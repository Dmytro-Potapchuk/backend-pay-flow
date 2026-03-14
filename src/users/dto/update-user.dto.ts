import {
    IsEmail,
    IsOptional,
    IsString,
    MinLength
} from 'class-validator'
import { ApiPropertyOptional } from '@nestjs/swagger'

export class UpdateUserDto {

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    login?: string

    @ApiPropertyOptional()
    @IsOptional()
    @IsEmail()
    email?: string

    @ApiPropertyOptional({ minLength: 6 })
    @IsOptional()
    @MinLength(6)
    password?: string

}