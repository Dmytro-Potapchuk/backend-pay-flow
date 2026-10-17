import {
    BadRequestException,
    ForbiddenException,
    Injectable,
    NotFoundException,
} from '@nestjs/common'
import { InjectConnection, InjectModel } from '@nestjs/mongoose'
import { Connection, Model } from 'mongoose'
import { Transaction, TransactionDocument } from './schemas/transaction.schema'
import { UsersService } from '../users/users.service'
import { MessagesService } from '../messages/messages.service'
import { roundMoney } from '../common/money'
import { runMoneyTransaction } from '../common/mongo-transaction'

@Injectable()
export class TransactionsService {

    constructor(
        @InjectModel(Transaction.name)
        private transactionModel: Model<TransactionDocument>,
        @InjectConnection()
        private connection: Connection,
        private usersService: UsersService,
        private messagesService: MessagesService,
    ) {}

    async createPendingPayuTopUp(
        userId: string,
        receiverLogin: string,
        amount: number,
    ) {
        const externalOrderId = `PAYFLOW-${Date.now()}-${Math.random()
            .toString(36)
            .slice(2, 10)}`

        const transaction = new this.transactionModel({
            senderId: userId,
            receiverAccount: receiverLogin,
            amount,
            type: 'payu_transfer',
            status: 'pending',
            externalOrderId,
        })

        return transaction.save()
    }

    async attachPayuOrderIds(
        externalOrderId: string,
        providerOrderId?: string,
    ) {
        if (!providerOrderId) {
            return
        }

        await this.transactionModel.findOneAndUpdate(
            { externalOrderId },
            { providerOrderId },
        )
    }

    async markPayuTopUpStatus(
        externalOrderId: string,
        status: 'pending' | 'canceled' | 'failed',
        providerOrderId?: string,
    ) {
        const $set: { status: string; providerOrderId?: string } = { status }
        if (providerOrderId) {
            $set.providerOrderId = providerOrderId
        }

        const updated = await this.transactionModel.findOneAndUpdate(
            { externalOrderId, status: { $nin: ['completed', 'canceled'] } },
            { $set },
            { new: true },
        )

        if (updated) {
            return updated
        }

        return this.transactionModel.findOne({ externalOrderId })
    }

    async completePayuTopUp(externalOrderId: string, providerOrderId?: string) {
        const outcome = await runMoneyTransaction(this.connection, async (session) => {
            const update: { status: 'completed'; providerOrderId?: string } = {
                status: 'completed',
            }
            if (providerOrderId) {
                update.providerOrderId = providerOrderId
            }

            const claimed = await this.transactionModel.findOneAndUpdate(
                {
                    externalOrderId,
                    type: 'payu_transfer',
                    status: { $in: ['pending', 'failed'] },
                },
                { $set: update },
                { new: true, ...(session ? { session } : {}) },
            )

            if (!claimed) {
                const current = await this.transactionModel.findOne(
                    { externalOrderId },
                    null,
                    session ? { session } : undefined,
                )
                return { transaction: current, credited: false }
            }

            try {
                await this.usersService.addBalancePln(
                    claimed.senderId,
                    claimed.amount,
                    session,
                )
            } catch (error) {
                if (!session) {
                    await this.transactionModel.updateOne(
                        { _id: claimed._id, status: 'completed' },
                        { $set: { status: 'pending' } },
                    )
                }
                throw error
            }

            return { transaction: claimed, credited: true }
        })

        if (outcome.credited && outcome.transaction) {
            await this.messagesService
                .createSystemNotification(
                    outcome.transaction.senderId,
                    'Doładowanie PayU',
                    `Doładowanie ${outcome.transaction.amount.toFixed(2)} PLN zostało zaksięgowane.`,
                    'success',
                )
                .catch(() => null)
        }

        return outcome.transaction
    }

    async findPayuTopUpForUser(userId: string, externalOrderId: string) {
        return this.transactionModel.findOne({
            senderId: userId,
            externalOrderId,
            type: 'payu_transfer',
        })
    }

    async bankTransfer(userId: string, receiverLogin: string, amount: number) {
        const normalizedAmount = roundMoney(amount)
        if (!Number.isFinite(normalizedAmount) || normalizedAmount <= 0) {
            throw new BadRequestException('Invalid amount')
        }

        let sender
        try {
            sender = await this.usersService.findById(userId)
        } catch (error) {
            if (error instanceof NotFoundException) {
                throw new BadRequestException('User not found')
            }
            throw error
        }

        if (!sender) {
            throw new BadRequestException('User not found')
        }

        const receiver = await this.usersService.findByLogin(receiverLogin)

        if (!receiver) {
            throw new BadRequestException('Receiver not found')
        }

        if (String(sender._id) === String(receiver._id)) {
            throw new BadRequestException('Cannot transfer to yourself')
        }

        let savedTransaction: TransactionDocument
        try {
            savedTransaction = await runMoneyTransaction(this.connection, async (session) => {
                const debit = await this.usersService.debitPlnIfSufficient(
                    userId,
                    normalizedAmount,
                    session,
                )

                if (!debit.ok && debit.reason === 'missing') {
                    throw new BadRequestException('User not found')
                }

                if (!debit.ok) {
                    throw new BadRequestException('Insufficient funds')
                }

                try {
                    await this.usersService.addBalancePln(
                        String(receiver._id),
                        normalizedAmount,
                        session,
                    )
                } catch (error) {
                    if (!session) {
                        await this.usersService.addBalancePln(userId, normalizedAmount)
                    }
                    throw error
                }

                const transaction = new this.transactionModel({
                    senderId: userId,
                    receiverAccount: receiver.login,
                    amount: normalizedAmount,
                    type: 'bank_transfer',
                    status: 'completed',
                })

                try {
                    return await transaction.save(session ? { session } : undefined)
                } catch (error) {
                    if (!session) {
                        await this.usersService.addBalancePln(userId, normalizedAmount)
                        await this.usersService.debitPlnIfSufficient(
                            String(receiver._id),
                            normalizedAmount,
                        )
                    }
                    throw error
                }
            })
        } catch (error) {
            if (
                error instanceof BadRequestException &&
                error.message === 'Insufficient funds'
            ) {
                await this.messagesService
                    .createSystemNotification(
                        userId,
                        'Przelew odrzucony',
                        'Niewystarczające środki na koncie – doładuj konto',
                        'error',
                    )
                    .catch(() => null)
            }
            throw error
        }

        await Promise.allSettled([
            this.messagesService.createSystemNotification(
                userId,
                'Przelew',
                'Przelew zakończony sukcesem',
                'success',
            ),
            this.messagesService.createSystemNotification(
                String(receiver._id),
                'Nowy przelew',
                `Otrzymałeś ${normalizedAmount.toFixed(2)} PLN od ${sender.login}.`,
                'info',
            ),
        ])

        return savedTransaction
    }

    async getHistory(userId: string, page = 1, limit = 20) {
        const safeLimit = Math.min(50, Math.max(1, Math.trunc(limit) || 20))
        const safePage = Math.max(1, Math.trunc(page) || 1)
        const user = await this.usersService.findById(userId)
        const filter = {
            status: 'completed',
            $or: [
                { senderId: userId },
                { receiverAccount: user.login },
            ],
        }

        const [items, total] = await Promise.all([
            this.transactionModel
                .find(filter)
                .sort({ createdAt: -1 })
                .skip((safePage - 1) * safeLimit)
                .limit(safeLimit),
            this.transactionModel.countDocuments(filter),
        ])

        return {
            items,
            page: safePage,
            limit: safeLimit,
            total,
            hasMore: safePage * safeLimit < total,
        }
    }

    async getTransaction(id: string, userId: string) {
        let transaction: TransactionDocument | null
        try {
            transaction = await this.transactionModel.findById(id)
        } catch {
            throw new NotFoundException('Transaction not found')
        }

        if (!transaction) {
            throw new NotFoundException('Transaction not found')
        }

        const user = await this.usersService.findById(userId)
        const isSender = String(transaction.senderId) === String(userId)
        const isReceiver = transaction.receiverAccount === user.login

        if (!isSender && !isReceiver) {
            throw new ForbiddenException('Access denied')
        }

        return transaction
    }
}