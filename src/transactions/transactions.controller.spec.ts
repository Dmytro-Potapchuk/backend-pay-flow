import { Test, TestingModule } from '@nestjs/testing'
import { TransactionsController } from './transactions.controller'
import { TransactionsService } from './transactions.service'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'

describe('TransactionsController', () => {
    let controller: TransactionsController
    let transactionsService: jest.Mocked<TransactionsService>

    const mockTransaction = {
        _id: 'tx1',
        senderId: 'user123',
        receiverAccount: 'anna',
        amount: 100,
        type: 'bank_transfer',
    }

    const mockRequest = { user: { userId: 'user123' } }

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [TransactionsController],
            providers: [
                {
                    provide: TransactionsService,
                    useValue: {
                        bankTransfer: jest.fn(),
                        getHistory: jest.fn(),
                        getTransaction: jest.fn(),
                    },
                },
            ],
        })
            .overrideGuard(JwtAuthGuard)
            .useValue({ canActivate: () => true })
            .compile()

        controller = module.get<TransactionsController>(TransactionsController)
        transactionsService = module.get(TransactionsService)
        jest.clearAllMocks()
    })

    it('should be defined', () => {
        expect(controller).toBeDefined()
    })

    describe('bankTransfer', () => {
        it('should call service with user id and dto', async () => {
            const dto = { receiverAccount: 'anna', amount: 100 }
            transactionsService.bankTransfer.mockResolvedValue(
                mockTransaction as never,
            )

            const result = await controller.bankTransfer(
                mockRequest as never,
                dto,
            )

            expect(transactionsService.bankTransfer).toHaveBeenCalledWith(
                'user123',
                'anna',
                100,
            )
            expect(result).toEqual(mockTransaction)
        })
    })

    describe('history', () => {
        it('should return transaction history', async () => {
            transactionsService.getHistory.mockResolvedValue([
                mockTransaction,
            ] as never)

            const result = await controller.history(mockRequest as never)

            expect(transactionsService.getHistory).toHaveBeenCalledWith(
                'user123',
            )
            expect(result).toEqual([mockTransaction])
        })
    })

    describe('getTransaction', () => {
        it('should return transaction by id', async () => {
            transactionsService.getTransaction.mockResolvedValue(
                mockTransaction as never,
            )

            const result = await controller.getTransaction('tx1')

            expect(transactionsService.getTransaction).toHaveBeenCalledWith(
                'tx1',
            )
            expect(result).toEqual(mockTransaction)
        })
    })
})
