import { Controller, Post, Get, Param, Body, UseGuards, Request } from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger'
import { TransactionsService } from './transactions.service'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { CreateTransferDto } from './dto/create-transfer.dto'
import type  { RequestWithUser } from '../common/interfaces/jwt-payload.interface'

@ApiTags('Transactions')
@ApiBearerAuth()
@Controller('transactions')
export class TransactionsController {

    constructor(private transactionsService: TransactionsService) {}

    @ApiOperation({ summary: 'Execute bank transfer' })
    @UseGuards(JwtAuthGuard)
    @Post('bank-transfer')
    bankTransfer(@Request() req: RequestWithUser, @Body() dto: CreateTransferDto) {
        return this.transactionsService.bankTransfer(
            req.user.userId,
            dto.receiverAccount,
            dto.amount
        )
    }

    @ApiOperation({ summary: 'Get transaction history' })
    @UseGuards(JwtAuthGuard)
    @Get('history')
    history(@Request() req: RequestWithUser) {
        return this.transactionsService.getHistory(req.user.userId)
    }

    @ApiOperation({ summary: 'Get transaction by ID' })
    @UseGuards(JwtAuthGuard)
    @Get(':id')
    getTransaction(@Param('id') id: string) {
        return this.transactionsService.getTransaction(id)
    }
}