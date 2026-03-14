import { Controller, Post, Body } from '@nestjs/common'
import { ApiTags, ApiOperation } from '@nestjs/swagger'
import { PayuService } from './payu.service'
import { CreatePaymentDto } from './dto/create-payment.dto'

@ApiTags('PayU')
@Controller('payu')
export class PayuController {

    constructor(private payuService: PayuService) {}

    @ApiOperation({ summary: 'Create PayU payment - returns redirectUrl' })
    @Post('create-payment')
    async createPayment(@Body() dto: CreatePaymentDto) {
        return this.payuService.createPayment(dto.amount, dto.email)
    }

}