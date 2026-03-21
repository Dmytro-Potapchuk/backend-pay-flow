import { ApiProperty } from '@nestjs/swagger'
import { IsOptional, IsString } from 'class-validator'

export class SendConversationMessageDto {
    @ApiProperty({ example: 'Czesc! Jak tam?' })
    @IsString()
    content: string

    @ApiProperty({ example: 'Nowa wiadomosc', required: false })
    @IsOptional()
    @IsString()
    title?: string
}
