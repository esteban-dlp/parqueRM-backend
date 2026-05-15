import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { VehiclesService } from './vehicles.service';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { QueryVehicleDto } from './dto/query-vehicle.dto';
import { ResponseService } from '../common/services/response.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';

@ApiTags('vehicles')
@ApiBearerAuth()
@Controller('vehicles')
export class VehiclesController {
  constructor(
    private readonly vehiclesService: VehiclesService,
    private readonly responses: ResponseService,
  ) {}

  @Get('currently-parked')
  @RequirePermissions('VEHICULOS_READ')
  @ApiOperation({ summary: 'List vehicles currently parked (no check-out)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async currentlyParked(@Query('page') page?: string, @Query('limit') limit?: string) {
    const result = await this.vehiclesService.findCurrentlyParked(
      page ? +page : 1,
      limit ? +limit : 20,
    );
    return this.responses.ok(result.data, 'Vehicles currently parked', result.meta);
  }

  @Get('today')
  @RequirePermissions('VEHICULOS_READ')
  @ApiOperation({ summary: "Today's vehicle records" })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async today(@Query('page') page?: string, @Query('limit') limit?: string) {
    const result = await this.vehiclesService.findToday(page ? +page : 1, limit ? +limit : 20);
    return this.responses.ok(result.data, 'Today vehicles', result.meta);
  }

  @Get('today-summary')
  @RequirePermissions('VEHICULOS_READ')
  @ApiOperation({ summary: "Today's vehicle summary" })
  async todaySummary() {
    const data = await this.vehiclesService.todaySummary();
    return this.responses.ok(data, 'Today vehicle summary');
  }

  @Get('search')
  @RequirePermissions('VEHICULOS_READ')
  @ApiOperation({ summary: 'Search vehicles by plate number' })
  @ApiQuery({ name: 'q', required: true, type: String })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async search(
    @Query('q') q: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const result = await this.vehiclesService.search(q ?? '', page ? +page : 1, limit ? +limit : 20);
    return this.responses.ok(result.data, 'Search results', result.meta);
  }

  @Get()
  @RequirePermissions('VEHICULOS_READ')
  @ApiOperation({ summary: 'List vehicle records (paginated, with filters)' })
  async findAll(@Query() query: QueryVehicleDto) {
    const result = await this.vehiclesService.findAll(query);
    return this.responses.ok(result.data, 'Vehicles', result.meta);
  }

  @Get(':id')
  @RequirePermissions('VEHICULOS_READ')
  @ApiOperation({ summary: 'Get a single vehicle record' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const data = await this.vehiclesService.findById(id);
    return this.responses.ok(data, 'Vehicle record');
  }

  @Post()
  @RequirePermissions('VEHICULOS_CREATE')
  @ApiOperation({ summary: 'Register a new vehicle' })
  async create(
    @Body() dto: CreateVehicleDto,
    @CurrentUser('id') userId: number,
    @CurrentUser('permissions') userPermissions: string[],
    @Req() req: any,
  ) {
    const data = await this.vehiclesService.create(dto, userId, req.ip, userPermissions ?? []);
    return this.responses.created(data);
  }

  @Patch(':id')
  @RequirePermissions('VEHICULOS_UPDATE')
  @ApiOperation({ summary: 'Update a vehicle record' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateVehicleDto,
    @CurrentUser('id') userId: number,
    @CurrentUser('permissions') userPermissions: string[],
    @Req() req: any,
  ) {
    const data = await this.vehiclesService.update(id, dto, userId, req.ip, userPermissions ?? []);
    return this.responses.updated(data);
  }

  @Delete(':id')
  @RequirePermissions('VEHICULOS_UPDATE')
  @ApiOperation({ summary: 'Delete a vehicle record (hard delete with audit)' })
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('id') userId: number,
    @Req() req: any,
  ) {
    await this.vehiclesService.delete(id, userId, req.ip);
    return this.responses.deleted('Vehicle record deleted');
  }

  @Post(':id/check-out')
  @RequirePermissions('VEHICULOS_UPDATE')
  @ApiOperation({ summary: 'Check out a vehicle' })
  async checkout(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('id') userId: number,
    @Req() req: any,
  ) {
    const data = await this.vehiclesService.checkout(id, userId, req.ip);
    return this.responses.ok(data, 'Vehicle checked out');
  }

  @Patch(':id/enable-exit')
  @RequirePermissions('VEHICULOS_ENABLE_EXIT')
  @ApiOperation({ summary: 'Enable vehicle exit' })
  async enableExit(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('id') userId: number,
    @Req() req: any,
  ) {
    const data = await this.vehiclesService.enableExit(id, userId, req.ip);
    return this.responses.ok(data, 'Exit enabled');
  }

  @Patch(':id/disable-exit')
  @RequirePermissions('VEHICULOS_ENABLE_EXIT')
  @ApiOperation({ summary: 'Disable vehicle exit' })
  async disableExit(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('id') userId: number,
    @Req() req: any,
  ) {
    const data = await this.vehiclesService.disableExit(id, userId, req.ip);
    return this.responses.ok(data, 'Exit disabled');
  }
}
