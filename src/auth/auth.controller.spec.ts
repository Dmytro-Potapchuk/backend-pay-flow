import { Test, TestingModule } from '@nestjs/testing'
import { AuthController } from './auth.controller'
import { AuthService } from './auth.service'

describe('AuthController', () => {
    let controller: AuthController
    let authService: jest.Mocked<AuthService>

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [AuthController],
            providers: [
                {
                    provide: AuthService,
                    useValue: {
                        register: jest.fn(),
                        login: jest.fn(),
                    },
                },
            ],
        }).compile()

        controller = module.get<AuthController>(AuthController)
        authService = module.get(AuthService)
        jest.clearAllMocks()
    })

    it('should be defined', () => {
        expect(controller).toBeDefined()
    })

    describe('register', () => {
        it('should call authService.register with dto', async () => {
            const dto = { login: 'jan', email: 'jan@test.pl', password: 'secret' }
            const user = { _id: '1', login: 'jan', email: 'jan@test.pl' }
            authService.register.mockResolvedValue(user as never)

            const result = await controller.register(dto)

            expect(authService.register).toHaveBeenCalledWith(dto)
            expect(result).toEqual(user)
        })
    })

    describe('login', () => {
        it('should call authService.login and return access_token', async () => {
            const dto = { login: 'jan', password: 'secret' }
            authService.login.mockResolvedValue({ access_token: 'jwt_xyz' })

            const result = await controller.login(dto)

            expect(authService.login).toHaveBeenCalledWith('jan', 'secret')
            expect(result).toEqual({ access_token: 'jwt_xyz' })
        })
    })
})
