import { Injectable, BadRequestException } from '@nestjs/common'
import axios from 'axios'

@Injectable()
export class PayuService {

    private api = process.env.PAYU_API
    private clientId = process.env.PAYU_CLIENT_ID
    private clientSecret = process.env.PAYU_CLIENT_SECRET
    private posId = process.env.PAYU_POS_ID

    async getToken() {

        const response = await axios.post(
            `${this.api}/pl/standard/user/oauth/authorize`,
            `grant_type=client_credentials&client_id=${this.clientId}&client_secret=${this.clientSecret}`,
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Accept': 'application/json'
                }
            }
        )

        return response.data.access_token
    }

    async createPayment(amount: number, email: string) {

        const token = await this.getToken()

        const order = {
            notifyUrl: "http://localhost:3000/payu/notify",
            customerIp: "127.0.0.1",
            merchantPosId: this.posId,
            description: "PayFlow payment",
            currencyCode: "PLN",
            totalAmount: amount * 100,
            buyer: {
                email
            },
            products: [
                {
                    name: "Transfer",
                    unitPrice: amount * 100,
                    quantity: "1"
                }
            ]
        }

        const response = await axios.post(
            `${this.api}/api/v2_1/orders`,
            order,
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                }
            }
        )

        const data = response.data

        // Log całej odpowiedzi z PayU do debugowania
        // (zobaczysz ją w logach NestJS)
        console.log('PayU order response:', JSON.stringify(data, null, 2))

        if (!data?.status || data.status.statusCode !== 'SUCCESS') {
            // Przekazujemy dalej całą odpowiedź PayU,
            // żeby frontend dostał pełny opis błędu
            throw new BadRequestException({
                message: 'PayU order failed',
                payu: data,
            })
        }

        if (!data.redirectUri) {
            throw new BadRequestException({
                message: 'PayU response missing redirectUri',
                payu: data,
            })
        }

        return {
            redirectUrl: data.redirectUri,
        }
    }

}