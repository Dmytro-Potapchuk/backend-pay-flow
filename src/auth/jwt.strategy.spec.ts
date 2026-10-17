import { Test, TestingModule } from '@nestjs/testing'
import { NotFoundException, UnauthorizedException } from '@nestjs/common'
import { JwtStrategy } from './jwt.strategy'
import { ConfigService } from '@nestjs/config'
import { UsersService } from '../users/users.service'
import { JwtPayload } from '../common/interfaces/jwt-payload.interface'

describe('JwtStrategy', () => {
    let strategy: JwtStrategy
    let usersService: jest.Mocked<UsersService>

    const mockConfigService = {
        get: jest.fn().mockReturnValue('test-secret'),
    }

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                JwtStrategy,
                {
                    provide: ConfigService,
                    useValue: mockConfigService,
                },
                {
                    provide: UsersService,
                    useValue: {
                        findById: jest.fn(),
                    },
                },
            ],
        }).compile()

        strategy = module.get<JwtStrategy>(JwtStrategy)
        usersService = module.get(UsersService)
        jest.clearAllMocks()
    })

    it('should be defined', () => {
        expect(strategy).toBeDefined()
    })

    it('should use the role stored in the database', async () => {
        const payload: JwtPayload = {
            userId: '1',
            login: 'stale-login',
            role: 'admin',
        }
        usersService.findById.mockResolvedValue({
            _id: '1',
            login: 'testUser',
            role: 'user',
        } as never)

        const result = await strategy.validate(payload)

        expect(usersService.findById).toHaveBeenCalledWith('1')
        expect(result).toEqual({
            userId: '1',
            login: 'testUser',
            role: 'user',
        })
    })

    it('should reject a token when the user no longer exists', async () => {
        usersService.findById.mockRejectedValue(new NotFoundException('User not found'))

        await expect(
            strategy.validate({ userId: 'missing', login: 'ghost' }),
        ).rejects.toBeInstanceOf(UnauthorizedException)
    })
})
