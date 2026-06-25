import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { User } from '../database/entities/user.entity';
import { AuditService } from '../audit/audit.service';

interface PendingNonce {
  hash: string;
  expiresAt: Date;
}

const NONCE_TTL_MS = 5 * 60 * 1000; // 5 minutos

const OPERATIONAL_TABLES = [
  'survey_answers',
  'survey_responses',
  'cash_closure_details',
  'cash_closures',
  'financial_movements',
  'receipt_lines',
  'receipts',
  'visitor_record_reasons',
  'visitor_record_activities',
  'visitor_record_companions',
  'visitor_records',
  'vehicle_records',
  'lodging_records',
] as const;

@Injectable()
export class SystemService {
  private readonly logger = new Logger(SystemService.name);
  private readonly pendingNonces = new Map<number, PendingNonce>();

  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly auditService: AuditService,
  ) {}

  async prepareReset(userId: number, ip: string): Promise<{ nonce: string }> {
    this.purgExpiredNonces();

    const rawNonce = crypto.randomUUID();
    const hash = crypto.createHash('sha256').update(rawNonce).digest('hex');
    const expiresAt = new Date(Date.now() + NONCE_TTL_MS);

    this.pendingNonces.set(userId, { hash, expiresAt });

    await this.auditService.record({
      userId,
      action: 'DATA_RESET_PREPARE',
      entityName: 'system',
      entityId: null,
      newValues: { preparedAt: new Date().toISOString(), expiresAt: expiresAt.toISOString() },
      ipAddress: ip,
    });

    return { nonce: rawNonce };
  }

  async executeReset(
    userId: number,
    nonce: string,
    adminPassword: string,
    ip: string,
  ): Promise<void> {
    this.purgExpiredNonces();

    const pending = this.pendingNonces.get(userId);
    if (!pending) {
      throw new BadRequestException({
        message: 'El token de confirmación no existe o ha expirado. Reinicia el proceso.',
      });
    }
    if (pending.expiresAt < new Date()) {
      this.pendingNonces.delete(userId);
      throw new BadRequestException({
        message: 'El token de confirmación ha expirado. Reinicia el proceso.',
      });
    }

    const providedHash = crypto.createHash('sha256').update(nonce).digest('hex');
    if (providedHash !== pending.hash) {
      throw new BadRequestException({
        message: 'Token de confirmación inválido.',
      });
    }

    const user = await this.userRepo
      .createQueryBuilder('u')
      .addSelect('u.passwordHash')
      .where('u.id = :id', { id: userId })
      .getOne();

    if (!user) {
      throw new NotFoundException({ message: 'Usuario no encontrado.' });
    }

    const passwordOk = await bcrypt.compare(adminPassword, user.passwordHash);
    if (!passwordOk) {
      throw new UnauthorizedException({
        message: 'Contraseña incorrecta. La operación fue cancelada.',
      });
    }

    this.pendingNonces.delete(userId);

    await this.auditService.record({
      userId,
      action: 'DATA_RESET_EXECUTE_START',
      entityName: 'system',
      entityId: null,
      newValues: { executedAt: new Date().toISOString(), tables: OPERATIONAL_TABLES },
      ipAddress: ip,
    });

    await this.dataSource.transaction(async (em) => {
      for (const table of OPERATIONAL_TABLES) {
        await em.query(`DELETE FROM ${table}`);
      }
    });

    this.logger.log(`Data reset ejecutado por userId=${userId} desde IP=${ip}`);

    await this.auditService.record({
      userId,
      action: 'DATA_RESET_EXECUTE_COMPLETE',
      entityName: 'system',
      entityId: null,
      newValues: { completedAt: new Date().toISOString() },
      ipAddress: ip,
    });
  }

  private purgExpiredNonces(): void {
    const now = new Date();
    for (const [uid, entry] of this.pendingNonces.entries()) {
      if (entry.expiresAt < now) {
        this.pendingNonces.delete(uid);
      }
    }
  }
}
