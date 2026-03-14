import { Controller, Get, UseGuards, Request } from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger'
import { DashboardService } from './dashboard.service'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import type { RequestWithUser } from '../common/interfaces/jwt-payload.interface'

@ApiTags('Dashboard')
@ApiBearerAuth()
@Controller('dashboard')
export class DashboardController {

    constructor(private dashboardService: DashboardService) {}

    @ApiOperation({ summary: 'Get dashboard data (balance, transactions, unread messages)' })
    @UseGuards(JwtAuthGuard)
    @Get()
    getDashboard(@Request() req: RequestWithUser) {
        return this.dashboardService.getDashboard(req.user.userId)
    }

}