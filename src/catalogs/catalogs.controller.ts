import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { CatalogsService } from './catalogs.service';
import { CreateCatalogItemDto } from './dto/create-catalog-item.dto';
import { UpdateCatalogItemDto } from './dto/update-catalog-item.dto';
import { ResponseService } from '../common/services/response.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';

@ApiTags('catalogs')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('catalogs')
export class CatalogsController {
  constructor(
    private readonly catalogsService: CatalogsService,
    private readonly responses: ResponseService,
  ) {}

  // Helper to build paginated response
  private paginated(result: { items: any[]; total: number; page: number; limit: number; totalPages: number }) {
    return this.responses.ok(result.items, 'OK', {
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
    });
  }

  // ─── Countries ─────────────────────────────────────────────────────────────
  @Get('countries')
  @RequirePermissions('CATALOGS_READ')
  @ApiQuery({ name: 'page', required: false }) @ApiQuery({ name: 'limit', required: false })
  @ApiOperation({ summary: 'List countries' })
  async findAllCountries(@Query('page') page = 1, @Query('limit') limit = 20) {
    return this.paginated(await this.catalogsService.findAllCountries(+page, +limit));
  }

  @Get('countries/:id')
  @RequirePermissions('CATALOGS_READ')
  @ApiOperation({ summary: 'Get country by id' })
  async findCountryById(@Param('id', ParseIntPipe) id: number) {
    return this.responses.ok(await this.catalogsService.findCountryById(id), 'Country');
  }

  @Post('countries')
  @RequirePermissions('CATALOGS_MANAGE')
  @ApiOperation({ summary: 'Create country' })
  async createCountry(@Body() dto: CreateCatalogItemDto) {
    return this.responses.created(await this.catalogsService.createCountry(dto), 'Country created');
  }

  @Patch('countries/:id')
  @RequirePermissions('CATALOGS_MANAGE')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update country' })
  async updateCountry(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateCatalogItemDto) {
    return this.responses.updated(await this.catalogsService.updateCountry(id, dto), 'Country updated');
  }

  @Patch('countries/:id/status')
  @RequirePermissions('CATALOGS_MANAGE')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Toggle country status' })
  async toggleCountryStatus(@Param('id', ParseIntPipe) id: number) {
    return this.responses.updated(await this.catalogsService.toggleCountryStatus(id), 'Country status toggled');
  }

  @Delete('countries/:id')
  @RequirePermissions('CATALOGS_MANAGE')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft-delete country' })
  async deleteCountry(@Param('id', ParseIntPipe) id: number) {
    await this.catalogsService.deleteCountry(id);
    return this.responses.deleted('Country deleted');
  }

  // ─── Departments ───────────────────────────────────────────────────────────
  @Get('departments')
  @RequirePermissions('CATALOGS_READ')
  @ApiQuery({ name: 'page', required: false }) @ApiQuery({ name: 'limit', required: false })
  @ApiOperation({ summary: 'List departments' })
  async findAllDepartments(@Query('page') page = 1, @Query('limit') limit = 20) {
    return this.paginated(await this.catalogsService.findAllDepartments(+page, +limit));
  }

  @Get('departments/:id')
  @RequirePermissions('CATALOGS_READ')
  @ApiOperation({ summary: 'Get department by id' })
  async findDepartmentById(@Param('id', ParseIntPipe) id: number) {
    return this.responses.ok(await this.catalogsService.findDepartmentById(id), 'Department');
  }

  @Post('departments')
  @RequirePermissions('CATALOGS_MANAGE')
  @ApiOperation({ summary: 'Create department' })
  async createDepartment(@Body() dto: CreateCatalogItemDto) {
    return this.responses.created(await this.catalogsService.createDepartment(dto), 'Department created');
  }

  @Patch('departments/:id')
  @RequirePermissions('CATALOGS_MANAGE')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update department' })
  async updateDepartment(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateCatalogItemDto) {
    return this.responses.updated(await this.catalogsService.updateDepartment(id, dto), 'Department updated');
  }

  @Patch('departments/:id/status')
  @RequirePermissions('CATALOGS_MANAGE')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Toggle department status' })
  async toggleDepartmentStatus(@Param('id', ParseIntPipe) id: number) {
    return this.responses.updated(await this.catalogsService.toggleDepartmentStatus(id), 'Department status toggled');
  }

  @Delete('departments/:id')
  @RequirePermissions('CATALOGS_MANAGE')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft-delete department' })
  async deleteDepartment(@Param('id', ParseIntPipe) id: number) {
    await this.catalogsService.deleteDepartment(id);
    return this.responses.deleted('Department deleted');
  }

  // ─── Municipalities ────────────────────────────────────────────────────────
  @Get('municipalities')
  @RequirePermissions('CATALOGS_READ')
  @ApiQuery({ name: 'page', required: false }) @ApiQuery({ name: 'limit', required: false })
  @ApiOperation({ summary: 'List municipalities' })
  async findAllMunicipalities(@Query('page') page = 1, @Query('limit') limit = 20) {
    return this.paginated(await this.catalogsService.findAllMunicipalities(+page, +limit));
  }

  @Get('municipalities/:id')
  @RequirePermissions('CATALOGS_READ')
  @ApiOperation({ summary: 'Get municipality by id' })
  async findMunicipalityById(@Param('id', ParseIntPipe) id: number) {
    return this.responses.ok(await this.catalogsService.findMunicipalityById(id), 'Municipality');
  }

  @Get('departments/:departmentId/municipalities')
  @RequirePermissions('CATALOGS_READ')
  @ApiQuery({ name: 'page', required: false }) @ApiQuery({ name: 'limit', required: false })
  @ApiOperation({ summary: 'Get municipalities by department' })
  async findByDepartment(
    @Param('departmentId', ParseIntPipe) departmentId: number,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.paginated(await this.catalogsService.findByDepartment(departmentId, +page, +limit));
  }

  @Post('municipalities')
  @RequirePermissions('CATALOGS_MANAGE')
  @ApiOperation({ summary: 'Create municipality' })
  async createMunicipality(@Body() dto: CreateCatalogItemDto) {
    return this.responses.created(await this.catalogsService.createMunicipality(dto), 'Municipality created');
  }

  @Patch('municipalities/:id')
  @RequirePermissions('CATALOGS_MANAGE')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update municipality' })
  async updateMunicipality(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateCatalogItemDto) {
    return this.responses.updated(await this.catalogsService.updateMunicipality(id, dto), 'Municipality updated');
  }

  @Patch('municipalities/:id/status')
  @RequirePermissions('CATALOGS_MANAGE')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Toggle municipality status' })
  async toggleMunicipalityStatus(@Param('id', ParseIntPipe) id: number) {
    return this.responses.updated(await this.catalogsService.toggleMunicipalityStatus(id), 'Municipality status toggled');
  }

  @Delete('municipalities/:id')
  @RequirePermissions('CATALOGS_MANAGE')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft-delete municipality' })
  async deleteMunicipality(@Param('id', ParseIntPipe) id: number) {
    await this.catalogsService.deleteMunicipality(id);
    return this.responses.deleted('Municipality deleted');
  }

  // ─── Visitor Categories ────────────────────────────────────────────────────
  @Get('visitor-categories')
  @RequirePermissions('CATALOGS_READ')
  @ApiQuery({ name: 'page', required: false }) @ApiQuery({ name: 'limit', required: false })
  @ApiOperation({ summary: 'List visitor categories' })
  async findAllVisitorCategories(@Query('page') page = 1, @Query('limit') limit = 20) {
    return this.paginated(await this.catalogsService.findAllVisitorCategories(+page, +limit));
  }

  @Get('visitor-categories/:id')
  @RequirePermissions('CATALOGS_READ')
  @ApiOperation({ summary: 'Get visitor category by id' })
  async findVisitorCategoryById(@Param('id', ParseIntPipe) id: number) {
    return this.responses.ok(await this.catalogsService.findVisitorCategoryById(id), 'VisitorCategory');
  }

  @Post('visitor-categories')
  @RequirePermissions('CATALOGS_MANAGE')
  @ApiOperation({ summary: 'Create visitor category' })
  async createVisitorCategory(@Body() dto: CreateCatalogItemDto) {
    return this.responses.created(await this.catalogsService.createVisitorCategory(dto), 'VisitorCategory created');
  }

  @Patch('visitor-categories/:id')
  @RequirePermissions('CATALOGS_MANAGE')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update visitor category' })
  async updateVisitorCategory(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateCatalogItemDto) {
    return this.responses.updated(await this.catalogsService.updateVisitorCategory(id, dto), 'VisitorCategory updated');
  }

  @Patch('visitor-categories/:id/status')
  @RequirePermissions('CATALOGS_MANAGE')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Toggle visitor category status' })
  async toggleVisitorCategoryStatus(@Param('id', ParseIntPipe) id: number) {
    return this.responses.updated(await this.catalogsService.toggleVisitorCategoryStatus(id), 'VisitorCategory status toggled');
  }

  @Delete('visitor-categories/:id')
  @RequirePermissions('CATALOGS_MANAGE')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft-delete visitor category' })
  async deleteVisitorCategory(@Param('id', ParseIntPipe) id: number) {
    await this.catalogsService.deleteVisitorCategory(id);
    return this.responses.deleted('VisitorCategory deleted');
  }

  // ─── Vehicle Types ─────────────────────────────────────────────────────────
  @Get('vehicle-types')
  @RequirePermissions('CATALOGS_READ')
  @ApiQuery({ name: 'page', required: false }) @ApiQuery({ name: 'limit', required: false })
  @ApiOperation({ summary: 'List vehicle types' })
  async findAllVehicleTypes(@Query('page') page = 1, @Query('limit') limit = 20) {
    return this.paginated(await this.catalogsService.findAllVehicleTypes(+page, +limit));
  }

  @Get('vehicle-types/:id')
  @RequirePermissions('CATALOGS_READ')
  @ApiOperation({ summary: 'Get vehicle type by id' })
  async findVehicleTypeById(@Param('id', ParseIntPipe) id: number) {
    return this.responses.ok(await this.catalogsService.findVehicleTypeById(id), 'VehicleType');
  }

  @Post('vehicle-types')
  @RequirePermissions('CATALOGS_MANAGE')
  @ApiOperation({ summary: 'Create vehicle type' })
  async createVehicleType(@Body() dto: CreateCatalogItemDto) {
    return this.responses.created(await this.catalogsService.createVehicleType(dto), 'VehicleType created');
  }

  @Patch('vehicle-types/:id')
  @RequirePermissions('CATALOGS_MANAGE')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update vehicle type' })
  async updateVehicleType(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateCatalogItemDto) {
    return this.responses.updated(await this.catalogsService.updateVehicleType(id, dto), 'VehicleType updated');
  }

  @Patch('vehicle-types/:id/status')
  @RequirePermissions('CATALOGS_MANAGE')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Toggle vehicle type status' })
  async toggleVehicleTypeStatus(@Param('id', ParseIntPipe) id: number) {
    return this.responses.updated(await this.catalogsService.toggleVehicleTypeStatus(id), 'VehicleType status toggled');
  }

  @Delete('vehicle-types/:id')
  @RequirePermissions('CATALOGS_MANAGE')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft-delete vehicle type' })
  async deleteVehicleType(@Param('id', ParseIntPipe) id: number) {
    await this.catalogsService.deleteVehicleType(id);
    return this.responses.deleted('VehicleType deleted');
  }

  // ─── Lodging Types ─────────────────────────────────────────────────────────
  @Get('lodging-types')
  @RequirePermissions('CATALOGS_READ')
  @ApiQuery({ name: 'page', required: false }) @ApiQuery({ name: 'limit', required: false })
  @ApiOperation({ summary: 'List lodging types' })
  async findAllLodgingTypes(@Query('page') page = 1, @Query('limit') limit = 20) {
    return this.paginated(await this.catalogsService.findAllLodgingTypes(+page, +limit));
  }

  @Get('lodging-types/:id')
  @RequirePermissions('CATALOGS_READ')
  @ApiOperation({ summary: 'Get lodging type by id' })
  async findLodgingTypeById(@Param('id', ParseIntPipe) id: number) {
    return this.responses.ok(await this.catalogsService.findLodgingTypeById(id), 'LodgingType');
  }

  @Post('lodging-types')
  @RequirePermissions('CATALOGS_MANAGE')
  @ApiOperation({ summary: 'Create lodging type' })
  async createLodgingType(@Body() dto: CreateCatalogItemDto) {
    return this.responses.created(await this.catalogsService.createLodgingType(dto), 'LodgingType created');
  }

  @Patch('lodging-types/:id')
  @RequirePermissions('CATALOGS_MANAGE')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update lodging type' })
  async updateLodgingType(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateCatalogItemDto) {
    return this.responses.updated(await this.catalogsService.updateLodgingType(id, dto), 'LodgingType updated');
  }

  @Patch('lodging-types/:id/status')
  @RequirePermissions('CATALOGS_MANAGE')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Toggle lodging type status' })
  async toggleLodgingTypeStatus(@Param('id', ParseIntPipe) id: number) {
    return this.responses.updated(await this.catalogsService.toggleLodgingTypeStatus(id), 'LodgingType status toggled');
  }

  @Delete('lodging-types/:id')
  @RequirePermissions('CATALOGS_MANAGE')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft-delete lodging type' })
  async deleteLodgingType(@Param('id', ParseIntPipe) id: number) {
    await this.catalogsService.deleteLodgingType(id);
    return this.responses.deleted('LodgingType deleted');
  }

  // ─── Payment Methods ───────────────────────────────────────────────────────
  @Get('payment-methods')
  @RequirePermissions('CATALOGS_READ')
  @ApiQuery({ name: 'page', required: false }) @ApiQuery({ name: 'limit', required: false })
  @ApiOperation({ summary: 'List payment methods' })
  async findAllPaymentMethods(@Query('page') page = 1, @Query('limit') limit = 20) {
    return this.paginated(await this.catalogsService.findAllPaymentMethods(+page, +limit));
  }

  @Get('payment-methods/:id')
  @RequirePermissions('CATALOGS_READ')
  @ApiOperation({ summary: 'Get payment method by id' })
  async findPaymentMethodById(@Param('id', ParseIntPipe) id: number) {
    return this.responses.ok(await this.catalogsService.findPaymentMethodById(id), 'PaymentMethod');
  }

  @Post('payment-methods')
  @RequirePermissions('CATALOGS_MANAGE')
  @ApiOperation({ summary: 'Create payment method' })
  async createPaymentMethod(@Body() dto: CreateCatalogItemDto) {
    return this.responses.created(await this.catalogsService.createPaymentMethod(dto), 'PaymentMethod created');
  }

  @Patch('payment-methods/:id')
  @RequirePermissions('CATALOGS_MANAGE')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update payment method' })
  async updatePaymentMethod(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateCatalogItemDto) {
    return this.responses.updated(await this.catalogsService.updatePaymentMethod(id, dto), 'PaymentMethod updated');
  }

  @Patch('payment-methods/:id/status')
  @RequirePermissions('CATALOGS_MANAGE')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Toggle payment method status' })
  async togglePaymentMethodStatus(@Param('id', ParseIntPipe) id: number) {
    return this.responses.updated(await this.catalogsService.togglePaymentMethodStatus(id), 'PaymentMethod status toggled');
  }

  @Delete('payment-methods/:id')
  @RequirePermissions('CATALOGS_MANAGE')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft-delete payment method' })
  async deletePaymentMethod(@Param('id', ParseIntPipe) id: number) {
    await this.catalogsService.deletePaymentMethod(id);
    return this.responses.deleted('PaymentMethod deleted');
  }

  // ─── Financial Concepts ────────────────────────────────────────────────────
  @Get('financial-concepts')
  @RequirePermissions('CATALOGS_READ')
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'type', required: false, enum: ['INGRESO', 'EGRESO'] })
  @ApiOperation({ summary: 'List financial concepts' })
  async findAllFinancialConcepts(
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('type') type?: 'INGRESO' | 'EGRESO',
  ) {
    return this.paginated(await this.catalogsService.findAllFinancialConcepts(+page, +limit, type));
  }

  @Get('financial-concepts/:id')
  @RequirePermissions('CATALOGS_READ')
  @ApiOperation({ summary: 'Get financial concept by id' })
  async findFinancialConceptById(@Param('id', ParseIntPipe) id: number) {
    return this.responses.ok(await this.catalogsService.findFinancialConceptById(id), 'FinancialConcept');
  }

  @Post('financial-concepts')
  @RequirePermissions('CATALOGS_MANAGE')
  @ApiOperation({ summary: 'Create financial concept' })
  async createFinancialConcept(@Body() dto: CreateCatalogItemDto) {
    return this.responses.created(await this.catalogsService.createFinancialConcept(dto), 'FinancialConcept created');
  }

  @Patch('financial-concepts/:id')
  @RequirePermissions('CATALOGS_MANAGE')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update financial concept' })
  async updateFinancialConcept(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateCatalogItemDto) {
    return this.responses.updated(await this.catalogsService.updateFinancialConcept(id, dto), 'FinancialConcept updated');
  }

  @Patch('financial-concepts/:id/status')
  @RequirePermissions('CATALOGS_MANAGE')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Toggle financial concept status' })
  async toggleFinancialConceptStatus(@Param('id', ParseIntPipe) id: number) {
    return this.responses.updated(await this.catalogsService.toggleFinancialConceptStatus(id), 'FinancialConcept status toggled');
  }

  @Delete('financial-concepts/:id')
  @RequirePermissions('CATALOGS_MANAGE')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft-delete financial concept' })
  async deleteFinancialConcept(@Param('id', ParseIntPipe) id: number) {
    await this.catalogsService.deleteFinancialConcept(id);
    return this.responses.deleted('FinancialConcept deleted');
  }

  // ─── Visit Reasons ─────────────────────────────────────────────────────────
  @Get('visit-reasons')
  @RequirePermissions('CATALOGS_READ')
  @ApiQuery({ name: 'page', required: false }) @ApiQuery({ name: 'limit', required: false })
  @ApiOperation({ summary: 'List visit reasons' })
  async findAllVisitReasons(@Query('page') page = 1, @Query('limit') limit = 20) {
    return this.paginated(await this.catalogsService.findAllVisitReasons(+page, +limit));
  }

  @Get('visit-reasons/:id')
  @RequirePermissions('CATALOGS_READ')
  @ApiOperation({ summary: 'Get visit reason by id' })
  async findVisitReasonById(@Param('id', ParseIntPipe) id: number) {
    return this.responses.ok(await this.catalogsService.findVisitReasonById(id), 'VisitReason');
  }

  @Post('visit-reasons')
  @RequirePermissions('CATALOGS_MANAGE')
  @ApiOperation({ summary: 'Create visit reason' })
  async createVisitReason(@Body() dto: CreateCatalogItemDto) {
    return this.responses.created(await this.catalogsService.createVisitReason(dto), 'VisitReason created');
  }

  @Patch('visit-reasons/:id')
  @RequirePermissions('CATALOGS_MANAGE')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update visit reason' })
  async updateVisitReason(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateCatalogItemDto) {
    return this.responses.updated(await this.catalogsService.updateVisitReason(id, dto), 'VisitReason updated');
  }

  @Patch('visit-reasons/:id/status')
  @RequirePermissions('CATALOGS_MANAGE')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Toggle visit reason status' })
  async toggleVisitReasonStatus(@Param('id', ParseIntPipe) id: number) {
    return this.responses.updated(await this.catalogsService.toggleVisitReasonStatus(id), 'VisitReason status toggled');
  }

  @Delete('visit-reasons/:id')
  @RequirePermissions('CATALOGS_MANAGE')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft-delete visit reason' })
  async deleteVisitReason(@Param('id', ParseIntPipe) id: number) {
    await this.catalogsService.deleteVisitReason(id);
    return this.responses.deleted('VisitReason deleted');
  }

  // ─── Visit Activities ──────────────────────────────────────────────────────
  @Get('visit-activities')
  @RequirePermissions('CATALOGS_READ')
  @ApiQuery({ name: 'page', required: false }) @ApiQuery({ name: 'limit', required: false })
  @ApiOperation({ summary: 'List visit activities' })
  async findAllVisitActivities(@Query('page') page = 1, @Query('limit') limit = 20) {
    return this.paginated(await this.catalogsService.findAllVisitActivities(+page, +limit));
  }

  @Get('visit-activities/:id')
  @RequirePermissions('CATALOGS_READ')
  @ApiOperation({ summary: 'Get visit activity by id' })
  async findVisitActivityById(@Param('id', ParseIntPipe) id: number) {
    return this.responses.ok(await this.catalogsService.findVisitActivityById(id), 'VisitActivity');
  }

  @Post('visit-activities')
  @RequirePermissions('CATALOGS_MANAGE')
  @ApiOperation({ summary: 'Create visit activity' })
  async createVisitActivity(@Body() dto: CreateCatalogItemDto) {
    return this.responses.created(await this.catalogsService.createVisitActivity(dto), 'VisitActivity created');
  }

  @Patch('visit-activities/:id')
  @RequirePermissions('CATALOGS_MANAGE')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update visit activity' })
  async updateVisitActivity(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateCatalogItemDto) {
    return this.responses.updated(await this.catalogsService.updateVisitActivity(id, dto), 'VisitActivity updated');
  }

  @Patch('visit-activities/:id/status')
  @RequirePermissions('CATALOGS_MANAGE')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Toggle visit activity status' })
  async toggleVisitActivityStatus(@Param('id', ParseIntPipe) id: number) {
    return this.responses.updated(await this.catalogsService.toggleVisitActivityStatus(id), 'VisitActivity status toggled');
  }

  @Delete('visit-activities/:id')
  @RequirePermissions('CATALOGS_MANAGE')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft-delete visit activity' })
  async deleteVisitActivity(@Param('id', ParseIntPipe) id: number) {
    await this.catalogsService.deleteVisitActivity(id);
    return this.responses.deleted('VisitActivity deleted');
  }

  // ─── Info Sources ──────────────────────────────────────────────────────────
  @Get('info-sources')
  @RequirePermissions('CATALOGS_READ')
  @ApiQuery({ name: 'page', required: false }) @ApiQuery({ name: 'limit', required: false })
  @ApiOperation({ summary: 'List info sources' })
  async findAllInfoSources(@Query('page') page = 1, @Query('limit') limit = 20) {
    return this.paginated(await this.catalogsService.findAllInfoSources(+page, +limit));
  }

  @Get('info-sources/:id')
  @RequirePermissions('CATALOGS_READ')
  @ApiOperation({ summary: 'Get info source by id' })
  async findInfoSourceById(@Param('id', ParseIntPipe) id: number) {
    return this.responses.ok(await this.catalogsService.findInfoSourceById(id), 'InfoSource');
  }

  @Post('info-sources')
  @RequirePermissions('CATALOGS_MANAGE')
  @ApiOperation({ summary: 'Create info source' })
  async createInfoSource(@Body() dto: CreateCatalogItemDto) {
    return this.responses.created(await this.catalogsService.createInfoSource(dto), 'InfoSource created');
  }

  @Patch('info-sources/:id')
  @RequirePermissions('CATALOGS_MANAGE')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update info source' })
  async updateInfoSource(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateCatalogItemDto) {
    return this.responses.updated(await this.catalogsService.updateInfoSource(id, dto), 'InfoSource updated');
  }

  @Patch('info-sources/:id/status')
  @RequirePermissions('CATALOGS_MANAGE')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Toggle info source status' })
  async toggleInfoSourceStatus(@Param('id', ParseIntPipe) id: number) {
    return this.responses.updated(await this.catalogsService.toggleInfoSourceStatus(id), 'InfoSource status toggled');
  }

  @Delete('info-sources/:id')
  @RequirePermissions('CATALOGS_MANAGE')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft-delete info source' })
  async deleteInfoSource(@Param('id', ParseIntPipe) id: number) {
    await this.catalogsService.deleteInfoSource(id);
    return this.responses.deleted('InfoSource deleted');
  }

  // ─── Travel Types ──────────────────────────────────────────────────────────
  @Get('travel-types')
  @RequirePermissions('CATALOGS_READ')
  @ApiQuery({ name: 'page', required: false }) @ApiQuery({ name: 'limit', required: false })
  @ApiOperation({ summary: 'List travel types' })
  async findAllTravelTypes(@Query('page') page = 1, @Query('limit') limit = 20) {
    return this.paginated(await this.catalogsService.findAllTravelTypes(+page, +limit));
  }

  @Get('travel-types/:id')
  @RequirePermissions('CATALOGS_READ')
  @ApiOperation({ summary: 'Get travel type by id' })
  async findTravelTypeById(@Param('id', ParseIntPipe) id: number) {
    return this.responses.ok(await this.catalogsService.findTravelTypeById(id), 'TravelType');
  }

  @Post('travel-types')
  @RequirePermissions('CATALOGS_MANAGE')
  @ApiOperation({ summary: 'Create travel type' })
  async createTravelType(@Body() dto: CreateCatalogItemDto) {
    return this.responses.created(await this.catalogsService.createTravelType(dto), 'TravelType created');
  }

  @Patch('travel-types/:id')
  @RequirePermissions('CATALOGS_MANAGE')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update travel type' })
  async updateTravelType(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateCatalogItemDto) {
    return this.responses.updated(await this.catalogsService.updateTravelType(id, dto), 'TravelType updated');
  }

  @Patch('travel-types/:id/status')
  @RequirePermissions('CATALOGS_MANAGE')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Toggle travel type status' })
  async toggleTravelTypeStatus(@Param('id', ParseIntPipe) id: number) {
    return this.responses.updated(await this.catalogsService.toggleTravelTypeStatus(id), 'TravelType status toggled');
  }

  @Delete('travel-types/:id')
  @RequirePermissions('CATALOGS_MANAGE')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft-delete travel type' })
  async deleteTravelType(@Param('id', ParseIntPipe) id: number) {
    await this.catalogsService.deleteTravelType(id);
    return this.responses.deleted('TravelType deleted');
  }
}
