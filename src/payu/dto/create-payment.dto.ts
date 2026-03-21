import { IsEmail, IsNumber, IsOptional, IsString, Min } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export class CreatePaymentDto {

    @ApiProperty({ example: 100 })
    @IsNumber()
    @Min(1)
    amount: number

    @ApiProperty({ example: 'user@example.com' })
    @IsEmail()
    email: string

    @ApiProperty({
        example: 'payflow://payu-result',
        required: false,
        description: 'Optional return URL for native app builds',
    })
    @IsOptional()
    @IsString()
    continueUrl?: string
}
