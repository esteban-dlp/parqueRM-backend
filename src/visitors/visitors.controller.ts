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
import { VisitorsService } from './visitors.service';
import { CreateVisitorDto } from './dto/create-visitor.dto';
import { UpdateVisitorDto } from './dto/update-visitor.dto';
import { QueryVisitorDto } from './dto/query-visitor.dto';
import { ResponseService } from '../common/services/response.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';

@ApiTags('visitors')
@ApiBearerAuth()
@Controller('visitors')
export class VisitorsController {
  constructor(
    private readonly visitorsService: VisitorsService,
    private readonly responses: ResponseService,
  ) {}

  @Get('currently-inside')
  @RequirePermissions('VISITANTES_READ')
  @ApiOperation({ summary: 'List visitors currently inside (no check-out)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async currentlyInside(@Query('page') page?: string, @Query('limit') limit?: string) {
    const result = await this.visitorsService.findCurrentlyInside(
      page ? +page : 1,
      limit ? +limit : 20,
    );
    return this.responses.ok(result.data, 'Visitors currently inside', result.meta);
  }

  @Get('today')
  @RequirePermissions('VISITANTES_READ')
  @ApiOperation({ summary: "List today's visitor records" })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async today(@Query('page') page?: string, @Query('limit') limit?: string) {
    const result = await this.visitorsService.findToday(
      page ? +page : 1,
      limit ? +limit : 20,
    );
    return this.responses.ok(result.data, 'Today visitors', result.meta);
  }

  @Get('today-summary')
  @RequirePermissions('VISITANTES_READ')
  @ApiOperation({ summary: "Today's visitor summary" })
  async todaySummary() {
    const data = await this.visitorsService.todaySummary();
    return this.responses.ok(data, 'Today summary');
  }

  @Get('occupancy')
  @RequirePermissions('VISITANTES_READ')
  @ApiOperation({ summary: 'Current occupancy vs max capacity' })
  async occupancy() {
    const data = await this.visitorsService.occupancySummary();
    return this.responses.ok(data, 'Occupancy');
  }

  @Get('search')
  @RequirePermissions('VISITANTES_READ')
  @ApiOperation({ summary: 'Search visitors by name or identification number' })
  @ApiQuery({ name: 'q', required: true, type: String })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async search(
    @Query('q') q: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const result = await this.visitorsService.search(q ?? '', page ? +page : 1, limit ? +limit : 20);
    return this.responses.ok(result.data, 'Search results', result.meta);
  }

  @Get()
  @RequirePermissions('VISITANTES_READ')
  @ApiOperation({ summary: 'List visitors (paginated, with filters)' })
  async findAll(@Query() query: QueryVisitorDto) {
    const result = await this.visitorsService.findAll(query);
    return this.responses.ok(result.data, 'Visitors', result.meta);
  }

  @Get(':id')
  @RequirePermissions('VISITANTES_READ')
  @ApiOperation({ summary: 'Get a single visitor record' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const data = await this.visitorsService.findById(id);
    return this.responses.ok(data, 'Visitor record');
  }

  @Post()
  @RequirePermissions('VISITANTES_CREATE')
  @ApiOperation({ summary: 'Register a new visitor' })
  async create(
    @Body() dto: CreateVisitorDto,
    @CurrentUser('id') userId: number,
    @CurrentUser('permissions') userPermissions: string[],
    @Req() req: any,
  ) {
    const data = await this.visitorsService.create(dto, userId, req.ip, userPermissions ?? []);
    return this.responses.created(data);
  }

  @Patch(':id')
  @RequirePermissions('VISITANTES_UPDATE')
  @ApiOperation({ summary: 'Update a visitor record' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateVisitorDto,
    @CurrentUser('id') userId: number,
    @CurrentUser('permissions') userPermissions: string[],
    @Req() req: any,
  ) {
    const data = await this.visitorsService.update(id, dto, userId, req.ip, userPermissions ?? []);
    return this.responses.updated(data);
  }

  @Delete(':id')
  @RequirePermissions('VISITANTES_UPDATE')
  @ApiOperation({ summary: 'Delete a visitor record (hard delete with audit)' })
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('id') userId: number,
    @Req() req: any,
  ) {
    await this.visitorsService.delete(id, userId, req.ip);
    return this.responses.deleted('Visitor record deleted');
  }

  @Post('bulk-check-out')
  @RequirePermissions('VISITANTES_CHECKOUT')
  @ApiOperation({ summary: 'Bulk check-out multiple visitors' })
  async bulkCheckout(
    @Body() body: { ids: number[] },
    @CurrentUser('id') userId: number,
    @Req() req: any,
  ) {
    const data = await this.visitorsService.bulkCheckout(body.ids, userId, req.ip);
    return this.responses.ok(data, 'Bulk check-out completed');
  }

  @Post(':id/check-out')
  @RequirePermissions('VISITANTES_CHECKOUT')
  @ApiOperation({ summary: 'Check out a visitor' })
  async checkout(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('id') userId: number,
    @Req() req: any,
  ) {
    const data = await this.visitorsService.checkout(id, userId, req.ip);
    return this.responses.ok(data, 'Check-out registered');
  }

  @Get(':id/ticket')
  @RequirePermissions('VISITANTES_READ')
  @ApiOperation({ summary: 'Get visitor ticket data' })
  async ticket(@Param('id', ParseIntPipe) id: number) {
    const data = await this.visitorsService.findById(id);
    return this.responses.ok(data, 'Visitor ticket');
  }
}
