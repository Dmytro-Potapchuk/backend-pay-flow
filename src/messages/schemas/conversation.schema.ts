import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Document } from 'mongoose'

import type { MessageType } from './message.schema'

export type ConversationDocument = Conversation & Document
export type ConversationType = 'direct' | 'system'

@Schema({ timestamps: true })
export class Conversation {
    @Prop({ enum: ['direct', 'system'], required: true })
    type: ConversationType

    @Prop({ type: [String], default: [] })
    participantIds: string[]

    @Prop()
    title?: string

    @Prop()
    lastMessageText?: string

    @Prop()
    lastMessageAt?: Date

    @Prop({ enum: ['success', 'error', 'info'], default: 'info' })
    lastMessageType?: MessageType

    createdAt?: Date
    updatedAt?: Date
}

export const ConversationSchema = SchemaFactory.createForClass(Conversation)
