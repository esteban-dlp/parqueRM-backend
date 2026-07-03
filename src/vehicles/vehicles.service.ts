import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, IsNull, Like, Repository } from 'typeorm';
import { VehicleRecord } from '../database/entities/vehicle-record.entity';
import { Tariff } from '../database/entities/tariff.entity';
import { Receipt } from '../database/entities/receipt.entity';
import { FinancialMovement } from '../database/entities/financial-movement.entity';
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
    @InjectRepository(Receipt)
    private readonly receiptRepo: Repository<Receipt>,
    @InjectRepository(FinancialMovement)
    private readonly movementRepo: Repository<FinancialMovement>,
    private readonly auditService: AuditService,
  ) {}

  private async assertEditable(record: VehicleRecord): Promise<void> {
    if ((record as VehicleRecord & { isPaid?: boolean }).isPaid || record.checkOutAt) {
      throw new BadRequestException('No se puede editar un registro ya cobrado. Debe anularse o registrarse un ajuste.');
    }

    const movement = await this.movementRepo
      .createQueryBuilder('m')
      .where('m.originType = :originType', { originType: 'VEHICULO' })
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

  private async attachPaymentStatus<T extends VehicleRecord>(records: T[]): Promise<T[]> {
    if (!records.length) return records;
    const ids = records.map((r) => r.id);
    const receipts = await this.receiptRepo
      .createQueryBuilder('r')
      .leftJoinAndSelect('r.lines', 'line')
      .where('r.status = :status', { status: 'ACTIVO' })
      .andWhere(new Brackets((qb) => {
        qb.where('(r.originType = :vehicleOriginType AND r.originId IN (:...ids))')
          .orWhere('(line.originType = :vehicleOriginType AND line.originId IN (:...ids))');
      }))
      .setParameters({
        vehicleOriginType: 'VEHICULO',
        ids,
      })
      .getMany();

    const receiptByRecord = new Map<number, Receipt>();
    for (const receipt of receipts) {
      if (receipt.originType === 'VEHICULO' && receipt.originId != null) {
        receiptByRecord.set(Number(receipt.originId), receipt);
      }
      for (const line of receipt.lines ?? []) {
        if (line.originType === 'VEHICULO' && line.originId != null) {
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
    if (query.visitorRecordId) {
      qb.andWhere('vr.visitorRecordId = :visitorRecordId', { visitorRecordId: query.visitorRecordId });
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
    return { data: await this.attachPaymentStatus(data), meta: { page, limit: take, total, totalPages: Math.ceil(total / take) } };
  }

  async findById(id: number): Promise<VehicleRecord> {
    const record = await this.repo.findOne({
      where: { id },
      relations: ['vehicleType', 'tariff', 'visitorRecord', 'createdByUser'],
    });
    if (!record) throw new NotFoundException(`Vehicle record #${id} not found`);
    return (await this.attachPaymentStatus([record]))[0];
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
    return { data: await this.attachPaymentStatus(data), meta: { page, limit: take, total, totalPages: Math.ceil(total / take) } };
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
    return { data: await this.attachPaymentStatus(data), meta: { page, limit: take, total, totalPages: Math.ceil(total / take) } };
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
    await this.assertEditable(record);
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
    return { data: await this.attachPaymentStatus(data), meta: { page, limit: take, total, totalPages: Math.ceil(total / take) } };
  }
}
