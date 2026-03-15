import { Test, TestingModule } from '@nestjs/testing'
import { HttpException, BadRequestException } from '@nestjs/common'
import { CurrencyService } from './currency.service'
import { UsersService } from '../users/users.service'

const mockFetch = jest.fn()

describe('CurrencyService', () => {
    let service: CurrencyService
    let usersService: jest.Mocked<UsersService>

    beforeEach(async () => {
        global.fetch = mockFetch as never

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                CurrencyService,
                {
                    provide: UsersService,
                    useValue: {
                        deductPln: jest.fn(),
                        addBalanceEur: jest.fn(),
                        addBalanceUsd: jest.fn(),
                        findById: jest.fn(),
                    },
                },
            ],
        }).compile()

        service = module.get<CurrencyService>(CurrencyService)
        usersService = module.get(UsersService)
        jest.clearAllMocks()
    })

    afterEach(() => {
        jest.restoreAllMocks()
    })

    it('should be defined', () => {
        expect(service).toBeDefined()
    })

    describe('getRates', () => {
        it('should return NBP rates', async () => {
            const rates = [
                { code: 'EUR', mid: 4.31 },
                { code: 'USD', mid: 4.0 },
            ]
            mockFetch.mockResolvedValue({
                ok: true,
                json: () => Promise.resolve([{ rates }]),
            })

            const result = await service.getRates()

            expect(mockFetch).toHaveBeenCalled()
            expect(result).toEqual(rates)
        })

        it('should throw HttpException when NBP API fails', async () => {
            mockFetch.mockResolvedValue({ ok: false })

            await expect(service.getRates()).rejects.toThrow(HttpException)
            await expect(service.getRates()).rejects.toThrow('NBP API error')
        })
    })

    describe('buyCurrency', () => {
        it('should throw BadRequestException when currency not found', async () => {
            mockFetch.mockResolvedValue({
                ok: true,
                json: () =>
                    Promise.resolve([
                        {
                            rates: [
                                { code: 'EUR', mid: 4.31 },
                                { code: 'USD', mid: 4.0 },
                            ],
                        },
                    ]),
            })

            await expect(
                service.buyCurrency('user123', 100, 'CHF'),
            ).rejects.toThrow(BadRequestException)
            await expect(
                service.buyCurrency('user123', 100, 'CHF'),
            ).rejects.toThrow('Currency CHF not found')
            expect(usersService.deductPln).not.toHaveBeenCalled()
        })

        it('should buy EUR and update balances', async () => {
            mockFetch.mockResolvedValue({
                ok: true,
                json: () =>
                    Promise.resolve([
                        {
                            rates: [
                                { code: 'EUR', mid: 4.31 },
                                { code: 'USD', mid: 4.0 },
                            ],
                        },
                    ]),
            })

            usersService.deductPln.mockResolvedValue({} as never)
            usersService.addBalanceEur.mockResolvedValue({} as never)
            usersService.findById.mockResolvedValue({
                balance: 900,
                balanceEur: 23.2,
                balanceUsd: 0,
            } as never)

            const result = await service.buyCurrency('user123', 100, 'EUR')

            expect(usersService.deductPln).toHaveBeenCalledWith('user123', 100)
            expect(usersService.addBalanceEur).toHaveBeenCalledWith(
                'user123',
                100 / 4.31,
            )
            expect(usersService.addBalanceUsd).not.toHaveBeenCalled()
            expect(result).toEqual({
                success: true,
                balance: 900,
                balanceEur: 23.2,
                balanceUsd: 0,
                boughtAmount: 100 / 4.31,
                currencyCode: 'EUR',
            })
        })

        it('should buy USD and update balances', async () => {
            mockFetch.mockResolvedValue({
                ok: true,
                json: () =>
                    Promise.resolve([
                        {
                            rates: [
                                { code: 'EUR', mid: 4.31 },
                                { code: 'USD', mid: 4.0 },
                            ],
                        },
                    ]),
            })

            usersService.deductPln.mockResolvedValue({} as never)
            usersService.addBalanceUsd.mockResolvedValue({} as never)
            usersService.findById.mockResolvedValue({
                balance: 900,
                balanceEur: 0,
                balanceUsd: 25,
            } as never)

            const result = await service.buyCurrency('user123', 100, 'USD')

            expect(usersService.addBalanceEur).not.toHaveBeenCalled()
            expect(usersService.addBalanceUsd).toHaveBeenCalledWith(
                'user123',
                100 / 4.0,
            )
            expect(result.currencyCode).toBe('USD')
        })
    })
})
