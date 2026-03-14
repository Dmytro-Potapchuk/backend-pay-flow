import { IsString } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export class CreateMessageDto {

    @ApiProperty({ example: 'Temat wiadomości' })
    @IsString()
    title: string

    @ApiProperty({ example: 'Treść wiadomości' })
    @IsString()
    content: string

    @ApiProperty({ example: 'odbiorca123' })
    @IsString()
    receiverLogin: string

}