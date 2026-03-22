import {
    Controller,
    Get,
    UseGuards,
    Request,
    Param,
    Patch,
    Body
} from '@nestjs/common'

import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger'

import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { UsersService } from './users.service'
import { RolesGuard } from '../common/guards/roles.guard'
import { Roles } from '../common/decorators/roles.decorator'

import { UpdateBalanceDto } from './dto/update-balance.dto'
import { UpdateRoleDto } from './dto/update-role.dto'
import type { RequestWithUser } from '../common/interfaces/jwt-payload.interface'

@ApiTags('Users')
@ApiBearerAuth() // 🔒 wszystkie endpointy w tym controllerze wymagają tokena
@Controller('users')
export class UsersController {

    constructor(private usersService: UsersService) {}

    /**
     * USER PROFILE
     */
    @ApiOperation({ summary: 'Get logged user profile' })
    @UseGuards(JwtAuthGuard)
    @Get('profile')
    getProfile(@Request() req: RequestWithUser) {
        return this.usersService.findById(req.user.userId)
    }

    /**
     * ADMIN - LIST ALL USERS
     */
    @ApiOperation({ summary: 'Admin: list all users' })
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('admin')
    @Get()
    findAll() {
        return this.usersService.findAll()
    }

    /**
     * ADMIN - UPDATE USER BALANCE
     */
    @ApiOperation({ summary: 'Admin: update user balance' })
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('admin')
    @Patch(':id/balance')
    updateBalance(
        @Param('id') id: string,
        @Body() dto: UpdateBalanceDto,
    ) {
        return this.usersService.updateBalance(id, dto.balance)
    }

    /**
     * ADMIN - CHANGE USER ROLE
     */
    @ApiOperation({ summary: 'Admin: change user role' })
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('admin')
    @Patch(':id/role')
    updateRole(
        @Param('id') id: string,
        @Body() dto: UpdateRoleDto,
    ) {
        return this.usersService.updateRole(id, dto.role)
    }

}