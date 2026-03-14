import { IsNumber, IsString, Min } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export class CreateTransferDto {

    @ApiProperty({ example: 'odbiorca123', description: 'Login odbiorcy' })
    @IsString()
    receiverAccount: string

    @ApiProperty({ example: 100, minimum: 1 })
    @IsNumber()
    @Min(1)
    amount: number
}