import { Module } from '@nestjs/common'
import { PayuService } from './payu.service'
import { PayuController } from './payu.controller'
import { TransactionsModule } from '../transactions/transactions.module'

@Module({
  imports: [TransactionsModule],
  providers: [PayuService],
  controllers: [PayuController],
})
export class PayuModule {}