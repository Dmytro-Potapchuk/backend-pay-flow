import { Injectable, BadRequestException } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import { Transaction, TransactionDocument } from './schemas/transaction.schema'
import { UsersService } from '../users/users.service'

@Injectable()
export class TransactionsService {

    constructor(
        @InjectModel(Transaction.name)
        private transactionModel: Model<TransactionDocument>,
        private usersService: UsersService,
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

        return transaction.save()
    }

    async getHistory(userId: string) {
        return this.transactionModel
            .find({ senderId: userId })
            .sort({ createdAt: -1 })
    }

    async getTransaction(id: string) {
        return this.transactionModel.findById(id)
    }
}