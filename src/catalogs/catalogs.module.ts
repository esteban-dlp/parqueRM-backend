import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Country } from '../database/entities/country.entity';
import { Department } from '../database/entities/department.entity';
import { Municipality } from '../database/entities/municipality.entity';
import { VisitorCategory } from '../database/entities/visitor-category.entity';
import { VehicleType } from '../database/entities/vehicle-type.entity';
import { LodgingType } from '../database/entities/lodging-type.entity';
import { PaymentMethod } from '../database/entities/payment-method.entity';
import { FinancialConcept } from '../database/entities/financial-concept.entity';
import { VisitReason } from '../database/entities/visit-reason.entity';
import { VisitActivity } from '../database/entities/visit-activity.entity';
import { InfoSource } from '../database/entities/info-source.entity';
import { TravelType } from '../database/entities/travel-type.entity';
import { CatalogsService } from './catalogs.service';
import { CatalogsController } from './catalogs.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
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
    ]),
  ],
  providers: [CatalogsService],
  controllers: [CatalogsController],
  exports: [CatalogsService],
})
export class CatalogsModule {}
