import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import configuration from './config/configuration';
import { validateEnv } from './config/env.validation';
import { DatabaseModule } from './database/database.module';
import { CommonModule } from './common/common.module';
import { AuditModule } from './audit/audit.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { RolesModule } from './roles/roles.module';
import { PermissionsModule } from './permissions/permissions.module';
import { HealthModule } from './health/health.module';
import { ParkConfigModule } from './park-config/park-config.module';
import { CatalogsModule } from './catalogs/catalogs.module';
import { TariffsModule } from './tariffs/tariffs.module';
import { VisitorsModule } from './visitors/visitors.module';
import { VehiclesModule } from './vehicles/vehicles.module';
import { LodgingModule } from './lodging/lodging.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { ReceiptsModule } from './receipts/receipts.module';
import { CashModule } from './cash/cash.module';
import { ReportsModule } from './reports/reports.module';
import { PrintsModule } from './prints/prints.module';
import { SurveysModule } from './surveys/surveys.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validate: validateEnv,
    }),
    ThrottlerModule.forRootAsync({
      useFactory: () => [
        {
          ttl: parseInt(process.env.THROTTLE_TTL ?? '60') * 1000,
          limit: parseInt(process.env.THROTTLE_LIMIT ?? '100'),
        },
      ],
    }),
    DatabaseModule,
    CommonModule,
    AuditModule,
    AuthModule,
    UsersModule,
    RolesModule,
    PermissionsModule,
    HealthModule,
    ParkConfigModule,
    CatalogsModule,
    TariffsModule,
    VisitorsModule,
    VehiclesModule,
    LodgingModule,
    DashboardModule,
    ReceiptsModule,
    CashModule,
    ReportsModule,
    PrintsModule,
    SurveysModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
