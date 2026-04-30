import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tariff } from '../database/entities/tariff.entity';
import { AuditService } from '../audit/audit.service';
import { CreateTariffDto } from './dto/create-tariff.dto';
import { UpdateTariffDto } from './dto/update-tariff.dto';
import { QueryTariffDto } from './dto/query-tariff.dto';

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
      .orderBy('t.id', 'DESC')
      .skip(skip)
      .take(limit);

    if (query.appliesTo) qb.andWhere('t.appliesTo = :appliesTo', { appliesTo: query.appliesTo });
    if (query.serviceId) qb.andWhere('t.serviceId = :serviceId', { serviceId: query.serviceId });
    if (query.isActive !== undefined) qb.andWhere('t.isActive = :isActive', { isActive: query.isActive });
    if (query.isForeign !== undefined) qb.andWhere('t.isForeign = :isForeign', { isForeign: query.isForeign });

    const [items, total] = await qb.getManyAndCount();
    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findById(id: number): Promise<Tariff> {
    const tariff = await this.tariffRepo.findOne({ where: { id }, relations: this.relations });
    if (!tariff) throw new NotFoundException(`Tariff #${id} not found`);
    return tariff;
  }

  async findByAppliesTo(type: string): Promise<Tariff[]> {
    return this.tariffRepo.find({
      where: { appliesTo: type as any, isActive: true },
      relations: this.relations,
      order: { name: 'ASC' },
    });
  }

  async resolve(
    appliesTo: string,
    categoryId?: number,
    vehicleTypeId?: number,
    lodgingTypeId?: number,
    isForeign?: boolean,
  ): Promise<Tariff | null> {
    const qb = this.tariffRepo.createQueryBuilder('t')
      .leftJoinAndSelect('t.service', 'service')
      .leftJoinAndSelect('t.visitorCategory', 'visitorCategory')
      .leftJoinAndSelect('t.vehicleType', 'vehicleType')
      .leftJoinAndSelect('t.lodgingType', 'lodgingType')
      .where('t.appliesTo = :appliesTo', { appliesTo })
      .andWhere('t.isActive = :isActive', { isActive: true });

    if (categoryId !== undefined) qb.andWhere('(t.visitorCategoryId = :categoryId OR t.visitorCategoryId IS NULL)', { categoryId });
    if (vehicleTypeId !== undefined) qb.andWhere('(t.vehicleTypeId = :vehicleTypeId OR t.vehicleTypeId IS NULL)', { vehicleTypeId });
    if (lodgingTypeId !== undefined) qb.andWhere('(t.lodgingTypeId = :lodgingTypeId OR t.lodgingTypeId IS NULL)', { lodgingTypeId });
    if (isForeign !== undefined) qb.andWhere('(t.isForeign = :isForeign OR t.isForeign IS NULL)', { isForeign });

    const results = await qb.orderBy('t.id', 'DESC').getMany();

    // Prefer exact matches (non-null FK fields) over generic ones
    const exact = results.find((t) => {
      if (categoryId && t.visitorCategoryId !== categoryId) return false;
      if (vehicleTypeId && t.vehicleTypeId !== vehicleTypeId) return false;
      if (lodgingTypeId && t.lodgingTypeId !== lodgingTypeId) return false;
      if (isForeign !== undefined && t.isForeign !== null && t.isForeign !== isForeign) return false;
      return true;
    });

    return exact ?? results[0] ?? null;
  }

  async create(dto: CreateTariffDto, actorId: number, ip: string): Promise<Tariff> {
    const tariff = this.tariffRepo.create({
      ...dto,
      visitorCategoryId: dto.visitorCategoryId ?? null,
      vehicleTypeId: dto.vehicleTypeId ?? null,
      lodgingTypeId: dto.lodgingTypeId ?? null,
      isForeign: dto.isForeign ?? null,
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
    if (dto.isForeign === undefined && 'isForeign' in dto) tariff.isForeign = null;

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
