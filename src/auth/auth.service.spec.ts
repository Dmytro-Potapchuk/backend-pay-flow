import { Test, TestingModule } from '@nestjs/testing'
import { UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { AuthService } from './auth.service'
import { UsersService } from '../users/users.service'
import * as bcrypt from 'bcrypt'

jest.mock('bcrypt', () => ({
    hash: jest.fn().mockResolvedValue('hashed_password'),
    compare: jest.fn(),
}))

describe('AuthService', () => {
    let service: AuthService
    let usersService: jest.Mocked<UsersService>
    let jwtService: jest.Mocked<JwtService>

    const mockUser = {
        _id: 'user123',
        login: 'jan',
        email: 'jan@test.pl',
        password: 'plain_password',
        role: 'user',
    }

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AuthService,
                {
                    provide: UsersService,
                    useValue: {
                        create: jest.fn(),
                        findByLogin: jest.fn(),
                    },
                },
                {
                    provide: JwtService,
                    useValue: {
                        sign: jest.fn().mockReturnValue('jwt_token_xyz'),
                    },
                },
            ],
        }).compile()

        service = module.get<AuthService>(AuthService)
        usersService = module.get(UsersService)
        jwtService = module.get(JwtService)
        jest.clearAllMocks()
    })

    describe('register', () => {
        it('should hash password and create user', async () => {
            const createData = {
                login: 'jan',
                email: 'jan@test.pl',
                password: 'hashed_password',
            }
            usersService.create.mockResolvedValue(mockUser as never)

            const result = await service.register({
                login: 'jan',
                email: 'jan@test.pl',
                password: 'secret123',
            })

            expect(bcrypt.hash).toHaveBeenCalledWith('secret123', 10)
            expect(usersService.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    login: 'jan',
                    email: 'jan@test.pl',
                    password: 'hashed_password',
                }),
            )
            expect(result).toEqual(mockUser)
        })
    })

    describe('login', () => {
        it('should return access_token when credentials are valid', async () => {
            usersService.findByLogin.mockResolvedValue(mockUser as never)
            ;(bcrypt.compare as jest.Mock).mockResolvedValue(true)

            const result = await service.login('jan', 'secret123')

            expect(usersService.findByLogin).toHaveBeenCalledWith('jan')
            expect(bcrypt.compare).toHaveBeenCalledWith('secret123', 'plain_password')
            expect(jwtService.sign).toHaveBeenCalledWith({
                userId: 'user123',
                login: 'jan',
                role: 'user',
            })
            expect(result).toEqual({ access_token: 'jwt_token_xyz' })
        })

        it('should throw UnauthorizedException when user not found', async () => {
            usersService.findByLogin.mockResolvedValue(null)

            await expect(service.login('unknown', 'pass')).rejects.toThrow(
                UnauthorizedException,
            )
            expect(bcrypt.compare).not.toHaveBeenCalled()
        })

        it('should throw UnauthorizedException when password is invalid', async () => {
            usersService.findByLogin.mockResolvedValue(mockUser as never)
            ;(bcrypt.compare as jest.Mock).mockResolvedValue(false)

            await expect(service.login('jan', 'wrong')).rejects.toThrow(
                UnauthorizedException,
            )
        })
    })
})
