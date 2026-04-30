import { Controller, Get, NotFoundException, Param, ParseIntPipe } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VisitorRecord } from '../database/entities/visitor-record.entity';
import { Receipt } from '../database/entities/receipt.entity';
import { CashClosure } from '../database/entities/cash-closure.entity';
import { ResponseService } from '../common/services/response.service';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';

@ApiTags('prints')
@ApiBearerAuth()
@Controller('prints')
export class PrintsController {
  constructor(
    @InjectRepository(VisitorRecord)
    private readonly visitorRepo: Repository<VisitorRecord>,
    @InjectRepository(Receipt)
    private readonly receiptRepo: Repository<Receipt>,
    @InjectRepository(CashClosure)
    private readonly closureRepo: Repository<CashClosure>,
    private readonly responses: ResponseService,
  ) {}

  @Get('visitor-ticket/:id')
  @RequirePermissions('VISITANTES_READ')
  @ApiOperation({ summary: 'Get visitor record data for print rendering' })
  async visitorTicket(@Param('id', ParseIntPipe) id: number) {
    const record = await this.visitorRepo.findOne({
      where: { id },
      relations: [
        'visitorCategory',
        'country',
        'department',
        'municipality',
        'tariff',
        'createdByUser',
        'visitReasons',
        'visitActivities',
      ],
    });
    if (!record) throw new NotFoundException(`Visitor record #${id} not found`);
    return this.responses.ok(record, 'Visitor ticket data');
  }

  @Get('receipt/:id')
  @RequirePermissions('RECEIPTS_PRINT')
  @ApiOperation({ summary: 'Get receipt + lines data for print rendering' })
  async receipt(@Param('id', ParseIntPipe) id: number) {
    const receipt = await this.receiptRepo.findOne({
      where: { id },
      relations: ['paymentMethod', 'createdByUser', 'cancelledByUser', 'lines'],
    });
    if (!receipt) throw new NotFoundException(`Receipt #${id} not found`);
    return this.responses.ok(receipt, 'Receipt print data');
  }

  @Get('cash-closure/:id')
  @RequirePermissions('CAJA_READ')
  @ApiOperation({ summary: 'Get cash closure + details data for print rendering' })
  async cashClosure(@Param('id', ParseIntPipe) id: number) {
    const closure = await this.closureRepo.findOne({
      where: { id },
      relations: ['closedByUser', 'details'],
    });
    if (!closure) throw new NotFoundException(`Cash closure #${id} not found`);
    return this.responses.ok(closure, 'Cash closure print data');
  }
}
