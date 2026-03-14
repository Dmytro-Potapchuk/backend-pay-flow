import {
    IsEmail,
    IsString,
    MinLength,
    IsOptional,
    IsEnum
} from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class CreateUserDto {

    @ApiProperty()
    @IsString()
    login: string

    @ApiProperty()
    @IsEmail()
    email: string

    @ApiProperty({ minLength: 6 })
    @MinLength(6)
    password: string

    @ApiPropertyOptional({ enum: ['user', 'admin'] })
    @IsOptional()
    @IsEnum(['user', 'admin'])
    role?: string

}