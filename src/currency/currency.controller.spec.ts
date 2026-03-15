import { Test, TestingModule } from '@nestjs/testing'
import { CurrencyController } from './currency.controller'
import { CurrencyService } from './currency.service'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'

describe('CurrencyController', () => {
    let controller: CurrencyController
    let currencyService: jest.Mocked<CurrencyService>

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [CurrencyController],
            providers: [
                {
                    provide: CurrencyService,
                    useValue: {
                        getRates: jest.fn(),
                        buyCurrency: jest.fn(),
                    },
                },
            ],
        })
            .overrideGuard(JwtAuthGuard)
            .useValue({ canActivate: () => true })
            .compile()

        controller = module.get<CurrencyController>(CurrencyController)
        currencyService = module.get(CurrencyService)
        jest.clearAllMocks()
    })

    it('should be defined', () => {
        expect(controller).toBeDefined()
    })

    describe('getRates', () => {
        it('should return currency rates', async () => {
            const rates = [
                { code: 'EUR', mid: 4.31 },
                { code: 'USD', mid: 4.0 },
            ]
            currencyService.getRates.mockResolvedValue(rates as never)

            const result = await controller.getRates()

            expect(currencyService.getRates).toHaveBeenCalled()
            expect(result).toEqual(rates)
        })
    })

    describe('buy', () => {
        it('should call buyCurrency with dto and user id', async () => {
            const dto = { amountPln: 100, currencyCode: 'EUR' }
            const req = { user: { userId: 'user123' } }
            const expected = {
                success: true,
                balance: 900,
                balanceEur: 23.2,
                balanceUsd: 0,
                boughtAmount: 23.2,
                currencyCode: 'EUR',
            }
            currencyService.buyCurrency.mockResolvedValue(expected as never)

            const result = await controller.buy(dto, req as never)

            expect(currencyService.buyCurrency).toHaveBeenCalledWith(
                'user123',
                100,
                'EUR',
            )
            expect(result).toEqual(expected)
        })
    })
})
