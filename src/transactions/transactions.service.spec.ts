import { Test, TestingModule } from '@nestjs/testing'
import { getModelToken } from '@nestjs/mongoose'
import { BadRequestException } from '@nestjs/common'
import { TransactionsService } from './transactions.service'
import { UsersService } from '../users/users.service'
import { MessagesService } from '../messages/messages.service'
import { Transaction } from './schemas/transaction.schema'

describe('TransactionsService', () => {
    let service: TransactionsService
    let transactionModel: {
        find: jest.Mock
        findById: jest.Mock
        findOne: jest.Mock
        findOneAndUpdate: jest.Mock
    }
    let usersService: jest.Mocked<UsersService>
    let messagesService: jest.Mocked<MessagesService>

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
            findOne: jest.fn(),
            findOneAndUpdate: jest.fn(),
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
                        addBalancePln: jest.fn(),
                    },
                },
                {
                    provide: MessagesService,
                    useValue: {
                        createSystemNotification: jest.fn().mockResolvedValue(null),
                    },
                },
            ],
        }).compile()

        service = module.get<TransactionsService>(TransactionsService)
        usersService = module.get(UsersService)
        messagesService = module.get(MessagesService)
        jest.clearAllMocks()
    })

    it('should be defined', () => {
        expect(service).toBeDefined()
    })

    describe('createPendingPayuTopUp', () => {
        it('should create pending PayU top-up with generated external order id', async () => {
            const nowSpy = jest.spyOn(Date, 'now').mockReturnValue(1700000000000)
            const randomSpy = jest.spyOn(Math, 'random').mockReturnValue(0.123456789)

            const result = await service.createPendingPayuTopUp('sender123', 'jan', 250)

            expect(result).toEqual(mockTransaction)
            expect(nowSpy).toHaveBeenCalled()
            expect(randomSpy).toHaveBeenCalled()
        })
    })

    describe('attachPayuOrderIds', () => {
        it('should skip update when provider order id is missing', async () => {
            await expect(
                service.attachPayuOrderIds('PAYFLOW-123'),
            ).resolves.toBeUndefined()
            expect(transactionModel.findOneAndUpdate).not.toHaveBeenCalled()
        })

        it('should update transaction with provider order id', async () => {
            transactionModel.findOneAndUpdate.mockResolvedValue({} as never)

            await service.attachPayuOrderIds('PAYFLOW-123', 'ORDER-1')

            expect(transactionModel.findOneAndUpdate).toHaveBeenCalledWith(
                { externalOrderId: 'PAYFLOW-123' },
                { providerOrderId: 'ORDER-1' },
            )
        })
    })

    describe('markPayuTopUpStatus', () => {
        it('should return null when transaction does not exist', async () => {
            transactionModel.findOne.mockResolvedValue(null)

            await expect(
                service.markPayuTopUpStatus('PAYFLOW-123', 'failed'),
            ).resolves.toBeNull()
        })

        it('should update status and provider order id', async () => {
            const transaction = {
                status: 'pending',
                providerOrderId: undefined,
                save: jest.fn().mockResolvedValue({ status: 'canceled' }),
            }
            transactionModel.findOne.mockResolvedValue(transaction as never)

            const result = await service.markPayuTopUpStatus(
                'PAYFLOW-123',
                'canceled',
                'ORDER-2',
            )

            expect(transaction.status).toBe('canceled')
            expect(transaction.providerOrderId).toBe('ORDER-2')
            expect(transaction.save).toHaveBeenCalled()
            expect(result).toEqual({ status: 'canceled' })
        })
    })

    describe('completePayuTopUp', () => {
        it('should return null when transaction does not exist', async () => {
            transactionModel.findOne.mockResolvedValue(null)

            await expect(service.completePayuTopUp('PAYFLOW-123')).resolves.toBeNull()
        })

        it('should return existing transaction when already completed', async () => {
            const transaction = {
                status: 'completed',
            }
            transactionModel.findOne.mockResolvedValue(transaction as never)

            const result = await service.completePayuTopUp('PAYFLOW-123')

            expect(usersService.addBalancePln).not.toHaveBeenCalled()
            expect(result).toBe(transaction)
        })

        it('should complete top-up and send notification', async () => {
            const transaction = {
                senderId: 'sender123',
                amount: 100,
                status: 'pending',
                providerOrderId: undefined,
                save: jest.fn().mockResolvedValue({ status: 'completed' }),
            }
            usersService.addBalancePln = jest.fn().mockResolvedValue({} as never)
            transactionModel.findOne.mockResolvedValue(transaction as never)

            const result = await service.completePayuTopUp('PAYFLOW-123', 'ORDER-3')

            expect(usersService.addBalancePln).toHaveBeenCalledWith('sender123', 100)
            expect(transaction.status).toBe('completed')
            expect(transaction.providerOrderId).toBe('ORDER-3')
            expect(messagesService.createSystemNotification).toHaveBeenCalledWith(
                'sender123',
                'Doładowanie PayU',
                'Doładowanie 100.00 PLN zostało zaksięgowane.',
                'success',
            )
            expect(result).toEqual({ status: 'completed' })
        })

        it('should ignore notification failure after balance update', async () => {
            const transaction = {
                senderId: 'sender123',
                amount: 50,
                status: 'pending',
                save: jest.fn().mockResolvedValue({ status: 'completed' }),
            }
            usersService.addBalancePln = jest.fn().mockResolvedValue({} as never)
            transactionModel.findOne.mockResolvedValue(transaction as never)
            messagesService.createSystemNotification.mockRejectedValue(
                new Error('notification failed'),
            )

            await expect(
                service.completePayuTopUp('PAYFLOW-123'),
            ).resolves.toEqual({ status: 'completed' })
        })
    })

    describe('findPayuTopUpForUser', () => {
        it('should query PayU top-up by user and external order id', async () => {
            transactionModel.findOne.mockResolvedValue(mockTransaction as never)

            const result = await service.findPayuTopUpForUser(
                'sender123',
                'PAYFLOW-123',
            )

            expect(transactionModel.findOne).toHaveBeenCalledWith({
                senderId: 'sender123',
                externalOrderId: 'PAYFLOW-123',
                type: 'payu_transfer',
            })
            expect(result).toEqual(mockTransaction)
        })
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
            expect(messagesService.createSystemNotification).toHaveBeenCalledWith(
                'sender123',
                'Przelew odrzucony',
                'Niewystarczające środki na koncie – doładuj konto',
                'error',
            )
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
            expect(messagesService.createSystemNotification).toHaveBeenNthCalledWith(
                1,
                'sender123',
                'Przelew',
                'Przelew zakończony sukcesem',
                'success',
            )
            expect(messagesService.createSystemNotification).toHaveBeenNthCalledWith(
                2,
                'receiver456',
                'Nowy przelew',
                'Otrzymałeś 100.00 PLN od jan.',
                'info',
            )
            expect(result).toEqual(mockTransaction)
        })
    })

    describe('getHistory', () => {
        it('should return transactions sorted by createdAt', async () => {
            const sortMock = jest.fn().mockResolvedValue([mockTransaction])
            transactionModel.find.mockReturnValue({ sort: sortMock })
            usersService.findById.mockResolvedValue({
                ...mockSender,
                login: 'jan',
            } as never)

            const result = await service.getHistory('sender123')

            expect(transactionModel.find).toHaveBeenCalledWith({
                status: 'completed',
                $or: [
                    { senderId: 'sender123' },
                    { receiverAccount: 'jan' },
                ],
            })
            expect(sortMock).toHaveBeenCalledWith({ createdAt: -1 })
            expect(result).toEqual([mockTransaction])
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
