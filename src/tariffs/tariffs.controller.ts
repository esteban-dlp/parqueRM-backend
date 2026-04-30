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
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { TariffsService } from './tariffs.service';
import { CreateTariffDto } from './dto/create-tariff.dto';
import { UpdateTariffDto } from './dto/update-tariff.dto';
import { QueryTariffDto } from './dto/query-tariff.dto';
import { ResponseService } from '../common/services/response.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('tariffs')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('tariffs')
export class TariffsController {
  constructor(
    private readonly tariffsService: TariffsService,
    private readonly responses: ResponseService,
  ) {}

  @Get()
  @RequirePermissions('CATALOGS_READ')
  @ApiOperation({ summary: 'List tariffs (paginated, filterable)' })
  async findAll(@Query() query: QueryTariffDto) {
    const result = await this.tariffsService.findAll(query);
    return this.responses.ok(result.items, 'Tariffs', {
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
    });
  }

  @Get('visitors')
  @RequirePermissions('CATALOGS_READ')
  @ApiOperation({ summary: 'Get active visitor tariffs' })
  async findVisitorTariffs() {
    return this.responses.ok(await this.tariffsService.findByAppliesTo('VISITANTE'), 'Visitor tariffs');
  }

  @Get('vehicles')
  @RequirePermissions('CATALOGS_READ')
  @ApiOperation({ summary: 'Get active vehicle tariffs' })
  async findVehicleTariffs() {
    return this.responses.ok(await this.tariffsService.findByAppliesTo('VEHICULO'), 'Vehicle tariffs');
  }

  @Get('lodging')
  @RequirePermissions('CATALOGS_READ')
  @ApiOperation({ summary: 'Get active lodging tariffs' })
  async findLodgingTariffs() {
    return this.responses.ok(await this.tariffsService.findByAppliesTo('HOSPEDAJE'), 'Lodging tariffs');
  }

  @Get('resolve')
  @RequirePermissions('CATALOGS_READ')
  @ApiQuery({ name: 'appliesTo', required: true, enum: ['VISITANTE', 'VEHICULO', 'HOSPEDAJE', 'SERVICIO'] })
  @ApiQuery({ name: 'categoryId', required: false })
  @ApiQuery({ name: 'vehicleTypeId', required: false })
  @ApiQuery({ name: 'lodgingTypeId', required: false })
  @ApiQuery({ name: 'isForeign', required: false })
  @ApiOperation({ summary: 'Resolve best matching tariff' })
  async resolve(
    @Query('appliesTo') appliesTo: string,
    @Query('categoryId') categoryId?: string,
    @Query('vehicleTypeId') vehicleTypeId?: string,
    @Query('lodgingTypeId') lodgingTypeId?: string,
    @Query('isForeign') isForeign?: string,
  ) {
    const tariff = await this.tariffsService.resolve(
      appliesTo,
      categoryId ? parseInt(categoryId) : undefined,
      vehicleTypeId ? parseInt(vehicleTypeId) : undefined,
      lodgingTypeId ? parseInt(lodgingTypeId) : undefined,
      isForeign !== undefined ? isForeign === 'true' : undefined,
    );
    return this.responses.ok(tariff, 'Resolved tariff');
  }

  @Get(':id')
  @RequirePermissions('CATALOGS_READ')
  @ApiOperation({ summary: 'Get tariff by id' })
  async findById(@Param('id', ParseIntPipe) id: number) {
    return this.responses.ok(await this.tariffsService.findById(id), 'Tariff');
  }

  @Post()
  @RequirePermissions('CATALOGS_MANAGE')
  @ApiOperation({ summary: 'Create tariff' })
  async create(
    @Body() dto: CreateTariffDto,
    @CurrentUser('id') actorId: number,
    @Request() req: any,
  ) {
    return this.responses.created(await this.tariffsService.create(dto, actorId, req.ip), 'Tariff created');
  }

  @Patch(':id')
  @RequirePermissions('CATALOGS_MANAGE')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update tariff' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTariffDto,
    @CurrentUser('id') actorId: number,
    @Request() req: any,
  ) {
    return this.responses.updated(await this.tariffsService.update(id, dto, actorId, req.ip), 'Tariff updated');
  }

  @Patch(':id/status')
  @RequirePermissions('CATALOGS_MANAGE')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Toggle tariff status' })
  async toggleStatus(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('id') actorId: number,
    @Request() req: any,
  ) {
    return this.responses.updated(await this.tariffsService.toggleStatus(id, actorId, req.ip), 'Tariff status toggled');
  }

  @Delete(':id')
  @RequirePermissions('CATALOGS_MANAGE')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft-delete tariff' })
  async delete(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('id') actorId: number,
    @Request() req: any,
  ) {
    await this.tariffsService.delete(id, actorId, req.ip);
    return this.responses.deleted('Tariff deleted');
  }
}
