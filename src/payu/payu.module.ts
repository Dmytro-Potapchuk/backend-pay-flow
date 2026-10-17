import { Module } from '@nestjs/common'
import { PayuService } from './payu.service'
import { PayuController } from './payu.controller'
import { TransactionsModule } from '../transactions/transactions.module'
import { UsersModule } from '../users/users.module'

@Module({
  imports: [TransactionsModule, UsersModule],
  providers: [PayuService],
  controllers: [PayuController],
})
export class PayuModule {}