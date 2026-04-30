import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { VisitorRecord } from '../database/entities/visitor-record.entity';
import { VehicleRecord } from '../database/entities/vehicle-record.entity';
import { LodgingRecord } from '../database/entities/lodging-record.entity';
import { FinancialMovement } from '../database/entities/financial-movement.entity';
import { ParkConfig } from '../database/entities/park-config.entity';

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(VisitorRecord)
    private readonly visitorRepo: Repository<VisitorRecord>,
    @InjectRepository(VehicleRecord)
    private readonly vehicleRepo: Repository<VehicleRecord>,
    @InjectRepository(LodgingRecord)
    private readonly lodgingRepo: Repository<LodgingRecord>,
    @InjectRepository(FinancialMovement)
    private readonly movementRepo: Repository<FinancialMovement>,
    @InjectRepository(ParkConfig)
    private readonly parkConfigRepo: Repository<ParkConfig>,
  ) {}

  private today() {
    return new Date().toISOString().slice(0, 10);
  }

  async getToday() {
    const today = this.today();

    const [visitors, vehicles, lodging] = await Promise.all([
      this.visitorRepo
        .createQueryBuilder('v')
        .select('COUNT(v.id)', 'count')
        .addSelect('SUM(v.quantity)', 'quantity')
        .addSelect('SUM(v.totalAmount)', 'amount')
        .where('v.recordDate = :today', { today })
        .getRawOne(),
      this.vehicleRepo
        .createQueryBuilder('v')
        .select('COUNT(v.id)', 'count')
        .addSelect('SUM(v.totalAmount)', 'amount')
        .where('CAST(v.checkInAt AS DATE) = :today', { today })
        .getRawOne(),
      this.lodgingRepo
        .createQueryBuilder('l')
        .select('COUNT(l.id)', 'count')
        .addSelect('SUM(l.totalAmount)', 'amount')
        .where('l.recordDate = :today', { today })
        .getRawOne(),
      this.movementRepo
        .createQueryBuilder('m')
        .select('SUM(m.amount)', 'income')
        .where('CAST(m.movementDate AS DATE) = :today', { today })
        .andWhere("m.movementType = 'INGRESO'")
        .andWhere("m.status = 'ACTIVO'")
        .getRawOne(),
    ]);

    const incomeRow = await this.movementRepo
      .createQueryBuilder('m')
      .select('SUM(m.amount)', 'income')
      .where('CAST(m.movementDate AS DATE) = :today', { today })
      .andWhere("m.movementType = 'INGRESO'")
      .andWhere("m.status = 'ACTIVO'")
      .getRawOne();

    return {
      date: today,
      visitors: {
        records: Number(visitors?.count ?? 0),
        quantity: Number(visitors?.quantity ?? 0),
        amount: Number(visitors?.amount ?? 0),
      },
      vehicles: {
        records: Number(vehicles?.count ?? 0),
        amount: Number(vehicles?.amount ?? 0),
      },
      lodging: {
        records: Number(lodging?.count ?? 0),
        amount: Number(lodging?.amount ?? 0),
      },
      income: Number(incomeRow?.income ?? 0),
    };
  }

  async getSummary() {
    const today = this.today();
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weekStr = weekAgo.toISOString().slice(0, 10);

    const todayData = await this.getToday();

    const weekVisitors = await this.visitorRepo
      .createQueryBuilder('v')
      .select('COUNT(v.id)', 'count')
      .addSelect('SUM(v.quantity)', 'quantity')
      .where('v.recordDate >= :from', { from: weekStr })
      .getRawOne();

    const weekIncome = await this.movementRepo
      .createQueryBuilder('m')
      .select('SUM(m.amount)', 'income')
      .where('CAST(m.movementDate AS DATE) >= :from', { from: weekStr })
      .andWhere("m.movementType = 'INGRESO'")
      .andWhere("m.status = 'ACTIVO'")
      .getRawOne();

    return {
      today: todayData,
      week: {
        visitors: Number(weekVisitors?.count ?? 0),
        quantity: Number(weekVisitors?.quantity ?? 0),
        income: Number(weekIncome?.income ?? 0),
      },
    };
  }

  async getVisitorsSummary(from?: string, to?: string) {
    const today = this.today();
    const dateFrom = from ?? today;
    const dateTo = to ?? today;

    const totals = await this.visitorRepo
      .createQueryBuilder('v')
      .select('COUNT(v.id)', 'totalRecords')
      .addSelect('SUM(v.quantity)', 'totalQuantity')
      .addSelect('SUM(v.totalAmount)', 'totalAmount')
      .where('v.recordDate >= :from AND v.recordDate <= :to', { from: dateFrom, to: dateTo })
      .getRawOne();

    const byCategory = await this.visitorRepo
      .createQueryBuilder('v')
      .leftJoin('v.visitorCategory', 'vc')
      .select('vc.name', 'category')
      .addSelect('COUNT(v.id)', 'records')
      .addSelect('SUM(v.quantity)', 'quantity')
      .addSelect('SUM(v.totalAmount)', 'amount')
      .where('v.recordDate >= :from AND v.recordDate <= :to', { from: dateFrom, to: dateTo })
      .groupBy('vc.name')
      .getRawMany();

    return {
      from: dateFrom,
      to: dateTo,
      totalRecords: Number(totals?.totalRecords ?? 0),
      totalQuantity: Number(totals?.totalQuantity ?? 0),
      totalAmount: Number(totals?.totalAmount ?? 0),
      byCategory,
    };
  }

  async getVehiclesSummary(from?: string, to?: string) {
    const today = this.today();
    const dateFrom = from ?? today;
    const dateTo = to ?? today;

    const totals = await this.vehicleRepo
      .createQueryBuilder('v')
      .select('COUNT(v.id)', 'totalRecords')
      .addSelect('SUM(v.totalAmount)', 'totalAmount')
      .where('CAST(v.checkInAt AS DATE) >= :from AND CAST(v.checkInAt AS DATE) <= :to', {
        from: dateFrom,
        to: dateTo,
      })
      .getRawOne();

    const byType = await this.vehicleRepo
      .createQueryBuilder('v')
      .leftJoin('v.vehicleType', 'vt')
      .select('vt.name', 'type')
      .addSelect('COUNT(v.id)', 'records')
      .addSelect('SUM(v.totalAmount)', 'amount')
      .where('CAST(v.checkInAt AS DATE) >= :from AND CAST(v.checkInAt AS DATE) <= :to', {
        from: dateFrom,
        to: dateTo,
      })
      .groupBy('vt.name')
      .getRawMany();

    return {
      from: dateFrom,
      to: dateTo,
      totalRecords: Number(totals?.totalRecords ?? 0),
      totalAmount: Number(totals?.totalAmount ?? 0),
      byType,
    };
  }

  async getIncomeSummary(from?: string, to?: string) {
    const today = this.today();
    const dateFrom = from ?? today;
    const dateTo = to ?? today;

    const income = await this.movementRepo
      .createQueryBuilder('m')
      .select('SUM(m.amount)', 'total')
      .where("CAST(m.movementDate AS DATE) >= :from AND CAST(m.movementDate AS DATE) <= :to", {
        from: dateFrom,
        to: dateTo,
      })
      .andWhere("m.movementType = 'INGRESO'")
      .andWhere("m.status = 'ACTIVO'")
      .getRawOne();

    const expense = await this.movementRepo
      .createQueryBuilder('m')
      .select('SUM(m.amount)', 'total')
      .where("CAST(m.movementDate AS DATE) >= :from AND CAST(m.movementDate AS DATE) <= :to", {
        from: dateFrom,
        to: dateTo,
      })
      .andWhere("m.movementType = 'EGRESO'")
      .andWhere("m.status = 'ACTIVO'")
      .getRawOne();

    const byMethod = await this.movementRepo
      .createQueryBuilder('m')
      .leftJoin('m.paymentMethod', 'pm')
      .select('pm.name', 'method')
      .addSelect('SUM(m.amount)', 'total')
      .addSelect('m.movementType', 'type')
      .where("CAST(m.movementDate AS DATE) >= :from AND CAST(m.movementDate AS DATE) <= :to", {
        from: dateFrom,
        to: dateTo,
      })
      .andWhere("m.status = 'ACTIVO'")
      .groupBy('pm.name, m.movementType')
      .getRawMany();

    return {
      from: dateFrom,
      to: dateTo,
      totalIncome: Number(income?.total ?? 0),
      totalExpense: Number(expense?.total ?? 0),
      net: Number(income?.total ?? 0) - Number(expense?.total ?? 0),
      byMethod,
    };
  }

  async getLatestMovements(limit = 10) {
    return this.movementRepo.find({
      order: { createdAt: 'DESC' },
      take: Math.min(limit, 50),
      relations: ['concept', 'paymentMethod', 'createdByUser'],
    });
  }

  async getOccupancy() {
    const currentInside = await this.visitorRepo.count({ where: { checkOutAt: IsNull() } });
    const config = await this.parkConfigRepo.findOne({ where: {} });
    const maxCapacity = config?.maxCapacity ?? 0;
    const percentage = maxCapacity > 0 ? Math.round((currentInside / maxCapacity) * 100) : 0;
    return { currentInside, maxCapacity, percentage };
  }
}
