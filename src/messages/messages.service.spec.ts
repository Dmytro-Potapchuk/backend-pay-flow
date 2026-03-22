import { Test, TestingModule } from '@nestjs/testing'
import { getModelToken } from '@nestjs/mongoose'
import {
    BadRequestException,
    ForbiddenException,
    NotFoundException,
} from '@nestjs/common'
import { MessagesService } from './messages.service'
import { UsersService } from '../users/users.service'
import { Message } from './schemas/message.schema'
import { Conversation } from './schemas/conversation.schema'
import { MessagesGateway } from './messages.gateway'

describe('MessagesService', () => {
    let service: MessagesService
    let messageModel: Record<string, jest.Mock>
    let conversationModel: Record<string, jest.Mock>
    let usersService: jest.Mocked<UsersService>
    let messagesGateway: { emitConversationUpdate: jest.Mock }

    const mockMessage = {
        _id: 'msg1',
        conversationId: 'conv1',
        senderId: 'sender123',
        senderLogin: 'jan',
        title: 'Test',
        content: 'Hello',
        type: 'info',
        readBy: ['sender123'],
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    }

    const mockConversation = {
        _id: 'conv1',
        type: 'direct',
        participantIds: ['sender123', 'receiver123'],
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        save: jest.fn().mockResolvedValue({
            _id: 'conv1',
            type: 'direct',
            participantIds: ['sender123', 'receiver123'],
        }),
    }

    beforeEach(async () => {
        messageModel = {
            find: jest.fn(),
            findOne: jest.fn(),
            findById: jest.fn(),
            findByIdAndUpdate: jest.fn(),
            updateMany: jest.fn(),
            countDocuments: jest.fn(),
        }
        conversationModel = {
            findOne: jest.fn(),
            findById: jest.fn(),
            findByIdAndUpdate: jest.fn(),
            find: jest.fn(),
        }
        messagesGateway = {
            emitConversationUpdate: jest.fn(),
        }

        const saveMock = jest.fn().mockResolvedValue(mockMessage)
        const MockMessageModel = jest.fn().mockImplementation((data: object) => ({
            ...data,
            save: saveMock,
        }))
        Object.assign(MockMessageModel, messageModel)

        const MockConversationModel = jest.fn().mockImplementation((data: object) => ({
            ...data,
            save: jest.fn().mockResolvedValue({ ...mockConversation, ...data }),
        }))
        Object.assign(MockConversationModel, conversationModel)

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                MessagesService,
                {
                    provide: getModelToken(Message.name),
                    useValue: MockMessageModel,
                },
                {
                    provide: getModelToken(Conversation.name),
                    useValue: MockConversationModel,
                },
                {
                    provide: UsersService,
                    useValue: {
                        findByLogin: jest.fn(),
                        findPublicByIds: jest.fn(),
                        searchContacts: jest.fn(),
                    },
                },
                {
                    provide: MessagesGateway,
                    useValue: messagesGateway,
                },
            ],
        }).compile()

        service = module.get<MessagesService>(MessagesService)
        usersService = module.get(UsersService)
        jest.clearAllMocks()
    })

    it('should be defined', () => {
        expect(service).toBeDefined()
    })

    describe('create', () => {
        it('should throw BadRequestException when receiver not found', async () => {
            usersService.findByLogin.mockResolvedValue(null)

            await expect(
                service.create(
                    'sender123',
                    'jan',
                    'unknown',
                    'Title',
                    'Content',
                ),
            ).rejects.toThrow(BadRequestException)
            await expect(
                service.create(
                    'sender123',
                    'jan',
                    'unknown',
                    'Title',
                    'Content',
                ),
            ).rejects.toThrow('Receiver not found')
        })

        it('should create and save message when receiver exists', async () => {
            usersService.findByLogin.mockResolvedValue({
                _id: 'receiver123',
                login: 'anna',
            } as never)
            conversationModel.findOne.mockResolvedValue(mockConversation as never)
            conversationModel.findByIdAndUpdate.mockResolvedValue({} as never)

            const result = await service.create(
                'sender123',
                'jan',
                'anna',
                'Title',
                'Content',
            )

            expect(usersService.findByLogin).toHaveBeenCalledWith('anna')
            expect(result).toEqual(mockMessage)
            expect(messagesGateway.emitConversationUpdate).toHaveBeenCalled()
        })
    })

    describe('getConversationMessages', () => {
        it('should return mapped conversation messages', async () => {
            conversationModel.findById.mockResolvedValue(mockConversation as never)
            const leanMock = jest.fn().mockResolvedValue([mockMessage])
            const sortMock = jest.fn().mockReturnValue({ lean: leanMock })
            messageModel.find.mockReturnValue({ sort: sortMock })

            const result = await service.getConversationMessages('sender123', 'conv1')

            expect(conversationModel.findById).toHaveBeenCalledWith('conv1')
            expect(result).toEqual([
                expect.objectContaining({
                    _id: 'msg1',
                    conversationId: 'conv1',
                    isOwn: true,
                    read: true,
                }),
            ])
        })
    })

    describe('createDirectConversation', () => {
        it('should throw when receiver is not found', async () => {
            usersService.findByLogin.mockResolvedValue(null)

            await expect(
                service.createDirectConversation('sender123', 'missing'),
            ).rejects.toThrow(BadRequestException)
        })

        it('should throw when trying to create conversation with yourself', async () => {
            usersService.findByLogin.mockResolvedValue({
                _id: 'sender123',
                login: 'jan',
            } as never)

            await expect(
                service.createDirectConversation('sender123', 'jan'),
            ).rejects.toThrow(BadRequestException)
        })

        it('should create conversation and emit created event', async () => {
            usersService.findByLogin.mockResolvedValue({
                _id: 'receiver123',
                login: 'anna',
            } as never)
            usersService.findPublicByIds.mockResolvedValue([
                {
                    _id: 'receiver123',
                    login: 'anna',
                    email: 'anna@test.pl',
                    role: 'user',
                },
            ] as never)
            conversationModel.findOne.mockResolvedValue(null)
            messageModel.findOne.mockReturnValue({
                sort: jest.fn().mockResolvedValue(null),
            })
            messageModel.countDocuments.mockResolvedValue(0)

            const result = await service.createDirectConversation('sender123', 'anna')

            expect(messagesGateway.emitConversationUpdate).toHaveBeenCalledWith(
                ['sender123', 'receiver123'],
                'conv1',
                'created',
            )
            expect(result).toEqual(
                expect.objectContaining({
                    type: 'direct',
                    title: 'anna',
                    preview: 'Brak wiadomości',
                }),
            )
        })
    })

    describe('markConversationAsRead', () => {
        it('should mark messages as read and emit update', async () => {
            conversationModel.findById.mockResolvedValue(mockConversation as never)
            messageModel.updateMany.mockResolvedValue({} as never)

            const result = await service.markConversationAsRead('sender123', 'conv1')

            expect(messageModel.updateMany).toHaveBeenCalled()
            expect(result).toEqual({ success: true })
            expect(messagesGateway.emitConversationUpdate).toHaveBeenCalledWith(
                ['sender123', 'receiver123'],
                'conv1',
                'read',
            )
        })
    })

    describe('unreadCount', () => {
        it('should return zero when user has no conversations', async () => {
            conversationModel.find.mockResolvedValue([] as never)

            const result = await service.unreadCount('user123')

            expect(result).toBe(0)
        })

        it('should return count of unread messages', async () => {
            conversationModel.find.mockResolvedValue([{ _id: 'conv1' }] as never)
            messageModel.countDocuments.mockResolvedValue(3)

            const result = await service.unreadCount('user123')

            expect(messageModel.countDocuments).toHaveBeenCalledWith({
                conversationId: { $in: ['conv1'] },
                deletedFor: { $ne: 'user123' },
                title: { $nin: ['Logowanie'] },
                senderId: { $ne: 'user123' },
                readBy: { $ne: 'user123' },
            })
            expect(result).toBe(3)
        })
    })

    describe('createSystemNotification', () => {
        it('should create system conversation when it does not exist', async () => {
            conversationModel.findOne.mockResolvedValueOnce(null)
            conversationModel.findByIdAndUpdate.mockResolvedValue({} as never)

            const result = await service.createSystemNotification(
                'sender123',
                'Alert',
                'System message',
                'success',
            )

            expect(result).toEqual(mockMessage)
            expect(messagesGateway.emitConversationUpdate).toHaveBeenCalledWith(
                ['sender123'],
                'conv1',
                'message',
                'msg1',
            )
        })
    })

    describe('listConversations', () => {
        it('should build and sort visible conversation summaries', async () => {
            const directConversation = {
                ...mockConversation,
                _id: 'conv-direct',
                type: 'direct',
                participantIds: ['sender123', 'receiver123'],
                updatedAt: new Date('2026-01-01T00:00:00.000Z'),
            }
            const systemConversation = {
                _id: 'conv-system',
                type: 'system',
                participantIds: ['sender123'],
                title: 'Powiadomienia',
                updatedAt: new Date('2026-01-03T00:00:00.000Z'),
            }

            conversationModel.find.mockReturnValue({
                sort: jest.fn().mockResolvedValue([directConversation, systemConversation]),
            })
            messageModel.findOne
                .mockReturnValueOnce({
                    sort: jest.fn().mockResolvedValue({
                        title: 'Test',
                        content: 'Hello',
                        type: 'info',
                        createdAt: new Date('2026-01-01T00:00:00.000Z'),
                    }),
                })
                .mockReturnValueOnce({
                    sort: jest.fn().mockResolvedValue({
                        title: 'Alert',
                        content: 'System content',
                        type: 'error',
                        createdAt: new Date('2026-01-02T00:00:00.000Z'),
                    }),
                })
            messageModel.countDocuments
                .mockResolvedValueOnce(1)
                .mockResolvedValueOnce(2)
            usersService.findPublicByIds.mockResolvedValue([
                {
                    _id: 'receiver123',
                    login: 'anna',
                    email: 'anna@test.pl',
                    role: 'user',
                },
            ] as never)

            const result = await service.listConversations('sender123')

            expect(result).toEqual([
                expect.objectContaining({
                    _id: 'conv-system',
                    type: 'system',
                    preview: 'Alert: System content',
                    unreadCount: 2,
                    lastMessageType: 'error',
                }),
                expect.objectContaining({
                    _id: 'conv-direct',
                    type: 'direct',
                    title: 'anna',
                    preview: 'Test: Hello',
                    unreadCount: 1,
                    participant: expect.objectContaining({
                        _id: 'receiver123',
                    }),
                }),
            ])
        })

        it('should filter out empty system conversations', async () => {
            conversationModel.find.mockReturnValue({
                sort: jest.fn().mockResolvedValue([
                    {
                        _id: 'conv-system',
                        type: 'system',
                        participantIds: ['sender123'],
                        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
                    },
                ]),
            })
            messageModel.findOne.mockReturnValue({
                sort: jest.fn().mockResolvedValue(null),
            })
            messageModel.countDocuments.mockResolvedValue(0)

            const result = await service.listConversations('sender123')

            expect(result).toEqual([])
        })
    })

    describe('sendToConversation', () => {
        it('should reject blank content', async () => {
            await expect(
                service.sendToConversation('sender123', 'jan', 'conv1', '   '),
            ).rejects.toThrow(BadRequestException)
        })

        it('should trim content and title before saving message', async () => {
            conversationModel.findById.mockResolvedValue(mockConversation as never)
            conversationModel.findByIdAndUpdate.mockResolvedValue({} as never)

            const result = await service.sendToConversation(
                'sender123',
                'jan',
                'conv1',
                '  hello world  ',
                '  Greetings  ',
                'success',
            )

            expect(result).toEqual(mockMessage)
            expect(conversationModel.findByIdAndUpdate).toHaveBeenCalledWith('conv1', {
                lastMessageText: 'Greetings: hello world',
                lastMessageAt: mockMessage.createdAt,
                lastMessageType: 'success',
            })
        })

        it('should reject access to foreign conversation', async () => {
            conversationModel.findById.mockResolvedValue({
                ...mockConversation,
                participantIds: ['receiver123'],
            } as never)

            await expect(
                service.sendToConversation('sender123', 'jan', 'conv1', 'hello'),
            ).rejects.toThrow(ForbiddenException)
        })
    })

    describe('deleteMessage', () => {
        it('should throw when message does not exist', async () => {
            messageModel.findById.mockResolvedValue(null)

            await expect(
                service.deleteMessage('sender123', 'missing-message'),
            ).rejects.toThrow(NotFoundException)
        })

        it('should mark message as deleted for user', async () => {
            messageModel.findById.mockResolvedValue({
                _id: 'msg1',
                conversationId: 'conv1',
            } as never)
            conversationModel.findById.mockResolvedValue(mockConversation as never)
            messageModel.findByIdAndUpdate.mockResolvedValue({} as never)

            const result = await service.deleteMessage('sender123', 'msg1')

            expect(messageModel.findByIdAndUpdate).toHaveBeenCalledWith('msg1', {
                $addToSet: { deletedFor: 'sender123' },
            })
            expect(result).toEqual({ success: true })
        })
    })

    describe('clearConversation', () => {
        it('should mark visible conversation messages as deleted', async () => {
            conversationModel.findById.mockResolvedValue(mockConversation as never)
            messageModel.updateMany.mockResolvedValue({} as never)

            const result = await service.clearConversation('sender123', 'conv1')

            expect(messageModel.updateMany).toHaveBeenCalledWith(
                {
                    conversationId: 'conv1',
                    deletedFor: { $ne: 'sender123' },
                },
                {
                    $addToSet: { deletedFor: 'sender123' },
                },
            )
            expect(messagesGateway.emitConversationUpdate).toHaveBeenCalledWith(
                ['sender123', 'receiver123'],
                'conv1',
                'cleared',
            )
            expect(result).toEqual({ success: true })
        })
    })

    describe('searchContacts', () => {
        it('should map public contacts for search results', async () => {
            usersService.searchContacts.mockResolvedValue([
                {
                    _id: 'user2',
                    login: 'anna',
                    email: 'anna@test.pl',
                    role: 'user',
                },
            ] as never)

            const result = await service.searchContacts('ann', 'sender123')

            expect(usersService.searchContacts).toHaveBeenCalledWith('ann', 'sender123')
            expect(result).toEqual([
                {
                    _id: 'user2',
                    login: 'anna',
                    email: 'anna@test.pl',
                    role: 'user',
                },
            ])
        })
    })

    describe('private helpers', () => {
        it('should build message visibility filter', () => {
            expect(service['buildVisibleMessageFilter']('sender123')).toEqual({
                deletedFor: { $ne: 'sender123' },
                title: { $nin: ['Logowanie'] },
            })
        })

        it('should load direct conversation by both participants', async () => {
            conversationModel.findOne.mockResolvedValue(mockConversation as never)

            const result = await service['getDirectConversation'](
                'sender123',
                'receiver123',
            )

            expect(conversationModel.findOne).toHaveBeenCalledWith({
                type: 'direct',
                participantIds: { $all: ['sender123', 'receiver123'], $size: 2 },
            })
            expect(result).toEqual(mockConversation)
        })

        it('should return conversation for authorized user', async () => {
            conversationModel.findById.mockResolvedValue(mockConversation as never)

            await expect(
                service['getConversationForUser']('conv1', 'sender123'),
            ).resolves.toEqual(mockConversation)
        })
    })
})
