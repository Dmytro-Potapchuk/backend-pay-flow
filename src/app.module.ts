import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { APP_INTERCEPTOR } from '@nestjs/core'
import { AppController } from './app.controller'
import { AppService } from './app.service'
import { AuthModule } from './auth/auth.module'
import { CurrencyModule } from './currency/currency.module'
import { DashboardModule } from './dashboard/dashboard.module'
import { DatabaseModule } from './database/database.module'
import { MessagesModule } from './messages/messages.module'
import { MetricsInterceptor } from './metrics/metrics.interceptor'
import { MetricsModule } from './metrics/metrics.module'
import { PayuModule } from './payu/payu.module'
import { TransactionsModule } from './transactions/transactions.module'
import { UsersModule } from './users/users.module'

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
        DashboardModule,
        MetricsModule,
    ],
    controllers: [AppController],
    providers: [
        AppService,
        {
            provide: APP_INTERCEPTOR,
            useClass: MetricsInterceptor,
        },
    ],
})
export class AppModule {}