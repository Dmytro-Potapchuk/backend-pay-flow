import {
    CanActivate,
    ExecutionContext,
    Injectable,
    UnauthorizedException,
} from '@nestjs/common'
import { timingSafeEqual } from 'crypto'

@Injectable()
export class MetricsAuthGuard implements CanActivate {
    canActivate(context: ExecutionContext): boolean {
        const expected = process.env.METRICS_TOKEN
        if (!expected) {
            throw new UnauthorizedException()
        }

        const request = context.switchToHttp().getRequest<{
            headers: { authorization?: string }
        }>()
        const provided = (request.headers.authorization ?? '').replace(/^Bearer\s+/i, '')

        if (!provided || provided.length !== expected.length) {
            throw new UnauthorizedException()
        }

        const matches = timingSafeEqual(Buffer.from(provided), Buffer.from(expected))
        if (!matches) {
            throw new UnauthorizedException()
        }

        return true
    }
}
