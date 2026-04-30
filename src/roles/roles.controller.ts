import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { RolesService } from './roles.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { AssignPermissionsDto } from './dto/assign-permissions.dto';
import { ResponseService } from '../common/services/response.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('roles')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('roles')
export class RolesController {
  constructor(
    private readonly rolesService: RolesService,
    private readonly responses: ResponseService,
  ) {}

  @Get()
  @RequirePermissions('ROLES_READ')
  @ApiOperation({ summary: 'List all roles with permissions' })
  async findAll() {
    const roles = await this.rolesService.findAll();
    return this.responses.ok(roles, 'Roles');
  }

  @Get(':id')
  @RequirePermissions('ROLES_READ')
  @ApiOperation({ summary: 'Get role by id' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const role = await this.rolesService.findById(id);
    return this.responses.ok(role, 'Role');
  }

  @Post()
  @RequirePermissions('ROLES_MANAGE')
  @ApiOperation({ summary: 'Create a new role' })
  async create(
    @Body() dto: CreateRoleDto,
    @CurrentUser('id') actorId: number,
    @Request() req: any,
  ) {
    const role = await this.rolesService.create(dto, actorId, req.ip);
    return this.responses.created(role, 'Role created');
  }

  @Patch(':id')
  @RequirePermissions('ROLES_MANAGE')
  @ApiOperation({ summary: 'Update role' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateRoleDto,
    @CurrentUser('id') actorId: number,
    @Request() req: any,
  ) {
    const role = await this.rolesService.update(id, dto, actorId, req.ip);
    return this.responses.updated(role, 'Role updated');
  }

  @Delete(':id')
  @RequirePermissions('ROLES_MANAGE')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft-delete (deactivate) role' })
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('id') actorId: number,
    @Request() req: any,
  ) {
    await this.rolesService.delete(id, actorId, req.ip);
    return this.responses.deleted('Role deactivated');
  }

  @Get(':id/permissions')
  @RequirePermissions('ROLES_READ')
  @ApiOperation({ summary: 'Get permissions assigned to a role' })
  async getPermissions(@Param('id', ParseIntPipe) id: number) {
    const perms = await this.rolesService.getPermissions(id);
    return this.responses.ok(perms, 'Role permissions');
  }

  @Patch(':id/permissions')
  @RequirePermissions('ROLES_MANAGE')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Assign (replace) permissions for a role' })
  async assignPermissions(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AssignPermissionsDto,
    @CurrentUser('id') actorId: number,
    @Request() req: any,
  ) {
    const perms = await this.rolesService.assignPermissions(id, dto.permissionIds, actorId, req.ip);
    return this.responses.updated(perms, 'Permissions assigned');
  }
}
