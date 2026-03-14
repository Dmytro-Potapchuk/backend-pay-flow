import { Controller, Get, Post, Body, Param, UseGuards, Request, Patch } from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger'
import { MessagesService } from './messages.service'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { CreateMessageDto } from './dto/create-message.dto'
import type { RequestWithUser } from '../common/interfaces/jwt-payload.interface'

@ApiTags('Messages')
@ApiBearerAuth()
@Controller('messages')
export class MessagesController {

    constructor(private messagesService: MessagesService) {}

    @ApiOperation({ summary: 'Send message' })
    @UseGuards(JwtAuthGuard)
    @Post()
    create(@Request() req: RequestWithUser, @Body() dto: CreateMessageDto) {
        return this.messagesService.create(
            req.user.userId,
            req.user.login,
            dto.receiverLogin,
            dto.title,
            dto.content,
        )
    }

    @ApiOperation({ summary: 'List user messages' })
    @UseGuards(JwtAuthGuard)
    @Get()
    findAll(@Request() req: RequestWithUser) {
        return this.messagesService.findAll(req.user.userId)
    }

    @ApiOperation({ summary: 'Get message by ID' })
    @UseGuards(JwtAuthGuard)
    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.messagesService.findOne(id)
    }

    @ApiOperation({ summary: 'Mark message as read' })
    @UseGuards(JwtAuthGuard)
    @Patch(':id/read')
    read(@Param('id') id: string) {
        return this.messagesService.markAsRead(id)
    }

}