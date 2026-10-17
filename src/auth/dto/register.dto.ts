import { IsEmail, IsString, Matches, MaxLength, MinLength } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export class RegisterDto {

    @ApiProperty({ example: 'jan123' })
    @IsString()
    @MinLength(1)
    @MaxLength(64)
    login: string

    @ApiProperty({ example: 'jan@example.com' })
    @IsEmail()
    @MaxLength(254)
    email: string

    @ApiProperty({ example: 'haslo123', minLength: 6, maxLength: 128 })
    @IsString()
    @MinLength(6)
    @MaxLength(128)
    @Matches(/^(?=.*[A-Za-z])(?=.*\d).+$/, {
        message: 'Hasło musi mieć co najmniej 6 znaków, zawierać literę i cyfrę',
    })
    password: string
}