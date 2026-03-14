import { Module } from '@nestjs/common'
import { CurrencyController } from './currency.controller'
import { CurrencyService } from './currency.service'
import { UsersModule } from '../users/users.module'

@Module({
  imports: [UsersModule],
  controllers: [CurrencyController],
  providers: [CurrencyService],
})
export class CurrencyModule {}