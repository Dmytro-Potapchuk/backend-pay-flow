import { IsNumber, Max, Min } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export class UpdateBalanceDto {

    @ApiProperty({ example: 1500, minimum: 0, maximum: 1_000_000 })
    @IsNumber({ maxDecimalPlaces: 2 })
    @Min(0)
    @Max(1_000_000)
    balance: number

}