import { IsIn, IsNumber, IsString, Min } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export class SellCurrencyDto {
    @ApiProperty({ example: 10, minimum: 0.01, description: 'Kwota w EUR lub USD' })
    @IsNumber()
    @Min(0.01)
    amount: number

    @ApiProperty({ enum: ['EUR', 'USD'] })
    @IsString()
    @IsIn(['EUR', 'USD'])
    currencyCode: string
}
