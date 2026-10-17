import {
    CanActivate,
    ExecutionContext,
    HttpException,
    HttpStatus,
    Injectable,
} from '@nestjs/common'

const WINDOW_MS = 15 * 60 * 1000
const MAX_ATTEMPTS = 10

@Injectable()
export class AuthRateLimitGuard implements CanActivate {
    private readonly attempts = new Map<string, number[]>()

    canActivate(context: ExecutionContext): boolean {
        const request = context.switchToHttp().getRequest<{
            ip?: string
            path?: string
            socket?: { remoteAddress?: string }
        }>()
        const ip = request.ip || request.socket?.remoteAddress || 'unknown'
        const key = `${ip}:${request.path ?? 'auth'}`
        const now = Date.now()
        const recent = (this.attempts.get(key) ?? []).filter(
            (timestamp) => now - timestamp < WINDOW_MS,
        )

        if (recent.length >= MAX_ATTEMPTS) {
            throw new HttpException(
                'Zbyt wiele prób. Spróbuj ponownie później.',
                HttpStatus.TOO_MANY_REQUESTS,
            )
        }

        recent.push(now)
        this.attempts.set(key, recent)

        if (this.attempts.size > 5000) {
            const oldestKey = this.attempts.keys().next().value
            if (oldestKey) {
                this.attempts.delete(oldestKey)
            }
        }

        return true
    }
}
