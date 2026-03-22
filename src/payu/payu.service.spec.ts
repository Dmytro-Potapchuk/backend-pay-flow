import { Test, TestingModule } from '@nestjs/testing'
import { BadRequestException, ForbiddenException } from '@nestjs/common'
import { PayuService } from './payu.service'
import axios from 'axios'
import { TransactionsService } from '../transactions/transactions.service'

jest.mock('axios')
const mockedAxios = axios as jest.Mocked<typeof axios>

describe('PayuService', () => {
    let service: PayuService
    let transactionsService: jest.Mocked<TransactionsService>

    const originalEnv = process.env

    beforeEach(async () => {
        process.env = {
            ...originalEnv,
            PAYU_API: 'https://secure.snd.payu.com',
            PAYU_CLIENT_ID: 'client_id',
            PAYU_CLIENT_SECRET: 'secret',
            PAYU_POS_ID: 'pos123',
        }

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                PayuService,
                {
                    provide: TransactionsService,
                    useValue: {
                        createPendingPayuTopUp: jest.fn(),
                        attachPayuOrderIds: jest.fn(),
                        markPayuTopUpStatus: jest.fn(),
                        findPayuTopUpForUser: jest.fn(),
                        completePayuTopUp: jest.fn(),
                    },
                },
            ],
        }).compile()

        service = module.get<PayuService>(PayuService)
        transactionsService = module.get(TransactionsService)
        jest.clearAllMocks()
        transactionsService.createPendingPayuTopUp.mockResolvedValue({
            externalOrderId: 'PAYFLOW-123',
        } as never)
    })

    afterEach(() => {
        process.env = originalEnv
    })

    it('should be defined', () => {
        expect(service).toBeDefined()
    })

    describe('getToken', () => {
        it('should return access_token from PayU', async () => {
            mockedAxios.post.mockResolvedValue({
                data: { access_token: 'payu_token_xyz' },
            })

            const result = await service.getToken()

            expect(mockedAxios.post).toHaveBeenCalled()
            expect(result).toBe('payu_token_xyz')
        })

        it('should throw when token is missing in response', async () => {
            mockedAxios.post.mockResolvedValue({
                data: {},
            })

            await expect(service.getToken()).rejects.toThrow(BadRequestException)
        })

        it('should wrap axios authorization errors', async () => {
            mockedAxios.post.mockRejectedValue({
                message: 'unauthorized',
                response: {
                    status: 401,
                    data: { error: 'invalid_client' },
                },
            })

            await expect(service.getToken()).rejects.toThrow(BadRequestException)
        })
    })

    describe('createPayment', () => {
        it('should throw BadRequestException when PayU returns error status', async () => {
            mockedAxios.post
                .mockResolvedValueOnce({ data: { access_token: 'token' } })
                .mockResolvedValueOnce({
                    data: {
                        status: { statusCode: 'ERROR' },
                        redirectUri: null,
                    },
                })

            await expect(
                service.createPayment(
                    'user123',
                    'jan',
                    100,
                    'user@test.pl',
                    { frontendBaseUrl: 'https://dom.payflow.waw.pl' },
                ),
            ).rejects.toThrow(BadRequestException)
        })

        it('should throw BadRequestException when redirectUri is missing', async () => {
            mockedAxios.post
                .mockResolvedValueOnce({ data: { access_token: 'token' } })
                .mockResolvedValueOnce({
                    headers: {},
                    data: {
                        status: { statusCode: 'SUCCESS' },
                        redirectUri: null,
                    },
                })

            await expect(
                service.createPayment(
                    'user123',
                    'jan',
                    100,
                    'user@test.pl',
                    { frontendBaseUrl: 'https://dom.payflow.waw.pl' },
                ),
            ).rejects.toThrow(BadRequestException)
            expect(transactionsService.markPayuTopUpStatus).toHaveBeenCalledWith(
                'PAYFLOW-123',
                'failed',
            )
        })

        it('should return redirectUrl when payment is created', async () => {
            mockedAxios.post
                .mockResolvedValueOnce({ data: { access_token: 'token' } })
                .mockResolvedValueOnce({
                    headers: {},
                    data: {
                        status: { statusCode: 'SUCCESS' },
                        orderId: 'ORDER-123',
                        redirectUri: 'https://payu.pl/checkout/xyz',
                    },
                })

            const result = await service.createPayment(
                'user123',
                'jan',
                100,
                'user@test.pl',
                { frontendBaseUrl: 'https://dom.payflow.waw.pl' },
            )

            expect(transactionsService.createPendingPayuTopUp).toHaveBeenCalledWith(
                'user123',
                'jan',
                100,
            )
            expect(transactionsService.attachPayuOrderIds).toHaveBeenCalledWith(
                'PAYFLOW-123',
                'ORDER-123',
            )
            expect(result).toEqual(
                expect.objectContaining({
                    redirectUrl: 'https://payu.pl/checkout/xyz',
                    externalOrderId: 'PAYFLOW-123',
                }),
            )
        })

        it('should use location header when redirectUri is missing', async () => {
            mockedAxios.post
                .mockResolvedValueOnce({ data: { access_token: 'token' } })
                .mockResolvedValueOnce({
                    headers: {
                        location: 'https://payu.pl/checkout/from-header',
                    },
                    data: {
                        status: { statusCode: 'SUCCESS' },
                        orderId: 'ORDER-999',
                    },
                })

            const result = await service.createPayment(
                'user123',
                'jan',
                123.45,
                'user@test.pl',
                {
                    backendBaseUrl: 'https://api.example.com',
                    frontendBaseUrl: 'https://app.example.com',
                    continueUrl: '/payu-result?foo=bar',
                },
            )

            expect(result).toEqual({
                redirectUrl: 'https://payu.pl/checkout/from-header',
                externalOrderId: 'PAYFLOW-123',
            })
            expect(mockedAxios.post).toHaveBeenNthCalledWith(
                2,
                'https://secure.snd.payu.com/api/v2_1/orders',
                expect.objectContaining({
                    notifyUrl: 'https://api.example.com/payu/notify',
                    continueUrl:
                        '/payu-result?foo=bar&extOrderId=PAYFLOW-123',
                    totalAmount: '12345',
                    extOrderId: 'PAYFLOW-123',
                }),
                expect.any(Object),
            )
        })

        it('should wrap PayU order request errors and mark transaction failed', async () => {
            mockedAxios.post
                .mockResolvedValueOnce({ data: { access_token: 'token' } })
                .mockRejectedValueOnce({
                    message: 'order failed',
                    response: {
                        status: 500,
                        data: { error: 'boom' },
                    },
                })

            await expect(
                service.createPayment(
                    'user123',
                    'jan',
                    100,
                    'user@test.pl',
                    { frontendBaseUrl: 'https://dom.payflow.waw.pl' },
                ),
            ).rejects.toThrow(BadRequestException)

            expect(transactionsService.markPayuTopUpStatus).toHaveBeenCalledWith(
                'PAYFLOW-123',
                'failed',
            )
        })
    })

    describe('handleNotification', () => {
        it('should ignore payload without external order id', async () => {
            await expect(service.handleNotification({})).resolves.toEqual({
                received: true,
                ignored: true,
            })
        })

        it('should complete transaction for completed status', async () => {
            const result = await service.handleNotification({
                order: {
                    extOrderId: 'PAYFLOW-123',
                    orderId: 'ORDER-1',
                    status: 'completed',
                },
            })

            expect(transactionsService.completePayuTopUp).toHaveBeenCalledWith(
                'PAYFLOW-123',
                'ORDER-1',
            )
            expect(result).toEqual({
                received: true,
                status: 'COMPLETED',
                extOrderId: 'PAYFLOW-123',
            })
        })

        it('should mark canceled transaction', async () => {
            await service.handleNotification({
                order: {
                    extOrderId: 'PAYFLOW-123',
                    orderId: 'ORDER-2',
                    status: 'canceled',
                },
            })

            expect(transactionsService.markPayuTopUpStatus).toHaveBeenCalledWith(
                'PAYFLOW-123',
                'canceled',
                'ORDER-2',
            )
        })

        it('should mark other statuses as pending', async () => {
            await service.handleNotification({
                order: {
                    extOrderId: 'PAYFLOW-123',
                    orderId: 'ORDER-3',
                    status: 'waiting_for_confirmation',
                },
            })

            expect(transactionsService.markPayuTopUpStatus).toHaveBeenCalledWith(
                'PAYFLOW-123',
                'pending',
                'ORDER-3',
            )
        })
    })

    describe('confirmPayment', () => {
        it('should throw when payment is not found for user', async () => {
            transactionsService.findPayuTopUpForUser.mockResolvedValue(null)

            await expect(
                service.confirmPayment('user123', 'PAYFLOW-123'),
            ).rejects.toThrow(ForbiddenException)
        })

        it('should return completed result for already completed transaction', async () => {
            transactionsService.findPayuTopUpForUser.mockResolvedValue({
                status: 'completed',
            } as never)

            await expect(
                service.confirmPayment('user123', 'PAYFLOW-123'),
            ).resolves.toEqual({
                status: 'COMPLETED',
                externalOrderId: 'PAYFLOW-123',
                balanceApplied: true,
            })
        })

        it('should return pending state when provider order id is missing', async () => {
            transactionsService.findPayuTopUpForUser.mockResolvedValue({
                status: 'pending',
            } as never)

            await expect(
                service.confirmPayment('user123', 'PAYFLOW-123'),
            ).resolves.toEqual({
                status: 'PENDING',
                externalOrderId: 'PAYFLOW-123',
                balanceApplied: false,
            })
        })

        it('should complete balance when PayU order is successful', async () => {
            transactionsService.findPayuTopUpForUser.mockResolvedValue({
                status: 'pending',
                providerOrderId: 'ORDER-4',
            } as never)
            mockedAxios.post.mockResolvedValueOnce({
                data: { access_token: 'token' },
            })
            mockedAxios.get.mockResolvedValueOnce({
                data: {
                    orders: [{ status: 'SUCCESS' }],
                },
            })

            await expect(
                service.confirmPayment('user123', 'PAYFLOW-123'),
            ).resolves.toEqual({
                status: 'COMPLETED',
                externalOrderId: 'PAYFLOW-123',
                balanceApplied: true,
            })
            expect(transactionsService.completePayuTopUp).toHaveBeenCalledWith(
                'PAYFLOW-123',
                'ORDER-4',
            )
        })

        it('should mark canceled status returned from PayU details', async () => {
            transactionsService.findPayuTopUpForUser.mockResolvedValue({
                status: 'pending',
                providerOrderId: 'ORDER-5',
            } as never)
            mockedAxios.post.mockResolvedValueOnce({
                data: { access_token: 'token' },
            })
            mockedAxios.get.mockResolvedValueOnce({
                data: {
                    orders: [{ status: 'CANCELED' }],
                },
            })

            await expect(
                service.confirmPayment('user123', 'PAYFLOW-123'),
            ).resolves.toEqual({
                status: 'CANCELED',
                externalOrderId: 'PAYFLOW-123',
                balanceApplied: false,
            })
            expect(transactionsService.markPayuTopUpStatus).toHaveBeenCalledWith(
                'PAYFLOW-123',
                'canceled',
                'ORDER-5',
            )
        })
    })
})
