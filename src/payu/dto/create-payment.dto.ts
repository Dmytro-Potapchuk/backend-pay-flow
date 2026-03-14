import { IsNumber, IsEmail, Min } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export class CreatePaymentDto {

    @ApiProperty({ example: 100 })
    @IsNumber()
    @Min(1)
    amount: number

    @ApiProperty({ example: 'user@example.com' })
    @IsEmail()
    email: string
}
