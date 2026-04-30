import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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
import { CreateCatalogItemDto } from './dto/create-catalog-item.dto';
import { UpdateCatalogItemDto } from './dto/update-catalog-item.dto';

type CatalogEntity = { id: number; name: string; isActive?: boolean; [key: string]: any };

@Injectable()
export class CatalogsService {
  constructor(
    @InjectRepository(Country)
    private readonly countryRepo: Repository<Country>,
    @InjectRepository(Department)
    private readonly departmentRepo: Repository<Department>,
    @InjectRepository(Municipality)
    private readonly municipalityRepo: Repository<Municipality>,
    @InjectRepository(VisitorCategory)
    private readonly visitorCategoryRepo: Repository<VisitorCategory>,
    @InjectRepository(VehicleType)
    private readonly vehicleTypeRepo: Repository<VehicleType>,
    @InjectRepository(LodgingType)
    private readonly lodgingTypeRepo: Repository<LodgingType>,
    @InjectRepository(PaymentMethod)
    private readonly paymentMethodRepo: Repository<PaymentMethod>,
    @InjectRepository(FinancialConcept)
    private readonly financialConceptRepo: Repository<FinancialConcept>,
    @InjectRepository(VisitReason)
    private readonly visitReasonRepo: Repository<VisitReason>,
    @InjectRepository(VisitActivity)
    private readonly visitActivityRepo: Repository<VisitActivity>,
    @InjectRepository(InfoSource)
    private readonly infoSourceRepo: Repository<InfoSource>,
    @InjectRepository(TravelType)
    private readonly travelTypeRepo: Repository<TravelType>,
  ) {}

  // Generic helpers
  private clampLimit(limit: number): number {
    return Math.min(limit, parseInt(process.env.MAX_PAGE_SIZE ?? '100'));
  }

  private async genericFindAll<T extends CatalogEntity>(
    repo: Repository<T>,
    page = 1,
    limit = 20,
    where?: Partial<T>,
    order?: any,
  ): Promise<{ items: T[]; total: number; page: number; limit: number; totalPages: number }> {
    const take = this.clampLimit(limit);
    const skip = (page - 1) * take;
    const [items, total] = await repo.findAndCount({
      where: where as any,
      order: order ?? ({ name: 'ASC' } as any),
      skip,
      take,
    });
    return { items, total, page, limit: take, totalPages: Math.ceil(total / take) };
  }

  private async genericFindById<T extends CatalogEntity>(
    repo: Repository<T>,
    id: number,
    entityLabel: string,
  ): Promise<T> {
    const item = await repo.findOne({ where: { id } as any });
    if (!item) throw new NotFoundException(`${entityLabel} #${id} not found`);
    return item;
  }

  private async genericCreate<T extends CatalogEntity>(repo: Repository<T>, data: Partial<T>): Promise<T> {
    const entity = repo.create(data as any);
    return repo.save(entity as any);
  }

  private async genericUpdate<T extends CatalogEntity>(
    repo: Repository<T>,
    id: number,
    data: Partial<T>,
    entityLabel: string,
  ): Promise<T> {
    const entity = await this.genericFindById(repo, id, entityLabel);
    Object.assign(entity, data);
    return repo.save(entity as any);
  }

  private async genericToggleStatus<T extends CatalogEntity>(
    repo: Repository<T>,
    id: number,
    entityLabel: string,
  ): Promise<T> {
    const entity = await this.genericFindById(repo, id, entityLabel);
    entity.isActive = !entity.isActive;
    return repo.save(entity as any);
  }

  private async genericDelete<T extends CatalogEntity>(
    repo: Repository<T>,
    id: number,
    entityLabel: string,
  ): Promise<void> {
    const entity = await this.genericFindById(repo, id, entityLabel);
    if ('isActive' in entity) {
      entity.isActive = false;
      await repo.save(entity as any);
    } else {
      await repo.remove(entity as any);
    }
  }

  // ─── Countries ─────────────────────────────────────────────────────────────
  findAllCountries(page = 1, limit = 20) {
    return this.genericFindAll(this.countryRepo, page, limit);
  }
  findCountryById(id: number) {
    return this.genericFindById(this.countryRepo, id, 'Country');
  }
  createCountry(dto: CreateCatalogItemDto) {
    return this.genericCreate(this.countryRepo, {
      name: dto.name,
      nationality: dto.nationality ?? null,
      isActive: true,
    } as any);
  }
  updateCountry(id: number, dto: UpdateCatalogItemDto) {
    const data: any = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.nationality !== undefined) data.nationality = dto.nationality;
    return this.genericUpdate(this.countryRepo, id, data, 'Country');
  }
  toggleCountryStatus(id: number) {
    return this.genericToggleStatus(this.countryRepo, id, 'Country');
  }
  deleteCountry(id: number) {
    return this.genericDelete(this.countryRepo, id, 'Country');
  }

  // ─── Departments ───────────────────────────────────────────────────────────
  findAllDepartments(page = 1, limit = 20) {
    return this.genericFindAll(this.departmentRepo, page, limit);
  }
  findDepartmentById(id: number) {
    return this.genericFindById(this.departmentRepo, id, 'Department');
  }
  createDepartment(dto: CreateCatalogItemDto) {
    return this.genericCreate(this.departmentRepo, { name: dto.name, isActive: true } as any);
  }
  updateDepartment(id: number, dto: UpdateCatalogItemDto) {
    const data: any = {};
    if (dto.name !== undefined) data.name = dto.name;
    return this.genericUpdate(this.departmentRepo, id, data, 'Department');
  }
  toggleDepartmentStatus(id: number) {
    return this.genericToggleStatus(this.departmentRepo, id, 'Department');
  }
  deleteDepartment(id: number) {
    return this.genericDelete(this.departmentRepo, id, 'Department');
  }

  // ─── Municipalities ────────────────────────────────────────────────────────
  findAllMunicipalities(page = 1, limit = 20) {
    return this.genericFindAll(this.municipalityRepo, page, limit, undefined, {
      department: { name: 'ASC' },
      name: 'ASC',
    });
  }
  findMunicipalityById(id: number) {
    return this.municipalityRepo.findOne({ where: { id }, relations: ['department'] }).then((m) => {
      if (!m) throw new NotFoundException(`Municipality #${id} not found`);
      return m;
    });
  }
  async findByDepartment(departmentId: number, page = 1, limit = 20) {
    const take = this.clampLimit(limit);
    const skip = (page - 1) * take;
    const [items, total] = await this.municipalityRepo.findAndCount({
      where: { departmentId } as any,
      order: { name: 'ASC' } as any,
      skip,
      take,
    });
    return { items, total, page, limit: take, totalPages: Math.ceil(total / take) };
  }
  createMunicipality(dto: CreateCatalogItemDto) {
    if (!dto.departmentId) throw new NotFoundException('departmentId is required for municipalities');
    return this.genericCreate(this.municipalityRepo, {
      name: dto.name,
      departmentId: dto.departmentId,
      isActive: true,
    } as any);
  }
  updateMunicipality(id: number, dto: UpdateCatalogItemDto) {
    const data: any = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.departmentId !== undefined) data.departmentId = dto.departmentId;
    return this.genericUpdate(this.municipalityRepo, id, data, 'Municipality');
  }
  toggleMunicipalityStatus(id: number) {
    return this.genericToggleStatus(this.municipalityRepo, id, 'Municipality');
  }
  deleteMunicipality(id: number) {
    return this.genericDelete(this.municipalityRepo, id, 'Municipality');
  }

  // ─── Visitor Categories ────────────────────────────────────────────────────
  findAllVisitorCategories(page = 1, limit = 20) {
    return this.genericFindAll(this.visitorCategoryRepo, page, limit);
  }
  findVisitorCategoryById(id: number) {
    return this.genericFindById(this.visitorCategoryRepo, id, 'VisitorCategory');
  }
  createVisitorCategory(dto: CreateCatalogItemDto) {
    return this.genericCreate(this.visitorCategoryRepo, { name: dto.name, isActive: true } as any);
  }
  updateVisitorCategory(id: number, dto: UpdateCatalogItemDto) {
    const data: any = {};
    if (dto.name !== undefined) data.name = dto.name;
    return this.genericUpdate(this.visitorCategoryRepo, id, data, 'VisitorCategory');
  }
  toggleVisitorCategoryStatus(id: number) {
    return this.genericToggleStatus(this.visitorCategoryRepo, id, 'VisitorCategory');
  }
  deleteVisitorCategory(id: number) {
    return this.genericDelete(this.visitorCategoryRepo, id, 'VisitorCategory');
  }

  // ─── Vehicle Types ─────────────────────────────────────────────────────────
  findAllVehicleTypes(page = 1, limit = 20) {
    return this.genericFindAll(this.vehicleTypeRepo, page, limit);
  }
  findVehicleTypeById(id: number) {
    return this.genericFindById(this.vehicleTypeRepo, id, 'VehicleType');
  }
  createVehicleType(dto: CreateCatalogItemDto) {
    return this.genericCreate(this.vehicleTypeRepo, { name: dto.name, isActive: true } as any);
  }
  updateVehicleType(id: number, dto: UpdateCatalogItemDto) {
    const data: any = {};
    if (dto.name !== undefined) data.name = dto.name;
    return this.genericUpdate(this.vehicleTypeRepo, id, data, 'VehicleType');
  }
  toggleVehicleTypeStatus(id: number) {
    return this.genericToggleStatus(this.vehicleTypeRepo, id, 'VehicleType');
  }
  deleteVehicleType(id: number) {
    return this.genericDelete(this.vehicleTypeRepo, id, 'VehicleType');
  }

  // ─── Lodging Types ─────────────────────────────────────────────────────────
  findAllLodgingTypes(page = 1, limit = 20) {
    return this.genericFindAll(this.lodgingTypeRepo, page, limit);
  }
  findLodgingTypeById(id: number) {
    return this.genericFindById(this.lodgingTypeRepo, id, 'LodgingType');
  }
  createLodgingType(dto: CreateCatalogItemDto) {
    return this.genericCreate(this.lodgingTypeRepo, { name: dto.name, isActive: true } as any);
  }
  updateLodgingType(id: number, dto: UpdateCatalogItemDto) {
    const data: any = {};
    if (dto.name !== undefined) data.name = dto.name;
    return this.genericUpdate(this.lodgingTypeRepo, id, data, 'LodgingType');
  }
  toggleLodgingTypeStatus(id: number) {
    return this.genericToggleStatus(this.lodgingTypeRepo, id, 'LodgingType');
  }
  deleteLodgingType(id: number) {
    return this.genericDelete(this.lodgingTypeRepo, id, 'LodgingType');
  }

  // ─── Payment Methods ───────────────────────────────────────────────────────
  findAllPaymentMethods(page = 1, limit = 20) {
    return this.genericFindAll(this.paymentMethodRepo, page, limit);
  }
  findPaymentMethodById(id: number) {
    return this.genericFindById(this.paymentMethodRepo, id, 'PaymentMethod');
  }
  createPaymentMethod(dto: CreateCatalogItemDto) {
    return this.genericCreate(this.paymentMethodRepo, { name: dto.name, isActive: true } as any);
  }
  updatePaymentMethod(id: number, dto: UpdateCatalogItemDto) {
    const data: any = {};
    if (dto.name !== undefined) data.name = dto.name;
    return this.genericUpdate(this.paymentMethodRepo, id, data, 'PaymentMethod');
  }
  togglePaymentMethodStatus(id: number) {
    return this.genericToggleStatus(this.paymentMethodRepo, id, 'PaymentMethod');
  }
  deletePaymentMethod(id: number) {
    return this.genericDelete(this.paymentMethodRepo, id, 'PaymentMethod');
  }

  // ─── Financial Concepts ────────────────────────────────────────────────────
  findAllFinancialConcepts(page = 1, limit = 20, type?: 'INGRESO' | 'EGRESO') {
    const where = type ? ({ type } as any) : undefined;
    return this.genericFindAll(this.financialConceptRepo, page, limit, where);
  }
  findFinancialConceptById(id: number) {
    return this.genericFindById(this.financialConceptRepo, id, 'FinancialConcept');
  }
  createFinancialConcept(dto: CreateCatalogItemDto) {
    if (!dto.type) throw new NotFoundException('type (INGRESO|EGRESO) is required for financial-concepts');
    return this.genericCreate(this.financialConceptRepo, {
      name: dto.name,
      type: dto.type,
      isActive: true,
    } as any);
  }
  updateFinancialConcept(id: number, dto: UpdateCatalogItemDto) {
    const data: any = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.type !== undefined) data.type = dto.type;
    return this.genericUpdate(this.financialConceptRepo, id, data, 'FinancialConcept');
  }
  toggleFinancialConceptStatus(id: number) {
    return this.genericToggleStatus(this.financialConceptRepo, id, 'FinancialConcept');
  }
  deleteFinancialConcept(id: number) {
    return this.genericDelete(this.financialConceptRepo, id, 'FinancialConcept');
  }

  // ─── Visit Reasons ─────────────────────────────────────────────────────────
  findAllVisitReasons(page = 1, limit = 20) {
    return this.genericFindAll(this.visitReasonRepo, page, limit);
  }
  findVisitReasonById(id: number) {
    return this.genericFindById(this.visitReasonRepo, id, 'VisitReason');
  }
  createVisitReason(dto: CreateCatalogItemDto) {
    return this.genericCreate(this.visitReasonRepo, { name: dto.name, isActive: true } as any);
  }
  updateVisitReason(id: number, dto: UpdateCatalogItemDto) {
    const data: any = {};
    if (dto.name !== undefined) data.name = dto.name;
    return this.genericUpdate(this.visitReasonRepo, id, data, 'VisitReason');
  }
  toggleVisitReasonStatus(id: number) {
    return this.genericToggleStatus(this.visitReasonRepo, id, 'VisitReason');
  }
  deleteVisitReason(id: number) {
    return this.genericDelete(this.visitReasonRepo, id, 'VisitReason');
  }

  // ─── Visit Activities ──────────────────────────────────────────────────────
  findAllVisitActivities(page = 1, limit = 20) {
    return this.genericFindAll(this.visitActivityRepo, page, limit);
  }
  findVisitActivityById(id: number) {
    return this.genericFindById(this.visitActivityRepo, id, 'VisitActivity');
  }
  createVisitActivity(dto: CreateCatalogItemDto) {
    return this.genericCreate(this.visitActivityRepo, { name: dto.name, isActive: true } as any);
  }
  updateVisitActivity(id: number, dto: UpdateCatalogItemDto) {
    const data: any = {};
    if (dto.name !== undefined) data.name = dto.name;
    return this.genericUpdate(this.visitActivityRepo, id, data, 'VisitActivity');
  }
  toggleVisitActivityStatus(id: number) {
    return this.genericToggleStatus(this.visitActivityRepo, id, 'VisitActivity');
  }
  deleteVisitActivity(id: number) {
    return this.genericDelete(this.visitActivityRepo, id, 'VisitActivity');
  }

  // ─── Info Sources ──────────────────────────────────────────────────────────
  findAllInfoSources(page = 1, limit = 20) {
    return this.genericFindAll(this.infoSourceRepo, page, limit);
  }
  findInfoSourceById(id: number) {
    return this.genericFindById(this.infoSourceRepo, id, 'InfoSource');
  }
  createInfoSource(dto: CreateCatalogItemDto) {
    return this.genericCreate(this.infoSourceRepo, { name: dto.name, isActive: true } as any);
  }
  updateInfoSource(id: number, dto: UpdateCatalogItemDto) {
    const data: any = {};
    if (dto.name !== undefined) data.name = dto.name;
    return this.genericUpdate(this.infoSourceRepo, id, data, 'InfoSource');
  }
  toggleInfoSourceStatus(id: number) {
    return this.genericToggleStatus(this.infoSourceRepo, id, 'InfoSource');
  }
  deleteInfoSource(id: number) {
    return this.genericDelete(this.infoSourceRepo, id, 'InfoSource');
  }

  // ─── Travel Types ──────────────────────────────────────────────────────────
  findAllTravelTypes(page = 1, limit = 20) {
    return this.genericFindAll(this.travelTypeRepo, page, limit);
  }
  findTravelTypeById(id: number) {
    return this.genericFindById(this.travelTypeRepo, id, 'TravelType');
  }
  createTravelType(dto: CreateCatalogItemDto) {
    return this.genericCreate(this.travelTypeRepo, { name: dto.name, isActive: true } as any);
  }
  updateTravelType(id: number, dto: UpdateCatalogItemDto) {
    const data: any = {};
    if (dto.name !== undefined) data.name = dto.name;
    return this.genericUpdate(this.travelTypeRepo, id, data, 'TravelType');
  }
  toggleTravelTypeStatus(id: number) {
    return this.genericToggleStatus(this.travelTypeRepo, id, 'TravelType');
  }
  deleteTravelType(id: number) {
    return this.genericDelete(this.travelTypeRepo, id, 'TravelType');
  }
}
