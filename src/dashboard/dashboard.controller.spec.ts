import { Test, TestingModule } from '@nestjs/testing'
import { DashboardController } from './dashboard.controller'
import { DashboardService } from './dashboard.service'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'

describe('DashboardController', () => {
    let controller: DashboardController
    let dashboardService: jest.Mocked<DashboardService>

    const mockDashboard = {
        balance: 1000,
        balanceEur: 50,
        balanceUsd: 25,
        recentTransactions: [],
        unreadMessages: 2,
    }

    const mockRequest = { user: { userId: 'user123' } }

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [DashboardController],
            providers: [
                {
                    provide: DashboardService,
                    useValue: {
                        getDashboard: jest.fn(),
                    },
                },
            ],
        })
            .overrideGuard(JwtAuthGuard)
            .useValue({ canActivate: () => true })
            .compile()

        controller = module.get<DashboardController>(DashboardController)
        dashboardService = module.get(DashboardService)
        jest.clearAllMocks()
    })

    it('should be defined', () => {
        expect(controller).toBeDefined()
    })

    describe('getDashboard', () => {
        it('should return dashboard data for user', async () => {
            dashboardService.getDashboard.mockResolvedValue(
                mockDashboard as never,
            )

            const result = await controller.getDashboard(mockRequest as never)

            expect(dashboardService.getDashboard).toHaveBeenCalledWith(
                'user123',
            )
            expect(result).toEqual(mockDashboard)
        })
    })
})
