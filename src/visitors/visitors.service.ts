import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository, IsNull, Like } from 'typeorm';
import { VisitorRecord } from '../database/entities/visitor-record.entity';
import { VisitorCompanion } from '../database/entities/visitor-companion.entity';
import { Receipt } from '../database/entities/receipt.entity';
import { FinancialMovement } from '../database/entities/financial-movement.entity';
import { VisitReason } from '../database/entities/visit-reason.entity';
import { VisitActivity } from '../database/entities/visit-activity.entity';
import { VisitorCategory } from '../database/entities/visitor-category.entity';
import { ParkConfig } from '../database/entities/park-config.entity';
import { Tariff } from '../database/entities/tariff.entity';
import { AuditService } from '../audit/audit.service';
import { CreateVisitorDto } from './dto/create-visitor.dto';
import { UpdateVisitorDto } from './dto/update-visitor.dto';
import { QueryVisitorDto } from './dto/query-visitor.dto';
import { guatemalaTodayISO } from '../common/utils/guatemala-time';

@Injectable()
export class VisitorsService {
  constructor(
    @InjectRepository(VisitorRecord)
    private readonly repo: Repository<VisitorRecord>,
    @InjectRepository(VisitorCompanion)
    private readonly companionRepo: Repository<VisitorCompanion>,
    @InjectRepository(VisitorCategory)
    private readonly categoryRepo: Repository<VisitorCategory>,
    @InjectRepository(ParkConfig)
    private readonly parkConfigRepo: Repository<ParkConfig>,
    @InjectRepository(Tariff)
    private readonly tariffRepo: Repository<Tariff>,
    @InjectRepository(Receipt)
    private readonly receiptRepo: Repository<Receipt>,
    @InjectRepository(FinancialMovement)
    private readonly movementRepo: Repository<FinancialMovement>,
    private readonly auditService: AuditService,
  ) {}

  private async assertEditable(record: VisitorRecord): Promise<void> {
    if ((record as VisitorRecord & { isPaid?: boolean }).isPaid || record.checkOutAt) {
      throw new BadRequestException('No se puede editar un registro ya cobrado. Debe anularse o registrarse un ajuste.');
    }

    const movement = await this.movementRepo
      .createQueryBuilder('m')
      .where('m.originType = :originType', { originType: 'VISITANTE' })
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

  private async attachPaymentStatus<T extends VisitorRecord>(records: T[]): Promise<T[]> {
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
      .setParameters({ originType: 'VISITANTE', ids })
      .getMany();

    const receiptByRecord = new Map<number, Receipt>();
    for (const receipt of receipts) {
      if (receipt.originType === 'VISITANTE' && receipt.originId != null) {
        receiptByRecord.set(Number(receipt.originId), receipt);
      }
      for (const line of receipt.lines ?? []) {
        if (line.originType === 'VISITANTE' && line.originId != null) {
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
      .leftJoinAndSelect('vr.companions', 'companions')
      .leftJoinAndSelect('companions.visitorCategory', 'companionCategory')
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
    const enriched = await this.attachPaymentStatus(data);

    return {
      data: enriched,
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
        'companions',
        'companions.visitorCategory',
      ],
    });
    if (!record) {
      throw new NotFoundException(`Visitor record #${id} not found`);
    }
    return (await this.attachPaymentStatus([record]))[0];
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
    return { data: await this.attachPaymentStatus(data), meta: { page, limit: take, total, totalPages: Math.ceil(total / take) } };
  }

  async findToday(page = 1, limit = 20) {
    const today = guatemalaTodayISO();
    const take = Math.min(limit, 100);
    const skip = (page - 1) * take;
    const [data, total] = await this.repo.findAndCount({
      where: { recordDate: today },
      relations: ['visitorCategory', 'country'],
      order: { checkInAt: 'DESC' },
      skip,
      take,
    });
    return { data: await this.attachPaymentStatus(data), meta: { page, limit: take, total, totalPages: Math.ceil(total / take) } };
  }

  async todaySummary() {
    const today = guatemalaTodayISO();

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
    const today = guatemalaTodayISO();
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
      hasMedicationAllergy: dto.hasMedicationAllergy ?? false,
      medicationAllergyDetail: dto.medicationAllergyDetail ?? null,
      hasDiabetes: dto.hasDiabetes ?? false,
      hasHypertension: dto.hasHypertension ?? false,
      hasRespiratoryDisease: dto.hasRespiratoryDisease ?? false,
      hasAnimalBiteAllergy: dto.hasAnimalBiteAllergy ?? false,
      animalBiteAllergyDetail: dto.animalBiteAllergyDetail ?? null,
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

    // Companions — include their totals in the grand totalAmount
    if (dto.companions && dto.companions.length > 0) {
      const companionTotal = dto.companions.reduce((sum, c) => sum + Number(c.totalAmount), 0);
      record.totalAmount = Number(dto.totalAmount) + companionTotal;
    }

    const saved = await this.repo.save(record);

    // Save companions linking to the saved visitor record
    if (dto.companions && dto.companions.length > 0) {
      const companionEntities = dto.companions.map((c) =>
        this.companionRepo.create({
          visitorRecordId: saved.id,
          visitorCategoryId: c.visitorCategoryId,
          quantity: c.quantity,
          appliedRate: c.appliedRate,
          totalAmount: c.totalAmount,
          isForeign: c.isForeign ?? false,
        }),
      );
      await this.companionRepo.save(companionEntities);
    }

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
    await this.assertEditable(record);
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
    if (dto.hasMedicationAllergy !== undefined) record.hasMedicationAllergy = dto.hasMedicationAllergy;
    if (dto.medicationAllergyDetail !== undefined) record.medicationAllergyDetail = dto.medicationAllergyDetail ?? null;
    if (dto.hasDiabetes !== undefined) record.hasDiabetes = dto.hasDiabetes;
    if (dto.hasHypertension !== undefined) record.hasHypertension = dto.hasHypertension;
    if (dto.hasRespiratoryDisease !== undefined) record.hasRespiratoryDisease = dto.hasRespiratoryDisease;
    if (dto.hasAnimalBiteAllergy !== undefined) record.hasAnimalBiteAllergy = dto.hasAnimalBiteAllergy;
    if (dto.animalBiteAllergyDetail !== undefined) record.animalBiteAllergyDetail = dto.animalBiteAllergyDetail ?? null;

    if (dto.reasonIds !== undefined) {
      record.visitReasons = dto.reasonIds.map((rid) => ({ id: rid } as VisitReason));
    }
    if (dto.activityIds !== undefined) {
      record.visitActivities = dto.activityIds.map((aid) => ({ id: aid } as VisitActivity));
    }

    // Companions: full-replace strategy when present in DTO.
    // If dto.companions is undefined → don't touch companions.
    // If dto.companions is an array (even empty) → replace them entirely.
    if (dto.companions !== undefined) {
      await this.companionRepo.delete({ visitorRecordId: id });
      if (dto.companions.length > 0) {
        const newOnes = dto.companions.map((c) =>
          this.companionRepo.create({
            visitorRecordId: id,
            visitorCategoryId: c.visitorCategoryId,
            quantity: c.quantity,
            appliedRate: c.appliedRate,
            totalAmount: c.totalAmount,
            isForeign: c.isForeign ?? false,
          }),
        );
        await this.companionRepo.save(newOnes);
      }
    }

    // Recalculate total = primary line total + companion totals
    const companionsAfter = await this.companionRepo.find({
      where: { visitorRecordId: id },
    });
    const companionSum = companionsAfter.reduce((s, c) => s + Number(c.totalAmount), 0);
    const primaryTotal =
      dto.totalAmount !== undefined
        ? Number(dto.totalAmount)
        : Number(record.appliedRate) * Number(record.quantity);
    record.totalAmount = parseFloat((primaryTotal + companionSum).toFixed(2));

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
    return { data: await this.attachPaymentStatus(data), meta: { page, limit: take, total, totalPages: Math.ceil(total / take) } };
  }
}
