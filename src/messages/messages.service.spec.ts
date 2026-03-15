import { Test, TestingModule } from '@nestjs/testing'
import { getModelToken } from '@nestjs/mongoose'
import { BadRequestException } from '@nestjs/common'
import { MessagesService } from './messages.service'
import { UsersService } from '../users/users.service'
import { Message } from './schemas/message.schema'

describe('MessagesService', () => {
    let service: MessagesService
    let messageModel: Record<string, jest.Mock>
    let usersService: jest.Mocked<UsersService>

    const mockMessage = {
        _id: 'msg1',
        userId: 'receiver123',
        senderId: 'sender123',
        senderLogin: 'jan',
        title: 'Test',
        content: 'Hello',
        read: false,
    }

    beforeEach(async () => {
        messageModel = {
            find: jest.fn(),
            findById: jest.fn(),
            findByIdAndUpdate: jest.fn(),
            countDocuments: jest.fn(),
        }

        const saveMock = jest.fn().mockResolvedValue(mockMessage)
        const MockMessageModel = jest.fn().mockImplementation((data: object) => ({
            ...data,
            save: saveMock,
        }))
        Object.assign(MockMessageModel, messageModel)

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                MessagesService,
                {
                    provide: getModelToken(Message.name),
                    useValue: MockMessageModel,
                },
                {
                    provide: UsersService,
                    useValue: {
                        findByLogin: jest.fn(),
                    },
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

            const result = await service.create(
                'sender123',
                'jan',
                'anna',
                'Title',
                'Content',
            )

            expect(usersService.findByLogin).toHaveBeenCalledWith('anna')
            expect(result).toEqual(mockMessage)
        })
    })

    describe('findAll', () => {
        it('should return messages sorted by createdAt', async () => {
            const sortMock = jest.fn().mockResolvedValue([mockMessage])
            messageModel.find.mockReturnValue({ sort: sortMock })

            const result = await service.findAll('user123')

            expect(messageModel.find).toHaveBeenCalledWith({ userId: 'user123' })
            expect(sortMock).toHaveBeenCalledWith({ createdAt: -1 })
            expect(result).toEqual([mockMessage])
        })
    })

    describe('findOne', () => {
        it('should return message by id', async () => {
            messageModel.findById.mockResolvedValue(mockMessage)

            const result = await service.findOne('msg1')

            expect(messageModel.findById).toHaveBeenCalledWith('msg1')
            expect(result).toEqual(mockMessage)
        })
    })

    describe('markAsRead', () => {
        it('should update message to read', async () => {
            const updated = { ...mockMessage, read: true }
            messageModel.findByIdAndUpdate.mockResolvedValue(updated)

            const result = await service.markAsRead('msg1')

            expect(messageModel.findByIdAndUpdate).toHaveBeenCalledWith(
                'msg1',
                { read: true },
                { new: true },
            )
            expect(result.read).toBe(true)
        })
    })

    describe('unreadCount', () => {
        it('should return count of unread messages', async () => {
            messageModel.countDocuments.mockResolvedValue(3)

            const result = await service.unreadCount('user123')

            expect(messageModel.countDocuments).toHaveBeenCalledWith({
                userId: 'user123',
                read: false,
            })
            expect(result).toBe(3)
        })
    })
})
