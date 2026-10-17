import * as common from '@nestjs/common'
import {ApiBearerAuth, ApiOperation, ApiTags} from '@nestjs/swagger'
import type {Request} from 'express'
import {PayuService} from './payu.service'
import {CreatePaymentDto} from './dto/create-payment.dto'
import {resolveCustomerIp} from './customer-ip'
import {JwtAuthGuard} from '../common/guards/jwt-auth.guard'
import type {RequestWithUser} from '../common/interfaces/jwt-payload.interface'

@ApiTags('PayU')
@ApiBearerAuth()
@common.Controller('payu')
export class PayuController {

    constructor(private payuService: PayuService) {
    }

    @ApiOperation({summary: 'Create PayU payment - returns redirectUrl'})
    @common.UseGuards(JwtAuthGuard)
    @common.Post('create-payment')
    async createPayment(
        @common.Body() dto: CreatePaymentDto,
        @common.Req() req: Request & RequestWithUser,
    ) {
        const host = req.get('host') ?? 'localhost:3000'
        const protocol =
            (req.headers['x-forwarded-proto'] as string | undefined) ??
            req.protocol ??
            'http'
        const backendBaseUrl = `${protocol}://${host}`

        return this.payuService.createPayment(
            req.user.userId,
            req.user.login,
            dto.amount,
            dto.email,
            {
                backendBaseUrl,
                continueUrl: dto.continueUrl,
                customerIp: resolveCustomerIp(req),
            },
        )
    }

    @ApiOperation({summary: 'Receive PayU notifications'})
    @common.HttpCode(200)
    @common.Post('notify')
    handleNotify(@common.Req() req: common.RawBodyRequest<Request>) {
        const signatureHeader = req.headers['openpayu-signature']
        this.payuService.assertValidNotificationSignature(req.rawBody, signatureHeader)
        return this.payuService.handleNotification(req.body)
    }

    @ApiOperation({summary: 'Confirm PayU payment status for current user'})
    @common.UseGuards(JwtAuthGuard)
    @common.Get('confirm/:externalOrderId')
    confirmPayment(
        @common.Param('externalOrderId') externalOrderId: string,
        @common.Req() req: Request & RequestWithUser,
    ) {
        return this.payuService.confirmPayment(req.user.userId, externalOrderId)
    }
}