import { Injectable, HttpException, BadRequestException } from '@nestjs/common'
import { UsersService } from '../users/users.service'

@Injectable()
export class CurrencyService {

    private API = 'https://api.nbp.pl/api/exchangerates/tables/A'

    constructor(private usersService: UsersService) {}

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
        const mid = rate.mid
        const foreignAmount = amountPln / mid

        await this.usersService.deductPln(userId, amountPln)
        if (currencyCode === 'EUR') {
            await this.usersService.addBalanceEur(userId, foreignAmount)
        } else {
            await this.usersService.addBalanceUsd(userId, foreignAmount)
        }

        const user = await this.usersService.findById(userId)
        return {
            success: true,
            balance: user.balance,
            balanceEur: user.balanceEur ?? 0,
            balanceUsd: user.balanceUsd ?? 0,
            boughtAmount: foreignAmount,
            currencyCode,
        }
    }

}