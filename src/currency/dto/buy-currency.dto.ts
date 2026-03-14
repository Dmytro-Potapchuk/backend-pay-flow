import { IsNumber, IsString, Min, IsIn } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export class BuyCurrencyDto {

    @ApiProperty({ example: 100, minimum: 0.01, description: 'Kwota w PLN' })
    @IsNumber()
    @Min(0.01, { message: 'Amount must be greater than 0' })
    amountPln: number

    @ApiProperty({ enum: ['EUR', 'USD'] })
    @IsString()
    @IsIn(['EUR', 'USD'], { message: 'Only EUR and USD are supported for purchase' })
    currencyCode: string
}
