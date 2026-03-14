import { Controller, Get, Post, Body, Req, UseGuards } from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger'
import { CurrencyService } from './currency.service'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { BuyCurrencyDto } from './dto/buy-currency.dto'
import type { RequestWithUser } from '../common/interfaces/jwt-payload.interface'

@ApiTags('Currency')
@Controller('currency')
export class CurrencyController {

    constructor(private currencyService: CurrencyService) {}

    @ApiOperation({ summary: 'Get NBP exchange rates (table A)' })
    @Get('rates')
    getRates() {
        return this.currencyService.getRates()
    }

    @ApiOperation({ summary: 'Buy foreign currency (EUR/USD) - deducts PLN, adds to balance' })
    @ApiBearerAuth()
    @Post('buy')
    @UseGuards(JwtAuthGuard)
    buy(@Body() dto: BuyCurrencyDto, @Req() req: RequestWithUser) {
        return this.currencyService.buyCurrency(req.user.userId, dto.amountPln, dto.currencyCode)
    }

}