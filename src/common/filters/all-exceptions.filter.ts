import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ApiResponse } from '../interfaces/api-response.interface';
import { ResponseCode, ResponseCodes } from '../constants/response-codes';

interface HttpExceptionPayload {
  message?: string | string[];
  error?: string;
  code?: string;
  errors?: unknown;
}

type DbErrorKind = 'fk' | 'unique' | 'invalid_column' | 'null_violation' | 'truncation' | 'generic';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let code: ResponseCode = ResponseCodes.INTERNAL_ERROR;
    let message = 'Ocurrió un error inesperado. Contacta al administrador.';
    let errors: ApiResponse['errors'] = null;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();

      const payload: HttpExceptionPayload =
        typeof res === 'string'
          ? { message: res }
          : (res as HttpExceptionPayload);

      message = Array.isArray(payload.message)
        ? 'Revisa los campos marcados.'
        : (payload.message ?? exception.message);

      code = (payload.code as ResponseCode) ?? this.statusToCode(status);

      if (status === HttpStatus.BAD_REQUEST && Array.isArray(payload.message)) {
        code = ResponseCodes.VALIDATION_ERROR;
        errors = payload.message;
      } else if (payload.errors !== undefined) {
        errors = payload.errors as ApiResponse['errors'];
      }

      if (status >= 500) {
        this.logger.error(
          `[${request.method}] ${request.url} → ${status} | ${message}`,
          exception instanceof Error ? exception.stack : undefined,
        );
      }
    } else if (exception instanceof Error) {
      this.logger.error(
        `[${request.method}] ${request.url} | ${exception.constructor.name}: ${exception.message}`,
        exception.stack,
      );

      const kind = this.classifyDbError(exception);

      switch (kind) {
        case 'fk':
          status = HttpStatus.BAD_REQUEST;
          code = ResponseCodes.BAD_REQUEST;
          message = 'El valor seleccionado ya no está disponible. Recarga los catálogos e inténtalo de nuevo.';
          break;
        case 'unique':
          status = HttpStatus.CONFLICT;
          code = ResponseCodes.CONFLICT;
          message = 'Ya existe un registro con esos datos.';
          break;
        case 'invalid_column':
          status = HttpStatus.INTERNAL_SERVER_ERROR;
          code = ResponseCodes.INTERNAL_ERROR;
          message = 'La base de datos no está actualizada. Revisa los scripts de inicialización.';
          break;
        case 'null_violation':
          status = HttpStatus.BAD_REQUEST;
          code = ResponseCodes.VALIDATION_ERROR;
          message = 'Faltan datos obligatorios. Revisa el formulario.';
          break;
        case 'truncation':
          status = HttpStatus.BAD_REQUEST;
          code = ResponseCodes.VALIDATION_ERROR;
          message = 'Un campo excede el tamaño máximo permitido.';
          break;
        case 'generic':
          status = HttpStatus.INTERNAL_SERVER_ERROR;
          code = ResponseCodes.INTERNAL_ERROR;
          message = 'Ocurrió un error inesperado. Contacta al administrador.';
          break;
      }
    } else {
      this.logger.error('Unknown exception', JSON.stringify(exception));
    }

    const body: ApiResponse<null> = {
      success: false,
      code,
      message,
      data: null,
      errors,
      meta: {
        path: request.url,
        method: request.method,
        timestamp: new Date().toISOString(),
      },
    };

    response.status(status).json(body);
  }

  private classifyDbError(err: Error): DbErrorKind {
    const msg = err.message;
    if (msg.includes('FOREIGN KEY constraint') || msg.includes('fk_visitor_info_source') || msg.includes('fk_')) return 'fk';
    if (msg.includes('duplicate key') || msg.includes('UNIQUE constraint') || msg.includes('Violation of UNIQUE')) return 'unique';
    if (msg.includes('Invalid column name')) return 'invalid_column';
    if (msg.includes('Cannot insert the value NULL') || msg.includes('NOT NULL constraint')) return 'null_violation';
    if (msg.includes('String or binary data would be truncated')) return 'truncation';
    if (
      err.constructor.name === 'QueryFailedError' ||
      msg.includes('ECONNREFUSED') ||
      msg.includes('ETIMEOUT') ||
      msg.includes('Login failed')
    ) return 'generic';
    return 'generic';
  }

  private statusToCode(status: number): ResponseCode {
    switch (status) {
      case HttpStatus.BAD_REQUEST:
        return ResponseCodes.BAD_REQUEST;
      case HttpStatus.UNAUTHORIZED:
        return ResponseCodes.UNAUTHORIZED;
      case HttpStatus.FORBIDDEN:
        return ResponseCodes.FORBIDDEN;
      case HttpStatus.NOT_FOUND:
        return ResponseCodes.NOT_FOUND;
      case HttpStatus.CONFLICT:
        return ResponseCodes.CONFLICT;
      default:
        return ResponseCodes.INTERNAL_ERROR;
    }
  }
}
