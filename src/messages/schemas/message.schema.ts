import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Document } from 'mongoose'

export type MessageDocument = Message & Document
export type MessageType = 'success' | 'error' | 'info'

@Schema({ timestamps: true })
export class Message {
    @Prop({ required: true })
    conversationId: string

    @Prop()
    senderId?: string

    @Prop()
    senderLogin?: string

    @Prop()
    title?: string

    @Prop({ required: true })
    content: string

    @Prop({ enum: ['success', 'error', 'info'], default: 'info' })
    type: MessageType

    @Prop({ type: [String], default: [] })
    readBy: string[]

    @Prop({ type: [String], default: [] })
    deletedFor: string[]

    createdAt?: Date
    updatedAt?: Date
}

export const MessageSchema = SchemaFactory.createForClass(Message)