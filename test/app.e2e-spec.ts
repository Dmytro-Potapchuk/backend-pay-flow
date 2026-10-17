import { INestApplication, ValidationPipe } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import request from 'supertest'
import { App } from 'supertest/types'
import { AuthController } from '../src/auth/auth.controller'
import { AuthRateLimitGuard } from '../src/auth/auth-rate-limit.guard'
import { AuthService } from '../src/auth/auth.service'
import { MetricsController } from '../src/metrics/metrics.controller'
import { MetricsAuthGuard } from '../src/metrics/metrics-auth.guard'
import { MetricsService } from '../src/metrics/metrics.service'
import { PayuController } from '../src/payu/payu.controller'
import { PayuService } from '../src/payu/payu.service'
import { TransactionsService } from '../src/transactions/transactions.service'
import { UsersService } from '../src/users/users.service'
import { createHash } from 'crypto'

describe('Money and access HTTP paths (e2e)', () => {
    let app: INestApplication<App>
    const authService = {
        register: jest.fn().mockResolvedValue({ login: 'jan' }),
        login: jest.fn().mockResolvedValue({ access_token: 'token' }),
    }

    beforeAll(async () => {
        process.env.METRICS_TOKEN = 'metrics-secret'
        process.env.PAYU_SECOND_KEY = 'second-key'
        process.env.PAYU_API = 'https://secure.snd.payu.com'

        const moduleFixture: TestingModule = await Test.createTestingModule({
            controllers: [AuthController, MetricsController, PayuController],
            providers: [
                AuthRateLimitGuard,
                MetricsAuthGuard,
                PayuService,
                { provide: AuthService, useValue: authService },
                {
                    provide: MetricsService,
                    useValue: {
                        getMetrics: jest.fn().mockResolvedValue('metric 1\n'),
                        getContentType: jest.fn().mockReturnValue('text/plain'),
                    },
                },
                { provide: TransactionsService, useValue: {} },
                {
                    provide: UsersService,
                    useValue: { findById: jest.fn() },
                },
            ],
        }).compile()

        app = moduleFixture.createNestApplication({ rawBody: true })
        app.useGlobalPipes(new ValidationPipe({
            whitelist: true,
            forbidNonWhitelisted: true,
            transform: true,
        }))
        await app.init()
    })

    afterAll(async () => {
        await app.close()
    })

    it('rejects a weak password and an unknown register field', async () => {
        await request(app.getHttpServer())
            .post('/auth/register')
            .send({
                login: 'jan',
                email: 'jan@test.pl',
                password: 'aaaaaa',
            })
            .expect(400)

        await request(app.getHttpServer())
            .post('/auth/register')
            .send({
                login: 'jan',
                email: 'jan@test.pl',
                password: 'haslo123',
                role: 'admin',
            })
            .expect(400)

        expect(authService.register).not.toHaveBeenCalled()
    })

    it('limits repeated login attempts', async () => {
        for (let attempt = 0; attempt < 10; attempt += 1) {
            await request(app.getHttpServer())
                .post('/auth/login')
                .send({ login: 'jan', password: 'haslo123' })
                .expect(201)
        }

        await request(app.getHttpServer())
            .post('/auth/login')
            .send({ login: 'jan', password: 'haslo123' })
            .expect(429)
    })

    it('hides metrics unless the metrics token matches', async () => {
        await request(app.getHttpServer()).get('/metrics').expect(401)
        await request(app.getHttpServer())
            .get('/metrics')
            .set('Authorization', 'Bearer wrong-token')
            .expect(401)
        await request(app.getHttpServer())
            .get('/metrics')
            .set('Authorization', 'Bearer metrics-secret')
            .expect(200)
    })

    it('rejects a PayU notification without a valid signature', async () => {
        await request(app.getHttpServer())
            .post('/payu/notify')
            .send({ order: { extOrderId: 'PAYFLOW-1', status: 'COMPLETED' } })
            .expect(401)
    })

    it('accepts a signed PayU notification body', async () => {
        const rawBody = JSON.stringify({ order: { status: 'PENDING' } })
        const signature = createHash('md5')
            .update(rawBody)
            .update('second-key')
            .digest('hex')

        const response = await request(app.getHttpServer())
            .post('/payu/notify')
            .set('Content-Type', 'application/json')
            .set(
                'OpenPayu-Signature',
                `sender=checkout;signature=${signature};algorithm=MD5;content=DOCUMENT`,
            )
            .send(rawBody)
            .expect(200)

        expect(response.body).toEqual({
            received: true,
            ignored: true,
        })
    })
})
