import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { InjectRepository } from '@nestjs/typeorm';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Repository } from 'typeorm';
import { User } from '../../database/entities/user.entity';
import { AuthenticatedUser } from '../../common/interfaces/api-response.interface';
import { ResponseCodes } from '../../common/constants/response-codes';

export interface JwtPayload {
  sub: number;
  username: string;
  roleId: number;
  roleName: string;
  permissions: string[];
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    configService: ConfigService,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('jwt.secret')!,
    });
  }

  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    const user = await this.userRepo.findOne({
      where: { id: payload.sub },
      relations: ['role', 'role.permissions'],
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException({
        code: ResponseCodes.AUTH_USER_INACTIVE,
        message: 'El usuario no existe o está desactivado.',
      });
    }

    if (!user.role || !user.role.isActive) {
      throw new UnauthorizedException({
        code: ResponseCodes.AUTH_ROLE_INACTIVE,
        message: 'El rol asignado a este usuario está inactivo.',
      });
    }

    const permissions = (user.role.permissions ?? []).map((p) => p.code);

    return {
      id: user.id,
      username: user.username,
      roleId: user.role.id,
      roleName: user.role.name,
      permissions,
    };
  }
}
