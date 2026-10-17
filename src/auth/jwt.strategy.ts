import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common'
import { PassportStrategy } from '@nestjs/passport'
import { ExtractJwt, Strategy } from 'passport-jwt'
import { ConfigService } from '@nestjs/config'
import { JwtPayload } from '../common/interfaces/jwt-payload.interface'
import { UsersService } from '../users/users.service'

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {

    constructor(
        config: ConfigService,
        private usersService: UsersService,
    ) {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            secretOrKey: config.get('JWT_SECRET'),
        })
    }

    async validate(payload: JwtPayload) {
        if (!payload?.userId) {
            throw new UnauthorizedException()
        }

        try {
            const user = await this.usersService.findById(payload.userId)
            return {
                userId: String(user._id),
                login: user.login,
                role: user.role,
            }
        } catch (error) {
            if (error instanceof NotFoundException) {
                throw new UnauthorizedException()
            }
            throw error
        }
    }
}