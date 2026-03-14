import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { DatabaseModule } from './database/database.module'

import { AuthModule } from './auth/auth.module'
import { UsersModule } from './users/users.module'
import {CurrencyModule} from "./currency/currency.module";
import {PayuModule} from "./payu/payu.module";
import {TransactionsModule} from "./transactions/transactions.module";
import {DashboardModule} from "./dashboard/dashboard.module";
import {MessagesModule} from "./messages/messages.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    AuthModule,
    UsersModule,
    CurrencyModule,
    PayuModule,
    TransactionsModule,
    MessagesModule,
    DashboardModule
  ],
})
export class AppModule {}