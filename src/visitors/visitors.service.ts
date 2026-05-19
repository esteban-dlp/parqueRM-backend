import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, Not, Like, Between } from 'typeorm';
import { VisitorRecord } from '../database/entities/visitor-record.entity';
import { VisitReason } from '../database/entities/visit-reason.entity';
import { VisitActivity } from '../database/entities/visit-activity.entity';
import { VisitorCategory } from '../database/entities/visitor-category.entity';
import { ParkConfig } from '../database/entities/park-config.entity';
import { Tariff } from '../database/entities/tariff.entity';
import { AuditService } from '../audit/audit.service';
import { CreateVisitorDto } from './dto/create-visitor.dto';
import { UpdateVisitorDto } from './dto/update-visitor.dto';
import { QueryVisitorDto } from './dto/query-visitor.dto';

@Injectable()
export class VisitorsService {
  constructor(
    @InjectRepository(VisitorRecord)
    private readonly repo: Repository<VisitorRecord>,
    @InjectRepository(VisitorCategory)
    private readonly categoryRepo: Repository<VisitorCategory>,
    @InjectRepository(ParkConfig)
    private readonly parkConfigRepo: Repository<ParkConfig>,
    @InjectRepository(Tariff)
    private readonly tariffRepo: Repository<Tariff>,
    private readonly auditService: AuditService,
  ) {}

  private async resolvedTariffAmount(tariffId: number | null, isForeign = false): Promise<number | null> {
    if (!tariffId) return null;
    const tariff = await this.tariffRepo.findOne({ where: { id: tariffId } });
    if (!tariff) return null;
    return isForeign ? Number(tariff.amountForeign) : Number(tariff.amountLocal);
  }

  async findAll(query: QueryVisitorDto) {
    const page = Math.max(1, query.page ?? 1);
    const take = Math.min(query.limit ?? 20, parseInt(process.env['MAX_PAGE_SIZE'] ?? '100'));
    const skip = (page - 1) * take;

    const qb = this.repo
      .createQueryBuilder('vr')
      .leftJoinAndSelect('vr.country', 'country')
      .leftJoinAndSelect('vr.department', 'department')
      .leftJoinAndSelect('vr.municipality', 'municipality')
      .leftJoinAndSelect('vr.visitorCategory', 'visitorCategory')
      .leftJoinAndSelect('vr.tariff', 'tariff')
      .leftJoinAndSelect('vr.visitReasons', 'reasons')
      .leftJoinAndSelect('vr.visitActivities', 'activities')
      .orderBy('vr.createdAt', 'DESC')
      .skip(skip)
      .take(take);

    if (query.from) {
      qb.andWhere('vr.recordDate >= :from', { from: query.from });
    }
    if (query.to) {
      qb.andWhere('vr.recordDate <= :to', { to: query.to });
    }
    if (query.visitorCategoryId) {
      qb.andWhere('vr.visitorCategoryId = :catId', { catId: query.visitorCategoryId });
    }
    if (query.countryId) {
      qb.andWhere('vr.countryId = :countryId', { countryId: query.countryId });
    }
    if (query.departmentId) {
      qb.andWhere('vr.departmentId = :deptId', { deptId: query.departmentId });
    }
    if (query.source) {
      qb.andWhere('vr.source = :source', { source: query.source });
    }
    if (query.inside === 'true') {
      qb.andWhere('vr.checkOutAt IS NULL');
    }
    if (query.search) {
      qb.andWhere(
        '(vr.fullName LIKE :search OR vr.identificationNumber LIKE :search)',
        { search: `%${query.search}%` },
      );
    }

    const [data, total] = await qb.getManyAndCount();

    return {
      data,
      meta: {
        page,
        limit: take,
        total,
        totalPages: Math.ceil(total / take),
      },
    };
  }

  async findById(id: number): Promise<VisitorRecord> {
    const record = await this.repo.findOne({
      where: { id },
      relations: [
        'country',
        'department',
        'municipality',
        'visitorCategory',
        'tariff',
        'visitReasons',
        'visitActivities',
        'infoSource',
        'travelType',
        'createdByUser',
      ],
    });
    if (!record) {
      throw new NotFoundException(`Visitor record #${id} not found`);
    }
    return record;
  }

  async findCurrentlyInside(page = 1, limit = 20) {
    const take = Math.min(limit, 100);
    const skip = (page - 1) * take;
    const [data, total] = await this.repo.findAndCount({
      where: { checkOutAt: IsNull() },
      relations: ['visitorCategory', 'country'],
      order: { checkInAt: 'DESC' },
      skip,
      take,
    });
    return { data, meta: { page, limit: take, total, totalPages: Math.ceil(total / take) } };
  }

  async findToday(page = 1, limit = 20) {
    const today = new Date().toISOString().slice(0, 10);
    const take = Math.min(limit, 100);
    const skip = (page - 1) * take;
    const [data, total] = await this.repo.findAndCount({
      where: { recordDate: today },
      relations: ['visitorCategory', 'country'],
      order: { checkInAt: 'DESC' },
      skip,
      take,
    });
    return { data, meta: { page, limit: take, total, totalPages: Math.ceil(total / take) } };
  }

  async todaySummary() {
    const today = new Date().toISOString().slice(0, 10);

    const totals = await this.repo
      .createQueryBuilder('vr')
      .select('COUNT(vr.id)', 'totalVisitors')
      .addSelect('SUM(vr.quantity)', 'totalQuantity')
      .addSelect('SUM(vr.totalAmount)', 'totalAmount')
      .where('vr.recordDate = :today', { today })
      .getRawOne();

    const byCategory = await this.repo
      .createQueryBuilder('vr')
      .leftJoin('vr.visitorCategory', 'vc')
      .select('vc.name', 'category')
      .addSelect('COUNT(vr.id)', 'count')
      .addSelect('SUM(vr.totalAmount)', 'total')
      .where('vr.recordDate = :today', { today })
      .groupBy('vc.name')
      .getRawMany();

    return {
      total: Number(totals?.totalVisitors ?? 0),
      totalQuantity: Number(totals?.totalQuantity ?? 0),
      totalAmount: Number(totals?.totalAmount ?? 0),
      byCategory,
    };
  }

  async occupancySummary() {
    const currentInside = await this.repo.count({ where: { checkOutAt: IsNull() } });
    const parkConfig = await this.parkConfigRepo.findOne({ where: {} });
    const maxCapacity = parkConfig?.maxCapacity ?? 0;
    return { currentInside, maxCapacity };
  }

  async create(dto: CreateVisitorDto, userId: number, ip: string, userPermissions: string[] = []): Promise<VisitorRecord> {
    const today = new Date().toISOString().slice(0, 10);
    const count = await this.repo.count();
    const sequence = String(count + 1).padStart(5, '0');
    const datePart = today.replace(/-/g, '');
    const ticketNumber = `VIS-${datePart}-${sequence}`;

    const isForeign = dto.isForeign ?? false;
    const canOverrideTariff = userPermissions.includes('TARIFF_OVERRIDE');
    const appliedRate = canOverrideTariff
      ? dto.appliedRate
      : ((await this.resolvedTariffAmount(dto.tariffId ?? null, isForeign)) ?? dto.appliedRate);

    const record = this.repo.create({
      ticketNumber,
      visitorCategoryId: dto.visitorCategoryId,
      quantity: dto.quantity ?? 1,
      tariffId: dto.tariffId ?? null,
      appliedRate,
      totalAmount: dto.totalAmount,
      isForeign,
      recordDate: dto.recordDate ?? today,
      checkInAt: dto.checkInAt ? new Date(dto.checkInAt) : new Date(),
      countryId: dto.countryId ?? null,
      departmentId: dto.departmentId ?? null,
      municipalityId: dto.municipalityId ?? null,
      infoSourceId: dto.infoSourceId ?? null,
      travelTypeId: dto.travelTypeId ?? null,
      nationality: dto.nationality ?? null,
      identificationType: dto.identificationType ?? null,
      identificationNumber: dto.identificationNumber ?? null,
      fullName: dto.fullName ?? null,
      email: dto.email ?? null,
      gender: dto.gender ?? null,
      ageRange: dto.ageRange ?? null,
      visitType: dto.visitType ?? null,
      observations: dto.observations ?? null,
      source: dto.source ?? 'MANUAL',
      createdByUserId: userId,
    });

    if (dto.reasonIds && dto.reasonIds.length > 0) {
      record.visitReasons = dto.reasonIds.map((rid) => ({ id: rid } as VisitReason));
    } else {
      record.visitReasons = [];
    }

    if (dto.activityIds && dto.activityIds.length > 0) {
      record.visitActivities = dto.activityIds.map((aid) => ({ id: aid } as VisitActivity));
    } else {
      record.visitActivities = [];
    }

    const saved = await this.repo.save(record);

    await this.auditService.record({
      userId,
      action: 'CREATE',
      entityName: 'visitor_records',
      entityId: saved.id,
      newValues: saved,
      ipAddress: ip,
    });

    return this.findById(saved.id);
  }

  async update(id: number, dto: UpdateVisitorDto, userId: number, ip: string, userPermissions: string[] = []): Promise<VisitorRecord> {
    const record = await this.findById(id);
    const old = { ...record };

    const canOverrideTariff = userPermissions.includes('TARIFF_OVERRIDE');

    if (dto.isForeign !== undefined) record.isForeign = dto.isForeign;
    if (dto.visitorCategoryId !== undefined) record.visitorCategoryId = dto.visitorCategoryId;
    if (dto.quantity !== undefined) record.quantity = dto.quantity;
    if (dto.tariffId !== undefined) record.tariffId = dto.tariffId ?? null;
    if (dto.appliedRate !== undefined) {
      record.appliedRate = canOverrideTariff
        ? dto.appliedRate
        : ((await this.resolvedTariffAmount(record.tariffId, record.isForeign)) ?? dto.appliedRate);
    }
    if (dto.totalAmount !== undefined) record.totalAmount = dto.totalAmount;
    if (dto.countryId !== undefined) record.countryId = dto.countryId ?? null;
    if (dto.departmentId !== undefined) record.departmentId = dto.departmentId ?? null;
    if (dto.municipalityId !== undefined) record.municipalityId = dto.municipalityId ?? null;
    if (dto.infoSourceId !== undefined) record.infoSourceId = dto.infoSourceId ?? null;
    if (dto.travelTypeId !== undefined) record.travelTypeId = dto.travelTypeId ?? null;
    if (dto.nationality !== undefined) record.nationality = dto.nationality ?? null;
    if (dto.identificationType !== undefined) record.identificationType = dto.identificationType ?? null;
    if (dto.identificationNumber !== undefined) record.identificationNumber = dto.identificationNumber ?? null;
    if (dto.fullName !== undefined) record.fullName = dto.fullName ?? null;
    if (dto.email !== undefined) record.email = dto.email ?? null;
    if (dto.gender !== undefined) record.gender = dto.gender ?? null;
    if (dto.ageRange !== undefined) record.ageRange = dto.ageRange ?? null;
    if (dto.visitType !== undefined) record.visitType = dto.visitType ?? null;
    if (dto.observations !== undefined) record.observations = dto.observations ?? null;

    if (dto.reasonIds !== undefined) {
      record.visitReasons = dto.reasonIds.map((rid) => ({ id: rid } as VisitReason));
    }
    if (dto.activityIds !== undefined) {
      record.visitActivities = dto.activityIds.map((aid) => ({ id: aid } as VisitActivity));
    }

    record.updatedAt = new Date();
    const saved = await this.repo.save(record);

    await this.auditService.record({
      userId,
      action: 'UPDATE',
      entityName: 'visitor_records',
      entityId: id,
      oldValues: old,
      newValues: saved,
      ipAddress: ip,
    });

    return this.findById(saved.id);
  }

  async checkout(id: number, userId: number, ip: string): Promise<VisitorRecord> {
    const record = await this.findById(id);
    const old = { checkOutAt: record.checkOutAt };
    record.checkOutAt = new Date();
    record.updatedAt = new Date();
    await this.repo.save(record);

    await this.auditService.record({
      userId,
      action: 'CHECKOUT',
      entityName: 'visitor_records',
      entityId: id,
      oldValues: old,
      newValues: { checkOutAt: record.checkOutAt },
      ipAddress: ip,
    });

    return this.findById(id);
  }

  async bulkCheckout(ids: number[], userId: number, ip: string): Promise<{ checked: number[] }> {
    const results: number[] = [];
    for (const id of ids) {
      try {
        await this.checkout(id, userId, ip);
        results.push(id);
      } catch {
        // skip not found
      }
    }
    return { checked: results };
  }

  async delete(id: number, userId: number, ip: string): Promise<void> {
    const record = await this.findById(id);

    await this.auditService.record({
      userId,
      action: 'DELETE',
      entityName: 'visitor_records',
      entityId: id,
      oldValues: record,
      ipAddress: ip,
    });

    await this.repo.delete(id);
  }

  async search(q: string, page = 1, limit = 20) {
    const take = Math.min(limit, 100);
    const skip = (page - 1) * take;
    const [data, total] = await this.repo.findAndCount({
      where: [
        { fullName: Like(`%${q}%`) },
        { identificationNumber: Like(`%${q}%`) },
      ],
      relations: ['visitorCategory', 'country'],
      order: { createdAt: 'DESC' },
      skip,
      take,
    });
    return { data, meta: { page, limit: take, total, totalPages: Math.ceil(total / take) } };
  }
}
