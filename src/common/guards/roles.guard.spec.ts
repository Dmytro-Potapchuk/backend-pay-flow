import { RolesGuard } from './roles.guard'
import { Reflector } from '@nestjs/core'
import { ExecutionContext } from '@nestjs/common'

describe('RolesGuard', () => {
    let guard: RolesGuard
    let reflector: Reflector

    const mockReflector = {
        get: jest.fn(),
    }

    const mockExecutionContext = (userRole?: string): ExecutionContext =>
        ({
            switchToHttp: () => ({
                getRequest: () => ({
                    user: { role: userRole },
                }),
            }),
            getHandler: jest.fn(),
        }) as unknown as ExecutionContext

    beforeEach(() => {
        reflector = mockReflector as unknown as Reflector
        guard = new RolesGuard(reflector)
    })

    it('should allow access when no roles are required', () => {
        mockReflector.get.mockReturnValue(undefined)

        const context = mockExecutionContext()

        const result = guard.canActivate(context)

        expect(result).toBe(true)
    })

    it('should allow access when user has required role', () => {
        mockReflector.get.mockReturnValue(['admin'])

        const context = mockExecutionContext('admin')

        const result = guard.canActivate(context)

        expect(result).toBe(true)
    })

    it('should deny access when user does not have required role', () => {
        mockReflector.get.mockReturnValue(['admin'])

        const context = mockExecutionContext('user')

        const result = guard.canActivate(context)

        expect(result).toBe(false)
    })
})