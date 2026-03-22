import { Test, TestingModule } from '@nestjs/testing'
import { MessagesController } from './messages.controller'
import { MessagesService } from './messages.service'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'

describe('MessagesController', () => {
    let controller: MessagesController
    let messagesService: jest.Mocked<MessagesService>

    const mockConversation = {
        _id: 'conv1',
        title: 'anna',
        preview: 'Hello',
        unreadCount: 0,
    }

    const mockMessage = {
        _id: 'msg1',
        conversationId: 'conv1',
        title: 'Test',
        content: 'Hello',
        read: false,
        senderLogin: 'jan',
    }

    const mockRequest = { user: { userId: 'user123', login: 'jan' } }

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [MessagesController],
            providers: [
                {
                    provide: MessagesService,
                    useValue: {
                        create: jest.fn(),
                        listConversations: jest.fn(),
                        getConversationMessages: jest.fn(),
                        createDirectConversation: jest.fn(),
                        sendToConversation: jest.fn(),
                        markConversationAsRead: jest.fn(),
                        clearConversation: jest.fn(),
                        deleteMessage: jest.fn(),
                        searchContacts: jest.fn(),
                    },
                },
            ],
        })
            .overrideGuard(JwtAuthGuard)
            .useValue({ canActivate: () => true })
            .compile()

        controller = module.get<MessagesController>(MessagesController)
        messagesService = module.get(MessagesService)
        jest.clearAllMocks()
    })

    it('should be defined', () => {
        expect(controller).toBeDefined()
    })

    describe('create', () => {
        it('should create message', async () => {
            const dto = {
                receiverLogin: 'anna',
                title: 'Test',
                content: 'Hello',
            }
            messagesService.create.mockResolvedValue(mockMessage as never)

            const result = await controller.create(mockRequest as never, dto)

            expect(messagesService.create).toHaveBeenCalledWith(
                'user123',
                'jan',
                'anna',
                'Test',
                'Hello',
            )
            expect(result).toEqual(mockMessage)
        })
    })

    describe('listConversations', () => {
        it('should return user conversations', async () => {
            messagesService.listConversations.mockResolvedValue([
                mockConversation,
            ] as never)

            const result = await controller.listConversations(mockRequest as never)

            expect(messagesService.listConversations).toHaveBeenCalledWith('user123')
            expect(result).toEqual([mockConversation])
        })
    })

    describe('getConversationMessages', () => {
        it('should return messages in conversation', async () => {
            messagesService.getConversationMessages.mockResolvedValue([
                mockMessage,
            ] as never)

            const result = await controller.getConversationMessages(
                mockRequest as never,
                'conv1',
            )

            expect(messagesService.getConversationMessages).toHaveBeenCalledWith(
                'user123',
                'conv1',
            )
            expect(result).toEqual([mockMessage])
        })
    })

    describe('createDirectConversation', () => {
        it('should create direct conversation', async () => {
            messagesService.createDirectConversation.mockResolvedValue(
                mockConversation as never,
            )

            const result = await controller.createDirectConversation(
                mockRequest as never,
                { login: 'anna' },
            )

            expect(messagesService.createDirectConversation).toHaveBeenCalledWith(
                'user123',
                'anna',
            )
            expect(result).toEqual(mockConversation)
        })
    })

    describe('sendToConversation', () => {
        it('should send message to conversation', async () => {
            messagesService.sendToConversation.mockResolvedValue(mockMessage as never)

            const result = await controller.sendToConversation(
                mockRequest as never,
                'conv1',
                { content: 'Hello', title: 'Test' },
            )

            expect(messagesService.sendToConversation).toHaveBeenCalledWith(
                'user123',
                'jan',
                'conv1',
                'Hello',
                'Test',
            )
            expect(result).toEqual(mockMessage)
        })
    })

    describe('markConversationAsRead', () => {
        it('should mark conversation as read', async () => {
            messagesService.markConversationAsRead.mockResolvedValue({
                success: true,
            } as never)

            const result = await controller.markConversationAsRead(
                mockRequest as never,
                'conv1',
            )

            expect(messagesService.markConversationAsRead).toHaveBeenCalledWith(
                'user123',
                'conv1',
            )
            expect(result).toEqual({ success: true })
        })
    })

    describe('clearConversation', () => {
        it('should clear current conversation', async () => {
            messagesService.clearConversation.mockResolvedValue({
                success: true,
            } as never)

            const result = await controller.clearConversation(
                mockRequest as never,
                'conv1',
            )

            expect(messagesService.clearConversation).toHaveBeenCalledWith(
                'user123',
                'conv1',
            )
            expect(result).toEqual({ success: true })
        })
    })

    describe('deleteMessage', () => {
        it('should delete single message', async () => {
            messagesService.deleteMessage.mockResolvedValue({ success: true } as never)

            const result = await controller.deleteMessage(
                mockRequest as never,
                'msg1',
            )

            expect(messagesService.deleteMessage).toHaveBeenCalledWith(
                'user123',
                'msg1',
            )
            expect(result).toEqual({ success: true })
        })
    })

    describe('searchContacts', () => {
        it('should search contacts', async () => {
            const contacts = [{ _id: 'u2', login: 'anna', email: 'a@test.pl' }]
            messagesService.searchContacts.mockResolvedValue(contacts as never)

            const result = await controller.searchContacts(
                mockRequest as never,
                'ann',
            )

            expect(messagesService.searchContacts).toHaveBeenCalledWith(
                'ann',
                'user123',
            )
            expect(result).toEqual(contacts)
        })
    })
})
