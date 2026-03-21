import { Injectable, UnauthorizedException } from '@nestjs/common'
import { UsersService } from '../users/users.service'
import { JwtService } from '@nestjs/jwt'
import * as bcrypt from 'bcrypt'
import { MessagesService } from '../messages/messages.service'

@Injectable()
export class AuthService {

    constructor(
        private usersService: UsersService,
        private jwtService: JwtService,
        private messagesService: MessagesService,
    ) {}

    async register(data: { login: string; email: string; password: string }) {

        const hash = await bcrypt.hash(data.password, 10)

        const user = await this.usersService.create({
            ...data,
            password: hash,
        })

        return user
    }

    async login(login: string, password: string) {

        const user = await this.usersService.findByLogin(login)

        if (!user) throw new UnauthorizedException()

        const valid = await bcrypt.compare(password, user.password)

        if (!valid) throw new UnauthorizedException()

        const payload = {
            userId: user._id,
            login: user.login,
            role: user.role
        }

        await this.messagesService
            .createSystemNotification(
                String(user._id),
                'Logowanie',
                'Logowanie poprawne',
                'success',
            )
            .catch(() => null)

        return {
            access_token: this.jwtService.sign(payload),
        }
    }
}