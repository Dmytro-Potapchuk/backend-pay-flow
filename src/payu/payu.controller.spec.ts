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
        it('should call createPayment with amount and email', async () => {
            const dto = { amount: 100, email: 'user@test.pl' }
            payuService.createPayment.mockResolvedValue({
                redirectUrl: 'https://payu.pl/checkout/xyz',
            } as never)

            const result = await controller.createPayment(dto)

            expect(payuService.createPayment).toHaveBeenCalledWith(100, 'user@test.pl')
            expect(result).toEqual({
                redirectUrl: 'https://payu.pl/checkout/xyz',
            })
        })
    })
})
