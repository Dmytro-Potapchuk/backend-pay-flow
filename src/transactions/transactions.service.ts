import { Injectable, BadRequestException } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import { Transaction, TransactionDocument } from './schemas/transaction.schema'
import { UsersService } from '../users/users.service'
import { MessagesService } from '../messages/messages.service'

@Injectable()
export class TransactionsService {

    constructor(
        @InjectModel(Transaction.name)
        private transactionModel: Model<TransactionDocument>,
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
        const transaction = await this.transactionModel.findOne({ externalOrderId })

        if (!transaction) {
            return null
        }

        transaction.status = status
        if (providerOrderId) {
            transaction.providerOrderId = providerOrderId
        }

        return transaction.save()
    }

    async completePayuTopUp(externalOrderId: string, providerOrderId?: string) {
        const transaction = await this.transactionModel.findOne({ externalOrderId })

        if (!transaction) {
            return null
        }

        if (transaction.status === 'completed') {
            return transaction
        }

        await this.usersService.addBalancePln(transaction.senderId, transaction.amount)

        transaction.status = 'completed'
        if (providerOrderId) {
            transaction.providerOrderId = providerOrderId
        }

        const savedTransaction = await transaction.save()

        await this.messagesService
            .createSystemNotification(
                transaction.senderId,
                'Doładowanie PayU',
                `Doładowanie ${transaction.amount.toFixed(2)} PLN zostało zaksięgowane.`,
                'success',
            )
            .catch(() => null)

        return savedTransaction
    }

    async bankTransfer(userId: string, receiverLogin: string, amount: number) {

        const sender = await this.usersService.findById(userId)

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

        if (sender.balance < amount) {
            await this.messagesService
                .createSystemNotification(
                    userId,
                    'Przelew odrzucony',
                    'Niewystarczające środki na koncie – doładuj konto',
                    'error',
                )
                .catch(() => null)
            throw new BadRequestException('Insufficient funds')
        }

        sender.balance -= amount
        receiver.balance += amount

        await sender.save()
        await receiver.save()

        const transaction = new this.transactionModel({
            senderId: userId,
            receiverAccount: receiver.login, // zapisujemy login odbiorcy
            amount,
            type: 'bank_transfer',
        })

        const savedTransaction = await transaction.save()

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
                `Otrzymałeś ${amount.toFixed(2)} PLN od ${sender.login}.`,
                'info',
            ),
        ])

        return savedTransaction
    }

    async getHistory(userId: string) {
        const user = await this.usersService.findById(userId)

        return this.transactionModel
            .find({
                $or: [
                    { senderId: userId },
                    { receiverAccount: user.login },
                ],
            })
            .sort({ createdAt: -1 })
    }

    async getTransaction(id: string) {
        return this.transactionModel.findById(id)
    }
}