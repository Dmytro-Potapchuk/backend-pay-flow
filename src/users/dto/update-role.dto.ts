import { IsEnum } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export class UpdateRoleDto {

    @ApiProperty({ enum: ['user', 'admin'] })
    @IsEnum(['user', 'admin'])
    role: string

}