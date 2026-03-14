import { IsEmail, IsString, MinLength } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export class RegisterDto {

    @ApiProperty({ example: 'jan123' })
    @IsString()
    login: string

    @ApiProperty({ example: 'jan@example.com' })
    @IsEmail()
    email: string

    @ApiProperty({ example: 'haslo123', minLength: 6 })
    @MinLength(6)
    password: string
}