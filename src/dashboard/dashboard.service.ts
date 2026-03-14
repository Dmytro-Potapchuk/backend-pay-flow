import { Injectable, NotFoundException } from '@nestjs/common'
import { UsersService } from '../users/users.service'
import { TransactionsService } from '../transactions/transactions.service'
import { MessagesService } from '../messages/messages.service'

@Injectable()
export class DashboardService {

    constructor(
        private usersService: UsersService,
        private transactionsService: TransactionsService,
        private messagesService: MessagesService,
    ) {}

    async getDashboard(userId: string) {

        const user = await this.usersService.findById(userId)

        if (!user) {
            throw new NotFoundException('User not found')
        }

        const transactions = await this.transactionsService.getHistory(userId)

        const unreadMessages = await this.messagesService.unreadCount(userId)

        return {
            balance: user.balance,
            balanceEur: user.balanceEur ?? 0,
            balanceUsd: user.balanceUsd ?? 0,
            recentTransactions: transactions.slice(0, 5),
            unreadMessages
        }
    }
}