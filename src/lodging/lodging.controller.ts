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
import { LodgingService } from './lodging.service';
import { CreateLodgingDto } from './dto/create-lodging.dto';
import { UpdateLodgingDto } from './dto/update-lodging.dto';
import { QueryLodgingDto } from './dto/query-lodging.dto';
import { ResponseService } from '../common/services/response.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';

@ApiTags('lodging')
@ApiBearerAuth()
@Controller('lodging')
export class LodgingController {
  constructor(
    private readonly lodgingService: LodgingService,
    private readonly responses: ResponseService,
  ) {}

  @Get('today')
  @RequirePermissions('HOSPEDAJE_READ')
  @ApiOperation({ summary: "Today's lodging records" })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async today(@Query('page') page?: string, @Query('limit') limit?: string) {
    const result = await this.lodgingService.findToday(page ? +page : 1, limit ? +limit : 20);
    return this.responses.ok(result.data, 'Today lodging', result.meta);
  }

  @Get('today-summary')
  @RequirePermissions('HOSPEDAJE_READ')
  @ApiOperation({ summary: "Today's lodging summary" })
  async todaySummary() {
    const data = await this.lodgingService.todaySummary();
    return this.responses.ok(data, 'Today lodging summary');
  }

  @Get('month-summary')
  @RequirePermissions('HOSPEDAJE_READ')
  @ApiOperation({ summary: 'Monthly lodging summary' })
  @ApiQuery({ name: 'year', required: true, type: Number })
  @ApiQuery({ name: 'month', required: true, type: Number })
  async monthSummary(@Query('year') year: string, @Query('month') month: string) {
    const data = await this.lodgingService.monthSummary(+year, +month);
    return this.responses.ok(data, 'Month lodging summary');
  }

  @Get()
  @RequirePermissions('HOSPEDAJE_READ')
  @ApiOperation({ summary: 'List lodging records (paginated)' })
  async findAll(@Query() query: QueryLodgingDto) {
    const result = await this.lodgingService.findAll(query);
    return this.responses.ok(result.data, 'Lodging records', result.meta);
  }

  @Get(':id')
  @RequirePermissions('HOSPEDAJE_READ')
  @ApiOperation({ summary: 'Get a single lodging record' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const data = await this.lodgingService.findById(id);
    return this.responses.ok(data, 'Lodging record');
  }

  @Post()
  @RequirePermissions('HOSPEDAJE_CREATE')
  @ApiOperation({ summary: 'Register lodging' })
  async create(
    @Body() dto: CreateLodgingDto,
    @CurrentUser('id') userId: number,
    @CurrentUser('permissions') userPermissions: string[],
    @Req() req: any,
  ) {
    const data = await this.lodgingService.create(dto, userId, req.ip, userPermissions ?? []);
    return this.responses.created(data);
  }

  @Patch(':id')
  @RequirePermissions('HOSPEDAJE_CREATE')
  @ApiOperation({ summary: 'Update a lodging record' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateLodgingDto,
    @CurrentUser('id') userId: number,
    @CurrentUser('permissions') userPermissions: string[],
    @Req() req: any,
  ) {
    const data = await this.lodgingService.update(id, dto, userId, req.ip, userPermissions ?? []);
    return this.responses.updated(data);
  }

  @Delete(':id')
  @RequirePermissions('HOSPEDAJE_CREATE')
  @ApiOperation({ summary: 'Delete a lodging record (hard delete with audit)' })
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('id') userId: number,
    @Req() req: any,
  ) {
    await this.lodgingService.delete(id, userId, req.ip);
    return this.responses.deleted('Lodging record deleted');
  }
}
