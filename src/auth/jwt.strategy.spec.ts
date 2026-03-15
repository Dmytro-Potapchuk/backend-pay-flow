import { Test, TestingModule } from '@nestjs/testing'
import { JwtStrategy } from './jwt.strategy'
import { ConfigService } from '@nestjs/config'
import { JwtPayload } from '../common/interfaces/jwt-payload.interface'

describe('JwtStrategy', () => {
    let strategy: JwtStrategy

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
            ],
        }).compile()

        strategy = module.get<JwtStrategy>(JwtStrategy)
    })

    it('should be defined', () => {
        expect(strategy).toBeDefined()
    })

    it('should return payload from validate()', () => {
        const payload: JwtPayload = {
            userId: '1',
            login: 'testUser',
        }

        const result = strategy.validate(payload)

        expect(result).toEqual(payload)
    })

    it('should return payload with role', () => {
        const payload: JwtPayload & { role: string } = {
            userId: '1',
            login: 'adminUser',
            role: 'admin',
        }

        const result = strategy.validate(payload)

        expect(result.role).toBe('admin')
        expect(result).toEqual(payload)
    })
})