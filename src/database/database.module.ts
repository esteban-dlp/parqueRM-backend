import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Permission } from './entities/permission.entity';
import { Role } from './entities/role.entity';
import { User } from './entities/user.entity';
import { AuditLog } from './entities/audit-log.entity';
import { ParkConfig } from './entities/park-config.entity';
import { Service } from './entities/service.entity';
import { Country } from './entities/country.entity';
import { Department } from './entities/department.entity';
import { Municipality } from './entities/municipality.entity';
import { VisitorCategory } from './entities/visitor-category.entity';
import { VehicleType } from './entities/vehicle-type.entity';
import { LodgingType } from './entities/lodging-type.entity';
import { PaymentMethod } from './entities/payment-method.entity';
import { FinancialConcept } from './entities/financial-concept.entity';
import { VisitReason } from './entities/visit-reason.entity';
import { VisitActivity } from './entities/visit-activity.entity';
import { InfoSource } from './entities/info-source.entity';
import { TravelType } from './entities/travel-type.entity';
import { Tariff } from './entities/tariff.entity';
import { VisitorRecord } from './entities/visitor-record.entity';
import { VehicleRecord } from './entities/vehicle-record.entity';
import { LodgingRecord } from './entities/lodging-record.entity';
import { Receipt } from './entities/receipt.entity';
import { ReceiptLine } from './entities/receipt-line.entity';
import { CashClosure } from './entities/cash-closure.entity';
import { CashClosureDetail } from './entities/cash-closure-detail.entity';
import { FinancialMovement } from './entities/financial-movement.entity';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'mssql' as const,
        host: config.get<string>('database.host'),
        port: config.get<number>('database.port'),
        username: config.get<string>('database.user'),
        password: config.get<string>('database.password'),
        database: config.get<string>('database.name'),
        synchronize: false,
        autoLoadEntities: true,
        entities: [
          User,
          Role,
          Permission,
          AuditLog,
          ParkConfig,
          Service,
          Country,
          Department,
          Municipality,
          VisitorCategory,
          VehicleType,
          LodgingType,
          PaymentMethod,
          FinancialConcept,
          VisitReason,
          VisitActivity,
          InfoSource,
          TravelType,
          Tariff,
          VisitorRecord,
          VehicleRecord,
          LodgingRecord,
          Receipt,
          ReceiptLine,
          CashClosure,
          CashClosureDetail,
          FinancialMovement,
        ],
        options: {
          encrypt: config.get<boolean>('database.encrypt') ?? false,
          trustServerCertificate: config.get<boolean>('database.trustServerCert') ?? true,
          enableArithAbort: true,
        },
        extra: {
          connectionTimeout: 30000,
          requestTimeout: 30000,
        },
      }),
    }),
  ],
})
export class DatabaseModule {}
