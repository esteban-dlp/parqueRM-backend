import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { QueryReportDto } from './dto/query-report.dto';
import { ResponseService } from '../common/services/response.service';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';

@ApiTags('reports')
@ApiBearerAuth()
@Controller('reports')
export class ReportsController {
  constructor(
    private readonly reportsService: ReportsService,
    private readonly responses: ResponseService,
  ) {}

  @Get('general')
  @RequirePermissions('REPORTES_READ')
  @ApiOperation({ summary: 'General combined stats report' })
  async getGeneral(@Query() query: QueryReportDto) {
    const data = await this.reportsService.getGeneral(query);
    return this.responses.ok(data, 'General report');
  }

  @Get('visitors/by-category')
  @RequirePermissions('REPORTES_READ')
  @ApiOperation({ summary: 'Visitors grouped by category' })
  async getVisitorsByCategory(@Query() query: QueryReportDto) {
    const data = await this.reportsService.getVisitorsByCategory(query);
    return this.responses.ok(data, 'Visitors by category');
  }

  @Get('visitors/by-origin')
  @RequirePermissions('REPORTES_READ')
  @ApiOperation({ summary: 'Visitors grouped by country of origin' })
  async getVisitorsByOrigin(@Query() query: QueryReportDto) {
    const data = await this.reportsService.getVisitorsByOrigin(query);
    return this.responses.ok(data, 'Visitors by origin');
  }

  @Get('visitors/by-nationality')
  @RequirePermissions('REPORTES_READ')
  @ApiOperation({ summary: 'Visitors grouped by nationality' })
  async getVisitorsByNationality(@Query() query: QueryReportDto) {
    const data = await this.reportsService.getVisitorsByNationality(query);
    return this.responses.ok(data, 'Visitors by nationality');
  }

  @Get('visitors/export/excel')
  @RequirePermissions('REPORTES_EXPORT')
  @ApiOperation({
    summary: 'Export visitor report as Excel (data for frontend rendering)',
  })
  async exportVisitorsExcel(@Query() query: QueryReportDto) {
    const result = await this.reportsService.getVisitors(query);
    return this.responses.ok(
      { ...result, export: true, format: 'excel' },
      'Visitors export data',
    );
  }

  @Get('visitors/export/pdf')
  @RequirePermissions('REPORTES_EXPORT')
  @ApiOperation({
    summary: 'Export visitor report as PDF (data for frontend rendering)',
  })
  async exportVisitorsPdf(@Query() query: QueryReportDto) {
    const result = await this.reportsService.getVisitors(query);
    return this.responses.ok(
      { ...result, export: true, format: 'pdf' },
      'Visitors export data',
    );
  }

  @Get('visitors')
  @RequirePermissions('REPORTES_READ')
  @ApiOperation({ summary: 'Paginated visitor records report' })
  async getVisitors(@Query() query: QueryReportDto) {
    const result = await this.reportsService.getVisitors(query);
    return this.responses.ok(result.data, 'Visitors report', result.meta);
  }

  @Get('vehicles')
  @RequirePermissions('REPORTES_READ')
  @ApiOperation({ summary: 'Paginated vehicle records report' })
  async getVehicles(@Query() query: QueryReportDto) {
    const result = await this.reportsService.getVehicles(query);
    return this.responses.ok(result.data, 'Vehicles report', result.meta);
  }

  @Get('lodging')
  @RequirePermissions('REPORTES_READ')
  @ApiOperation({ summary: 'Paginated lodging records report' })
  async getLodging(@Query() query: QueryReportDto) {
    const result = await this.reportsService.getLodging(query);
    return this.responses.ok(result.data, 'Lodging report', result.meta);
  }

  @Get('cash-by-payment-method')
  @RequirePermissions('REPORTES_READ')
  @ApiOperation({ summary: 'Daily income totals grouped by payment method' })
  async getCashByPaymentMethod(@Query() query: QueryReportDto) {
    const data = await this.reportsService.getCashByPaymentMethod(query);
    return this.responses.ok(data, 'Cash by payment method report');
  }

  @Get('income-by-origin')
  @RequirePermissions('REPORTES_READ')
  @ApiOperation({
    summary:
      'Income totals grouped by origin type (visitantes, vehiculos, hospedaje, etc.)',
  })
  async getIncomeByOriginType(@Query() query: QueryReportDto) {
    const data = await this.reportsService.getIncomeByOriginType(query);
    return this.responses.ok(data, 'Income by origin type report');
  }

  @Get('surveys')
  @RequirePermissions('SURVEYS_REPORT_READ')
  @ApiOperation({
    summary:
      'Survey report: occurrences, dominant answer and percentage per question',
  })
  async getSurveyReport(@Query() query: QueryReportDto) {
    const data = await this.reportsService.getSurveyReport(query);
    return this.responses.ok(data, 'Survey report');
  }

  @Get('income/export/excel')
  @RequirePermissions('REPORTES_EXPORT')
  @ApiOperation({ summary: 'Export income report as Excel' })
  async exportIncomeExcel(@Query() query: QueryReportDto) {
    const result = await this.reportsService.getIncome(query);
    return this.responses.ok(
      { ...result, export: true, format: 'excel' },
      'Income export data',
    );
  }

  @Get('income/export/pdf')
  @RequirePermissions('REPORTES_EXPORT')
  @ApiOperation({ summary: 'Export income report as PDF' })
  async exportIncomePdf(@Query() query: QueryReportDto) {
    const result = await this.reportsService.getIncome(query);
    return this.responses.ok(
      { ...result, export: true, format: 'pdf' },
      'Income export data',
    );
  }

  @Get('income')
  @RequirePermissions('REPORTES_READ')
  @ApiOperation({ summary: 'Paginated income movements report' })
  async getIncome(@Query() query: QueryReportDto) {
    const result = await this.reportsService.getIncome(query);
    return this.responses.ok(result.data, 'Income report', result.meta);
  }

  @Get('expenses')
  @RequirePermissions('REPORTES_READ')
  @ApiOperation({ summary: 'Paginated expense movements report' })
  async getExpenses(@Query() query: QueryReportDto) {
    const result = await this.reportsService.getExpenses(query);
    return this.responses.ok(result.data, 'Expenses report', result.meta);
  }

  @Get('cash-closures/export/excel')
  @RequirePermissions('REPORTES_EXPORT')
  @ApiOperation({ summary: 'Export cash closures report as Excel' })
  async exportCashClosuresExcel(@Query() query: QueryReportDto) {
    const result = await this.reportsService.getCashClosures(query);
    return this.responses.ok(
      { ...result, export: true, format: 'excel' },
      'Cash closures export data',
    );
  }

  @Get('cash-closures/export/pdf')
  @RequirePermissions('REPORTES_EXPORT')
  @ApiOperation({ summary: 'Export cash closures report as PDF' })
  async exportCashClosuresPdf(@Query() query: QueryReportDto) {
    const result = await this.reportsService.getCashClosures(query);
    return this.responses.ok(
      { ...result, export: true, format: 'pdf' },
      'Cash closures export data',
    );
  }

  @Get('cash-closures')
  @RequirePermissions('REPORTES_READ')
  @ApiOperation({ summary: 'Paginated cash closures report' })
  async getCashClosures(@Query() query: QueryReportDto) {
    const result = await this.reportsService.getCashClosures(query);
    return this.responses.ok(result.data, 'Cash closures report', result.meta);
  }

  @Get('receipts')
  @RequirePermissions('REPORTES_READ')
  @ApiOperation({ summary: 'Paginated receipts report' })
  async getReceipts(@Query() query: QueryReportDto) {
    const result = await this.reportsService.getReceipts(query);
    return this.responses.ok(result.data, 'Receipts report', result.meta);
  }

  @Get('export/excel')
  @RequirePermissions('REPORTES_EXPORT')
  @ApiOperation({ summary: 'Export general report as Excel' })
  async exportExcel(@Query() query: QueryReportDto) {
    const data = await this.reportsService.getGeneral(query);
    return this.responses.ok(
      { ...data, export: true, format: 'excel' },
      'General export data',
    );
  }

  @Get('export/pdf')
  @RequirePermissions('REPORTES_EXPORT')
  @ApiOperation({ summary: 'Export general report as PDF' })
  async exportPdf(@Query() query: QueryReportDto) {
    const data = await this.reportsService.getGeneral(query);
    return this.responses.ok(
      { ...data, export: true, format: 'pdf' },
      'General export data',
    );
  }
}
