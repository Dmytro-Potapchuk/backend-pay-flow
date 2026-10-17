import { IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator'
import { ApiPropertyOptional } from '@nestjs/swagger'

export class UpdateProfileDto {
    @ApiPropertyOptional({ example: '+48123456789' })
    @IsOptional()
    @IsString()
    @MaxLength(20)
    phone?: string

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    @MaxLength(128)
    currentPassword?: string

    @ApiPropertyOptional({ minLength: 6, maxLength: 128 })
    @IsOptional()
    @IsString()
    @MinLength(6)
    @MaxLength(128)
    @Matches(/^(?=.*[A-Za-z])(?=.*\d).+$/, {
        message: 'Hasło musi mieć co najmniej 6 znaków, zawierać literę i cyfrę',
    })
    newPassword?: string
}
