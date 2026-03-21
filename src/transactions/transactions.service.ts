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