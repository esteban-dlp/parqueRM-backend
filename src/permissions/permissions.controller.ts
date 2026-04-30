import {
  Controller,
  Get,
  NotFoundException,
  Param,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PermissionsService } from './permissions.service';
import { ResponseService } from '../common/services/response.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { ResponseCodes } from '../common/constants/response-codes';

@ApiTags('permissions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('permissions')
export class PermissionsController {
  constructor(
    private readonly permissionsService: PermissionsService,
    private readonly responses: ResponseService,
  ) {}

  @Get()
  @RequirePermissions('ROLES_READ')
  @ApiOperation({ summary: 'List all permissions' })
  async findAll() {
    const items = await this.permissionsService.findAll();
    return this.responses.ok(items, 'Permissions');
  }

  @Get('grouped-by-module')
  @RequirePermissions('ROLES_READ')
  @ApiOperation({ summary: 'List permissions grouped by module' })
  async grouped() {
    const grouped = await this.permissionsService.findGroupedByModule();
    return this.responses.ok(grouped, 'Permissions by module');
  }

  @Get(':id')
  @RequirePermissions('ROLES_READ')
  @ApiOperation({ summary: 'Get a single permission' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const item = await this.permissionsService.findById(id);
    if (!item) {
      throw new NotFoundException({
        code: ResponseCodes.NOT_FOUND,
        message: 'Permission not found',
      });
    }
    return this.responses.ok(item, 'Permission');
  }
}
