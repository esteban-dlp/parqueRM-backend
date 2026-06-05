import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VisitorRecord } from '../database/entities/visitor-record.entity';
import { VehicleRecord } from '../database/entities/vehicle-record.entity';
import { LodgingRecord } from '../database/entities/lodging-record.entity';
import { FinancialMovement } from '../database/entities/financial-movement.entity';
import { CashClosure } from '../database/entities/cash-closure.entity';
import { Receipt } from '../database/entities/receipt.entity';
import { QueryReportDto } from './dto/query-report.dto';
import { guatemalaDateRangeUtc } from '../common/utils/guatemala-time';

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(VisitorRecord)
    private readonly visitorRepo: Repository<VisitorRecord>,
    @InjectRepository(VehicleRecord)
    private readonly vehicleRepo: Repository<VehicleRecord>,
    @InjectRepository(LodgingRecord)
    private readonly lodgingRepo: Repository<LodgingRecord>,
    @InjectRepository(FinancialMovement)
    private readonly movementRepo: Repository<FinancialMovement>,
    @InjectRepository(CashClosure)
    private readonly closureRepo: Repository<CashClosure>,
    @InjectRepository(Receipt)
    private readonly receiptRepo: Repository<Receipt>,
  ) {}

  private paginate(query: QueryReportDto) {
    const page = Math.max(1, query.page ?? 1);
    const take = Math.min(query.limit ?? 20, parseInt(process.env['MAX_PAGE_SIZE'] ?? '100'));
    return { page, take, skip: (page - 1) * take };
  }

  async getGeneral(query: QueryReportDto) {
    const visitorQb = this.visitorRepo.createQueryBuilder('vr');
    const vehicleQb = this.vehicleRepo.createQueryBuilder('vh');
    const lodgingQb = this.lodgingRepo.createQueryBuilder('lr');
    const incomeQb = this.movementRepo
      .createQueryBuilder('m')
      .where('m.movementType = :t', { t: 'INGRESO' })
      .andWhere('m.status = :s', { s: 'ACTIVO' });
    const expenseQb = this.movementRepo
      .createQueryBuilder('m')
      .where('m.movementType = :t', { t: 'EGRESO' })
      .andWhere('m.status = :s', { s: 'ACTIVO' });

    if (query.from) {
      visitorQb.andWhere('vr.recordDate >= :from', { from: query.from });
      vehicleQb.andWhere('vh.checkInAt >= :from', { from: guatemalaDateRangeUtc(query.from).from });
      lodgingQb.andWhere('lr.recordDate >= :from', { from: query.from });
      incomeQb.andWhere('m.movementDate >= :from', { from: guatemalaDateRangeUtc(query.from).from });
      expenseQb.andWhere('m.movementDate >= :from', { from: guatemalaDateRangeUtc(query.from).from });
    }
    if (query.to) {
      visitorQb.andWhere('vr.recordDate <= :to', { to: query.to });
      vehicleQb.andWhere('vh.checkInAt <= :to', { to: guatemalaDateRangeUtc(undefined, query.to).to });
      lodgingQb.andWhere('lr.recordDate <= :to', { to: query.to });
      incomeQb.andWhere('m.movementDate <= :to', { to: guatemalaDateRangeUtc(undefined, query.to).to });
      expenseQb.andWhere('m.movementDate <= :to', { to: guatemalaDateRangeUtc(undefined, query.to).to });
    }

    const [totalVisitors, totalVehicles, totalLodging] = await Promise.all([
      visitorQb.getCount(),
      vehicleQb.getCount(),
      lodgingQb.getCount(),
    ]);

    const incomeResult = await incomeQb
      .select('SUM(m.amount)', 'total')
      .getRawOne();
    const expenseResult = await expenseQb
      .select('SUM(m.amount)', 'total')
      .getRawOne();

    const totalIncome = Number(incomeResult?.total ?? 0);
    const totalExpense = Number(expenseResult?.total ?? 0);

    return {
      totalVisitors,
      totalVehicles,
      totalLodging,
      totalIncome,
      totalExpense,
      net: totalIncome - totalExpense,
    };
  }

  async getVisitors(query: QueryReportDto) {
    const { page, take, skip } = this.paginate(query);
    const qb = this.visitorRepo
      .createQueryBuilder('vr')
      .leftJoinAndSelect('vr.visitorCategory', 'visitorCategory')
      .leftJoinAndSelect('vr.country', 'country')
      .leftJoinAndSelect('vr.department', 'department')
      .leftJoinAndSelect('vr.municipality', 'municipality')
      .leftJoinAndSelect('vr.infoSource', 'infoSource')
      .leftJoinAndSelect('vr.travelType', 'travelType')
      .leftJoinAndSelect('vr.tariff', 'tariff')
      .leftJoinAndSelect('vr.visitReasons', 'visitReasons')
      .leftJoinAndSelect('vr.visitActivities', 'visitActivities')
      .leftJoinAndSelect('vr.createdByUser', 'createdByUser')
      .leftJoinAndSelect('vr.companions', 'companions')
      .leftJoinAndSelect('companions.visitorCategory', 'companionCategory')
      .orderBy('vr.createdAt', 'DESC')
      .skip(skip)
      .take(take);

    if (query.from) qb.andWhere('vr.recordDate >= :from', { from: query.from });
    if (query.to) qb.andWhere('vr.recordDate <= :to', { to: query.to });
    if (query.categoryId) qb.andWhere('vr.visitorCategoryId = :catId', { catId: query.categoryId });
    if (query.countryId) qb.andWhere('vr.countryId = :countryId', { countryId: query.countryId });
    if (query.departmentId) qb.andWhere('vr.departmentId = :deptId', { deptId: query.departmentId });
    if (query.source) qb.andWhere('vr.source = :source', { source: query.source });

    const [data, total] = await qb.getManyAndCount();
    return { data, meta: { total, page, limit: take, totalPages: Math.ceil(total / take) } };
  }

  async getVisitorsByCategory(query: QueryReportDto) {
    const qb = this.visitorRepo
      .createQueryBuilder('vr')
      .select('vr.visitorCategoryId', 'categoryId')
      .addSelect('vc.name', 'category')
      .addSelect('COUNT(vr.id)', 'count')
      .addSelect('SUM(vr.totalAmount)', 'totalAmount')
      .leftJoin('vr.visitorCategory', 'vc')
      .groupBy('vr.visitorCategoryId')
      .addGroupBy('vc.name');

    if (query.from) qb.andWhere('vr.recordDate >= :from', { from: query.from });
    if (query.to) qb.andWhere('vr.recordDate <= :to', { to: query.to });

    return qb.getRawMany();
  }

  async getVisitorsByOrigin(query: QueryReportDto) {
    const qb = this.visitorRepo
      .createQueryBuilder('vr')
      .select('vr.countryId', 'countryId')
      .addSelect('c.name', 'country')
      .addSelect('COUNT(vr.id)', 'count')
      .leftJoin('vr.country', 'c')
      .groupBy('vr.countryId')
      .addGroupBy('c.name')
      .orderBy('count', 'DESC');

    if (query.from) qb.andWhere('vr.recordDate >= :from', { from: query.from });
    if (query.to) qb.andWhere('vr.recordDate <= :to', { to: query.to });

    return qb.getRawMany();
  }

  async getVisitorsByNationality(query: QueryReportDto) {
    const qb = this.visitorRepo
      .createQueryBuilder('vr')
      .select('vr.nationality', 'nationality')
      .addSelect('COUNT(vr.id)', 'count')
      .groupBy('vr.nationality')
      .orderBy('count', 'DESC');

    if (query.from) qb.andWhere('vr.recordDate >= :from', { from: query.from });
    if (query.to) qb.andWhere('vr.recordDate <= :to', { to: query.to });

    return qb.getRawMany();
  }

  async getVehicles(query: QueryReportDto) {
    const { page, take, skip } = this.paginate(query);
    const qb = this.vehicleRepo
      .createQueryBuilder('vh')
      .leftJoinAndSelect('vh.vehicleType', 'vehicleType')
      .leftJoinAndSelect('vh.tariff', 'tariff')
      .leftJoinAndSelect('vh.visitorRecord', 'visitorRecord')
      .leftJoinAndSelect('vh.createdByUser', 'createdByUser')
      .orderBy('vh.createdAt', 'DESC')
      .skip(skip)
      .take(take);

    if (query.from) qb.andWhere('vh.checkInAt >= :from', { from: guatemalaDateRangeUtc(query.from).from });
    if (query.to) qb.andWhere('vh.checkInAt <= :to', { to: guatemalaDateRangeUtc(undefined, query.to).to });
    if (query.source) qb.andWhere('vh.source = :source', { source: query.source });

    const [data, total] = await qb.getManyAndCount();
    return { data, meta: { total, page, limit: take, totalPages: Math.ceil(total / take) } };
  }

  async getLodging(query: QueryReportDto) {
    const { page, take, skip } = this.paginate(query);
    const qb = this.lodgingRepo
      .createQueryBuilder('lr')
      .leftJoinAndSelect('lr.lodgingType', 'lodgingType')
      .leftJoinAndSelect('lr.tariff', 'tariff')
      .leftJoinAndSelect('lr.createdByUser', 'createdByUser')
      .orderBy('lr.createdAt', 'DESC')
      .skip(skip)
      .take(take);

    if (query.from) qb.andWhere('lr.recordDate >= :from', { from: query.from });
    if (query.to) qb.andWhere('lr.recordDate <= :to', { to: query.to });
    if (query.lodgingTypeId) qb.andWhere('lr.lodgingTypeId = :ltId', { ltId: query.lodgingTypeId });

    const [data, total] = await qb.getManyAndCount();
    return { data, meta: { total, page, limit: take, totalPages: Math.ceil(total / take) } };
  }

  async getIncome(query: QueryReportDto) {
    const { page, take, skip } = this.paginate(query);
    const qb = this.movementRepo
      .createQueryBuilder('m')
      .leftJoinAndSelect('m.concept', 'concept')
      .leftJoinAndSelect('m.paymentMethod', 'paymentMethod')
      .leftJoinAndSelect('m.receipt', 'receipt')
      .leftJoinAndSelect('m.createdByUser', 'createdByUser')
      .where('m.movementType = :t', { t: 'INGRESO' })
      .andWhere('m.status = :s', { s: 'ACTIVO' })
      .orderBy('m.createdAt', 'DESC')
      .skip(skip)
      .take(take);

    if (query.from) qb.andWhere('m.movementDate >= :from', { from: guatemalaDateRangeUtc(query.from).from });
    if (query.to) qb.andWhere('m.movementDate <= :to', { to: guatemalaDateRangeUtc(undefined, query.to).to });
    if (query.paymentMethodId) qb.andWhere('m.paymentMethodId = :pmId', { pmId: query.paymentMethodId });

    const [data, total] = await qb.getManyAndCount();
    return { data, meta: { total, page, limit: take, totalPages: Math.ceil(total / take) } };
  }

  async getExpenses(query: QueryReportDto) {
    const { page, take, skip } = this.paginate(query);
    const qb = this.movementRepo
      .createQueryBuilder('m')
      .leftJoinAndSelect('m.concept', 'concept')
      .leftJoinAndSelect('m.paymentMethod', 'paymentMethod')
      .leftJoinAndSelect('m.receipt', 'receipt')
      .leftJoinAndSelect('m.createdByUser', 'createdByUser')
      .where('m.movementType = :t', { t: 'EGRESO' })
      .andWhere('m.status = :s', { s: 'ACTIVO' })
      .orderBy('m.createdAt', 'DESC')
      .skip(skip)
      .take(take);

    if (query.from) qb.andWhere('m.movementDate >= :from', { from: guatemalaDateRangeUtc(query.from).from });
    if (query.to) qb.andWhere('m.movementDate <= :to', { to: guatemalaDateRangeUtc(undefined, query.to).to });
    if (query.paymentMethodId) qb.andWhere('m.paymentMethodId = :pmId', { pmId: query.paymentMethodId });

    const [data, total] = await qb.getManyAndCount();
    return { data, meta: { total, page, limit: take, totalPages: Math.ceil(total / take) } };
  }

  async getCashClosures(query: QueryReportDto) {
    const { page, take, skip } = this.paginate(query);
    const qb = this.closureRepo
      .createQueryBuilder('c')
      .leftJoinAndSelect('c.closedByUser', 'closedByUser')
      .orderBy('c.createdAt', 'DESC')
      .skip(skip)
      .take(take);

    if (query.from) qb.andWhere('c.closedAt >= :from', { from: guatemalaDateRangeUtc(query.from).from });
    if (query.to) qb.andWhere('c.closedAt <= :to', { to: guatemalaDateRangeUtc(undefined, query.to).to });

    const [data, total] = await qb.getManyAndCount();
    return { data, meta: { total, page, limit: take, totalPages: Math.ceil(total / take) } };
  }

  async getReceipts(query: QueryReportDto) {
    const { page, take, skip } = this.paginate(query);
    const qb = this.receiptRepo
      .createQueryBuilder('r')
      .leftJoinAndSelect('r.paymentMethod', 'paymentMethod')
      .leftJoinAndSelect('r.createdByUser', 'createdByUser')
      .leftJoinAndSelect('r.cancelledByUser', 'cancelledByUser')
      .leftJoinAndSelect('r.lines', 'lines')
      .orderBy('r.createdAt', 'DESC')
      .skip(skip)
      .take(take);

    if (query.from) qb.andWhere('r.receiptDate >= :from', { from: guatemalaDateRangeUtc(query.from).from });
    if (query.to) qb.andWhere('r.receiptDate <= :to', { to: guatemalaDateRangeUtc(undefined, query.to).to });
    if (query.paymentMethodId) qb.andWhere('r.paymentMethodId = :pmId', { pmId: query.paymentMethodId });

    const [data, total] = await qb.getManyAndCount();
    return { data, meta: { total, page, limit: take, totalPages: Math.ceil(total / take) } };
  }

  /**
   * Visitors report with companion lines included so exports can audit the
   * full Q250 grand-total vs. the Q200 primary line.
   */
  async getVisitorsWithLines(query: QueryReportDto) {
    const qb = this.visitorRepo
      .createQueryBuilder('vr')
      .leftJoinAndSelect('vr.visitorCategory', 'visitorCategory')
      .leftJoinAndSelect('vr.country', 'country')
      .leftJoinAndSelect('vr.department', 'department')
      .leftJoinAndSelect('vr.municipality', 'municipality')
      .leftJoinAndSelect('vr.infoSource', 'infoSource')
      .leftJoinAndSelect('vr.travelType', 'travelType')
      .leftJoinAndSelect('vr.tariff', 'tariff')
      .leftJoinAndSelect('vr.visitReasons', 'visitReasons')
      .leftJoinAndSelect('vr.visitActivities', 'visitActivities')
      .leftJoinAndSelect('vr.createdByUser', 'createdByUser')
      .leftJoinAndSelect('vr.companions', 'companions')
      .leftJoinAndSelect('companions.visitorCategory', 'companionCategory')
      .orderBy('vr.createdAt', 'DESC');

    if (query.from) qb.andWhere('vr.recordDate >= :from', { from: query.from });
    if (query.to) qb.andWhere('vr.recordDate <= :to', { to: query.to });

    return qb.getMany();
  }
}
