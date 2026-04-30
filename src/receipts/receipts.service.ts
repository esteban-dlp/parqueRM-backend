import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Receipt } from '../database/entities/receipt.entity';
import { ReceiptLine } from '../database/entities/receipt-line.entity';
import { PaymentMethod } from '../database/entities/payment-method.entity';
import { AuditService } from '../audit/audit.service';
import { CreateReceiptDto } from './dto/create-receipt.dto';
import { CancelReceiptDto } from './dto/cancel-receipt.dto';
import { QueryReceiptDto } from './dto/query-receipt.dto';

@Injectable()
export class ReceiptsService {
  constructor(
    @InjectRepository(Receipt)
    private readonly receiptRepo: Repository<Receipt>,
    @InjectRepository(ReceiptLine)
    private readonly lineRepo: Repository<ReceiptLine>,
    @InjectRepository(PaymentMethod)
    private readonly paymentMethodRepo: Repository<PaymentMethod>,
    private readonly auditService: AuditService,
  ) {}

  async findAll(query: QueryReceiptDto) {
    const page = Math.max(1, query.page ?? 1);
    const take = Math.min(query.limit ?? 20, parseInt(process.env['MAX_PAGE_SIZE'] ?? '100'));
    const skip = (page - 1) * take;

    const qb = this.receiptRepo
      .createQueryBuilder('r')
      .leftJoinAndSelect('r.paymentMethod', 'paymentMethod')
      .leftJoinAndSelect('r.createdByUser', 'createdByUser')
      .leftJoinAndSelect('r.lines', 'lines')
      .orderBy('r.createdAt', 'DESC')
      .skip(skip)
      .take(take);

    if (query.from) {
      qb.andWhere('r.receiptDate >= :from', { from: query.from });
    }
    if (query.to) {
      qb.andWhere('r.receiptDate <= :to', { to: query.to });
    }
    if (query.status) {
      qb.andWhere('r.status = :status', { status: query.status });
    }
    if (query.paymentMethodId) {
      qb.andWhere('r.paymentMethodId = :pmId', { pmId: query.paymentMethodId });
    }
    if (query.originType) {
      qb.andWhere('r.originType = :originType', { originType: query.originType });
    }

    const [data, total] = await qb.getManyAndCount();
    return {
      data,
      meta: { total, page, limit: take, totalPages: Math.ceil(total / take) },
    };
  }

  async findById(id: number): Promise<Receipt> {
    const receipt = await this.receiptRepo.findOne({
      where: { id },
      relations: ['paymentMethod', 'createdByUser', 'cancelledByUser', 'lines'],
    });
    if (!receipt) throw new NotFoundException(`Receipt #${id} not found`);
    return receipt;
  }

  async nextReceiptNumber(): Promise<string> {
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');

    // Count receipts created today
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

    const count = await this.receiptRepo
      .createQueryBuilder('r')
      .where('r.createdAt >= :start', { start: startOfDay })
      .andWhere('r.createdAt < :end', { end: endOfDay })
      .getCount();

    const seq = String(count + 1).padStart(5, '0');
    return `REC-${dateStr}-${seq}`;
  }

  async create(dto: CreateReceiptDto, userId: number, ip?: string): Promise<Receipt> {
    const receiptNumber = dto.receiptNumber ?? (await this.nextReceiptNumber());

    const receipt = this.receiptRepo.create({
      receiptNumber,
      contributorName: dto.contributorName ?? null,
      contributorDocument: dto.contributorDocument ?? null,
      contributorAddress: dto.contributorAddress ?? null,
      originType: dto.originType,
      originId: dto.originId ?? null,
      paymentMethodId: dto.paymentMethodId,
      total: dto.total,
      amountReceived: dto.amountReceived ?? null,
      changeAmount: dto.changeAmount ?? null,
      paymentReference: dto.paymentReference ?? null,
      status: 'ACTIVO',
      createdByUserId: userId,
    });

    const saved = await this.receiptRepo.save(receipt);

    if (dto.lines && dto.lines.length > 0) {
      const lines = dto.lines.map((l) =>
        this.lineRepo.create({
          receiptId: saved.id,
          description: l.description,
          quantity: l.quantity,
          unitPrice: l.unitPrice,
          total: l.total,
        }),
      );
      await this.lineRepo.save(lines);
    }

    await this.auditService.record({
      userId,
      action: 'CREATE_RECEIPT',
      entityName: 'Receipt',
      entityId: saved.id,
      newValues: { receiptNumber: saved.receiptNumber, total: saved.total },
      ipAddress: ip,
    });

    return this.findById(saved.id);
  }

  async update(id: number, dto: Partial<CreateReceiptDto>, userId: number, ip?: string): Promise<Receipt> {
    const receipt = await this.findById(id);
    if (receipt.status !== 'ACTIVO') {
      throw new BadRequestException('Only active receipts can be updated');
    }

    const old = { ...receipt };

    if (dto.contributorName !== undefined) receipt.contributorName = dto.contributorName ?? null;
    if (dto.contributorDocument !== undefined) receipt.contributorDocument = dto.contributorDocument ?? null;
    if (dto.contributorAddress !== undefined) receipt.contributorAddress = dto.contributorAddress ?? null;
    if (dto.paymentReference !== undefined) receipt.paymentReference = dto.paymentReference ?? null;
    if (dto.amountReceived !== undefined) receipt.amountReceived = dto.amountReceived ?? null;
    if (dto.changeAmount !== undefined) receipt.changeAmount = dto.changeAmount ?? null;
    receipt.updatedAt = new Date();

    const saved = await this.receiptRepo.save(receipt);

    await this.auditService.record({
      userId,
      action: 'UPDATE_RECEIPT',
      entityName: 'Receipt',
      entityId: id,
      oldValues: old,
      newValues: saved,
      ipAddress: ip,
    });

    return this.findById(id);
  }

  async cancel(id: number, dto: CancelReceiptDto, userId: number, ip?: string): Promise<Receipt> {
    const receipt = await this.findById(id);
    if (receipt.status === 'ANULADO') {
      throw new BadRequestException('Receipt is already cancelled');
    }

    const old = { status: receipt.status };

    receipt.status = 'ANULADO';
    receipt.cancelledByUserId = userId;
    receipt.cancelledAt = new Date();
    receipt.cancelReason = dto.cancelReason;
    receipt.updatedAt = new Date();

    const saved = await this.receiptRepo.save(receipt);

    await this.auditService.record({
      userId,
      action: 'CANCEL_RECEIPT',
      entityName: 'Receipt',
      entityId: id,
      oldValues: old,
      newValues: { status: 'ANULADO', cancelReason: dto.cancelReason },
      ipAddress: ip,
    });

    return saved;
  }

  async delete(id: number, userId: number, ip?: string): Promise<void> {
    const receipt = await this.findById(id);
    if (receipt.status === 'ACTIVO') {
      throw new BadRequestException('Cannot delete active receipt — cancel it first');
    }

    await this.auditService.record({
      userId,
      action: 'DELETE_RECEIPT',
      entityName: 'Receipt',
      entityId: id,
      oldValues: { receiptNumber: receipt.receiptNumber, status: receipt.status },
      ipAddress: ip,
    });

    await this.receiptRepo.delete(id);
  }
}
