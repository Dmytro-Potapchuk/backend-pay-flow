import { IsString } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export class LoginDto {

    @ApiProperty({ example: 'jan123' })
    @IsString()
    login: string

    @ApiProperty({ example: 'haslo123' })
    @IsString()
    password: string
}