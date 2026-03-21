import { Body, Controller, HttpCode, Post, Req } from '@nestjs/common'
import { ApiTags, ApiOperation } from '@nestjs/swagger'
import type { Request } from 'express'
import { PayuService } from './payu.service'
import { CreatePaymentDto } from './dto/create-payment.dto'

@ApiTags('PayU')
@Controller('payu')
export class PayuController {

    constructor(private payuService: PayuService) {}

    @ApiOperation({ summary: 'Create PayU payment - returns redirectUrl' })
    @Post('create-payment')
    async createPayment(
        @Body() dto: CreatePaymentDto,
        @Req() req: Request,
    ) {
        const host = req.get('host') ?? 'localhost:3000'
        const protocol =
            (req.headers['x-forwarded-proto'] as string | undefined) ??
            req.protocol ??
            'http'
        const backendBaseUrl = `${protocol}://${host}`
        const hostname = host.replace(/:\d+$/, '')
        const frontendBaseUrl = `${protocol}://${hostname}`

        return this.payuService.createPayment(dto.amount, dto.email, {
            backendBaseUrl,
            frontendBaseUrl,
        })
    }

    @ApiOperation({ summary: 'Receive PayU notifications' })
    @HttpCode(200)
    @Post('notify')
    handleNotify(@Body() payload: unknown) {
        return {
            received: true,
            payload,
        }
    }
}