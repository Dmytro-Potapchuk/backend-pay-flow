import { BadRequestException, ForbiddenException, Injectable, Logger } from '@nestjs/common'
import axios from 'axios'
import { TransactionsService } from '../transactions/transactions.service'

@Injectable()
export class PayuService {
    private readonly logger = new Logger(PayuService.name)

    private api = process.env.PAYU_API
    private clientId = process.env.PAYU_CLIENT_ID
    private clientSecret = process.env.PAYU_CLIENT_SECRET
    private posId = process.env.PAYU_POS_ID

    constructor(private transactionsService: TransactionsService) {}

    private extractOrder(payload: unknown) {
        if (!payload || typeof payload !== 'object' || !('order' in payload)) {
            return null
        }

        const order = payload.order
        if (!order || typeof order !== 'object') {
            return null
        }

        return order as {
            orderId?: string
            extOrderId?: string
            status?: string
        }
    }

    private appendExternalOrderId(baseUrl: string, externalOrderId: string) {
        try {
            if (baseUrl.startsWith('http://') || baseUrl.startsWith('https://')) {
                const url = new URL(baseUrl)
                url.searchParams.set('extOrderId', externalOrderId)
                return url.toString()
            }

            const separator = baseUrl.includes('?') ? '&' : '?'
            return `${baseUrl}${separator}extOrderId=${encodeURIComponent(externalOrderId)}`
        } catch {
            const separator = baseUrl.includes('?') ? '&' : '?'
            return `${baseUrl}${separator}extOrderId=${encodeURIComponent(externalOrderId)}`
        }
    }

    private async getOrderDetails(orderId: string) {
        const token = await this.getToken()

        const response = await axios.get(`${this.api}/api/v2_1/orders/${orderId}`, {
            headers: {
                Authorization: `Bearer ${token}`,
                Accept: 'application/json',
            },
            validateStatus: (status) => status >= 200 && status < 500,
        })

        return response.data as {
            status?: { statusCode?: string }
            orders?: Array<{ status?: string }>
            orderId?: string
        }
    }

    async getToken() {
        try {
            const response = await axios.post(
                `${this.api}/pl/standard/user/oauth/authorize`,
                `grant_type=client_credentials&client_id=${this.clientId}&client_secret=${this.clientSecret}`,
                {
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                        Accept: 'application/json',
                    },
                },
            )

            if (!response.data?.access_token) {
                throw new BadRequestException('PayU token missing in response')
            }

            return response.data.access_token as string
        } catch (error) {
            const axiosError = error as {
                response?: { status?: number; data?: unknown }
                message?: string
            }

            this.logger.error(
                `PayU token error: ${axiosError.message ?? 'unknown error'}`,
            )

            throw new BadRequestException({
                message: 'PayU authorization failed',
                status: axiosError.response?.status,
                payu: axiosError.response?.data ?? null,
            })
        }
    }

    async createPayment(
        userId: string,
        userLogin: string,
        amount: number,
        email: string,
        urls?: {
            backendBaseUrl?: string
            frontendBaseUrl?: string
            continueUrl?: string
        },
    ) {
        const token = await this.getToken()
        const pendingTopUp = await this.transactionsService.createPendingPayuTopUp(
            userId,
            userLogin,
            amount,
        )
        const externalOrderId = pendingTopUp.externalOrderId ?? ''
        const normalizedAmount = String(Math.round(amount * 100))
        const backendBaseUrl =
            process.env.BACKEND_PUBLIC_URL ||
            urls?.backendBaseUrl ||
            'http://localhost:3000'
        const frontendBaseUrl =
            process.env.FRONTEND_PUBLIC_URL ||
            urls?.frontendBaseUrl ||
            'http://localhost'
        const continueUrlBase =
            urls?.continueUrl ||
            process.env.PAYU_CONTINUE_URL ||
            `${frontendBaseUrl}/payu-result`
        const continueUrl = this.appendExternalOrderId(
            continueUrlBase,
            externalOrderId,
        )

        const order = {
            notifyUrl: process.env.PAYU_NOTIFY_URL || `${backendBaseUrl}/payu/notify`,
            continueUrl,
            customerIp: '127.0.0.1',
            merchantPosId: this.posId,
            description: 'PayFlow payment',
            currencyCode: 'PLN',
            totalAmount: normalizedAmount,
            extOrderId: externalOrderId,
            buyer: {
                email,
                firstName: 'Test',
                lastName: 'User',
                language: 'pl',
            },
            products: [
                {
                    name: 'PayFlow top-up',
                    unitPrice: normalizedAmount,
                    quantity: '1',
                },
            ],
        }

        try {
            const response = await axios.post(`${this.api}/api/v2_1/orders`, order, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                },
                maxRedirects: 0,
                validateStatus: (status) => status >= 200 && status < 400,
            })

            const data = response.data
            const redirectUrl =
                (typeof data === 'object' &&
                    data &&
                    'redirectUri' in data &&
                    typeof data.redirectUri === 'string' &&
                    data.redirectUri) ||
                (typeof response.headers?.location === 'string'
                    ? response.headers.location
                    : undefined)
            const providerOrderId =
                typeof data === 'object' &&
                data &&
                'orderId' in data &&
                typeof data.orderId === 'string'
                    ? data.orderId
                    : undefined

            this.logger.log(
                `PayU order status: ${response.status}, redirect: ${redirectUrl ?? 'missing'}`,
            )

            if (externalOrderId) {
                await this.transactionsService.attachPayuOrderIds(
                    externalOrderId,
                    providerOrderId,
                )
            }

            if (!redirectUrl) {
                throw new BadRequestException({
                    message: 'PayU response missing redirectUri',
                    payu: data ?? null,
                })
            }

            return {
                redirectUrl,
                externalOrderId,
            }
        } catch (error) {
            if (error instanceof BadRequestException) {
                if (externalOrderId) {
                    await this.transactionsService.markPayuTopUpStatus(
                        externalOrderId,
                        'failed',
                    )
                }
                throw error
            }

            const axiosError = error as {
                response?: { status?: number; data?: unknown }
                message?: string
            }

            this.logger.error(
                `PayU order error: ${axiosError.message ?? 'unknown error'}`,
            )

            if (externalOrderId) {
                await this.transactionsService.markPayuTopUpStatus(
                    externalOrderId,
                    'failed',
                )
            }

            throw new BadRequestException({
                message: 'PayU order failed',
                status: axiosError.response?.status,
                payu: axiosError.response?.data ?? null,
            })
        }
    }

    async handleNotification(payload: unknown) {
        const order = this.extractOrder(payload)

        if (!order?.extOrderId) {
            return {
                received: true,
                ignored: true,
            }
        }

        const status = order.status?.toUpperCase() ?? 'UNKNOWN'

        if (status === 'COMPLETED') {
            await this.transactionsService.completePayuTopUp(
                order.extOrderId,
                order.orderId,
            )
        } else if (status === 'CANCELED') {
            await this.transactionsService.markPayuTopUpStatus(
                order.extOrderId,
                'canceled',
                order.orderId,
            )
        } else {
            await this.transactionsService.markPayuTopUpStatus(
                order.extOrderId,
                'pending',
                order.orderId,
            )
        }

        return {
            received: true,
            status,
            extOrderId: order.extOrderId,
        }
    }

    async confirmPayment(userId: string, externalOrderId: string) {
        const transaction = await this.transactionsService.findPayuTopUpForUser(
            userId,
            externalOrderId,
        )

        if (!transaction) {
            throw new ForbiddenException('Payment not found')
        }

        if (transaction.status === 'completed') {
            return {
                status: 'COMPLETED',
                externalOrderId,
                balanceApplied: true,
            }
        }

        if (!transaction.providerOrderId) {
            return {
                status: transaction.status?.toUpperCase() ?? 'PENDING',
                externalOrderId,
                balanceApplied: false,
            }
        }

        const orderDetails = await this.getOrderDetails(transaction.providerOrderId)
        const orderStatus =
            orderDetails.orders?.[0]?.status ||
            orderDetails.status?.statusCode ||
            transaction.status

        const normalizedStatus = String(orderStatus ?? 'PENDING').toUpperCase()

        if (normalizedStatus === 'COMPLETED' || normalizedStatus === 'SUCCESS') {
            await this.transactionsService.completePayuTopUp(
                externalOrderId,
                transaction.providerOrderId,
            )

            return {
                status: 'COMPLETED',
                externalOrderId,
                balanceApplied: true,
            }
        }

        if (normalizedStatus === 'CANCELED') {
            await this.transactionsService.markPayuTopUpStatus(
                externalOrderId,
                'canceled',
                transaction.providerOrderId,
            )
        }

        return {
            status: normalizedStatus,
            externalOrderId,
            balanceApplied: false,
        }
    }
}