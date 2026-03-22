import { Injectable } from '@nestjs/common'
import * as client from 'prom-client'

@Injectable()
export class MetricsService {
    private readonly register = new client.Registry()

    // 📊 HTTP metrics
    readonly httpRequestsTotal: client.Counter<string>
    readonly httpRequestDuration: client.Histogram<string>
    readonly httpErrorsTotal: client.Counter<string>

    constructor() {
        // Use a dedicated registry so metrics stay isolated from prom-client's
        // global registry and do not collide during reloads/tests.
        client.collectDefaultMetrics({
            register: this.register,
            prefix: 'app_',
        })

        this.httpRequestsTotal = new client.Counter({
            name: 'app_http_requests_total',
            help: 'Total number of HTTP requests',
            labelNames: ['method', 'route', 'status'],
            registers: [this.register],
        })

        this.httpRequestDuration = new client.Histogram({
            name: 'app_http_request_duration_seconds',
            help: 'HTTP request duration in seconds',
            labelNames: ['method', 'route', 'status'],
            buckets: [0.1, 0.3, 0.5, 1, 2, 5],
            registers: [this.register],
        })

        this.httpErrorsTotal = new client.Counter({
            name: 'app_http_errors_total',
            help: 'Total number of HTTP 5xx errors',
            labelNames: ['method', 'route', 'status'],
            registers: [this.register],
        })
    }

    async getMetrics(): Promise<string> {
        return this.register.metrics()
    }

    getContentType(): string {
        return this.register.contentType
    }

    getRegister(): client.Registry {
        return this.register
    }
}