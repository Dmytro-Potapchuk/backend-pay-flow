import { Controller, Post, Get, Param, Body, UseGuards, Request, Query } from '@nestjs/common'
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
    history(
        @Request() req: RequestWithUser,
        @Query('page') page?: string,
        @Query('limit') limit?: string,
    ) {
        return this.transactionsService.getHistory(
            req.user.userId,
            Number(page) || 1,
            Number(limit) || 20,
        )
    }

    @ApiOperation({ summary: 'Get transaction by ID' })
    @UseGuards(JwtAuthGuard)
    @Get(':id')
    getTransaction(@Param('id') id: string, @Request() req: RequestWithUser) {
        return this.transactionsService.getTransaction(id, req.user.userId)
    }
}