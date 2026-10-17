import { Test, TestingModule } from '@nestjs/testing'
import { HttpException, BadRequestException } from '@nestjs/common'
import { CurrencyService } from './currency.service'
import { UsersService } from '../users/users.service'
import { MessagesService } from '../messages/messages.service'

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
                        exchangePlnForCurrency: jest.fn(),
                        sellForeignForPln: jest.fn(),
                    },
                },
                {
                    provide: MessagesService,
                    useValue: {
                        createSystemNotification: jest.fn().mockResolvedValue(undefined),
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
            expect(usersService.exchangePlnForCurrency).not.toHaveBeenCalled()
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

            usersService.exchangePlnForCurrency.mockResolvedValue({
                balance: 900,
                balanceEur: 23.2,
                balanceUsd: 0,
            } as never)

            const result = await service.buyCurrency('user123', 100, 'EUR')

            expect(usersService.exchangePlnForCurrency).toHaveBeenCalledWith(
                'user123',
                100,
                'EUR',
                23.2,
            )
            expect(result).toEqual({
                success: true,
                balance: 900,
                balanceEur: 23.2,
                balanceUsd: 0,
                boughtAmount: 23.2,
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

            usersService.exchangePlnForCurrency.mockResolvedValue({
                balance: 900,
                balanceEur: 0,
                balanceUsd: 25,
            } as never)

            const result = await service.buyCurrency('user123', 100, 'USD')

            expect(usersService.exchangePlnForCurrency).toHaveBeenCalledWith(
                'user123',
                100,
                'USD',
                25,
            )
            expect(result.currencyCode).toBe('USD')
            expect(result.boughtAmount).toBe(25)
        })

        it('should sell EUR back to PLN in one balance update', async () => {
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
            usersService.sellForeignForPln.mockResolvedValue({
                balance: 1043.1,
                balanceEur: 0,
                balanceUsd: 0,
            } as never)

            const result = await service.sellCurrency('user123', 10, 'EUR')

            expect(usersService.sellForeignForPln).toHaveBeenCalledWith(
                'user123',
                'EUR',
                10,
                43.1,
            )
            expect(result).toEqual({
                success: true,
                balance: 1043.1,
                balanceEur: 0,
                balanceUsd: 0,
                soldAmount: 10,
                plnAmount: 43.1,
                currencyCode: 'EUR',
            })
        })
    })
})
