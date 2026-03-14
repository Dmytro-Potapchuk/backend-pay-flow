import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Document } from 'mongoose'

export type UserDocument = User & Document

@Schema()
export class User {
    @Prop({ unique: true, required: true })
    login: string

    @Prop({ unique: true, required: true })
    email: string

    @Prop({ required: true })
    password: string

    @Prop({ default: 0 })
    balance: number

    @Prop({ default: 0 })
    balanceEur: number

    @Prop({ default: 0 })
    balanceUsd: number

    @Prop()
    phone: string

    @Prop({ default: 'user', enum: ['user', 'admin'] })
    role: string

    @Prop({ default: Date.now })
    createdAt: Date
}

export const UserSchema = SchemaFactory.createForClass(User)