import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { ResponseService } from '../common/services/response.service';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';

@ApiTags('dashboard')
@ApiBearerAuth()
@Controller('dashboard')
export class DashboardController {
  constructor(
    private readonly dashboardService: DashboardService,
    private readonly responses: ResponseService,
  ) {}

  @Get('summary')
  @RequirePermissions('REPORTES_READ')
  @ApiOperation({ summary: 'General dashboard summary (today + last 7 days)' })
  async summary() {
    const data = await this.dashboardService.getSummary();
    return this.responses.ok(data, 'Dashboard summary');
  }

  @Get('today')
  @RequirePermissions('REPORTES_READ')
  @ApiOperation({ summary: "Today's totals" })
  async today() {
    const data = await this.dashboardService.getToday();
    return this.responses.ok(data, 'Today totals');
  }

  @Get('visitors-summary')
  @RequirePermissions('REPORTES_READ')
  @ApiOperation({ summary: 'Visitors summary for a date range' })
  @ApiQuery({ name: 'from', required: false, type: String })
  @ApiQuery({ name: 'to', required: false, type: String })
  async visitorsSummary(@Query('from') from?: string, @Query('to') to?: string) {
    const data = await this.dashboardService.getVisitorsSummary(from, to);
    return this.responses.ok(data, 'Visitors summary');
  }

  @Get('vehicles-summary')
  @RequirePermissions('REPORTES_READ')
  @ApiOperation({ summary: 'Vehicles summary for a date range' })
  @ApiQuery({ name: 'from', required: false, type: String })
  @ApiQuery({ name: 'to', required: false, type: String })
  async vehiclesSummary(@Query('from') from?: string, @Query('to') to?: string) {
    const data = await this.dashboardService.getVehiclesSummary(from, to);
    return this.responses.ok(data, 'Vehicles summary');
  }

  @Get('income-summary')
  @RequirePermissions('REPORTES_READ')
  @ApiOperation({ summary: 'Income/expense summary for a date range' })
  @ApiQuery({ name: 'from', required: false, type: String })
  @ApiQuery({ name: 'to', required: false, type: String })
  async incomeSummary(@Query('from') from?: string, @Query('to') to?: string) {
    const data = await this.dashboardService.getIncomeSummary(from, to);
    return this.responses.ok(data, 'Income summary');
  }

  @Get('latest-movements')
  @RequirePermissions('REPORTES_READ')
  @ApiOperation({ summary: 'Latest financial movements' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async latestMovements(@Query('limit') limit?: string) {
    const data = await this.dashboardService.getLatestMovements(limit ? +limit : 10);
    return this.responses.ok(data, 'Latest movements');
  }

  @Get('occupancy')
  @RequirePermissions('REPORTES_READ')
  @ApiOperation({ summary: 'Current park occupancy vs max capacity' })
  async occupancy() {
    const data = await this.dashboardService.getOccupancy();
    return this.responses.ok(data, 'Occupancy');
  }
}
