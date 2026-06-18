import { plainToInstance } from 'class-transformer';
import {
  IsBooleanString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MinLength,
  validateSync,
} from 'class-validator';

export enum NodeEnv {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

export enum DbType {
  Sqlite = 'sqlite',
  BetterSqlite3 = 'better-sqlite3',
}

export class EnvironmentVariables {
  @IsEnum(NodeEnv)
  @IsOptional()
  NODE_ENV: NodeEnv = NodeEnv.Development;

  @IsInt()
  @IsOptional()
  PORT: number = 3000;

  @IsString()
  @IsOptional()
  HOST?: string;

  @IsString()
  @IsOptional()
  PARQUERM_VERSION?: string;

  @IsString()
  @IsOptional()
  PARQUERM_INSTANCE_ID?: string;

  @IsEnum(DbType)
  DB_TYPE: DbType = DbType.BetterSqlite3;

  @IsString()
  DB_PATH!: string;

  @IsString()
  @IsOptional()
  DB_HOST?: string;

  @IsInt()
  @IsOptional()
  DB_PORT?: number = 1433;

  @IsString()
  @IsOptional()
  DB_USER?: string;

  @IsString()
  @IsOptional()
  DB_PASSWORD?: string;

  @IsString()
  @IsOptional()
  DB_NAME?: string;

  @IsBooleanString()
  @IsOptional()
  DB_ENCRYPT?: string;

  @IsBooleanString()
  @IsOptional()
  DB_TRUST_SERVER_CERT?: string;

  @IsString()
  @MinLength(16)
  JWT_SECRET!: string;

  @IsString()
  @IsOptional()
  JWT_EXPIRES_IN?: string = '1h';

  @IsString()
  @MinLength(16)
  JWT_REFRESH_SECRET!: string;

  @IsString()
  @IsOptional()
  JWT_REFRESH_EXPIRES_IN?: string = '7d';

  @IsString()
  @IsOptional()
  ADMIN_USERNAME?: string;

  @IsString()
  @IsOptional()
  ADMIN_PASSWORD?: string;

  @IsString()
  @IsOptional()
  ADMIN_FULL_NAME?: string;

  @IsString()
  @IsOptional()
  ADMIN_EMAIL?: string;

  @IsBooleanString()
  @IsOptional()
  ADMIN_BOOTSTRAP?: string;

  @IsString()
  @IsOptional()
  CORS_ORIGIN?: string;

  @IsString()
  @IsOptional()
  PUBLIC_FRONTEND_URL?: string;

  @IsString()
  @IsOptional()
  PUBLIC_BACKEND_URL?: string;

  @IsString()
  @IsOptional()
  UPLOADS_PATH?: string;
}

export function validateEnv(config: Record<string, unknown>) {
  const validated = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validated, { skipMissingProperties: false });

  if (errors.length > 0) {
    const message = errors
      .map((e) => `${e.property}: ${Object.values(e.constraints ?? {}).join(', ')}`)
      .join('\n');
    throw new Error(`Invalid environment configuration:\n${message}`);
  }

  if (!validated.DB_PATH) {
    throw new Error(`Invalid environment configuration: DB_PATH is required when DB_TYPE=${validated.DB_TYPE}`);
  }

  return validated;
}
