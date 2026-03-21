import { Body, Controller, HttpCode, Post, Req, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import type { Request } from 'express'
import { PayuService } from './payu.service'
import { CreatePaymentDto } from './dto/create-payment.dto'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import type { RequestWithUser } from '../common/interfaces/jwt-payload.interface'

@ApiTags('PayU')
@ApiBearerAuth()
@Controller('payu')
export class PayuController {

    constructor(private payuService: PayuService) {}

    @ApiOperation({ summary: 'Create PayU payment - returns redirectUrl' })
    @UseGuards(JwtAuthGuard)
    @Post('create-payment')
    async createPayment(
        @Body() dto: CreatePaymentDto,
        @Req() req: Request & RequestWithUser,
    ) {
        const host = req.get('host') ?? 'localhost:3000'
        const protocol =
            (req.headers['x-forwarded-proto'] as string | undefined) ??
            req.protocol ??
            'http'
        const backendBaseUrl = `${protocol}://${host}`
        const hostname = host.replace(/:\d+$/, '')
        const frontendBaseUrl = `${protocol}://${hostname}`

        return this.payuService.createPayment(
            req.user.userId,
            req.user.login,
            dto.amount,
            dto.email,
            {
                backendBaseUrl,
                frontendBaseUrl,
            },
        )
    }

    @ApiOperation({ summary: 'Receive PayU notifications' })
    @HttpCode(200)
    @Post('notify')
    handleNotify(@Body() payload: unknown) {
        return this.payuService.handleNotification(payload)
    }
}