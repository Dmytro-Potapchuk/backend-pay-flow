import { Injectable, HttpException, BadRequestException } from '@nestjs/common'
import { UsersService } from '../users/users.service'
import { MessagesService } from '../messages/messages.service'
import { roundMoney } from '../common/money'

@Injectable()
export class CurrencyService {

    private API = 'https://api.nbp.pl/api/exchangerates/tables/A'

    constructor(
        private usersService: UsersService,
        private messagesService: MessagesService,
    ) {}

    async getRates() {

        const response = await fetch(this.API)

        if (!response.ok) {
            throw new HttpException('NBP API error', 500)
        }

        const data = await response.json()

        return data[0].rates
    }

    async buyCurrency(userId: string, amountPln: number, currencyCode: string) {
        const rates = await this.getRates()
        interface NbpRate { code: string; mid: number }
        const rate = (rates as NbpRate[]).find((r) => r.code === currencyCode)
        if (!rate) {
            throw new BadRequestException(`Currency ${currencyCode} not found in NBP rates`)
        }
        if (currencyCode !== 'EUR' && currencyCode !== 'USD') {
            throw new BadRequestException('Only EUR and USD can be purchased')
        }

        const normalizedPln = roundMoney(amountPln)
        const foreignAmount = roundMoney(normalizedPln / rate.mid)
        const user = await this.usersService.exchangePlnForCurrency(
            userId,
            normalizedPln,
            currencyCode,
            foreignAmount,
        )

        await this.messagesService
            .createSystemNotification(
                userId,
                'Wymiana walut',
                `Kupiono ${foreignAmount.toFixed(2)} ${currencyCode}.`,
                'success',
            )
            .catch(() => null)

        return {
            success: true,
            balance: user.balance,
            balanceEur: user.balanceEur ?? 0,
            balanceUsd: user.balanceUsd ?? 0,
            boughtAmount: foreignAmount,
            currencyCode,
        }
    }

    async sellCurrency(userId: string, amountForeign: number, currencyCode: string) {
        const rates = await this.getRates()
        interface NbpRate { code: string; mid: number }
        const rate = (rates as NbpRate[]).find((item) => item.code === currencyCode)
        if (!rate) {
            throw new BadRequestException(`Currency ${currencyCode} not found in NBP rates`)
        }
        if (currencyCode !== 'EUR' && currencyCode !== 'USD') {
            throw new BadRequestException('Only EUR and USD can be sold')
        }

        const foreignAmount = roundMoney(amountForeign)
        const plnAmount = roundMoney(foreignAmount * rate.mid)
        const user = await this.usersService.sellForeignForPln(
            userId,
            currencyCode,
            foreignAmount,
            plnAmount,
        )

        await this.messagesService
            .createSystemNotification(
                userId,
                'Wymiana walut',
                `Sprzedano ${foreignAmount.toFixed(2)} ${currencyCode} za ${plnAmount.toFixed(2)} PLN.`,
                'success',
            )
            .catch(() => null)

        return {
            success: true,
            balance: user.balance,
            balanceEur: user.balanceEur ?? 0,
            balanceUsd: user.balanceUsd ?? 0,
            soldAmount: foreignAmount,
            plnAmount,
            currencyCode,
        }
    }

}