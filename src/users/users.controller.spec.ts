import { Test, TestingModule } from '@nestjs/testing'
import { UsersController } from './users.controller'
import { UsersService } from './users.service'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { RolesGuard } from '../common/guards/roles.guard'

describe('UsersController', () => {
    let controller: UsersController
    let usersService: jest.Mocked<UsersService>

    const mockUser = {
        _id: 'user123',
        login: 'jan',
        email: 'jan@test.pl',
        balance: 1000,
        role: 'user',
    }

    const mockRequest = {
        user: { userId: 'user123', login: 'jan' },
    }

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [UsersController],
            providers: [
                {
                    provide: UsersService,
                    useValue: {
                        findById: jest.fn(),
                        findAll: jest.fn(),
                        updateBalance: jest.fn(),
                        updateRole: jest.fn(),
                    },
                },
            ],
        })
            .overrideGuard(JwtAuthGuard)
            .useValue({ canActivate: () => true })
            .overrideGuard(RolesGuard)
            .useValue({ canActivate: () => true })
            .compile()

        controller = module.get<UsersController>(UsersController)
        usersService = module.get(UsersService)
        jest.clearAllMocks()
    })

    it('should be defined', () => {
        expect(controller).toBeDefined()
    })

    describe('getProfile', () => {
        it('should return user profile for logged user', async () => {
            usersService.findById.mockResolvedValue(mockUser as never)

            const result = await controller.getProfile(mockRequest as never)

            expect(usersService.findById).toHaveBeenCalledWith('user123')
            expect(result).toEqual(mockUser)
        })
    })

    describe('findAll', () => {
        it('should return all users', async () => {
            usersService.findAll.mockResolvedValue([mockUser] as never)

            const result = await controller.findAll()

            expect(usersService.findAll).toHaveBeenCalled()
            expect(result).toEqual([mockUser])
        })
    })

    describe('updateBalance', () => {
        it('should update user balance', async () => {
            const updated = { ...mockUser, balance: 1500 }
            usersService.updateBalance.mockResolvedValue(updated as never)

            const result = await controller.updateBalance('user123', {
                balance: 1500,
            })

            expect(usersService.updateBalance).toHaveBeenCalledWith(
                'user123',
                1500,
            )
            expect(result.balance).toBe(1500)
        })
    })

    describe('updateRole', () => {
        it('should update user role', async () => {
            const updated = { ...mockUser, role: 'admin' }
            usersService.updateRole.mockResolvedValue(updated as never)

            const result = await controller.updateRole('user123', {
                role: 'admin',
            })

            expect(usersService.updateRole).toHaveBeenCalledWith(
                'user123',
                'admin',
            )
            expect(result.role).toBe('admin')
        })
    })
})
