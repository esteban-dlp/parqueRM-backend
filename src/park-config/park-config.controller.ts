import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ParkConfigService } from './park-config.service';
import { UpdateParkConfigDto } from './dto/update-park-config.dto';
import { ResponseService } from '../common/services/response.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('park-config')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('park-config')
export class ParkConfigController {
  constructor(
    private readonly parkConfigService: ParkConfigService,
    private readonly responses: ResponseService,
  ) {}

  @Get()
  @RequirePermissions('CONFIG_READ')
  @ApiOperation({ summary: 'Get park configuration' })
  async get() {
    const config = await this.parkConfigService.get();
    return this.responses.ok(config, 'Park configuration');
  }

  @Patch()
  @RequirePermissions('CONFIG_UPDATE')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update park configuration' })
  async update(
    @Body() dto: UpdateParkConfigDto,
    @CurrentUser('id') actorId: number,
    @Request() req: any,
  ) {
    const config = await this.parkConfigService.update(dto, actorId, req.ip);
    return this.responses.updated(config, 'Park configuration updated');
  }

  @Get('services')
  @RequirePermissions('CONFIG_READ')
  @ApiOperation({ summary: 'Get all services' })
  async getServices() {
    const services = await this.parkConfigService.getServices();
    return this.responses.ok(services, 'Services');
  }

  @Patch('services/:id/toggle')
  @RequirePermissions('CONFIG_UPDATE')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Toggle service enabled/disabled' })
  async toggleService(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('id') actorId: number,
    @Request() req: any,
  ) {
    const service = await this.parkConfigService.toggleService(id, actorId, req.ip);
    return this.responses.updated(service, 'Service status toggled');
  }
}
