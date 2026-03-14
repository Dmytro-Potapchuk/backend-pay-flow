import { IsNumber } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export class UpdateBalanceDto {

    @ApiProperty({ example: 1500 })
    @IsNumber()
    balance: number

}