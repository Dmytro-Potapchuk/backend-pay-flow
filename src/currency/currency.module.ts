import { Module } from '@nestjs/common'
import { CurrencyController } from './currency.controller'
import { CurrencyService } from './currency.service'
import { UsersModule } from '../users/users.module'
import { MessagesModule } from '../messages/messages.module'

@Module({
  imports: [UsersModule, MessagesModule],
  controllers: [CurrencyController],
  providers: [CurrencyService],
})
export class CurrencyModule {}