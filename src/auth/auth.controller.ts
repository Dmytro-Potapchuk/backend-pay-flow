import { Body, Controller, Post } from '@nestjs/common'
import { ApiTags, ApiOperation } from '@nestjs/swagger'
import { AuthService } from './auth.service'
import { RegisterDto } from './dto/register.dto'
import { LoginDto } from './dto/login.dto'

@ApiTags('Auth')
@Controller('auth')
export class AuthController {

    constructor(private authService: AuthService) {}

    @ApiOperation({ summary: 'Register new user' })
    @Post('register')
    register(@Body() dto: RegisterDto) {
        return this.authService.register(dto)
    }

    @ApiOperation({ summary: 'Login - returns JWT token' })
    @Post('login')
    login(@Body() dto: LoginDto) {
        return this.authService.login(dto.login, dto.password)
    }
}