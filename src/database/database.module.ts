import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Permission } from './entities/permission.entity';
import { Role } from './entities/role.entity';
import { User } from './entities/user.entity';
import { AuditLog } from './entities/audit-log.entity';

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
        entities: [User, Role, Permission, AuditLog],
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
