import { Test, TestingModule } from '@nestjs/testing'
import { NotFoundException } from '@nestjs/common'
import { DashboardService } from './dashboard.service'
import { UsersService } from '../users/users.service'
import { TransactionsService } from '../transactions/transactions.service'
import { MessagesService } from '../messages/messages.service'

describe('DashboardService', () => {
    let service: DashboardService
    let usersService: jest.Mocked<UsersService>
    let transactionsService: jest.Mocked<TransactionsService>
    let messagesService: jest.Mocked<MessagesService>

    const mockUser = {
        _id: 'user123',
        login: 'jan',
        balance: 1000,
        balanceEur: 50,
        balanceUsd: 25,
    }

    const mockTransactions = [
        {
            _id: 'tx1',
            amount: 100,
            type: 'bank_transfer',
            receiverAccount: 'anna',
        },
    ]

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                DashboardService,
                {
                    provide: UsersService,
                    useValue: {
                        findById: jest.fn(),
                    },
                },
                {
                    provide: TransactionsService,
                    useValue: {
                        getHistory: jest.fn(),
                    },
                },
                {
                    provide: MessagesService,
                    useValue: {
                        unreadCount: jest.fn(),
                    },
                },
            ],
        }).compile()

        service = module.get<DashboardService>(DashboardService)
        usersService = module.get(UsersService)
        transactionsService = module.get(TransactionsService)
        messagesService = module.get(MessagesService)
        jest.clearAllMocks()
    })

    it('should be defined', () => {
        expect(service).toBeDefined()
    })

    describe('getDashboard', () => {
        it('should throw NotFoundException when user not found', async () => {
            usersService.findById.mockRejectedValue(
                new NotFoundException('User not found'),
            )

            await expect(service.getDashboard('nonexistent')).rejects.toThrow(
                NotFoundException,
            )
        })

        it('should return dashboard data', async () => {
            usersService.findById.mockResolvedValue(mockUser as never)
            transactionsService.getHistory.mockResolvedValue(
                mockTransactions as never,
            )
            messagesService.unreadCount.mockResolvedValue(2)

            const result = await service.getDashboard('user123')

            expect(usersService.findById).toHaveBeenCalledWith('user123')
            expect(transactionsService.getHistory).toHaveBeenCalledWith(
                'user123',
            )
            expect(messagesService.unreadCount).toHaveBeenCalledWith('user123')
            expect(result).toEqual({
                balance: 1000,
                balanceEur: 50,
                balanceUsd: 25,
                recentTransactions: mockTransactions.slice(0, 5),
                unreadMessages: 2,
            })
        })

        it('should return only first 5 transactions', async () => {
            const manyTransactions = Array.from({ length: 10 }, (_, i) => ({
                _id: `tx${i}`,
                amount: 100,
                type: 'bank_transfer',
            }))
            usersService.findById.mockResolvedValue(mockUser as never)
            transactionsService.getHistory.mockResolvedValue(
                manyTransactions as never,
            )
            messagesService.unreadCount.mockResolvedValue(0)

            const result = await service.getDashboard('user123')

            expect(result.recentTransactions).toHaveLength(5)
        })
    })
})
