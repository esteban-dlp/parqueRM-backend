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
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ReceiptsService } from './receipts.service';
import { CreateReceiptDto } from './dto/create-receipt.dto';
import { CancelReceiptDto } from './dto/cancel-receipt.dto';
import { QueryReceiptDto } from './dto/query-receipt.dto';
import { ResponseService } from '../common/services/response.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';

@ApiTags('receipts')
@ApiBearerAuth()
@Controller('receipts')
export class ReceiptsController {
  constructor(
    private readonly receiptsService: ReceiptsService,
    private readonly responses: ResponseService,
  ) {}

  @Get('next-number')
  @RequirePermissions('RECEIPTS_READ')
  @ApiOperation({ summary: 'Get next auto-generated receipt number' })
  async nextNumber() {
    const number = await this.receiptsService.nextReceiptNumber();
    return this.responses.ok({ receiptNumber: number }, 'Next receipt number');
  }

  @Get()
  @RequirePermissions('RECEIPTS_READ')
  @ApiOperation({ summary: 'List receipts with pagination and filters' })
  async findAll(@Query() query: QueryReceiptDto) {
    const result = await this.receiptsService.findAll(query);
    return this.responses.ok(result.data, 'Receipts', result.meta);
  }

  @Get(':id/print')
  @RequirePermissions('RECEIPTS_PRINT')
  @ApiOperation({ summary: 'Get receipt data for printing' })
  async getPrintData(@Param('id', ParseIntPipe) id: number) {
    const receipt = await this.receiptsService.findById(id);
    return this.responses.ok(receipt, 'Receipt print data');
  }

  @Get(':id')
  @RequirePermissions('RECEIPTS_READ')
  @ApiOperation({ summary: 'Get receipt by ID' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const receipt = await this.receiptsService.findById(id);
    return this.responses.ok(receipt, 'Receipt');
  }

  @Post()
  @RequirePermissions('RECEIPTS_CREATE')
  @ApiOperation({ summary: 'Create a new receipt' })
  async create(
    @Body() dto: CreateReceiptDto,
    @CurrentUser('id') userId: number,
    @Req() req: any,
  ) {
    const receipt = await this.receiptsService.create(dto, userId, req.ip);
    return this.responses.created(receipt, 'Receipt created');
  }

  @Patch(':id')
  @RequirePermissions('RECEIPTS_CREATE')
  @ApiOperation({ summary: 'Update basic fields of an active receipt' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: Partial<CreateReceiptDto>,
    @CurrentUser('id') userId: number,
    @Req() req: any,
  ) {
    const receipt = await this.receiptsService.update(id, dto, userId, req.ip);
    return this.responses.updated(receipt, 'Receipt updated');
  }

  @Patch(':id/cancel')
  @RequirePermissions('RECEIPTS_CANCEL')
  @ApiOperation({ summary: 'Cancel a receipt' })
  async cancel(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CancelReceiptDto,
    @CurrentUser('id') userId: number,
    @Req() req: any,
  ) {
    const receipt = await this.receiptsService.cancel(id, dto, userId, req.ip);
    return this.responses.updated(receipt, 'Receipt cancelled');
  }

  @Delete(':id')
  @RequirePermissions('RECEIPTS_CANCEL')
  @ApiOperation({ summary: 'Delete a cancelled receipt' })
  async delete(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('id') userId: number,
    @Req() req: any,
  ) {
    await this.receiptsService.delete(id, userId, req.ip);
    return this.responses.deleted('Receipt deleted');
  }

  @Post(':id/print')
  @RequirePermissions('RECEIPTS_PRINT')
  @ApiOperation({ summary: 'Trigger print for a receipt' })
  async triggerPrint(@Param('id', ParseIntPipe) id: number) {
    const receipt = await this.receiptsService.findById(id);
    return this.responses.ok(receipt, 'Receipt print triggered');
  }
}
