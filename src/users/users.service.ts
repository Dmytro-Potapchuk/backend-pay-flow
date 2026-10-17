import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { ClientSession, Model } from 'mongoose'
import * as bcrypt from 'bcrypt'
import { User, UserDocument } from './schemas/user.schema'
import { roundMoney } from '../common/money'

export type DebitPlnResult =
    | { ok: true; user: UserDocument }
    | { ok: false; reason: 'missing' | 'insufficient' }

@Injectable()
export class UsersService {
    private readonly logger = new Logger(UsersService.name)

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

    async findPublicByIds(ids: string[]) {
        return this.userModel
            .find({ _id: { $in: ids } })
            .select('_id login email role')
    }

    async searchContacts(query: string, currentUserId: string) {
        const normalizedQuery = query.trim()

        const escapedQuery = normalizedQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        const filter = normalizedQuery
            ? {
                _id: { $ne: currentUserId },
                $or: [
                    { login: { $regex: escapedQuery, $options: 'i' } },
                    { email: { $regex: escapedQuery, $options: 'i' } },
                ],
            }
            : {
                _id: { $ne: currentUserId },
            }

        return this.userModel
            .find(filter)
            .select('_id login email role')
            .sort({ login: 1 })
            .limit(normalizedQuery ? 50 : 200)
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

    async findPublicByLogin(login: string) {
        const normalized = login.trim()
        if (!normalized) {
            throw new BadRequestException('Login is required')
        }

        const user = await this.userModel
            .findOne({ login: normalized })
            .select('_id login')

        if (!user) {
            throw new NotFoundException('User not found')
        }

        return user
    }

    async updateOwnProfile(
        userId: string,
        data: { phone?: string; currentPassword?: string; newPassword?: string },
    ) {
        const user = await this.userModel.findById(userId)
        if (!user) {
            throw new NotFoundException('User not found')
        }

        if (data.newPassword) {
            if (!data.currentPassword) {
                throw new BadRequestException('Current password is required')
            }

            const valid = await bcrypt.compare(data.currentPassword, user.password)
            if (!valid) {
                throw new BadRequestException('Current password is invalid')
            }

            user.password = await bcrypt.hash(data.newPassword, 10)
        }

        if (typeof data.phone === 'string') {
            user.phone = data.phone.trim()
        }

        await user.save()
        const plain = user.toObject() as unknown as Record<string, unknown>
        delete plain.password
        return plain
    }

    async updateBalance(id: string, balance: number, actorId?: string) {

        const user = await this.userModel.findByIdAndUpdate(
            id,
            { balance },
            { new: true },
        )

        if (!user) {
            throw new NotFoundException('User not found')
        }

        this.logger.log(
            `Balance set actor=${actorId ?? 'unknown'} user=${id} balance=${balance}`,
        )

        const plain = typeof user.toObject === 'function'
            ? user.toObject() as unknown as Record<string, unknown>
            : { ...(user as unknown as Record<string, unknown>) }
        delete plain.password
        return plain
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

    async debitPlnIfSufficient(
        userId: string,
        amount: number,
        session?: ClientSession | null,
    ): Promise<DebitPlnResult> {
        const normalizedAmount = roundMoney(amount)
        const options: { new: true; session?: ClientSession } = { new: true }
        if (session) {
            options.session = session
        }

        const updated = await this.userModel
            .findOneAndUpdate(
                { _id: userId, balance: { $gte: normalizedAmount } },
                { $inc: { balance: -normalizedAmount } },
                options,
            )
            .select('-password')

        if (updated) {
            return { ok: true, user: updated }
        }

        const existing = await this.userModel.findById(userId).select('_id')
        if (!existing) {
            return { ok: false, reason: 'missing' }
        }

        return { ok: false, reason: 'insufficient' }
    }

    async exchangePlnForCurrency(
        userId: string,
        amountPln: number,
        currencyCode: 'EUR' | 'USD',
        foreignAmount: number,
    ) {
        const normalizedPln = roundMoney(amountPln)
        const normalizedForeign = roundMoney(foreignAmount)
        if (!Number.isFinite(normalizedPln) || normalizedPln <= 0) {
            throw new BadRequestException('Invalid amount')
        }
        if (!Number.isFinite(normalizedForeign) || normalizedForeign <= 0) {
            throw new BadRequestException('Invalid amount')
        }

        const balanceField = currencyCode === 'EUR' ? 'balanceEur' : 'balanceUsd'
        const updated = await this.userModel
            .findOneAndUpdate(
                { _id: userId, balance: { $gte: normalizedPln } },
                {
                    $inc: {
                        balance: -normalizedPln,
                        [balanceField]: normalizedForeign,
                    },
                },
                { new: true },
            )
            .select('-password')

        if (updated) {
            return updated
        }

        const existing = await this.userModel.findById(userId).select('_id')
        if (!existing) {
            throw new NotFoundException('User not found')
        }

        throw new BadRequestException('Insufficient PLN balance')
    }

    async sellForeignForPln(
        userId: string,
        currencyCode: 'EUR' | 'USD',
        foreignAmount: number,
        plnAmount: number,
    ) {
        const normalizedForeign = roundMoney(foreignAmount)
        const normalizedPln = roundMoney(plnAmount)
        if (
            !Number.isFinite(normalizedForeign) ||
            normalizedForeign <= 0 ||
            !Number.isFinite(normalizedPln) ||
            normalizedPln <= 0
        ) {
            throw new BadRequestException('Invalid amount')
        }

        const balanceField = currencyCode === 'EUR' ? 'balanceEur' : 'balanceUsd'
        const updated = await this.userModel
            .findOneAndUpdate(
                { _id: userId, [balanceField]: { $gte: normalizedForeign } },
                {
                    $inc: {
                        [balanceField]: -normalizedForeign,
                        balance: normalizedPln,
                    },
                },
                { new: true },
            )
            .select('-password')

        if (updated) {
            return updated
        }

        const existing = await this.userModel.findById(userId).select('_id')
        if (!existing) {
            throw new NotFoundException('User not found')
        }

        throw new BadRequestException('Insufficient foreign balance')
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

    async addBalancePln(
        userId: string,
        amount: number,
        session?: ClientSession | null,
    ) {
        const options: { new: true; session?: ClientSession } = { new: true }
        if (session) {
            options.session = session
        }

        const user = await this.userModel.findByIdAndUpdate(
            userId,
            { $inc: { balance: roundMoney(amount) } },
            options,
        ).select('-password')

        if (!user) throw new NotFoundException('User not found')

        return user
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