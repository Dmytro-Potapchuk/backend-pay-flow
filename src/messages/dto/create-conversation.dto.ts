import { ApiProperty } from '@nestjs/swagger'
import { IsString } from 'class-validator'

export class CreateConversationDto {
    @ApiProperty({ example: 'dmytro3' })
    @IsString()
    login: string
}
