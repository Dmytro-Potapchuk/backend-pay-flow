import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    Patch,
    Post,
    Query,
    Request,
    UseGuards,
} from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger'
import { MessagesService } from './messages.service'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { CreateMessageDto } from './dto/create-message.dto'
import { CreateConversationDto } from './dto/create-conversation.dto'
import { SendConversationMessageDto } from './dto/send-conversation-message.dto'
import type { RequestWithUser } from '../common/interfaces/jwt-payload.interface'

@ApiTags('Messages')
@ApiBearerAuth()
@Controller('messages')
export class MessagesController {
    constructor(private messagesService: MessagesService) {}

    @ApiOperation({ summary: 'List user conversations' })
    @UseGuards(JwtAuthGuard)
    @Get('conversations')
    listConversations(@Request() req: RequestWithUser) {
        return this.messagesService.listConversations(req.user.userId)
    }

    @ApiOperation({ summary: 'Get messages in conversation' })
    @UseGuards(JwtAuthGuard)
    @Get('conversations/:conversationId/messages')
    getConversationMessages(
        @Request() req: RequestWithUser,
        @Param('conversationId') conversationId: string,
    ) {
        return this.messagesService.getConversationMessages(
            req.user.userId,
            conversationId,
        )
    }

    @ApiOperation({ summary: 'Create or open direct conversation' })
    @UseGuards(JwtAuthGuard)
    @Post('conversations/direct')
    createDirectConversation(
        @Request() req: RequestWithUser,
        @Body() dto: CreateConversationDto,
    ) {
        return this.messagesService.createDirectConversation(
            req.user.userId,
            dto.login,
        )
    }

    @ApiOperation({ summary: 'Send message to conversation' })
    @UseGuards(JwtAuthGuard)
    @Post('conversations/:conversationId/messages')
    sendToConversation(
        @Request() req: RequestWithUser,
        @Param('conversationId') conversationId: string,
        @Body() dto: SendConversationMessageDto,
    ) {
        return this.messagesService.sendToConversation(
            req.user.userId,
            req.user.login,
            conversationId,
            dto.content,
            dto.title,
        )
    }

    @ApiOperation({ summary: 'Mark conversation as read' })
    @UseGuards(JwtAuthGuard)
    @Patch('conversations/:conversationId/read')
    markConversationAsRead(
        @Request() req: RequestWithUser,
        @Param('conversationId') conversationId: string,
    ) {
        return this.messagesService.markConversationAsRead(
            req.user.userId,
            conversationId,
        )
    }

    @ApiOperation({ summary: 'Clear conversation for current user' })
    @UseGuards(JwtAuthGuard)
    @Delete('conversations/:conversationId/messages')
    clearConversation(
        @Request() req: RequestWithUser,
        @Param('conversationId') conversationId: string,
    ) {
        return this.messagesService.clearConversation(
            req.user.userId,
            conversationId,
        )
    }

    @ApiOperation({ summary: 'Delete single message for current user' })
    @UseGuards(JwtAuthGuard)
    @Delete('messages/:messageId')
    deleteMessage(
        @Request() req: RequestWithUser,
        @Param('messageId') messageId: string,
    ) {
        return this.messagesService.deleteMessage(req.user.userId, messageId)
    }

    @ApiOperation({ summary: 'Search contacts for new conversation' })
    @UseGuards(JwtAuthGuard)
    @Get('contacts')
    searchContacts(
        @Request() req: RequestWithUser,
        @Query('query') query = '',
    ) {
        return this.messagesService.searchContacts(query, req.user.userId)
    }

    @ApiOperation({ summary: 'Legacy: send direct message by login' })
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
}