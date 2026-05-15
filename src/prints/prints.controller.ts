import { Controller, Get, NotFoundException, Param, ParseIntPipe } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VisitorRecord } from '../database/entities/visitor-record.entity';
import { Receipt } from '../database/entities/receipt.entity';
import { CashClosure } from '../database/entities/cash-closure.entity';
import { ParkConfig } from '../database/entities/park-config.entity';
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
    @InjectRepository(ParkConfig)
    private readonly parkConfigRepo: Repository<ParkConfig>,
    private readonly responses: ResponseService,
  ) {}

  private async getParkConfig(): Promise<ParkConfig | null> {
    return this.parkConfigRepo.findOne({ where: {} });
  }

  @Get('visitor-ticket/:id')
  @RequirePermissions('VISITANTES_READ')
  @ApiOperation({ summary: 'Get visitor record data for print rendering' })
  async visitorTicket(@Param('id', ParseIntPipe) id: number) {
    const [record, parkConfig] = await Promise.all([
      this.visitorRepo.findOne({
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
      }),
      this.getParkConfig(),
    ]);
    if (!record) throw new NotFoundException(`Visitor record #${id} not found`);
    return this.responses.ok({ record, parkConfig }, 'Visitor ticket data');
  }

  @Get('receipt/:id')
  @RequirePermissions('RECEIPTS_PRINT')
  @ApiOperation({ summary: 'Get receipt + lines data for print rendering' })
  async receipt(@Param('id', ParseIntPipe) id: number) {
    const [receipt, parkConfig] = await Promise.all([
      this.receiptRepo.findOne({
        where: { id },
        relations: ['paymentMethod', 'createdByUser', 'cancelledByUser', 'lines'],
      }),
      this.getParkConfig(),
    ]);
    if (!receipt) throw new NotFoundException(`Receipt #${id} not found`);
    return this.responses.ok({ receipt, parkConfig }, 'Receipt print data');
  }

  @Get('cash-closure/:id')
  @RequirePermissions('CAJA_READ')
  @ApiOperation({ summary: 'Get cash closure + details data for print rendering' })
  async cashClosure(@Param('id', ParseIntPipe) id: number) {
    const [closure, parkConfig] = await Promise.all([
      this.closureRepo.findOne({
        where: { id },
        relations: ['closedByUser', 'details'],
      }),
      this.getParkConfig(),
    ]);
    if (!closure) throw new NotFoundException(`Cash closure #${id} not found`);
    return this.responses.ok({ closure, parkConfig }, 'Cash closure print data');
  }
}
