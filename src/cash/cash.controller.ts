import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CashService } from './cash.service';
import { CreateMovementDto } from './dto/create-movement.dto';
import { CancelMovementDto } from './dto/cancel-movement.dto';
import { QueryMovementDto } from './dto/query-movement.dto';
import { CreateClosureDto } from './dto/create-closure.dto';
import { ResponseService } from '../common/services/response.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';

@ApiTags('cash')
@ApiBearerAuth()
@Controller('cash')
export class CashController {
  constructor(
    private readonly cashService: CashService,
    private readonly responses: ResponseService,
  ) {}

  // ─── MOVEMENTS ────────────────────────────────────────────────

  @Get('movements')
  @RequirePermissions('CAJA_READ')
  @ApiOperation({ summary: 'List financial movements' })
  async findAllMovements(@Query() query: QueryMovementDto) {
    const result = await this.cashService.findAllMovements(query);
    return this.responses.ok(result.data, 'Movements', result.meta);
  }

  @Post('movements')
  @RequirePermissions('CAJA_CREATE_MOVEMENT')
  @ApiOperation({ summary: 'Create a financial movement' })
  async createMovement(
    @Body() dto: CreateMovementDto,
    @CurrentUser('id') userId: number,
    @Req() req: any,
  ) {
    const movement = await this.cashService.createMovement(dto, userId, req.ip);
    return this.responses.created(movement, 'Movement created');
  }

  @Get('movements/:id')
  @RequirePermissions('CAJA_READ')
  @ApiOperation({ summary: 'Get movement by ID' })
  async findMovement(@Param('id', ParseIntPipe) id: number) {
    const movement = await this.cashService.findMovementById(id);
    return this.responses.ok(movement, 'Movement');
  }

  @Patch('movements/:id')
  @RequirePermissions('CAJA_CREATE_MOVEMENT')
  @ApiOperation({ summary: 'Update a financial movement' })
  async updateMovement(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: Partial<CreateMovementDto>,
    @CurrentUser('id') userId: number,
    @Req() req: any,
  ) {
    const movement = await this.cashService.updateMovement(id, dto, userId, req.ip);
    return this.responses.updated(movement, 'Movement updated');
  }

  @Patch('movements/:id/cancel')
  @RequirePermissions('CAJA_CANCEL_MOVEMENT')
  @ApiOperation({ summary: 'Cancel a financial movement' })
  async cancelMovement(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CancelMovementDto,
    @CurrentUser('id') userId: number,
    @Req() req: any,
  ) {
    const movement = await this.cashService.cancelMovement(id, dto, userId, req.ip);
    return this.responses.updated(movement, 'Movement cancelled');
  }

  // ─── SUMMARIES ────────────────────────────────────────────────

  @Get('summary')
  @RequirePermissions('CAJA_READ')
  @ApiOperation({ summary: 'Get cash summary (optionally filtered by date range)' })
  async getSummary(@Query('from') from?: string, @Query('to') to?: string) {
    const summary = await this.cashService.getSummary(from, to);
    return this.responses.ok(summary, 'Cash summary');
  }

  @Get('today-summary')
  @RequirePermissions('CAJA_READ')
  @ApiOperation({ summary: "Get today's cash summary" })
  async getTodaySummary() {
    const summary = await this.cashService.getTodaySummary();
    return this.responses.ok(summary, "Today's cash summary");
  }

  @Get('income-summary')
  @RequirePermissions('CAJA_READ')
  @ApiOperation({ summary: 'Get income movements summary' })
  async getIncomeSummary(@Query('from') from?: string, @Query('to') to?: string) {
    const data = await this.cashService.getIncomeSummary(from, to);
    return this.responses.ok(data, 'Income summary');
  }

  @Get('expense-summary')
  @RequirePermissions('CAJA_READ')
  @ApiOperation({ summary: 'Get expense movements summary' })
  async getExpenseSummary(@Query('from') from?: string, @Query('to') to?: string) {
    const data = await this.cashService.getExpenseSummary(from, to);
    return this.responses.ok(data, 'Expense summary');
  }

  @Get('by-payment-method')
  @RequirePermissions('CAJA_READ')
  @ApiOperation({ summary: 'Get movements grouped by payment method' })
  async getByPaymentMethod(@Query('from') from?: string, @Query('to') to?: string) {
    const data = await this.cashService.getByPaymentMethod(from, to);
    return this.responses.ok(data, 'By payment method');
  }

  @Get('by-service')
  @RequirePermissions('CAJA_READ')
  @ApiOperation({ summary: 'Get movements grouped by origin type (service)' })
  async getByService(@Query('from') from?: string, @Query('to') to?: string) {
    const data = await this.cashService.getByService(from, to);
    return this.responses.ok(data, 'By service');
  }

  // ─── CLOSURES ─────────────────────────────────────────────────

  @Get('closures/preview')
  @RequirePermissions('CAJA_CLOSE')
  @ApiOperation({ summary: 'Preview the next cash closure (pending unassigned movements)' })
  async previewClosure() {
    const preview = await this.cashService.previewClosure();
    return this.responses.ok(preview, 'Closure preview');
  }

  @Get('closures')
  @RequirePermissions('CAJA_READ')
  @ApiOperation({ summary: 'List cash closures' })
  async findAllClosures(@Query('page') page?: string, @Query('limit') limit?: string) {
    const result = await this.cashService.findAllClosures(page ? +page : 1, limit ? +limit : 20);
    return this.responses.ok(result.data, 'Cash closures', result.meta);
  }

  @Post('closures')
  @RequirePermissions('CAJA_CLOSE')
  @ApiOperation({ summary: 'Create a cash closure (close current period)' })
  async createClosure(
    @Body() dto: CreateClosureDto,
    @CurrentUser('id') userId: number,
    @Req() req: any,
  ) {
    const closure = await this.cashService.createClosure(dto, userId, req.ip);
    return this.responses.created(closure, 'Cash closure created');
  }

  @Get('closures/:id/details')
  @RequirePermissions('CAJA_READ')
  @ApiOperation({ summary: 'Get closure details' })
  async getClosureDetails(@Param('id', ParseIntPipe) id: number) {
    const closure = await this.cashService.findClosureById(id);
    return this.responses.ok(closure.details, 'Closure details');
  }

  @Get('closures/:id/print')
  @RequirePermissions('CAJA_READ')
  @ApiOperation({ summary: 'Get closure data for printing' })
  async printClosure(@Param('id', ParseIntPipe) id: number) {
    const closure = await this.cashService.findClosureById(id);
    return this.responses.ok(closure, 'Closure print data');
  }

  @Get('closures/:id')
  @RequirePermissions('CAJA_READ')
  @ApiOperation({ summary: 'Get cash closure by ID' })
  async findClosure(@Param('id', ParseIntPipe) id: number) {
    const closure = await this.cashService.findClosureById(id);
    return this.responses.ok(closure, 'Cash closure');
  }
}
