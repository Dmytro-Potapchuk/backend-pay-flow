import { Module } from '@nestjs/common'
import { AuthService } from './auth.service'
import { AuthController } from './auth.controller'
import { JwtModule } from '@nestjs/jwt'
import { UsersModule } from '../users/users.module'
import { JwtStrategy } from './jwt.strategy'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { AuthRateLimitGuard } from './auth-rate-limit.guard'

@Module({
  imports: [
    UsersModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        secret: config.get('JWT_SECRET'),
        signOptions: { expiresIn: '1d' },
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [AuthService, JwtStrategy, AuthRateLimitGuard],
  controllers: [AuthController],
})
export class AuthModule {}