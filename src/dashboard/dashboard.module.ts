import { Module } from '@nestjs/common'
import { DashboardController } from './dashboard.controller'
import { DashboardService } from './dashboard.service'
import { UsersModule } from '../users/users.module'
import { TransactionsModule } from '../transactions/transactions.module'
import { MessagesModule } from '../messages/messages.module'

@Module({
    imports: [
        UsersModule,
        TransactionsModule,
        MessagesModule
    ],
    controllers: [DashboardController],
    providers: [DashboardService],
})
export class DashboardModule {}