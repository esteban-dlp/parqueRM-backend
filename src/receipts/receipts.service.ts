import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import { Receipt } from '../database/entities/receipt.entity';
import { ReceiptLine } from '../database/entities/receipt-line.entity';
import { PaymentMethod } from '../database/entities/payment-method.entity';
import { FinancialConcept } from '../database/entities/financial-concept.entity';
import { FinancialMovement } from '../database/entities/financial-movement.entity';
import { AuditService } from '../audit/audit.service';
import { CashService } from '../cash/cash.service';
import { CreateReceiptDto } from './dto/create-receipt.dto';
import { CancelReceiptDto } from './dto/cancel-receipt.dto';
import { QueryReceiptDto } from './dto/query-receipt.dto';
import { guatemalaDateRangeUtc, guatemalaTodayISO, guatemalaTodayRangeUtc } from '../common/utils/guatemala-time';

type ChargeTarget = { originType: string; originId: number };

@Injectable()
export class ReceiptsService {
  private readonly logger = new Logger(ReceiptsService.name);
  private conceptCache: Map<string, number> | null = null;

  private readonly ORIGIN_TO_CONCEPT: Record<string, string> = {
    VISITANTE: 'Ingreso por visitante',
    VEHICULO: 'Ingreso por vehículo',
    HOSPEDAJE: 'Ingreso por hospedaje',
    SERVICIO_GENERAL: 'Servicio general',
    MOVIMIENTO_MANUAL: 'Servicio general',
  };

  constructor(
    @InjectRepository(Receipt)
    private readonly receiptRepo: Repository<Receipt>,
    @InjectRepository(ReceiptLine)
    private readonly lineRepo: Repository<ReceiptLine>,
    @InjectRepository(PaymentMethod)
    private readonly paymentMethodRepo: Repository<PaymentMethod>,
    @InjectRepository(FinancialConcept)
    private readonly conceptRepo: Repository<FinancialConcept>,
    @InjectRepository(FinancialMovement)
    private readonly movementRepo: Repository<FinancialMovement>,
    private readonly auditService: AuditService,
    private readonly cashService: CashService,
  ) {}

  private async resolveConceptId(originType: string): Promise<number | null> {
    if (!this.conceptCache) {
      const concepts = await this.conceptRepo.find({
        where: { type: 'INGRESO', isActive: true },
      });
      this.conceptCache = new Map(concepts.map((c) => [c.name, c.id]));
    }
    const conceptName = this.ORIGIN_TO_CONCEPT[originType] ?? 'Servicio general';
    return this.conceptCache.get(conceptName) ?? null;
  }

  private getChargeTargets(dto: CreateReceiptDto): ChargeTarget[] {
    const byKey = new Map<string, ChargeTarget>();
    const add = (originType?: string | null, originId?: number | null) => {
      if (!originType || originId == null) return;
      const key = `${originType}:${originId}`;
      byKey.set(key, { originType, originId: Number(originId) });
    };

    add(dto.originType, dto.originId ?? null);
    for (const line of dto.lines ?? []) {
      add(line.originType ?? dto.originType, line.originId ?? null);
    }

    return Array.from(byKey.values());
  }

  private async findActiveReceiptForTarget(target: ChargeTarget): Promise<Receipt | null> {
    return this.receiptRepo
      .createQueryBuilder('r')
      .leftJoin('r.lines', 'line')
      .where('r.status = :status', { status: 'ACTIVO' })
      .andWhere(new Brackets((qb) => {
        qb.where('(r.originType = :originType AND r.originId = :originId)')
          .orWhere('(line.originType = :originType AND line.originId = :originId)');
      }))
      .setParameters({ originType: target.originType, originId: target.originId })
      .getOne();
  }

  private async assertNoActiveCharge(dto: CreateReceiptDto): Promise<void> {
    for (const target of this.getChargeTargets(dto)) {
      const existing = await this.findActiveReceiptForTarget(target);
      if (existing) {
        throw new BadRequestException(
          `El registro ${target.originType} #${target.originId} ya tiene un ticket activo (${existing.receiptNumber}). Anule ese ticket antes de cobrar nuevamente.`,
        );
      }
    }
  }

  private async autoCreateMovement(receipt: Receipt, userId: number, ip?: string): Promise<void> {
    try {
      const existing = await this.movementRepo.findOne({
        where: { receiptId: receipt.id, status: 'ACTIVO' },
      });
      if (existing) return;

      const lines = receipt.lines?.length
        ? receipt.lines
        : [this.lineRepo.create({
          receiptId: receipt.id,
          description: `Recibo ${receipt.receiptNumber}`,
          quantity: 1,
          unitPrice: Number(receipt.total),
          total: Number(receipt.total),
          originType: receipt.originType,
          originId: receipt.originId,
        })];

      const rawSubtotal = lines.reduce((sum, line) => sum + Number(line.total ?? 0), 0);
      const subtotal = Number(receipt.subtotal ?? rawSubtotal);
      const receiptTotal = Number(receipt.total);

      if (receiptTotal <= 0) {
        return;
      }

      let allocated = 0;
      for (let i = 0; i < lines.length; i += 1) {
        const line = lines[i];
        const lineTotal = Number(line.total ?? 0);
        const isLast = i === lines.length - 1;
        let amount = subtotal > 0
          ? (lineTotal / subtotal) * receiptTotal
          : lineTotal;
        amount = isLast ? receiptTotal - allocated : parseFloat(amount.toFixed(2));
        amount = parseFloat(Math.max(0, amount).toFixed(2));
        allocated = parseFloat((allocated + amount).toFixed(2));

        if (amount <= 0) continue;

        const originType = line.originType ?? receipt.originType;
        const originId = line.originId ?? receipt.originId ?? undefined;
        const conceptId = line.conceptId ?? await this.resolveConceptId(originType);
        if (!conceptId) {
          this.logger.warn(`No active INGRESO concept found for originType=${originType}, skipping movement line`);
          continue;
        }

        await this.cashService.createMovement(
          {
            movementType: 'INGRESO',
            conceptId,
            paymentMethodId: receipt.paymentMethodId,
            originType: originType as any,
            originId,
            receiptId: receipt.id,
            amount,
            description: `${receipt.receiptNumber} - ${line.description}`,
          },
          userId,
          ip,
        );
      }

      if (allocated <= 0) {
        this.logger.warn(`Receipt #${receipt.id} generated no cash movements`);
        return;
      }
    } catch (err) {
      this.logger.error(`autoCreateMovement failed for receipt #${receipt.id}: ${err?.message}`);
      await this.auditService.record({
        userId,
        action: 'RECEIPT_MOVEMENT_CREATE_FAILED',
        entityName: 'Receipt',
        entityId: receipt.id,
        newValues: { error: String(err?.message) },
        ipAddress: ip,
      });
    }
  }

  private async autoCancelMovement(receiptId: number, cancelReason: string, userId: number, ip?: string): Promise<void> {
    try {
      const movements = await this.movementRepo.find({
        where: { receiptId, status: 'ACTIVO' },
      });
      if (!movements.length) return;

      for (const movement of movements) {
        if (movement.cashClosureId !== null) {
          this.logger.warn(`Movement #${movement.id} belongs to a closed cash period, skipping cancellation`);
          await this.auditService.record({
            userId,
            action: 'RECEIPT_CANCELLED_MOVEMENT_LOCKED',
            entityName: 'FinancialMovement',
            entityId: movement.id,
            newValues: { receiptId, cashClosureId: movement.cashClosureId, cancelReason },
            ipAddress: ip,
          });
          continue;
        }

        await this.cashService.cancelMovement(
          movement.id,
          { cancelReason },
          userId,
          ip,
        );
      }
    } catch (err) {
      this.logger.error(`autoCancelMovement failed for receipt #${receiptId}: ${err?.message}`);
      await this.auditService.record({
        userId,
        action: 'RECEIPT_MOVEMENT_CANCEL_FAILED',
        entityName: 'Receipt',
        entityId: receiptId,
        newValues: { error: String(err?.message) },
        ipAddress: ip,
      });
    }
  }

  async findAll(query: QueryReceiptDto) {
    const page = Math.max(1, query.page ?? 1);
    const take = Math.min(query.limit ?? 20, parseInt(process.env['MAX_PAGE_SIZE'] ?? '100'));
    const skip = (page - 1) * take;

    const qb = this.receiptRepo
      .createQueryBuilder('r')
      .leftJoinAndSelect('r.paymentMethod', 'paymentMethod')
      .leftJoinAndSelect('r.createdByUser', 'createdByUser')
      .leftJoinAndSelect('r.lines', 'lines')
      .orderBy('r.createdAt', 'DESC')
      .skip(skip)
      .take(take);

    if (query.from) {
      qb.andWhere('r.receiptDate >= :from', { from: guatemalaDateRangeUtc(query.from).from });
    }
    if (query.to) {
      qb.andWhere('r.receiptDate <= :to', { to: guatemalaDateRangeUtc(undefined, query.to).to });
    }
    if (query.status) {
      qb.andWhere('r.status = :status', { status: query.status });
    }
    if (query.paymentMethodId) {
      qb.andWhere('r.paymentMethodId = :pmId', { pmId: query.paymentMethodId });
    }
    if (query.originType) {
      qb.andWhere('r.originType = :originType', { originType: query.originType });
    }

    const [data, total] = await qb.getManyAndCount();
    return {
      data,
      meta: { total, page, limit: take, totalPages: Math.ceil(total / take) },
    };
  }

  async findById(id: number): Promise<Receipt> {
    const receipt = await this.receiptRepo.findOne({
      where: { id },
      relations: ['paymentMethod', 'createdByUser', 'cancelledByUser', 'lines', 'lines.concept'],
    });
    if (!receipt) throw new NotFoundException(`Receipt #${id} not found`);
    return receipt;
  }

  async nextReceiptNumber(): Promise<string> {
    const dateStr = guatemalaTodayISO().replace(/-/g, '');

    // Count receipts created today
    const { start: startOfDay, end: endOfDay } = guatemalaTodayRangeUtc();

    const count = await this.receiptRepo
      .createQueryBuilder('r')
      .where('r.createdAt >= :start', { start: startOfDay })
      .andWhere('r.createdAt < :end', { end: endOfDay })
      .getCount();

    const seq = String(count + 1).padStart(5, '0');
    return `REC-${dateStr}-${seq}`;
  }

  async create(dto: CreateReceiptDto, userId: number, ip?: string): Promise<Receipt> {
    await this.assertNoActiveCharge(dto);

    const receiptNumber = dto.receiptNumber ?? (await this.nextReceiptNumber());

    const subtotalVal = dto.subtotal ?? dto.total;
    const discountType = dto.discountType ?? null;
    const discountValue = dto.discountValue ?? null;

    let discountPct: number | null = null;
    let discountAmt: number | null = dto.discountAmount ?? null;

    if (discountType === 'PERCENTAGE' && discountValue !== null) {
      discountPct = discountValue;
      discountAmt = parseFloat((subtotalVal * discountValue / 100).toFixed(2));
    } else if (discountType === 'AMOUNT' && discountValue !== null) {
      discountAmt = discountValue;
    }

    const receipt = this.receiptRepo.create({
      receiptNumber,
      contributorName: dto.contributorName ?? null,
      contributorDocument: dto.contributorDocument ?? null,
      contributorAddress: dto.contributorAddress ?? null,
      originType: dto.originType,
      originId: dto.originId ?? null,
      paymentMethodId: dto.paymentMethodId,
      subtotal: dto.subtotal ?? null,
      discountType,
      discountPercentage: discountPct,
      discountAmount: discountAmt,
      discountReason: dto.discountReason ?? null,
      total: dto.total,
      amountReceived: dto.amountReceived ?? null,
      changeAmount: dto.changeAmount ?? null,
      paymentReference: dto.paymentReference ?? null,
      status: 'ACTIVO',
      createdByUserId: userId,
    });

    const saved = await this.receiptRepo.save(receipt);

    if (dto.lines && dto.lines.length > 0) {
      const lines = dto.lines.map((l) =>
        this.lineRepo.create({
          receiptId: saved.id,
          conceptId: l.conceptId ?? null,
          originType: l.originType ?? dto.originType,
          originId: l.originId ?? dto.originId ?? null,
          description: l.description,
          quantity: l.quantity,
          unitPrice: l.unitPrice,
          total: l.total,
        }),
      );
      await this.lineRepo.save(lines);
    }

    await this.auditService.record({
      userId,
      action: 'CREATE_RECEIPT',
      entityName: 'Receipt',
      entityId: saved.id,
      newValues: {
        receiptNumber: saved.receiptNumber,
        subtotal: saved.subtotal,
        discountPercentage: saved.discountPercentage,
        discountAmount: saved.discountAmount,
        total: saved.total,
      },
      ipAddress: ip,
    });

    const receiptWithLines = await this.findById(saved.id);
    await this.autoCreateMovement(receiptWithLines, userId, ip);

    return receiptWithLines;
  }

  async update(id: number, dto: Partial<CreateReceiptDto>, userId: number, ip?: string): Promise<Receipt> {
    const receipt = await this.findById(id);
    if (receipt.status !== 'ACTIVO') {
      throw new BadRequestException('Only active receipts can be updated');
    }

    const old = { ...receipt };

    if (dto.contributorName !== undefined) receipt.contributorName = dto.contributorName ?? null;
    if (dto.contributorDocument !== undefined) receipt.contributorDocument = dto.contributorDocument ?? null;
    if (dto.contributorAddress !== undefined) receipt.contributorAddress = dto.contributorAddress ?? null;
    if (dto.paymentReference !== undefined) receipt.paymentReference = dto.paymentReference ?? null;
    if (dto.amountReceived !== undefined) receipt.amountReceived = dto.amountReceived ?? null;
    if (dto.changeAmount !== undefined) receipt.changeAmount = dto.changeAmount ?? null;
    receipt.updatedAt = new Date();

    const saved = await this.receiptRepo.save(receipt);

    await this.auditService.record({
      userId,
      action: 'UPDATE_RECEIPT',
      entityName: 'Receipt',
      entityId: id,
      oldValues: old,
      newValues: saved,
      ipAddress: ip,
    });

    return this.findById(id);
  }

  async cancel(id: number, dto: CancelReceiptDto, userId: number, ip?: string): Promise<Receipt> {
    const receipt = await this.findById(id);
    if (receipt.status === 'ANULADO') {
      throw new BadRequestException('Receipt is already cancelled');
    }

    const old = { status: receipt.status };

    receipt.status = 'ANULADO';
    receipt.cancelledByUserId = userId;
    receipt.cancelledAt = new Date();
    receipt.cancelReason = dto.cancelReason;
    receipt.updatedAt = new Date();

    const saved = await this.receiptRepo.save(receipt);

    await this.auditService.record({
      userId,
      action: 'CANCEL_RECEIPT',
      entityName: 'Receipt',
      entityId: id,
      oldValues: old,
      newValues: { status: 'ANULADO', cancelReason: dto.cancelReason },
      ipAddress: ip,
    });

    await this.autoCancelMovement(id, dto.cancelReason, userId, ip);

    return saved;
  }

  async delete(id: number, userId: number, ip?: string): Promise<void> {
    const receipt = await this.findById(id);
    if (receipt.status === 'ACTIVO') {
      throw new BadRequestException('Cannot delete active receipt — cancel it first');
    }

    await this.auditService.record({
      userId,
      action: 'DELETE_RECEIPT',
      entityName: 'Receipt',
      entityId: id,
      oldValues: { receiptNumber: receipt.receiptNumber, status: receipt.status },
      ipAddress: ip,
    });

    await this.receiptRepo.delete(id);
  }
}
