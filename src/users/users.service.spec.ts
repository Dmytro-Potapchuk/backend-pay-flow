import { Test, TestingModule } from '@nestjs/testing'
import { getModelToken } from '@nestjs/mongoose'
import { NotFoundException, BadRequestException } from '@nestjs/common'
import { UsersService } from './users.service'
import { User } from './schemas/user.schema'

describe('UsersService', () => {
    let service: UsersService
    let mockUserModel: any

    const mockUser = {
        _id: 'user123',
        login: 'jan',
        email: 'jan@test.pl',
        balance: 1000,
        balanceEur: 0,
        balanceUsd: 0,
        role: 'user',
    }

    beforeEach(async () => {
        mockUserModel = {
            findById: jest.fn(),
            findOne: jest.fn(),
            find: jest.fn(),
            findByIdAndUpdate: jest.fn(),
            findOneAndUpdate: jest.fn(),
        }

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                UsersService,
                {
                    provide: getModelToken(User.name),
                    useValue: mockUserModel,
                },
            ],
        }).compile()

        service = module.get<UsersService>(UsersService)
    })

    it('should be defined', () => {
        expect(service).toBeDefined()
    })

    describe('create', () => {
        it('should create and save user', async () => {
            const saveMock = jest.fn().mockResolvedValue(mockUser)

            const mockModel = jest.fn().mockImplementation(() => ({
                save: saveMock,
            }))

            service['userModel'] = mockModel as any

            const result = await service.create({
                login: 'jan',
                email: 'jan@test.pl',
                password: 'hashed',
            })

            expect(saveMock).toHaveBeenCalled()
            expect(result).toEqual(mockUser)
        })
    })

    describe('findByLogin', () => {
        it('should return user by login', async () => {
            mockUserModel.findOne.mockResolvedValue(mockUser)

            const result = await service.findByLogin('jan')

            expect(mockUserModel.findOne).toHaveBeenCalledWith({ login: 'jan' })
            expect(result).toEqual(mockUser)
        })

        it('should return null when user not found', async () => {
            mockUserModel.findOne.mockResolvedValue(null)

            const result = await service.findByLogin('unknown')

            expect(result).toBeNull()
        })
    })

    describe('findById', () => {
        it('should return user when found', async () => {
            const selectMock = jest.fn().mockResolvedValue(mockUser)

            mockUserModel.findById.mockReturnValue({
                select: selectMock,
            })

            const result = await service.findById('user123')

            expect(mockUserModel.findById).toHaveBeenCalledWith('user123')
            expect(selectMock).toHaveBeenCalledWith('-password')
            expect(result).toEqual(mockUser)
        })

        it('should throw NotFoundException when user not found', async () => {
            const selectMock = jest.fn().mockResolvedValue(null)

            mockUserModel.findById.mockReturnValue({
                select: selectMock,
            })

            await expect(service.findById('invalid')).rejects.toThrow(
                new NotFoundException('User not found'),
            )
        })
    })

    describe('findAll', () => {
        it('should return users without password', async () => {
            const selectMock = jest.fn().mockResolvedValue([mockUser])

            mockUserModel.find.mockReturnValue({
                select: selectMock,
            })

            const result = await service.findAll()

            expect(mockUserModel.find).toHaveBeenCalled()
            expect(selectMock).toHaveBeenCalledWith('-password')
            expect(result).toEqual([mockUser])
        })

        it('should return empty array when no users exist', async () => {
            const selectMock = jest.fn().mockResolvedValue([])

            mockUserModel.find.mockReturnValue({
                select: selectMock,
            })

            const result = await service.findAll()

            expect(result).toEqual([])
        })
    })

    describe('update', () => {
        it('should update user', async () => {
            const updatedUser = { ...mockUser, login: 'newLogin' }

            mockUserModel.findByIdAndUpdate.mockResolvedValue(updatedUser)

            const result = await service.update('user123', { login: 'newLogin' })

            expect(mockUserModel.findByIdAndUpdate).toHaveBeenCalled()
            expect(result.login).toBe('newLogin')
        })

        it('should throw NotFoundException if user not found', async () => {
            mockUserModel.findByIdAndUpdate.mockResolvedValue(null)

            await expect(
                service.update('invalid', { login: 'test' }),
            ).rejects.toThrow(NotFoundException)
        })
    })

    describe('updateBalance', () => {
        it('should throw NotFoundException when user not found', async () => {
            mockUserModel.findByIdAndUpdate.mockResolvedValue(null)

            await expect(
                service.updateBalance('invalid', 500),
            ).rejects.toThrow(NotFoundException)
        })

        it('should update balance when user exists', async () => {
            const updatedUser = { ...mockUser, balance: 500 }

            mockUserModel.findByIdAndUpdate.mockResolvedValue(updatedUser)

            const result = await service.updateBalance('user123', 500)

            expect(result.balance).toBe(500)
        })
    })

    describe('updateRole', () => {
        it('should update role', async () => {
            const updatedUser = { ...mockUser, role: 'admin' }

            mockUserModel.findByIdAndUpdate.mockResolvedValue(updatedUser)

            const result = await service.updateRole('user123', 'admin')

            expect(result.role).toBe('admin')
        })

        it('should throw NotFoundException if user not found', async () => {
            mockUserModel.findByIdAndUpdate.mockResolvedValue(null)

            await expect(
                service.updateRole('invalid', 'admin'),
            ).rejects.toThrow(NotFoundException)
        })
    })

    describe('debitPlnIfSufficient', () => {
        it('should debit only when the balance covers the amount', async () => {
            const updatedUser = { ...mockUser, balance: 900 }
            mockUserModel.findOneAndUpdate.mockReturnValue({
                select: jest.fn().mockResolvedValue(updatedUser),
            })

            const result = await service.debitPlnIfSufficient('user123', 100)

            expect(mockUserModel.findOneAndUpdate).toHaveBeenCalledWith(
                { _id: 'user123', balance: { $gte: 100 } },
                { $inc: { balance: -100 } },
                { new: true },
            )
            expect(result).toEqual({ ok: true, user: updatedUser })
        })

        it('should report insufficient funds without changing the balance', async () => {
            mockUserModel.findOneAndUpdate.mockReturnValue({
                select: jest.fn().mockResolvedValue(null),
            })
            mockUserModel.findById.mockReturnValue({
                select: jest.fn().mockResolvedValue({ _id: 'user123' }),
            })

            await expect(service.debitPlnIfSufficient('user123', 100)).resolves.toEqual({
                ok: false,
                reason: 'insufficient',
            })
        })
    })

    describe('exchangePlnForCurrency', () => {
        it('should move PLN and foreign currency in one update', async () => {
            const updatedUser = { ...mockUser, balance: 900, balanceEur: 23.2 }
            mockUserModel.findOneAndUpdate.mockReturnValue({
                select: jest.fn().mockResolvedValue(updatedUser),
            })

            const result = await service.exchangePlnForCurrency(
                'user123',
                100,
                'EUR',
                23.2,
            )

            expect(mockUserModel.findOneAndUpdate).toHaveBeenCalledWith(
                { _id: 'user123', balance: { $gte: 100 } },
                { $inc: { balance: -100, balanceEur: 23.2 } },
                { new: true },
            )
            expect(result).toBe(updatedUser)
        })

        it('should throw when PLN balance is too low', async () => {
            mockUserModel.findOneAndUpdate.mockReturnValue({
                select: jest.fn().mockResolvedValue(null),
            })
            mockUserModel.findById.mockReturnValue({
                select: jest.fn().mockResolvedValue({ _id: 'user123' }),
            })

            await expect(
                service.exchangePlnForCurrency('user123', 100, 'USD', 25),
            ).rejects.toBeInstanceOf(BadRequestException)
        })
    })

    describe('deductPln', () => {
        it('should throw NotFoundException when user not found', async () => {
            mockUserModel.findById.mockResolvedValue(null)

            await expect(service.deductPln('invalid', 100)).rejects.toThrow(
                NotFoundException,
            )
        })

        it('should throw BadRequestException when insufficient balance', async () => {
            mockUserModel.findById.mockResolvedValue({
                ...mockUser,
                balance: 50,
            })

            await expect(service.deductPln('user123', 100)).rejects.toThrow(
                new BadRequestException('Insufficient PLN balance'),
            )
        })

        it('should deduct PLN when balance is sufficient', async () => {
            mockUserModel.findById.mockResolvedValue(mockUser)

            const updatedUser = { ...mockUser, balance: 900 }

            mockUserModel.findByIdAndUpdate.mockReturnValue({
                select: jest.fn().mockResolvedValue(updatedUser),
            })

            const result = await service.deductPln('user123', 100)

            expect(result?.balance).toBe(900)
        })
    })

    describe('addBalanceEur', () => {
        it('should add EUR balance', async () => {
            const updatedUser = { ...mockUser, balanceEur: 100 }

            mockUserModel.findByIdAndUpdate.mockReturnValue({
                select: jest.fn().mockResolvedValue(updatedUser),
            })

            const result = await service.addBalanceEur('user123', 100)

            expect(result.balanceEur).toBe(100)
        })

        it('should throw NotFoundException when user not found', async () => {
            mockUserModel.findByIdAndUpdate.mockReturnValue({
                select: jest.fn().mockResolvedValue(null),
            })

            await expect(
                service.addBalanceEur('invalid', 100),
            ).rejects.toThrow(NotFoundException)
        })
    })

    describe('addBalanceUsd', () => {
        it('should add USD balance', async () => {
            const updatedUser = { ...mockUser, balanceUsd: 50 }

            mockUserModel.findByIdAndUpdate.mockReturnValue({
                select: jest.fn().mockResolvedValue(updatedUser),
            })

            const result = await service.addBalanceUsd('user123', 50)

            expect(result.balanceUsd).toBe(50)
        })

        it('should throw NotFoundException when user not found', async () => {
            mockUserModel.findByIdAndUpdate.mockReturnValue({
                select: jest.fn().mockResolvedValue(null),
            })

            await expect(
                service.addBalanceUsd('invalid', 50),
            ).rejects.toThrow(NotFoundException)
        })
    })
})