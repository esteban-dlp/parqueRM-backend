import {
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../database/entities/user.entity';
import { AuditService } from '../audit/audit.service';
import { ResponseCodes } from '../common/constants/response-codes';

export interface LoginResult {
  accessToken: string;
  refreshToken: string;
  user: {
    id: number;
    username: string;
    fullName: string;
    email: string | null;
    role: { id: number; name: string };
    permissions: string[];
  };
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly auditService: AuditService,
  ) {}

  async login(username: string, password: string, ip?: string): Promise<LoginResult> {
    const user = await this.userRepo.findOne({
      where: { username },
      relations: ['role', 'role.permissions'],
      select: {
        id: true,
        username: true,
        fullName: true,
        email: true,
        isActive: true,
        roleId: true,
        passwordHash: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException({
        code: ResponseCodes.AUTH_INVALID_CREDENTIALS,
        message: 'Invalid credentials',
      });
    }

    if (!user.role || !user.role.isActive) {
      throw new UnauthorizedException({
        code: ResponseCodes.AUTH_ROLE_INACTIVE,
        message: 'Role is inactive',
      });
    }

    const passwordMatch = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatch) {
      await this.auditService.record({
        userId: user.id,
        action: 'LOGIN_FAILED',
        entityName: 'users',
        entityId: user.id,
        ipAddress: ip,
        newValues: { reason: 'invalid_password' },
      });
      throw new UnauthorizedException({
        code: ResponseCodes.AUTH_INVALID_CREDENTIALS,
        message: 'Invalid credentials',
      });
    }

    // Update last login
    await this.userRepo.update(user.id, { lastLoginAt: new Date() });

    const permissions = (user.role.permissions ?? []).map((p) => p.code);

    const jwtPayload = {
      sub: user.id,
      username: user.username,
      roleId: user.role.id,
      roleName: user.role.name,
      permissions,
    };

    const jwtSecret = this.configService.get<string>('jwt.secret')!;
    const jwtExpiresIn = this.configService.get<string>('jwt.expiresIn') ?? '1h';
    const refreshSecret = this.configService.get<string>('jwt.refreshSecret')!;
    const refreshExpiresIn = this.configService.get<string>('jwt.refreshExpiresIn') ?? '7d';

    const accessToken = this.jwtService.sign(jwtPayload, {
      secret: jwtSecret,
      expiresIn: jwtExpiresIn as any,
    });

    const refreshToken = this.jwtService.sign(
      { sub: user.id, username: user.username },
      { secret: refreshSecret, expiresIn: refreshExpiresIn as any },
    );

    await this.auditService.record({
      userId: user.id,
      action: 'LOGIN',
      entityName: 'users',
      entityId: user.id,
      ipAddress: ip,
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        email: user.email,
        role: { id: user.role.id, name: user.role.name },
        permissions,
      },
    };
  }

  async refreshToken(token: string): Promise<{ accessToken: string }> {
    const refreshSecret = this.configService.get<string>('jwt.refreshSecret')!;

    let payload: { sub: number; username: string };
    try {
      payload = this.jwtService.verify(token, { secret: refreshSecret });
    } catch {
      throw new UnauthorizedException({
        code: ResponseCodes.AUTH_INVALID_REFRESH,
        message: 'Invalid or expired refresh token',
      });
    }

    const user = await this.userRepo.findOne({
      where: { id: payload.sub },
      relations: ['role', 'role.permissions'],
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException({
        code: ResponseCodes.AUTH_INVALID_REFRESH,
        message: 'User not found or inactive',
      });
    }

    if (!user.role || !user.role.isActive) {
      throw new UnauthorizedException({
        code: ResponseCodes.AUTH_ROLE_INACTIVE,
        message: 'Role is inactive',
      });
    }

    const permissions = (user.role.permissions ?? []).map((p) => p.code);

    const jwtSecret = this.configService.get<string>('jwt.secret')!;
    const jwtExpiresIn = this.configService.get<string>('jwt.expiresIn') ?? '1h';

    const accessToken = this.jwtService.sign(
      {
        sub: user.id,
        username: user.username,
        roleId: user.role.id,
        roleName: user.role.name,
        permissions,
      },
      { secret: jwtSecret, expiresIn: jwtExpiresIn as any },
    );

    return { accessToken };
  }

  async changePassword(
    userId: number,
    currentPassword: string,
    newPassword: string,
    ip?: string,
  ): Promise<void> {
    const user = await this.userRepo.findOne({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        isActive: true,
        passwordHash: true,
        roleId: true,
        fullName: true,
        email: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException({
        code: ResponseCodes.AUTH_INVALID_CREDENTIALS,
        message: 'User not found',
      });
    }

    const match = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!match) {
      throw new UnauthorizedException({
        code: ResponseCodes.AUTH_PASSWORD_MISMATCH,
        message: 'Current password is incorrect',
      });
    }

    const hashed = await bcrypt.hash(newPassword, 12);
    await this.userRepo.update(userId, { passwordHash: hashed, updatedAt: new Date() });

    await this.auditService.record({
      userId,
      action: 'CHANGE_PASSWORD',
      entityName: 'users',
      entityId: userId,
      ipAddress: ip,
    });
  }

  async getMe(userId: number) {
    const user = await this.userRepo.findOne({
      where: { id: userId },
      relations: ['role', 'role.permissions'],
    });

    if (!user) {
      throw new UnauthorizedException({
        code: ResponseCodes.AUTH_INVALID_CREDENTIALS,
        message: 'User not found',
      });
    }

    const permissions = (user.role?.permissions ?? []).map((p) => p.code);

    return {
      id: user.id,
      username: user.username,
      fullName: user.fullName,
      email: user.email,
      isActive: user.isActive,
      lastLoginAt: user.lastLoginAt,
      role: user.role
        ? { id: user.role.id, name: user.role.name, description: user.role.description }
        : null,
      permissions,
    };
  }
}
