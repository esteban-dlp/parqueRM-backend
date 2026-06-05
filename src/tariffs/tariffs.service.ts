import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tariff } from '../database/entities/tariff.entity';
import { AuditService } from '../audit/audit.service';
import { CreateTariffDto } from './dto/create-tariff.dto';
import { UpdateTariffDto } from './dto/update-tariff.dto';
import { QueryTariffDto } from './dto/query-tariff.dto';
import { guatemalaTodayISO } from '../common/utils/guatemala-time';

@Injectable()
export class TariffsService {
  private readonly logger = new Logger(TariffsService.name);

  constructor(
    @InjectRepository(Tariff)
    private readonly tariffRepo: Repository<Tariff>,
    private readonly audit: AuditService,
  ) {}

  private get relations() {
    return ['service', 'visitorCategory', 'vehicleType', 'lodgingType'];
  }

  private clampLimit(limit: number): number {
    return Math.min(limit, parseInt(process.env.MAX_PAGE_SIZE ?? '100'));
  }

  async findAll(query: QueryTariffDto) {
    const page = Math.max(1, query.page ?? 1);
    const limit = this.clampLimit(query.limit ?? 20);
    const skip = (page - 1) * limit;

    const qb = this.tariffRepo.createQueryBuilder('t')
      .leftJoinAndSelect('t.service', 'service')
      .leftJoinAndSelect('t.visitorCategory', 'visitorCategory')
      .leftJoinAndSelect('t.vehicleType', 'vehicleType')
      .leftJoinAndSelect('t.lodgingType', 'lodgingType')
      .where('t.deleted_at IS NULL')
      .orderBy('t.id', 'DESC')
      .skip(skip)
      .take(limit);

    if (query.search) qb.andWhere('t.name LIKE :search', { search: `%${query.search}%` });
    if (query.appliesTo) qb.andWhere('t.appliesTo = :appliesTo', { appliesTo: query.appliesTo });
    if (query.serviceId) qb.andWhere('t.serviceId = :serviceId', { serviceId: query.serviceId });
    if (query.isActive !== undefined) qb.andWhere('t.isActive = :isActive', { isActive: query.isActive });

    const [items, total] = await qb.getManyAndCount();
    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findById(id: number): Promise<Tariff> {
    const tariff = await this.tariffRepo
      .createQueryBuilder('t')
      .leftJoinAndSelect('t.service', 'service')
      .leftJoinAndSelect('t.visitorCategory', 'visitorCategory')
      .leftJoinAndSelect('t.vehicleType', 'vehicleType')
      .leftJoinAndSelect('t.lodgingType', 'lodgingType')
      .where('t.id = :id', { id })
      .andWhere('t.deleted_at IS NULL')
      .getOne();
    if (!tariff) throw new NotFoundException(`Tariff #${id} not found`);
    return tariff;
  }

  async findByAppliesTo(type: string): Promise<Tariff[]> {
    const today = guatemalaTodayISO();
    return this.tariffRepo
      .createQueryBuilder('t')
      .leftJoinAndSelect('t.service', 'service')
      .leftJoinAndSelect('t.visitorCategory', 'visitorCategory')
      .leftJoinAndSelect('t.vehicleType', 'vehicleType')
      .leftJoinAndSelect('t.lodgingType', 'lodgingType')
      .where('t.appliesTo = :type', { type })
      .andWhere('t.isActive = :isActive', { isActive: true })
      .andWhere('t.validFrom <= :today', { today })
      .andWhere('(t.validTo IS NULL OR t.validTo >= :today)', { today })
      .andWhere('t.deleted_at IS NULL')
      .orderBy('t.name', 'ASC')
      .getMany();
  }

  async resolve(
    appliesTo: string,
    categoryId?: number,
    vehicleTypeId?: number,
    lodgingTypeId?: number,
  ): Promise<Tariff | null> {
    const today = guatemalaTodayISO();

    const qb = this.tariffRepo.createQueryBuilder('t')
      .leftJoinAndSelect('t.service', 'service')
      .leftJoinAndSelect('t.visitorCategory', 'visitorCategory')
      .leftJoinAndSelect('t.vehicleType', 'vehicleType')
      .leftJoinAndSelect('t.lodgingType', 'lodgingType')
      .where('t.appliesTo = :appliesTo', { appliesTo })
      .andWhere('t.isActive = :isActive', { isActive: true })
      .andWhere('t.validFrom <= :today', { today })
      .andWhere('(t.validTo IS NULL OR t.validTo >= :today)', { today })
      .andWhere('t.deleted_at IS NULL');

    if (categoryId !== undefined) qb.andWhere('(t.visitorCategoryId = :categoryId OR t.visitorCategoryId IS NULL)', { categoryId });
    if (vehicleTypeId !== undefined) qb.andWhere('(t.vehicleTypeId = :vehicleTypeId OR t.vehicleTypeId IS NULL)', { vehicleTypeId });
    if (lodgingTypeId !== undefined) qb.andWhere('(t.lodgingTypeId = :lodgingTypeId OR t.lodgingTypeId IS NULL)', { lodgingTypeId });

    const results = await qb.orderBy('t.id', 'DESC').getMany();

    // Prefer exact FK matches over generic ones
    const exact = results.find((t) => {
      if (categoryId && t.visitorCategoryId !== categoryId) return false;
      if (vehicleTypeId && t.vehicleTypeId !== vehicleTypeId) return false;
      if (lodgingTypeId && t.lodgingTypeId !== lodgingTypeId) return false;
      return true;
    });

    return exact ?? results[0] ?? null;
  }

  /** Devuelve el precio local o extranjero según la bandera. */
  resolveAmount(tariff: Tariff, isForeign: boolean): number {
    return isForeign ? Number(tariff.amountForeign) : Number(tariff.amountLocal);
  }

  async create(dto: CreateTariffDto, actorId: number, ip: string): Promise<Tariff> {
    const tariff = this.tariffRepo.create({
      ...dto,
      visitorCategoryId: dto.visitorCategoryId ?? null,
      vehicleTypeId: dto.vehicleTypeId ?? null,
      lodgingTypeId: dto.lodgingTypeId ?? null,
      validTo: dto.validTo ?? null,
      isActive: true,
    });

    const saved = await this.tariffRepo.save(tariff);

    await this.audit.record({
      userId: actorId,
      action: 'CREATE',
      entityName: 'Tariff',
      entityId: saved.id,
      newValues: saved,
      ipAddress: ip,
    });

    return this.findById(saved.id);
  }

  async update(id: number, dto: UpdateTariffDto, actorId: number, ip: string): Promise<Tariff> {
    const tariff = await this.findById(id);
    const old = { ...tariff };

    Object.assign(tariff, dto);
    if (dto.validTo === undefined && 'validTo' in dto) tariff.validTo = null;

    const saved = await this.tariffRepo.save(tariff);

    await this.audit.record({
      userId: actorId,
      action: 'UPDATE',
      entityName: 'Tariff',
      entityId: id,
      oldValues: old,
      newValues: saved,
      ipAddress: ip,
    });

    return this.findById(saved.id);
  }

  async toggleStatus(id: number, actorId: number, ip: string): Promise<Tariff> {
    const tariff = await this.findById(id);
    const old = { ...tariff };
    tariff.isActive = !tariff.isActive;
    const saved = await this.tariffRepo.save(tariff);

    await this.audit.record({
      userId: actorId,
      action: 'TOGGLE',
      entityName: 'Tariff',
      entityId: id,
      oldValues: old,
      newValues: saved,
      ipAddress: ip,
    });

    return saved;
  }

  async delete(id: number, actorId: number, ip: string): Promise<void> {
    const tariff = await this.findById(id);
    tariff.isActive = false;
    tariff.deletedAt = new Date();
    await this.tariffRepo.save(tariff);

    await this.audit.record({
      userId: actorId,
      action: 'DELETE',
      entityName: 'Tariff',
      entityId: id,
      ipAddress: ip,
    });
  }
}
