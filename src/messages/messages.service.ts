import {
    BadRequestException,
    ForbiddenException,
    Injectable,
    NotFoundException,
} from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import { Message, MessageDocument, MessageType } from './schemas/message.schema'
import {
    Conversation,
    ConversationDocument,
} from './schemas/conversation.schema'
import { UsersService } from '../users/users.service'
import { MessagesGateway } from './messages.gateway'

@Injectable()
export class MessagesService {
    private readonly hiddenSystemTitles = ['Logowanie']

    constructor(
        @InjectModel(Message.name)
        private messageModel: Model<MessageDocument>,
        @InjectModel(Conversation.name)
        private conversationModel: Model<ConversationDocument>,
        private usersService: UsersService,
        private messagesGateway: MessagesGateway,
    ) {}

    private buildVisibleMessageFilter(userId: string) {
        return {
            deletedFor: { $ne: userId },
            title: { $nin: this.hiddenSystemTitles },
        }
    }

    private async getDirectConversation(userId: string, otherUserId: string) {
        return this.conversationModel.findOne({
            type: 'direct',
            participantIds: { $all: [userId, otherUserId], $size: 2 },
        })
    }

    private async getOrCreateDirectConversation(
        userId: string,
        otherUserId: string,
    ) {
        const existing = await this.getDirectConversation(userId, otherUserId)

        if (existing) {
            return existing
        }

        const conversation = new this.conversationModel({
            type: 'direct',
            participantIds: [userId, otherUserId],
        })

        return conversation.save()
    }

    private async getOrCreateSystemConversation(userId: string) {
        const existing = await this.conversationModel.findOne({
            type: 'system',
            participantIds: { $all: [userId], $size: 1 },
        })

        if (existing) {
            return existing
        }

        const conversation = new this.conversationModel({
            type: 'system',
            participantIds: [userId],
            title: 'Powiadomienia',
        })

        return conversation.save()
    }

    private async getConversationForUser(
        conversationId: string,
        userId: string,
    ) {
        const conversation = await this.conversationModel.findById(conversationId)

        if (!conversation) {
            throw new NotFoundException('Conversation not found')
        }

        if (!conversation.participantIds.includes(userId)) {
            throw new ForbiddenException('Access denied')
        }

        return conversation
    }

    private async getLatestVisibleMessage(
        conversationId: string,
        userId: string,
    ) {
        return this.messageModel
            .findOne({
                conversationId,
                ...this.buildVisibleMessageFilter(userId),
            })
            .sort({ createdAt: -1 })
    }

    private async buildConversationSummary(
        conversation: ConversationDocument,
        currentUserId: string,
    ) {
        const [latestMessage, unreadCount] = await Promise.all([
            this.getLatestVisibleMessage(String(conversation._id), currentUserId),
            this.messageModel.countDocuments({
                conversationId: String(conversation._id),
                ...this.buildVisibleMessageFilter(currentUserId),
                senderId: { $ne: currentUserId },
                readBy: { $ne: currentUserId },
            }),
        ])

        if (conversation.type === 'system') {
            return {
                _id: String(conversation._id),
                type: conversation.type,
                title: conversation.title ?? 'Powiadomienia',
                preview: latestMessage
                    ? latestMessage.title
                        ? `${latestMessage.title}: ${latestMessage.content}`
                        : latestMessage.content
                    : 'Brak wiadomości',
                unreadCount,
                lastMessageAt:
                    latestMessage?.createdAt ?? conversation.updatedAt,
                lastMessageType:
                    latestMessage?.type ?? conversation.lastMessageType ?? 'info',
                participant: null,
            }
        }

        const otherParticipantId = conversation.participantIds.find(
            (participantId) => participantId !== currentUserId,
        )

        const [participant] = otherParticipantId
            ? await this.usersService.findPublicByIds([otherParticipantId])
            : []

        return {
            _id: String(conversation._id),
            type: conversation.type,
            title: participant?.login ?? 'Rozmowa',
            preview: latestMessage
                ? latestMessage.title
                    ? `${latestMessage.title}: ${latestMessage.content}`
                    : latestMessage.content
                : 'Brak wiadomości',
            unreadCount,
            lastMessageAt: latestMessage?.createdAt ?? conversation.updatedAt,
            lastMessageType:
                latestMessage?.type ?? conversation.lastMessageType ?? 'info',
            participant: participant
                ? {
                    _id: String(participant._id),
                    login: participant.login,
                    email: participant.email,
                    role: participant.role,
                }
                : null,
        }
    }

    private async saveConversationMessage(
        participantIds: string[],
        conversationId: string,
        senderId: string | undefined,
        senderLogin: string | undefined,
        content: string,
        type: MessageType,
        title?: string,
    ) {
        const message = new this.messageModel({
            conversationId,
            senderId,
            senderLogin,
            content,
            type,
            title,
            readBy: senderId ? [senderId] : [],
        })

        const savedMessage = await message.save()

        await this.conversationModel.findByIdAndUpdate(conversationId, {
            lastMessageText: title ? `${title}: ${content}` : content,
            lastMessageAt: savedMessage.createdAt,
            lastMessageType: type,
        })

        this.messagesGateway.emitConversationUpdate(
            participantIds,
            conversationId,
            'message',
            String(savedMessage._id),
        )

        return savedMessage
    }

    async create(
        senderId: string,
        senderLogin: string,
        receiverLogin: string,
        title: string,
        content: string,
        type: MessageType = 'info',
    ) {
        const receiver = await this.usersService.findByLogin(receiverLogin)

        if (!receiver) {
            throw new BadRequestException('Receiver not found')
        }

        const conversation = await this.getOrCreateDirectConversation(
            senderId,
            String(receiver._id),
        )

        return this.saveConversationMessage(
            conversation.participantIds,
            String(conversation._id),
            senderId,
            senderLogin,
            content,
            type,
            title,
        )
    }

    async createSystemNotification(
        userId: string,
        title: string,
        content: string,
        type: MessageType = 'info',
    ) {
        const conversation = await this.getOrCreateSystemConversation(userId)

        return this.saveConversationMessage(
            conversation.participantIds,
            String(conversation._id),
            undefined,
            'System',
            content,
            type,
            title,
        )
    }

    async listConversations(userId: string) {
        const conversations = await this.conversationModel
            .find({ participantIds: userId })
            .sort({ lastMessageAt: -1, updatedAt: -1 })

        const summaries = await Promise.all(
            conversations.map((conversation) =>
                this.buildConversationSummary(conversation, userId),
            ),
        )

        return summaries
            .filter(
                (summary) =>
                    summary.unreadCount > 0 ||
                    summary.preview !== 'Brak wiadomości' ||
                    summary.type !== 'system',
            )
            .sort((left, right) => {
                const leftDate = new Date(left.lastMessageAt ?? 0).getTime()
                const rightDate = new Date(right.lastMessageAt ?? 0).getTime()
                return rightDate - leftDate
            })
    }

    async getConversationMessages(userId: string, conversationId: string) {
        await this.getConversationForUser(conversationId, userId)

        return this.messageModel
            .find({
                conversationId,
                ...this.buildVisibleMessageFilter(userId),
            })
            .sort({ createdAt: 1 })
            .lean()
            .then((messages) =>
                messages.map((message) => ({
                    _id: String(message._id),
                    conversationId: message.conversationId,
                    senderId: message.senderId,
                    senderLogin: message.senderLogin,
                    title: message.title,
                    content: message.content,
                    type: message.type,
                    createdAt: message.createdAt,
                    updatedAt: message.updatedAt,
                    isOwn:
                        Boolean(message.senderId) &&
                        String(message.senderId) === userId,
                    read:
                        (message.readBy ?? []).includes(userId) ||
                        String(message.senderId) === userId,
                })),
            )
    }

    async createDirectConversation(userId: string, receiverLogin: string) {
        const receiver = await this.usersService.findByLogin(receiverLogin)

        if (!receiver) {
            throw new BadRequestException('Receiver not found')
        }

        if (String(receiver._id) === userId) {
            throw new BadRequestException('Cannot create conversation with yourself')
        }

        const conversation = await this.getOrCreateDirectConversation(
            userId,
            String(receiver._id),
        )

        this.messagesGateway.emitConversationUpdate(
            conversation.participantIds,
            String(conversation._id),
            'created',
        )

        return this.buildConversationSummary(conversation, userId)
    }

    async sendToConversation(
        userId: string,
        senderLogin: string,
        conversationId: string,
        content: string,
        title?: string,
        type: MessageType = 'info',
    ) {
        if (!content.trim()) {
            throw new BadRequestException('Message content is required')
        }

        const conversation = await this.getConversationForUser(conversationId, userId)

        return this.saveConversationMessage(
            conversation.participantIds,
            conversationId,
            userId,
            senderLogin,
            content.trim(),
            type,
            title?.trim() || undefined,
        )
    }

    async markConversationAsRead(userId: string, conversationId: string) {
        const conversation = await this.getConversationForUser(conversationId, userId)

        await this.messageModel.updateMany(
            {
                conversationId,
                deletedFor: { $ne: userId },
                senderId: { $ne: userId },
                readBy: { $ne: userId },
            },
            {
                $addToSet: { readBy: userId },
            },
        )

        this.messagesGateway.emitConversationUpdate(
            conversation.participantIds,
            conversationId,
            'read',
        )

        return { success: true }
    }

    async deleteMessage(userId: string, messageId: string) {
        const message = await this.messageModel.findById(messageId)

        if (!message) {
            throw new NotFoundException('Message not found')
        }

        const conversation = await this.getConversationForUser(
            message.conversationId,
            userId,
        )

        await this.messageModel.findByIdAndUpdate(messageId, {
            $addToSet: { deletedFor: userId },
        })

        this.messagesGateway.emitConversationUpdate(
            conversation.participantIds,
            message.conversationId,
            'deleted',
            String(message._id),
        )

        return { success: true }
    }

    async clearConversation(userId: string, conversationId: string) {
        const conversation = await this.getConversationForUser(conversationId, userId)

        await this.messageModel.updateMany(
            {
                conversationId,
                deletedFor: { $ne: userId },
            },
            {
                $addToSet: { deletedFor: userId },
            },
        )

        this.messagesGateway.emitConversationUpdate(
            conversation.participantIds,
            conversationId,
            'cleared',
        )

        return { success: true }
    }

    async searchContacts(query: string, userId: string) {
        const contacts = await this.usersService.searchContacts(query, userId)

        return contacts.map((contact) => ({
            _id: String(contact._id),
            login: contact.login,
            email: contact.email,
            role: contact.role,
        }))
    }

    async unreadCount(userId: string) {
        const conversations = await this.conversationModel.find({
            participantIds: userId,
        })

        const conversationIds = conversations.map((conversation) =>
            String(conversation._id),
        )

        if (conversationIds.length === 0) {
            return 0
        }

        return this.messageModel.countDocuments({
            conversationId: { $in: conversationIds },
            ...this.buildVisibleMessageFilter(userId),
            senderId: { $ne: userId },
            readBy: { $ne: userId },
        })
    }
}