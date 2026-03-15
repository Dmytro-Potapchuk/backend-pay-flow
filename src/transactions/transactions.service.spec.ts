import { Test, TestingModule } from '@nestjs/testing'
import { getModelToken } from '@nestjs/mongoose'
import { BadRequestException } from '@nestjs/common'
import { TransactionsService } from './transactions.service'
import { UsersService } from '../users/users.service'
import { Transaction } from './schemas/transaction.schema'

describe('TransactionsService', () => {
    let service: TransactionsService
    let transactionModel: { find: jest.Mock; findById: jest.Mock }
    let usersService: jest.Mocked<UsersService>

    const mockSender = {
        _id: 'sender123',
        login: 'jan',
        balance: 1000,
        save: jest.fn().mockResolvedValue(true),
    }

    const mockReceiver = {
        _id: 'receiver456',
        login: 'anna',
        balance: 500,
        save: jest.fn().mockResolvedValue(true),
    }

    const mockTransaction = {
        _id: 'tx1',
        senderId: 'sender123',
        receiverAccount: 'anna',
        amount: 100,
        type: 'bank_transfer',
        save: jest.fn().mockResolvedValue({}),
    }

    beforeEach(async () => {
        transactionModel = {
            find: jest.fn(),
            findById: jest.fn(),
        }

        const saveMock = jest.fn().mockResolvedValue(mockTransaction)
        const MockTransactionModel = jest.fn().mockImplementation(() => ({
            save: saveMock,
        }))
        Object.assign(MockTransactionModel, transactionModel)

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                TransactionsService,
                {
                    provide: getModelToken(Transaction.name),
                    useValue: MockTransactionModel,
                },
                {
                    provide: UsersService,
                    useValue: {
                        findById: jest.fn(),
                        findByLogin: jest.fn(),
                    },
                },
            ],
        }).compile()

        service = module.get<TransactionsService>(TransactionsService)
        usersService = module.get(UsersService)
        jest.clearAllMocks()
    })

    it('should be defined', () => {
        expect(service).toBeDefined()
    })

    describe('bankTransfer', () => {
        it('should throw BadRequestException when sender not found', async () => {
            usersService.findById.mockResolvedValue(null)

            await expect(
                service.bankTransfer('nonexistent', 'anna', 100),
            ).rejects.toThrow(BadRequestException)
            await expect(
                service.bankTransfer('nonexistent', 'anna', 100),
            ).rejects.toThrow('User not found')
        })

        it('should throw BadRequestException when receiver not found', async () => {
            usersService.findById.mockResolvedValue(mockSender as never)
            usersService.findByLogin.mockResolvedValue(null)

            await expect(
                service.bankTransfer('sender123', 'unknown', 100),
            ).rejects.toThrow(BadRequestException)
            await expect(
                service.bankTransfer('sender123', 'unknown', 100),
            ).rejects.toThrow('Receiver not found')
        })

        it('should throw BadRequestException when transferring to self', async () => {
            const sameUser = { ...mockSender, _id: 'user1' }
            usersService.findById.mockResolvedValue(sameUser as never)
            usersService.findByLogin.mockResolvedValue({
                ...sameUser,
                login: 'jan',
            } as never)

            await expect(
                service.bankTransfer('user1', 'jan', 100),
            ).rejects.toThrow(BadRequestException)
            await expect(
                service.bankTransfer('user1', 'jan', 100),
            ).rejects.toThrow('Cannot transfer to yourself')
        })

        it('should throw BadRequestException when insufficient funds', async () => {
            usersService.findById.mockResolvedValue({
                ...mockSender,
                balance: 50,
            } as never)
            usersService.findByLogin.mockResolvedValue(mockReceiver as never)

            await expect(
                service.bankTransfer('sender123', 'anna', 100),
            ).rejects.toThrow(BadRequestException)
            await expect(
                service.bankTransfer('sender123', 'anna', 100),
            ).rejects.toThrow('Insufficient funds')
        })

        it('should perform transfer and create transaction', async () => {
            const sender = { ...mockSender, balance: 1000 }
            const receiver = { ...mockReceiver, balance: 500 }
            usersService.findById.mockResolvedValue(sender as never)
            usersService.findByLogin.mockResolvedValue(receiver as never)

            const result = await service.bankTransfer('sender123', 'anna', 100)

            expect(sender.save).toHaveBeenCalled()
            expect(receiver.save).toHaveBeenCalled()
            expect(sender.balance).toBe(900)
            expect(receiver.balance).toBe(600)
        })
    })

    describe('getHistory', () => {
        it('should return transactions sorted by createdAt', async () => {
            const sortMock = jest.fn().mockResolvedValue([mockTransaction])
            transactionModel.find.mockReturnValue({ sort: sortMock })

            const result = await service.getHistory('sender123')

            expect(transactionModel.find).toHaveBeenCalledWith({
                senderId: 'sender123',
            })
            expect(sortMock).toHaveBeenCalledWith({ createdAt: -1 })
        })
    })

    describe('getTransaction', () => {
        it('should return transaction by id', async () => {
            transactionModel.findById.mockResolvedValue(mockTransaction)

            const result = await service.getTransaction('tx1')

            expect(transactionModel.findById).toHaveBeenCalledWith('tx1')
            expect(result).toEqual(mockTransaction)
        })
    })
})
