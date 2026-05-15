import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LodgingRecord } from '../database/entities/lodging-record.entity';
import { Tariff } from '../database/entities/tariff.entity';
import { AuditService } from '../audit/audit.service';
import { CreateLodgingDto } from './dto/create-lodging.dto';
import { UpdateLodgingDto } from './dto/update-lodging.dto';
import { QueryLodgingDto } from './dto/query-lodging.dto';

@Injectable()
export class LodgingService {
  constructor(
    @InjectRepository(LodgingRecord)
    private readonly repo: Repository<LodgingRecord>,
    @InjectRepository(Tariff)
    private readonly tariffRepo: Repository<Tariff>,
    private readonly auditService: AuditService,
  ) {}

  private async resolvedTariffAmount(tariffId: number | null): Promise<number | null> {
    if (!tariffId) return null;
    const tariff = await this.tariffRepo.findOne({ where: { id: tariffId } });
    return tariff?.amount ?? null;
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

    if (query.from) qb.andWhere('lr.recordDate >= :from', { from: query.from });
    if (query.to) qb.andWhere('lr.recordDate <= :to', { to: query.to });
    if (query.lodgingTypeId) qb.andWhere('lr.lodgingTypeId = :typeId', { typeId: query.lodgingTypeId });

    const [data, total] = await qb.getManyAndCount();
    return { data, meta: { page, limit: take, total, totalPages: Math.ceil(total / take) } };
  }

  async findById(id: number): Promise<LodgingRecord> {
    const record = await this.repo.findOne({
      where: { id },
      relations: ['lodgingType', 'tariff', 'createdByUser'],
    });
    if (!record) throw new NotFoundException(`Lodging record #${id} not found`);
    return record;
  }

  async findToday(page = 1, limit = 20) {
    const today = new Date().toISOString().slice(0, 10);
    const take = Math.min(limit, 100);
    const [data, total] = await this.repo.findAndCount({
      where: { recordDate: today },
      relations: ['lodgingType'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * take,
      take,
    });
    return { data, meta: { page, limit: take, total, totalPages: Math.ceil(total / take) } };
  }

  async todaySummary() {
    const today = new Date().toISOString().slice(0, 10);
    const totals = await this.repo
      .createQueryBuilder('lr')
      .select('COUNT(lr.id)', 'totalRecords')
      .addSelect('SUM(lr.guests)', 'totalGuests')
      .addSelect('SUM(lr.nights)', 'totalNights')
      .addSelect('SUM(lr.totalAmount)', 'totalAmount')
      .where('lr.recordDate = :today', { today })
      .getRawOne();
    return {
      totalRecords: Number(totals?.totalRecords ?? 0),
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
    const canOverrideTariff = userPermissions.includes('TARIFF_OVERRIDE');
    const appliedRate = canOverrideTariff
      ? dto.appliedRate
      : ((await this.resolvedTariffAmount(dto.tariffId ?? null)) ?? dto.appliedRate);

    const today = new Date().toISOString().slice(0, 10);
    const record = this.repo.create({
      lodgingTypeId: dto.lodgingTypeId,
      recordDate: dto.recordDate ?? today,
      nights: dto.nights,
      guests: dto.guests,
      tariffId: dto.tariffId ?? null,
      appliedRate,
      totalAmount: dto.totalAmount,
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
    const old = { ...record };

    const canOverrideTariff = userPermissions.includes('TARIFF_OVERRIDE');

    if (dto.lodgingTypeId !== undefined) record.lodgingTypeId = dto.lodgingTypeId;
    if (dto.nights !== undefined) record.nights = dto.nights;
    if (dto.guests !== undefined) record.guests = dto.guests;
    if (dto.tariffId !== undefined) record.tariffId = dto.tariffId ?? null;
    if (dto.appliedRate !== undefined) {
      record.appliedRate = canOverrideTariff
        ? dto.appliedRate
        : ((await this.resolvedTariffAmount(record.tariffId)) ?? dto.appliedRate);
    }
    if (dto.totalAmount !== undefined) record.totalAmount = dto.totalAmount;
    if (dto.observations !== undefined) record.observations = dto.observations ?? null;
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
