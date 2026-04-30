import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { FinancialMovement } from '../database/entities/financial-movement.entity';
import { CashClosure } from '../database/entities/cash-closure.entity';
import { CashClosureDetail } from '../database/entities/cash-closure-detail.entity';
import { FinancialConcept } from '../database/entities/financial-concept.entity';
import { PaymentMethod } from '../database/entities/payment-method.entity';
import { AuditService } from '../audit/audit.service';
import { CreateMovementDto } from './dto/create-movement.dto';
import { CancelMovementDto } from './dto/cancel-movement.dto';
import { QueryMovementDto } from './dto/query-movement.dto';
import { CreateClosureDto } from './dto/create-closure.dto';

@Injectable()
export class CashService {
  constructor(
    @InjectRepository(FinancialMovement)
    private readonly movementRepo: Repository<FinancialMovement>,
    @InjectRepository(CashClosure)
    private readonly closureRepo: Repository<CashClosure>,
    @InjectRepository(CashClosureDetail)
    private readonly closureDetailRepo: Repository<CashClosureDetail>,
    @InjectRepository(FinancialConcept)
    private readonly conceptRepo: Repository<FinancialConcept>,
    @InjectRepository(PaymentMethod)
    private readonly paymentMethodRepo: Repository<PaymentMethod>,
    private readonly auditService: AuditService,
  ) {}

  // ─── MOVEMENTS ────────────────────────────────────────────────

  async findAllMovements(query: QueryMovementDto) {
    const page = Math.max(1, query.page ?? 1);
    const take = Math.min(query.limit ?? 20, parseInt(process.env['MAX_PAGE_SIZE'] ?? '100'));
    const skip = (page - 1) * take;

    const qb = this.movementRepo
      .createQueryBuilder('m')
      .leftJoinAndSelect('m.concept', 'concept')
      .leftJoinAndSelect('m.paymentMethod', 'paymentMethod')
      .leftJoinAndSelect('m.createdByUser', 'createdByUser')
      .orderBy('m.createdAt', 'DESC')
      .skip(skip)
      .take(take);

    if (query.from) {
      qb.andWhere('m.movementDate >= :from', { from: query.from });
    }
    if (query.to) {
      qb.andWhere('m.movementDate <= :to', { to: query.to });
    }
    if (query.movementType) {
      qb.andWhere('m.movementType = :movementType', { movementType: query.movementType });
    }
    if (query.conceptId) {
      qb.andWhere('m.conceptId = :conceptId', { conceptId: query.conceptId });
    }
    if (query.paymentMethodId) {
      qb.andWhere('m.paymentMethodId = :pmId', { pmId: query.paymentMethodId });
    }
    if (query.status) {
      qb.andWhere('m.status = :status', { status: query.status });
    }
    if (query.originType) {
      qb.andWhere('m.originType = :originType', { originType: query.originType });
    }

    const [data, total] = await qb.getManyAndCount();
    return {
      data,
      meta: { total, page, limit: take, totalPages: Math.ceil(total / take) },
    };
  }

  async findMovementById(id: number): Promise<FinancialMovement> {
    const movement = await this.movementRepo.findOne({
      where: { id },
      relations: ['concept', 'paymentMethod', 'createdByUser', 'cancelledByUser'],
    });
    if (!movement) throw new NotFoundException(`Movement #${id} not found`);
    return movement;
  }

  async createMovement(dto: CreateMovementDto, userId: number, ip?: string): Promise<FinancialMovement> {
    const movement = this.movementRepo.create({
      movementType: dto.movementType as 'INGRESO' | 'EGRESO',
      conceptId: dto.conceptId,
      paymentMethodId: dto.paymentMethodId,
      originType: dto.originType,
      originId: dto.originId ?? null,
      receiptId: dto.receiptId ?? null,
      amount: dto.amount,
      description: dto.description ?? null,
      status: 'ACTIVO',
      createdByUserId: userId,
    });

    const saved = await this.movementRepo.save(movement);

    await this.auditService.record({
      userId,
      action: 'CREATE_MOVEMENT',
      entityName: 'FinancialMovement',
      entityId: saved.id,
      newValues: { movementType: saved.movementType, amount: saved.amount },
      ipAddress: ip,
    });

    return this.findMovementById(saved.id);
  }

  async updateMovement(
    id: number,
    dto: Partial<CreateMovementDto>,
    userId: number,
    ip?: string,
  ): Promise<FinancialMovement> {
    const movement = await this.findMovementById(id);
    if (movement.status !== 'ACTIVO') {
      throw new BadRequestException('Only active movements can be updated');
    }

    const old = { ...movement };

    if (dto.description !== undefined) movement.description = dto.description ?? null;
    if (dto.amount !== undefined) movement.amount = dto.amount;
    movement.updatedAt = new Date();

    const saved = await this.movementRepo.save(movement);

    await this.auditService.record({
      userId,
      action: 'UPDATE_MOVEMENT',
      entityName: 'FinancialMovement',
      entityId: id,
      oldValues: old,
      newValues: saved,
      ipAddress: ip,
    });

    return this.findMovementById(id);
  }

  async cancelMovement(
    id: number,
    dto: CancelMovementDto,
    userId: number,
    ip?: string,
  ): Promise<FinancialMovement> {
    const movement = await this.findMovementById(id);

    if (movement.status === 'ANULADO') {
      throw new BadRequestException('Movement is already cancelled');
    }

    if (movement.cashClosureId !== null) {
      throw new BadRequestException('Cannot cancel movement that belongs to a closed cash period');
    }

    const old = { status: movement.status };

    movement.status = 'ANULADO';
    movement.cancelledByUserId = userId;
    movement.cancelledAt = new Date();
    movement.cancelReason = dto.cancelReason;
    movement.updatedAt = new Date();

    const saved = await this.movementRepo.save(movement);

    await this.auditService.record({
      userId,
      action: 'CANCEL_MOVEMENT',
      entityName: 'FinancialMovement',
      entityId: id,
      oldValues: old,
      newValues: { status: 'ANULADO', cancelReason: dto.cancelReason },
      ipAddress: ip,
    });

    return saved;
  }

  // ─── SUMMARIES ────────────────────────────────────────────────

  async getSummary(from?: string, to?: string) {
    const qb = this.movementRepo
      .createQueryBuilder('m')
      .leftJoinAndSelect('m.paymentMethod', 'paymentMethod')
      .where('m.status = :status', { status: 'ACTIVO' });

    if (from) qb.andWhere('m.movementDate >= :from', { from });
    if (to) qb.andWhere('m.movementDate <= :to', { to });

    const movements = await qb.getMany();

    const totalIncome = movements
      .filter((m) => m.movementType === 'INGRESO')
      .reduce((sum, m) => sum + Number(m.amount), 0);

    const totalExpense = movements
      .filter((m) => m.movementType === 'EGRESO')
      .reduce((sum, m) => sum + Number(m.amount), 0);

    // Group by payment method
    const byPaymentMethodMap = new Map<string, number>();
    for (const m of movements) {
      const key = (m.paymentMethod as any)?.name ?? `PM#${m.paymentMethodId}`;
      byPaymentMethodMap.set(key, (byPaymentMethodMap.get(key) ?? 0) + Number(m.amount));
    }
    const byPaymentMethod = Array.from(byPaymentMethodMap.entries()).map(([method, total]) => ({
      method,
      total,
    }));

    // Group by movement type
    const byMovementType = [
      { type: 'INGRESO', total: totalIncome },
      { type: 'EGRESO', total: totalExpense },
    ];

    return {
      totalIncome,
      totalExpense,
      net: totalIncome - totalExpense,
      byPaymentMethod,
      byMovementType,
    };
  }

  async getTodaySummary() {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString();
    return this.getSummary(start, end);
  }

  async getIncomeSummary(from?: string, to?: string) {
    const qb = this.movementRepo
      .createQueryBuilder('m')
      .leftJoinAndSelect('m.concept', 'concept')
      .leftJoinAndSelect('m.paymentMethod', 'paymentMethod')
      .where('m.status = :status', { status: 'ACTIVO' })
      .andWhere('m.movementType = :type', { type: 'INGRESO' });

    if (from) qb.andWhere('m.movementDate >= :from', { from });
    if (to) qb.andWhere('m.movementDate <= :to', { to });

    return qb.getMany();
  }

  async getExpenseSummary(from?: string, to?: string) {
    const qb = this.movementRepo
      .createQueryBuilder('m')
      .leftJoinAndSelect('m.concept', 'concept')
      .leftJoinAndSelect('m.paymentMethod', 'paymentMethod')
      .where('m.status = :status', { status: 'ACTIVO' })
      .andWhere('m.movementType = :type', { type: 'EGRESO' });

    if (from) qb.andWhere('m.movementDate >= :from', { from });
    if (to) qb.andWhere('m.movementDate <= :to', { to });

    return qb.getMany();
  }

  async getByPaymentMethod(from?: string, to?: string) {
    const qb = this.movementRepo
      .createQueryBuilder('m')
      .select('m.paymentMethodId', 'paymentMethodId')
      .addSelect('pm.name', 'paymentMethod')
      .addSelect('SUM(m.amount)', 'total')
      .addSelect('m.movementType', 'movementType')
      .leftJoin('m.paymentMethod', 'pm')
      .where('m.status = :status', { status: 'ACTIVO' })
      .groupBy('m.paymentMethodId')
      .addGroupBy('pm.name')
      .addGroupBy('m.movementType');

    if (from) qb.andWhere('m.movementDate >= :from', { from });
    if (to) qb.andWhere('m.movementDate <= :to', { to });

    return qb.getRawMany();
  }

  async getByService(from?: string, to?: string) {
    const qb = this.movementRepo
      .createQueryBuilder('m')
      .select('m.originType', 'originType')
      .addSelect('SUM(m.amount)', 'total')
      .addSelect('COUNT(m.id)', 'count')
      .where('m.status = :status', { status: 'ACTIVO' })
      .groupBy('m.originType');

    if (from) qb.andWhere('m.movementDate >= :from', { from });
    if (to) qb.andWhere('m.movementDate <= :to', { to });

    return qb.getRawMany();
  }

  // ─── CLOSURES ─────────────────────────────────────────────────

  async findAllClosures(page = 1, limit = 20) {
    const take = Math.min(limit, parseInt(process.env['MAX_PAGE_SIZE'] ?? '100'));
    const skip = (Math.max(1, page) - 1) * take;

    const [data, total] = await this.closureRepo.findAndCount({
      relations: ['closedByUser', 'details'],
      order: { createdAt: 'DESC' },
      skip,
      take,
    });

    return {
      data,
      meta: { total, page, limit: take, totalPages: Math.ceil(total / take) },
    };
  }

  async findClosureById(id: number): Promise<CashClosure> {
    const closure = await this.closureRepo.findOne({
      where: { id },
      relations: ['closedByUser', 'details'],
    });
    if (!closure) throw new NotFoundException(`Cash closure #${id} not found`);
    return closure;
  }

  async previewClosure() {
    // All ACTIVO movements not yet assigned to a closure
    const movements = await this.movementRepo.find({
      where: { status: 'ACTIVO', cashClosureId: IsNull() },
      relations: ['concept', 'paymentMethod'],
    });

    const totalIncome = movements
      .filter((m) => m.movementType === 'INGRESO')
      .reduce((sum, m) => sum + Number(m.amount), 0);

    const totalExpense = movements
      .filter((m) => m.movementType === 'EGRESO')
      .reduce((sum, m) => sum + Number(m.amount), 0);

    // By payment method
    const byPaymentMethodMap = new Map<string, { id: number; name: string; total: number }>();
    for (const m of movements) {
      const pmId = m.paymentMethodId;
      const pmName = (m.paymentMethod as any)?.name ?? `PM#${pmId}`;
      if (!byPaymentMethodMap.has(pmName)) {
        byPaymentMethodMap.set(pmName, { id: pmId, name: pmName, total: 0 });
      }
      byPaymentMethodMap.get(pmName)!.total += Number(m.amount);
    }

    // By concept
    const byConceptMap = new Map<string, { id: number; name: string; total: number }>();
    for (const m of movements) {
      const cId = m.conceptId;
      const cName = (m.concept as any)?.name ?? `Concept#${cId}`;
      if (!byConceptMap.has(cName)) {
        byConceptMap.set(cName, { id: cId, name: cName, total: 0 });
      }
      byConceptMap.get(cName)!.total += Number(m.amount);
    }

    return {
      movementCount: movements.length,
      totalIncome,
      totalExpense,
      totalNet: totalIncome - totalExpense,
      byPaymentMethod: Array.from(byPaymentMethodMap.values()),
      byConcept: Array.from(byConceptMap.values()),
    };
  }

  async createClosure(dto: CreateClosureDto, userId: number, ip?: string): Promise<CashClosure> {
    const preview = await this.previewClosure();

    // Generate closure number
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');

    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const countToday = await this.closureRepo
      .createQueryBuilder('c')
      .where('c.createdAt >= :start', { start: startOfDay })
      .andWhere('c.createdAt < :end', { end: endOfDay })
      .getCount();

    const seq = String(countToday + 1).padStart(4, '0');
    const closureNumber = `CIERRE-${dateStr}-${seq}`;

    const closure = this.closureRepo.create({
      closureNumber,
      totalIncome: preview.totalIncome,
      totalExpense: preview.totalExpense,
      totalNet: preview.totalNet,
      observations: dto.observations ?? null,
      closedByUserId: userId,
    });

    const savedClosure = await this.closureRepo.save(closure);

    // Save details by payment method
    const detailsByPm: CashClosureDetail[] = preview.byPaymentMethod.map((pm) =>
      this.closureDetailRepo.create({
        cashClosureId: savedClosure.id,
        detailType: 'MEDIO_PAGO',
        label: pm.name,
        totalAmount: pm.total,
      }),
    );

    // Save details by concept
    const detailsByConcept: CashClosureDetail[] = preview.byConcept.map((c) =>
      this.closureDetailRepo.create({
        cashClosureId: savedClosure.id,
        detailType: 'CONCEPTO',
        label: c.name,
        totalAmount: c.total,
      }),
    );

    await this.closureDetailRepo.save([...detailsByPm, ...detailsByConcept]);

    // Update all unassigned ACTIVO movements
    await this.movementRepo
      .createQueryBuilder()
      .update(FinancialMovement)
      .set({ cashClosureId: savedClosure.id })
      .where('status = :status', { status: 'ACTIVO' })
      .andWhere('cashClosureId IS NULL')
      .execute();

    await this.auditService.record({
      userId,
      action: 'CLOSE_CASH',
      entityName: 'CashClosure',
      entityId: savedClosure.id,
      newValues: {
        closureNumber,
        totalIncome: preview.totalIncome,
        totalExpense: preview.totalExpense,
        totalNet: preview.totalNet,
        movementCount: preview.movementCount,
      },
      ipAddress: ip,
    });

    return this.findClosureById(savedClosure.id);
  }
}
