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
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { QueryUsersDto } from './dto/query-users.dto';
import { AdminChangePasswordDto } from './dto/change-password.dto';
import { ResponseService } from '../common/services/response.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly responses: ResponseService,
  ) {}

  @Get()
  @RequirePermissions('USERS_READ')
  @ApiOperation({ summary: 'List users (paginated)' })
  async findAll(@Query() query: QueryUsersDto) {
    const result = await this.usersService.findAll(query);
    return this.responses.ok(result.items, 'Users', {
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
    });
  }

  @Get(':id')
  @RequirePermissions('USERS_READ')
  @ApiOperation({ summary: 'Get user by id' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const user = await this.usersService.findById(id);
    return this.responses.ok(user, 'User');
  }

  @Post()
  @RequirePermissions('USERS_MANAGE')
  @ApiOperation({ summary: 'Create a new user' })
  async create(
    @Body() dto: CreateUserDto,
    @CurrentUser('id') actorId: number,
    @Request() req: any,
  ) {
    const user = await this.usersService.create(dto, actorId, req.ip);
    return this.responses.created(user, 'User created');
  }

  @Patch(':id')
  @RequirePermissions('USERS_MANAGE')
  @ApiOperation({ summary: 'Update user information' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateUserDto,
    @CurrentUser('id') actorId: number,
    @Request() req: any,
  ) {
    const user = await this.usersService.update(id, dto, actorId, req.ip);
    return this.responses.updated(user, 'User updated');
  }

  @Patch(':id/status')
  @RequirePermissions('USERS_MANAGE')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Activate or deactivate a user' })
  async updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body('isActive') isActive: boolean,
    @CurrentUser('id') actorId: number,
    @Request() req: any,
  ) {
    const user = await this.usersService.updateStatus(id, isActive, actorId, req.ip);
    return this.responses.updated(user, 'User status updated');
  }

  @Patch(':id/password')
  @RequirePermissions('USERS_MANAGE')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Admin: change user password' })
  async changePassword(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AdminChangePasswordDto,
    @CurrentUser('id') actorId: number,
    @Request() req: any,
  ) {
    await this.usersService.changePassword(id, dto.newPassword, actorId, req.ip);
    return this.responses.ok(null, 'Password updated');
  }

  @Delete(':id')
  @RequirePermissions('USERS_MANAGE')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft-delete (deactivate) user' })
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('id') actorId: number,
    @Request() req: any,
  ) {
    await this.usersService.delete(id, actorId, req.ip);
    return this.responses.deleted('User deactivated');
  }
}
