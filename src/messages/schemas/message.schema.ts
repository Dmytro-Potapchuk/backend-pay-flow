import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Document } from 'mongoose'

export type MessageDocument = Message & Document
export type MessageType = 'success' | 'error' | 'info'

@Schema({ timestamps: true })
export class Message {

    @Prop({ required: true })
    userId: string

    @Prop()
    senderId?: string

    @Prop()
    senderLogin?: string

    @Prop({ required: true })
    title: string

    @Prop({ required: true })
    content: string

    @Prop({ default: false })
    read: boolean

    @Prop({ enum: ['success', 'error', 'info'], default: 'info' })
    type: MessageType
}

export const MessageSchema = SchemaFactory.createForClass(Message)