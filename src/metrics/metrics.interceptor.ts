import {
    Injectable,
    NestInterceptor,
    ExecutionContext,
    CallHandler,
} from '@nestjs/common'
import { Observable } from 'rxjs'
import { catchError, finalize } from 'rxjs/operators'
import { MetricsService } from './metrics.service'

@Injectable()
export class MetricsInterceptor implements NestInterceptor {
    constructor(private readonly metricsService: MetricsService) {}

    intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
        if (context.getType() !== 'http') {
            return next.handle()
        }

        const now = Date.now()

        const http = context.switchToHttp()
        const request = http.getRequest()
        const response = http.getResponse()

        const method = request.method
        const path = request.path || request.originalUrl || ''

        if (
            path.startsWith('/api') ||
            path.startsWith('/docs') ||
            path.startsWith('/metrics')
        ) {
            return next.handle()
        }

        let statusCode = response.statusCode
        let route = request.route?.path || path || 'unknown_route'

        return next.handle().pipe(
            catchError((error: unknown) => {
                statusCode =
                    typeof (error as { getStatus?: () => number })?.getStatus ===
                    "function"
                        ? (error as { getStatus: () => number }).getStatus()
                        : ((error as { status?: number })?.status ?? 500)

                throw error
            }),
            finalize(() => {
                route = request.route?.path || route
                const duration = (Date.now() - now) / 1000
                const status = statusCode || response.statusCode || 500

                const labels = {
                    method,
                    route,
                    status: status.toString(),
                }

                this.metricsService.httpRequestsTotal.inc(labels)
                this.metricsService.httpRequestDuration.observe(labels, duration)

                if (status >= 500) {
                    this.metricsService.httpErrorsTotal.inc(labels)
                }
            }),
        )
    }
}