import { Test, TestingModule } from '@nestjs/testing'
import { MessagesController } from './messages.controller'
import { MessagesService } from './messages.service'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'

describe('MessagesController', () => {
    let controller: MessagesController
    let messagesService: jest.Mocked<MessagesService>

    const mockMessage = {
        _id: 'msg1',
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
                        findAll: jest.fn(),
                        findOne: jest.fn(),
                        markAsRead: jest.fn(),
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

    describe('findAll', () => {
        it('should return user messages', async () => {
            messagesService.findAll.mockResolvedValue([mockMessage] as never)

            const result = await controller.findAll(mockRequest as never)

            expect(messagesService.findAll).toHaveBeenCalledWith('user123')
            expect(result).toEqual([mockMessage])
        })
    })

    describe('findOne', () => {
        it('should return message by id', async () => {
            messagesService.findOne.mockResolvedValue(mockMessage as never)

            const result = await controller.findOne('msg1')

            expect(messagesService.findOne).toHaveBeenCalledWith('msg1')
            expect(result).toEqual(mockMessage)
        })
    })

    describe('read', () => {
        it('should mark message as read', async () => {
            const updated = { ...mockMessage, read: true }
            messagesService.markAsRead.mockResolvedValue(updated as never)

            const result = await controller.read('msg1')

            expect(messagesService.markAsRead).toHaveBeenCalledWith('msg1')
        })
    })
})
