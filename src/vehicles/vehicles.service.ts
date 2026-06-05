import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Like, Repository } from 'typeorm';
import { VehicleRecord } from '../database/entities/vehicle-record.entity';
import { Tariff } from '../database/entities/tariff.entity';
import { AuditService } from '../audit/audit.service';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { QueryVehicleDto } from './dto/query-vehicle.dto';
import { guatemalaDateRangeUtc, guatemalaTodayRangeUtc } from '../common/utils/guatemala-time';

@Injectable()
export class VehiclesService {
  constructor(
    @InjectRepository(VehicleRecord)
    private readonly repo: Repository<VehicleRecord>,
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

  async findAll(query: QueryVehicleDto) {
    const page = Math.max(1, query.page ?? 1);
    const take = Math.min(query.limit ?? 20, parseInt(process.env['MAX_PAGE_SIZE'] ?? '100'));
    const skip = (page - 1) * take;

    const qb = this.repo
      .createQueryBuilder('vr')
      .leftJoinAndSelect('vr.vehicleType', 'vehicleType')
      .leftJoinAndSelect('vr.tariff', 'tariff')
      .leftJoinAndSelect('vr.visitorRecord', 'visitorRecord')
      .orderBy('vr.createdAt', 'DESC')
      .skip(skip)
      .take(take);

    if (query.from) {
      qb.andWhere('vr.checkInAt >= :from', { from: guatemalaDateRangeUtc(query.from).from });
    }
    if (query.to) {
      qb.andWhere('vr.checkInAt <= :to', { to: guatemalaDateRangeUtc(undefined, query.to).to });
    }
    if (query.vehicleTypeId) {
      qb.andWhere('vr.vehicleTypeId = :typeId', { typeId: query.vehicleTypeId });
    }
    if (query.parked === 'true') {
      qb.andWhere('vr.checkOutAt IS NULL');
    }
    if (query.exitEnabled === 'true') {
      qb.andWhere('vr.exitEnabled = 1');
    } else if (query.exitEnabled === 'false') {
      qb.andWhere('vr.exitEnabled = 0');
    }
    if (query.search) {
      qb.andWhere('vr.plateNumber LIKE :search', { search: `%${query.search}%` });
    }

    const [data, total] = await qb.getManyAndCount();
    return { data, meta: { page, limit: take, total, totalPages: Math.ceil(total / take) } };
  }

  async findById(id: number): Promise<VehicleRecord> {
    const record = await this.repo.findOne({
      where: { id },
      relations: ['vehicleType', 'tariff', 'visitorRecord', 'createdByUser'],
    });
    if (!record) throw new NotFoundException(`Vehicle record #${id} not found`);
    return record;
  }

  async findCurrentlyParked(page = 1, limit = 20) {
    const take = Math.min(limit, 100);
    const [data, total] = await this.repo.findAndCount({
      where: { checkOutAt: IsNull() },
      relations: ['vehicleType'],
      order: { checkInAt: 'DESC' },
      skip: (page - 1) * take,
      take,
    });
    return { data, meta: { page, limit: take, total, totalPages: Math.ceil(total / take) } };
  }

  async findToday(page = 1, limit = 20) {
    const { start, end } = guatemalaTodayRangeUtc();
    const take = Math.min(limit, 100);
    const qb = this.repo
      .createQueryBuilder('vr')
      .leftJoinAndSelect('vr.vehicleType', 'vehicleType')
      .where('vr.checkInAt >= :start AND vr.checkInAt <= :end', { start, end })
      .orderBy('vr.checkInAt', 'DESC')
      .skip((page - 1) * take)
      .take(take);
    const [data, total] = await qb.getManyAndCount();
    return { data, meta: { page, limit: take, total, totalPages: Math.ceil(total / take) } };
  }

  async todaySummary() {
    const { start, end } = guatemalaTodayRangeUtc();

    const totals = await this.repo
      .createQueryBuilder('vr')
      .select('COUNT(vr.id)', 'total')
      .addSelect('SUM(vr.totalAmount)', 'totalAmount')
      .where('vr.checkInAt >= :start AND vr.checkInAt <= :end', { start, end })
      .getRawOne();

    const parked = await this.repo.count({ where: { checkOutAt: IsNull() } });

    const byType = await this.repo
      .createQueryBuilder('vr')
      .leftJoin('vr.vehicleType', 'vt')
      .select('vt.name', 'type')
      .addSelect('COUNT(vr.id)', 'count')
      .addSelect('SUM(vr.totalAmount)', 'total')
      .where('vr.checkInAt >= :start AND vr.checkInAt <= :end', { start, end })
      .groupBy('vt.name')
      .getRawMany();

    return {
      total: Number(totals?.total ?? 0),
      parked,
      totalAmount: Number(totals?.totalAmount ?? 0),
      byType,
    };
  }

  async create(dto: CreateVehicleDto, userId: number, ip: string, userPermissions: string[] = []): Promise<VehicleRecord> {
    const isForeign = dto.isForeign ?? false;
    const canOverrideTariff = userPermissions.includes('TARIFF_OVERRIDE');
    const appliedRate = canOverrideTariff
      ? dto.appliedRate
      : ((await this.resolvedTariffAmount(dto.tariffId ?? null, isForeign)) ?? dto.appliedRate);

    const record = this.repo.create({
      vehicleTypeId: dto.vehicleTypeId,
      visitorRecordId: dto.visitorRecordId ?? null,
      plateNumber: dto.plateNumber ?? null,
      tariffId: dto.tariffId ?? null,
      appliedRate,
      totalAmount: dto.totalAmount,
      isForeign,
      observations: dto.observations ?? null,
      source: dto.source ?? 'MANUAL',
      exitEnabled: false,
      createdByUserId: userId,
    });

    const saved = await this.repo.save(record);
    await this.auditService.record({
      userId,
      action: 'CREATE',
      entityName: 'vehicle_records',
      entityId: saved.id,
      newValues: saved,
      ipAddress: ip,
    });
    return this.findById(saved.id);
  }

  async update(id: number, dto: UpdateVehicleDto, userId: number, ip: string, userPermissions: string[] = []): Promise<VehicleRecord> {
    const record = await this.findById(id);
    const old = { ...record };

    const canOverrideTariff = userPermissions.includes('TARIFF_OVERRIDE');

    if (dto.isForeign !== undefined) record.isForeign = dto.isForeign;
    if (dto.vehicleTypeId !== undefined) record.vehicleTypeId = dto.vehicleTypeId;
    if (dto.plateNumber !== undefined) record.plateNumber = dto.plateNumber ?? null;
    if (dto.tariffId !== undefined) record.tariffId = dto.tariffId ?? null;
    if (dto.appliedRate !== undefined) {
      record.appliedRate = canOverrideTariff
        ? dto.appliedRate
        : ((await this.resolvedTariffAmount(record.tariffId, record.isForeign)) ?? dto.appliedRate);
    }
    if (dto.totalAmount !== undefined) record.totalAmount = dto.totalAmount;
    if (dto.observations !== undefined) record.observations = dto.observations ?? null;
    record.updatedAt = new Date();

    await this.repo.save(record);
    await this.auditService.record({
      userId,
      action: 'UPDATE',
      entityName: 'vehicle_records',
      entityId: id,
      oldValues: old,
      newValues: record,
      ipAddress: ip,
    });
    return this.findById(id);
  }

  async checkout(id: number, userId: number, ip: string): Promise<VehicleRecord> {
    const record = await this.findById(id);
    record.checkOutAt = new Date();
    record.updatedAt = new Date();
    await this.repo.save(record);
    await this.auditService.record({
      userId,
      action: 'CHECKOUT',
      entityName: 'vehicle_records',
      entityId: id,
      newValues: { checkOutAt: record.checkOutAt },
      ipAddress: ip,
    });
    return this.findById(id);
  }

  async enableExit(id: number, userId: number, ip: string): Promise<VehicleRecord> {
    const record = await this.findById(id);
    record.exitEnabled = true;
    record.updatedAt = new Date();
    await this.repo.save(record);
    await this.auditService.record({
      userId,
      action: 'ENABLE_EXIT',
      entityName: 'vehicle_records',
      entityId: id,
      newValues: { exitEnabled: true },
      ipAddress: ip,
    });
    return this.findById(id);
  }

  async disableExit(id: number, userId: number, ip: string): Promise<VehicleRecord> {
    const record = await this.findById(id);
    record.exitEnabled = false;
    record.updatedAt = new Date();
    await this.repo.save(record);
    await this.auditService.record({
      userId,
      action: 'DISABLE_EXIT',
      entityName: 'vehicle_records',
      entityId: id,
      newValues: { exitEnabled: false },
      ipAddress: ip,
    });
    return this.findById(id);
  }

  async delete(id: number, userId: number, ip: string): Promise<void> {
    const record = await this.findById(id);
    await this.auditService.record({
      userId,
      action: 'DELETE',
      entityName: 'vehicle_records',
      entityId: id,
      oldValues: record,
      ipAddress: ip,
    });
    await this.repo.delete(id);
  }

  async search(q: string, page = 1, limit = 20) {
    const take = Math.min(limit, 100);
    const [data, total] = await this.repo.findAndCount({
      where: { plateNumber: Like(`%${q}%`) },
      relations: ['vehicleType'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * take,
      take,
    });
    return { data, meta: { page, limit: take, total, totalPages: Math.ceil(total / take) } };
  }
}
