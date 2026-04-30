import {
  Controller,
  Get,
  NotFoundException,
  Param,
  ParseIntPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { AuditService } from './audit.service';
import { ResponseService } from '../common/services/response.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { ResponseCodes } from '../common/constants/response-codes';

@ApiTags('audit')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('audit-logs')
export class AuditController {
  constructor(
    private readonly auditService: AuditService,
    private readonly responses: ResponseService,
  ) {}

  @Get()
  @RequirePermissions('AUDIT_READ')
  @ApiOperation({ summary: 'List audit logs (paginated)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async findAll(@Query('page') page?: string, @Query('limit') limit?: string) {
    const [items, total] = await this.auditService.findAll({
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
    return this.responses.ok(items, 'Audit logs', { total });
  }

  @Get('by-entity')
  @RequirePermissions('AUDIT_READ')
  @ApiOperation({ summary: 'List audit logs by entity' })
  @ApiQuery({ name: 'entityName', required: true, type: String })
  @ApiQuery({ name: 'entityId', required: false, type: String })
  async byEntity(
    @Query('entityName') entityName: string,
    @Query('entityId') entityId?: string,
  ) {
    const items = await this.auditService.findByEntity(entityName, entityId);
    return this.responses.ok(items, 'Audit logs by entity');
  }

  @Get('by-user/:userId')
  @RequirePermissions('AUDIT_READ')
  @ApiOperation({ summary: 'List audit logs for a user' })
  async byUser(
    @Param('userId', ParseIntPipe) userId: number,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const [items, total] = await this.auditService.findByUser(userId, {
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
    return this.responses.ok(items, 'Audit logs by user', { total });
  }

  @Get(':id')
  @RequirePermissions('AUDIT_READ')
  @ApiOperation({ summary: 'Get a single audit log' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const log = await this.auditService.findById(id);
    if (!log) {
      throw new NotFoundException({
        code: ResponseCodes.NOT_FOUND,
        message: 'Audit log not found',
      });
    }
    return this.responses.ok(log, 'Audit log');
  }
}
