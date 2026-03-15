import { Test, TestingModule } from '@nestjs/testing'
import { BadRequestException } from '@nestjs/common'
import { PayuService } from './payu.service'
import axios from 'axios'

jest.mock('axios')
const mockedAxios = axios as jest.Mocked<typeof axios>

describe('PayuService', () => {
    let service: PayuService

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
            providers: [PayuService],
        }).compile()

        service = module.get<PayuService>(PayuService)
        jest.clearAllMocks()
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
                service.createPayment(100, 'user@test.pl'),
            ).rejects.toThrow(BadRequestException)
            await expect(
                service.createPayment(100, 'user@test.pl'),
            ).rejects.toThrow('PayU order failed')
        })

        it('should throw BadRequestException when redirectUri is missing', async () => {
            mockedAxios.post
                .mockResolvedValueOnce({ data: { access_token: 'token' } })
                .mockResolvedValueOnce({
                    data: {
                        status: { statusCode: 'SUCCESS' },
                        redirectUri: null,
                    },
                })

            await expect(
                service.createPayment(100, 'user@test.pl'),
            ).rejects.toThrow(BadRequestException)
        })

        it('should return redirectUrl when payment is created', async () => {
            mockedAxios.post
                .mockResolvedValueOnce({ data: { access_token: 'token' } })
                .mockResolvedValueOnce({
                    data: {
                        status: { statusCode: 'SUCCESS' },
                        redirectUri: 'https://payu.pl/checkout/xyz',
                    },
                })

            const result = await service.createPayment(100, 'user@test.pl')

            expect(result).toEqual({
                redirectUrl: 'https://payu.pl/checkout/xyz',
            })
        })
    })
})
