import { Test, TestingModule } from '@nestjs/testing'
import { PayuController } from './payu.controller'
import { PayuService } from './payu.service'

describe('PayuController', () => {
    let controller: PayuController
    let payuService: jest.Mocked<PayuService>

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [PayuController],
            providers: [
                {
                    provide: PayuService,
                    useValue: {
                        createPayment: jest.fn(),
                        handleNotification: jest.fn(),
                        confirmPayment: jest.fn(),
                    },
                },
            ],
        }).compile()

        controller = module.get<PayuController>(PayuController)
        payuService = module.get(PayuService)
        jest.clearAllMocks()
    })

    it('should be defined', () => {
        expect(controller).toBeDefined()
    })

    describe('createPayment', () => {
        it('should call createPayment with current user and request urls', async () => {
            const dto = { amount: 100, email: 'user@test.pl' }
            const req = {
                user: { userId: 'user123', login: 'jan' },
                get: jest.fn().mockReturnValue('api.payflow.waw.pl'),
                headers: {},
                protocol: 'https',
            } as never
            payuService.createPayment.mockResolvedValue({
                redirectUrl: 'https://payu.pl/checkout/xyz',
                externalOrderId: 'PAYFLOW-123',
            } as never)

            const result = await controller.createPayment(dto, req)

            expect(payuService.createPayment).toHaveBeenCalledWith(
                'user123',
                'jan',
                100,
                'user@test.pl',
                {
                    backendBaseUrl: 'https://api.payflow.waw.pl',
                    frontendBaseUrl: 'https://api.payflow.waw.pl',
                    continueUrl: undefined,
                },
            )
            expect(result).toEqual({
                redirectUrl: 'https://payu.pl/checkout/xyz',
                externalOrderId: 'PAYFLOW-123',
            })
        })
    })

    describe('handleNotify', () => {
        it('should delegate PayU notification payload', async () => {
            const payload = { order: { extOrderId: 'PAYFLOW-123' } }
            payuService.handleNotification.mockResolvedValue({
                received: true,
            } as never)

            const result = await controller.handleNotify(payload)

            expect(payuService.handleNotification).toHaveBeenCalledWith(payload)
            expect(result).toEqual({ received: true })
        })
    })

    describe('confirmPayment', () => {
        it('should confirm current user payment', async () => {
            const req = { user: { userId: 'user123' } } as never
            payuService.confirmPayment.mockResolvedValue({
                status: 'COMPLETED',
                balanceApplied: true,
            } as never)

            const result = await controller.confirmPayment('PAYFLOW-123', req)

            expect(payuService.confirmPayment).toHaveBeenCalledWith(
                'user123',
                'PAYFLOW-123',
            )
            expect(result).toEqual({
                status: 'COMPLETED',
                balanceApplied: true,
            })
        })
    })
})
