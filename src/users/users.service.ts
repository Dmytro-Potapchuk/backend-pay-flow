import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import { User, UserDocument } from './schemas/user.schema'

@Injectable()
export class UsersService {

    constructor(
        @InjectModel(User.name)
        private userModel: Model<UserDocument>,
    ) {}

    async create(data: { login: string; email: string; password: string; role?: string }) {
        const user = new this.userModel(data)
        return user.save()
    }

    async findByLogin(login: string) {
        return this.userModel.findOne({ login })
    }

    async findById(id: string) {

        const user = await this.userModel
            .findById(id)
            .select('-password')

        if (!user) {
            throw new NotFoundException('User not found')
        }

        return user
    }

    async findAll() {

        return this.userModel
            .find()
            .select('-password')
    }

    async update(id: string, data: Partial<{ login: string; email: string; password: string; phone: string; role: string }>) {
        const user = await this.userModel.findByIdAndUpdate(
            id,
            data,
            { new: true },
        )

        if (!user) {
            throw new NotFoundException('User not found')
        }

        return user
    }

    async updateBalance(id: string, balance: number) {

        const user = await this.userModel.findByIdAndUpdate(
            id,
            { balance },
            { new: true },
        )

        if (!user) {
            throw new NotFoundException('User not found')
        }

        return user
    }

    async updateRole(id: string, role: string) {

        const user = await this.userModel.findByIdAndUpdate(
            id,
            { role },
            { new: true },
        )

        if (!user) {
            throw new NotFoundException('User not found')
        }

        return user
    }

    async deductPln(userId: string, amount: number) {
        const user = await this.userModel.findById(userId)
        if (!user) throw new NotFoundException('User not found')
        if (user.balance < amount) {
            throw new BadRequestException('Insufficient PLN balance')
        }
        return this.userModel.findByIdAndUpdate(
            userId,
            { $inc: { balance: -amount } },
            { new: true },
        ).select('-password')
    }

    async addBalanceEur(userId: string, amount: number) {
        const user = await this.userModel.findByIdAndUpdate(
            userId,
            { $inc: { balanceEur: amount } },
            { new: true },
        ).select('-password')
        if (!user) throw new NotFoundException('User not found')
        return user
    }

    async addBalanceUsd(userId: string, amount: number) {
        const user = await this.userModel.findByIdAndUpdate(
            userId,
            { $inc: { balanceUsd: amount } },
            { new: true },
        ).select('-password')
        if (!user) throw new NotFoundException('User not found')
        return user
    }

}