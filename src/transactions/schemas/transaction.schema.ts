import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Document } from 'mongoose'

export type TransactionDocument = Transaction & Document

@Schema({ timestamps: true })
export class Transaction {

    @Prop({ required: true })
    senderId: string

    @Prop({ required: true })
    receiverAccount: string

    @Prop({ required: true })
    amount: number

    @Prop({ enum: ['bank_transfer', 'payu_transfer'], required: true })
    type: string

    @Prop({ default: 'completed' })
    status: string
}

export const TransactionSchema = SchemaFactory.createForClass(Transaction)