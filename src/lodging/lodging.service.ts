import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import { LodgingRecord } from '../database/entities/lodging-record.entity';
import { Tariff } from '../database/entities/tariff.entity';
import { Receipt } from '../database/entities/receipt.entity';
import { FinancialMovement } from '../database/entities/financial-movement.entity';
import { AuditService } from '../audit/audit.service';
import { CreateLodgingDto } from './dto/create-lodging.dto';
import { UpdateLodgingDto } from './dto/update-lodging.dto';
import { QueryLodgingDto } from './dto/query-lodging.dto';
import { guatemalaTodayISO } from '../common/utils/guatemala-time';

@Injectable()
export class LodgingService {
  constructor(
    @InjectRepository(LodgingRecord)
    private readonly repo: Repository<LodgingRecord>,
    @InjectRepository(Tariff)
    private readonly tariffRepo: Repository<Tariff>,
    @InjectRepository(Receipt)
    private readonly receiptRepo: Repository<Receipt>,
    @InjectRepository(FinancialMovement)
    private readonly movementRepo: Repository<FinancialMovement>,
    private readonly auditService: AuditService,
  ) {}

  private async assertEditable(record: LodgingRecord): Promise<void> {
    if ((record as LodgingRecord & { isPaid?: boolean }).isPaid) {
      throw new BadRequestException('No se puede editar un registro ya cobrado. Debe anularse o registrarse un ajuste.');
    }

    const movement = await this.movementRepo
      .createQueryBuilder('m')
      .where('m.originType = :originType', { originType: 'HOSPEDAJE' })
      .andWhere('m.originId = :originId', { originId: record.id })
      .andWhere('(m.status = :status OR m.cashClosureId IS NOT NULL)', { status: 'ACTIVO' })
      .getOne();
    if (movement) {
      throw new BadRequestException('No se puede editar un registro ya cobrado. Debe anularse o registrarse un ajuste.');
    }
  }

  private async resolvedTariffAmount(tariffId: number | null, isForeign = false): Promise<number | null> {
    if (!tariffId) return null;
    const tariff = await this.tariffRepo.findOne({ where: { id: tariffId } });
    if (!tariff) return null;
    return isForeign ? Number(tariff.amountForeign) : Number(tariff.amountLocal);
  }

  private async attachPaymentStatus<T extends LodgingRecord>(records: T[]): Promise<T[]> {
    if (!records.length) return records;
    const ids = records.map((r) => r.id);
    const receipts = await this.receiptRepo
      .createQueryBuilder('r')
      .leftJoinAndSelect('r.lines', 'line')
      .where('r.status = :status', { status: 'ACTIVO' })
      .andWhere(new Brackets((qb) => {
        qb.where('(r.originType = :originType AND r.originId IN (:...ids))')
          .orWhere('(line.originType = :originType AND line.originId IN (:...ids))');
      }))
      .setParameters({ originType: 'HOSPEDAJE', ids })
      .getMany();

    const receiptByRecord = new Map<number, Receipt>();
    for (const receipt of receipts) {
      if (receipt.originType === 'HOSPEDAJE' && receipt.originId != null) {
        receiptByRecord.set(Number(receipt.originId), receipt);
      }
      for (const line of receipt.lines ?? []) {
        if (line.originType === 'HOSPEDAJE' && line.originId != null) {
          receiptByRecord.set(Number(line.originId), receipt);
        }
      }
    }

    return records.map((record) => {
      const receipt = receiptByRecord.get(record.id) ?? null;
      return Object.assign(record, {
        isPaid: Boolean(receipt),
        receiptId: receipt?.id ?? null,
        receipt,
      });
    });
  }

  async findAll(query: QueryLodgingDto) {
    const page = Math.max(1, query.page ?? 1);
    const take = Math.min(query.limit ?? 20, parseInt(process.env['MAX_PAGE_SIZE'] ?? '100'));
    const skip = (page - 1) * take;

    const qb = this.repo
      .createQueryBuilder('lr')
      .leftJoinAndSelect('lr.lodgingType', 'lodgingType')
      .leftJoinAndSelect('lr.tariff', 'tariff')
      .orderBy('lr.createdAt', 'DESC')
      .skip(skip)
      .take(take);

    if (query.search) qb.andWhere('lr.observations LIKE :search', { search: `%${query.search}%` });
    if (query.from) qb.andWhere('lr.recordDate >= :from', { from: query.from });
    if (query.to) qb.andWhere('lr.recordDate <= :to', { to: query.to });
    if (query.lodgingTypeId) qb.andWhere('lr.lodgingTypeId = :typeId', { typeId: query.lodgingTypeId });

    const [data, total] = await qb.getManyAndCount();
    return { data: await this.attachPaymentStatus(data), meta: { page, limit: take, total, totalPages: Math.ceil(total / take) } };
  }

  async findById(id: number): Promise<LodgingRecord> {
    const record = await this.repo.findOne({
      where: { id },
      relations: ['lodgingType', 'tariff', 'createdByUser'],
    });
    if (!record) throw new NotFoundException(`Lodging record #${id} not found`);
    return (await this.attachPaymentStatus([record]))[0];
  }

  async findToday(page = 1, limit = 20) {
    const today = guatemalaTodayISO();
    const take = Math.min(limit, 100);
    const [data, total] = await this.repo.findAndCount({
      where: { recordDate: today },
      relations: ['lodgingType'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * take,
      take,
    });
    return { data: await this.attachPaymentStatus(data), meta: { page, limit: take, total, totalPages: Math.ceil(total / take) } };
  }

  async todaySummary() {
    const today = guatemalaTodayISO();
    const totals = await this.repo
      .createQueryBuilder('lr')
      .select('COUNT(lr.id)', 'totalRecords')
      .addSelect('SUM(lr.guests)', 'totalGuests')
      .addSelect('SUM(lr.nights)', 'totalNights')
      .addSelect('SUM(lr.totalAmount)', 'totalAmount')
      .where('lr.recordDate = :today', { today })
      .getRawOne();
    return {
      total: Number(totals?.totalRecords ?? 0),
      totalGuests: Number(totals?.totalGuests ?? 0),
      totalNights: Number(totals?.totalNights ?? 0),
      totalAmount: Number(totals?.totalAmount ?? 0),
    };
  }

  async monthSummary(year: number, month: number) {
    const from = `${year}-${String(month).padStart(2, '0')}-01`;
    const d = new Date(year, month, 0);
    const to = `${year}-${String(month).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

    const totals = await this.repo
      .createQueryBuilder('lr')
      .select('COUNT(lr.id)', 'totalRecords')
      .addSelect('SUM(lr.guests)', 'totalGuests')
      .addSelect('SUM(lr.nights)', 'totalNights')
      .addSelect('SUM(lr.totalAmount)', 'totalAmount')
      .where('lr.recordDate >= :from AND lr.recordDate <= :to', { from, to })
      .getRawOne();

    const byType = await this.repo
      .createQueryBuilder('lr')
      .leftJoin('lr.lodgingType', 'lt')
      .select('lt.name', 'type')
      .addSelect('COUNT(lr.id)', 'count')
      .addSelect('SUM(lr.totalAmount)', 'total')
      .where('lr.recordDate >= :from AND lr.recordDate <= :to', { from, to })
      .groupBy('lt.name')
      .getRawMany();

    return {
      year,
      month,
      totalRecords: Number(totals?.totalRecords ?? 0),
      totalGuests: Number(totals?.totalGuests ?? 0),
      totalNights: Number(totals?.totalNights ?? 0),
      totalAmount: Number(totals?.totalAmount ?? 0),
      byType,
    };
  }

  async create(dto: CreateLodgingDto, userId: number, ip: string, userPermissions: string[] = []): Promise<LodgingRecord> {
    const isForeign = dto.isForeign ?? false;
    const canOverrideTariff = userPermissions.includes('TARIFF_OVERRIDE');
    const appliedRate = canOverrideTariff
      ? dto.appliedRate
      : ((await this.resolvedTariffAmount(dto.tariffId ?? null, isForeign)) ?? dto.appliedRate);

    const today = guatemalaTodayISO();
    const record = this.repo.create({
      lodgingTypeId: dto.lodgingTypeId,
      recordDate: dto.recordDate ?? today,
      nights: dto.nights,
      guests: dto.guests,
      tariffId: dto.tariffId ?? null,
      appliedRate,
      totalAmount: dto.totalAmount,
      isForeign,
      observations: dto.observations ?? null,
      createdByUserId: userId,
    });
    const saved = await this.repo.save(record);
    await this.auditService.record({
      userId,
      action: 'CREATE',
      entityName: 'lodging_records',
      entityId: saved.id,
      newValues: saved,
      ipAddress: ip,
    });
    return this.findById(saved.id);
  }

  async update(id: number, dto: UpdateLodgingDto, userId: number, ip: string, userPermissions: string[] = []): Promise<LodgingRecord> {
    const record = await this.findById(id);
    await this.assertEditable(record);
    const old = { ...record };

    const canOverrideTariff = userPermissions.includes('TARIFF_OVERRIDE');

    if (dto.isForeign !== undefined) record.isForeign = dto.isForeign;
    if (dto.lodgingTypeId !== undefined) record.lodgingTypeId = dto.lodgingTypeId;
    if (dto.nights !== undefined) record.nights = dto.nights;
    if (dto.guests !== undefined) record.guests = dto.guests;
    if (dto.tariffId !== undefined) record.tariffId = dto.tariffId ?? null;
    if (dto.appliedRate !== undefined) {
      record.appliedRate = canOverrideTariff
        ? dto.appliedRate
        : ((await this.resolvedTariffAmount(record.tariffId, record.isForeign)) ?? dto.appliedRate);
    }
    if (dto.observations !== undefined) record.observations = dto.observations ?? null;
    // El total siempre se deriva de noches × tarifa aplicada
    record.totalAmount = parseFloat((Number(record.nights) * Number(record.appliedRate)).toFixed(2));
    record.updatedAt = new Date();
    await this.repo.save(record);
    await this.auditService.record({
      userId,
      action: 'UPDATE',
      entityName: 'lodging_records',
      entityId: id,
      oldValues: old,
      newValues: record,
      ipAddress: ip,
    });
    return this.findById(id);
  }

  async delete(id: number, userId: number, ip: string): Promise<void> {
    const record = await this.findById(id);
    await this.auditService.record({
      userId,
      action: 'DELETE',
      entityName: 'lodging_records',
      entityId: id,
      oldValues: record,
      ipAddress: ip,
    });
    await this.repo.delete(id);
  }
}
