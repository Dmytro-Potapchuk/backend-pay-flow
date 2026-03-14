import { Injectable, BadRequestException } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import { Message, MessageDocument } from './schemas/message.schema'
import { UsersService } from '../users/users.service'

@Injectable()
export class MessagesService {

    constructor(
        @InjectModel(Message.name)
        private messageModel: Model<MessageDocument>,
        private usersService: UsersService,
    ) {}

    async create(senderId: string, senderLogin: string, receiverLogin: string, title: string, content: string) {

        const receiver = await this.usersService.findByLogin(receiverLogin)

        if (!receiver) {
            throw new BadRequestException('Receiver not found')
        }

        const message = new this.messageModel({
            userId: receiver._id,
            senderId,
            senderLogin,
            title,
            content,
        })

        return message.save()
    }

    async findAll(userId: string) {

        return this.messageModel
            .find({ userId })
            .sort({ createdAt: -1 })
    }

    async findOne(id: string) {
        return this.messageModel.findById(id)
    }

    async markAsRead(id: string) {

        return this.messageModel.findByIdAndUpdate(
            id,
            { read: true },
            { new: true },
        )
    }

    async unreadCount(userId: string) {
        return this.messageModel.countDocuments({
            userId,
            read: false,
        })
    }
}