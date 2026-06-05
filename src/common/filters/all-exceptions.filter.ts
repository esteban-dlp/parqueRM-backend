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

type DbErrorKind =
  | 'connection'
  | 'login'
  | 'timeout'
  | 'fk'
  | 'unique'
  | 'invalid_column'
  | 'null_violation'
  | 'truncation'
  | 'generic'
  | 'unknown';

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
        typeof res === 'string' ? { message: res } : (res as HttpExceptionPayload);

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

      message = this.humanizeHttpMessage(status, code, message, payload.error);

      if (status >= 500) {
        this.logger.error(
          `[${request.method}] ${request.url} -> ${status} | ${message}`,
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
        case 'connection':
          status = HttpStatus.SERVICE_UNAVAILABLE;
          code = ResponseCodes.DB_CONNECTION_ERROR;
          message = 'No se pudo conectar con la base de datos. Verifica que SQL Server esté encendido y accesible.';
          break;
        case 'login':
          status = HttpStatus.SERVICE_UNAVAILABLE;
          code = ResponseCodes.DB_CONNECTION_ERROR;
          message = 'No se pudo iniciar sesión en SQL Server. Verifica la contraseña configurada para la base de datos.';
          break;
        case 'timeout':
          status = HttpStatus.SERVICE_UNAVAILABLE;
          code = ResponseCodes.DB_CONNECTION_ERROR;
          message = 'La base de datos tardó demasiado en responder. Intenta de nuevo o revisa el servicio SQL Server.';
          break;
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
          code = ResponseCodes.DB_QUERY_ERROR;
          message = 'La base de datos no está actualizada. Revisa los scripts de inicialización o migraciones.';
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
          code = ResponseCodes.DB_QUERY_ERROR;
          message = 'No se pudo completar la operación en la base de datos. Revisa los datos e intenta de nuevo.';
          break;
        case 'unknown':
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
        statusCode: status,
        path: request.url,
        method: request.method,
        timestamp: new Date().toISOString(),
      },
    };

    response.status(status).json(body);
  }

  private classifyDbError(err: Error): DbErrorKind {
    const msg = err.message;
    const anyErr = err as Error & { code?: string };
    const errCode = anyErr.code ?? '';
    const lower = msg.toLowerCase();

    if (
      ['ECONNREFUSED', 'ECONNRESET', 'ENOTFOUND', 'ESOCKET'].includes(errCode) ||
      msg.includes('Failed to connect') ||
      msg.includes('Could not connect') ||
      msg.includes('ConnectionError')
    ) return 'connection';
    if (msg.includes('Login failed') || msg.includes('ELOGIN')) return 'login';
    if (errCode === 'ETIMEOUT' || msg.includes('ETIMEOUT') || lower.includes('timeout')) return 'timeout';
    if (msg.includes('FOREIGN KEY constraint') || msg.includes('fk_visitor_info_source') || msg.includes('fk_')) return 'fk';
    if (msg.includes('duplicate key') || msg.includes('UNIQUE constraint') || msg.includes('Violation of UNIQUE')) return 'unique';
    if (msg.includes('Invalid column name')) return 'invalid_column';
    if (msg.includes('Cannot insert the value NULL') || msg.includes('NOT NULL constraint')) return 'null_violation';
    if (msg.includes('String or binary data would be truncated')) return 'truncation';
    if (err.constructor.name === 'QueryFailedError') return 'generic';
    return 'unknown';
  }

  private humanizeHttpMessage(status: number, code: ResponseCode, message: string, error?: string): string {
    const byCode = this.messageForCode(code);
    if (byCode) return byCode;

    const translated = this.translateKnownMessage(message);
    if (translated) return translated;

    if (this.isTechnicalMessage(message, error)) {
      return this.messageForStatus(status);
    }

    return message;
  }

  private messageForCode(code: ResponseCode): string | null {
    switch (code) {
      case ResponseCodes.VALIDATION_ERROR:
        return 'Revisa los campos marcados. Hay datos inválidos o incompletos.';
      case ResponseCodes.AUTH_INVALID_CREDENTIALS:
        return 'Usuario o contraseña incorrectos.';
      case ResponseCodes.AUTH_USER_INACTIVE:
        return 'Este usuario está desactivado. Solicita apoyo a un administrador.';
      case ResponseCodes.AUTH_ROLE_INACTIVE:
        return 'El rol asignado a este usuario está inactivo. Solicita apoyo a un administrador.';
      case ResponseCodes.AUTH_INVALID_TOKEN:
        return 'Tu sesión expiró o no es válida. Inicia sesión nuevamente.';
      case ResponseCodes.AUTH_INVALID_REFRESH:
        return 'Tu sesión expiró. Inicia sesión nuevamente.';
      case ResponseCodes.AUTH_PASSWORD_MISMATCH:
        return 'La contraseña actual no es correcta.';
      case ResponseCodes.AUTH_INSUFFICIENT_PERMISSIONS:
        return 'No tienes permiso para realizar esta acción.';
      case ResponseCodes.DB_CONNECTION_ERROR:
        return 'No se pudo conectar con la base de datos. Verifica el servidor e intenta de nuevo.';
      case ResponseCodes.PAYLOAD_TOO_LARGE:
        return 'El archivo o la solicitud excede el tamaño permitido.';
      case ResponseCodes.REQUEST_TIMEOUT:
        return 'La operación tardó demasiado. Intenta de nuevo.';
      default:
        return null;
    }
  }

  private translateKnownMessage(message: string): string | null {
    const normalized = message.trim();

    if (/^.+ #\d+ not found$/i.test(normalized)) return 'No se encontró el registro solicitado.';
    if (/^.+ not found$/i.test(normalized)) return 'No se encontró el registro solicitado.';
    if (/^.+ already taken$/i.test(normalized)) return 'Ese valor ya está en uso.';
    if (normalized === 'Invalid credentials') return 'Usuario o contraseña incorrectos.';
    if (normalized === 'Invalid or missing token') return 'Tu sesión expiró o no es válida. Inicia sesión nuevamente.';
    if (normalized === 'Invalid or expired refresh token') return 'Tu sesión expiró. Inicia sesión nuevamente.';
    if (normalized === 'User not found or inactive') return 'El usuario no existe o está desactivado.';
    if (normalized === 'Role is inactive') return 'El rol asignado a este usuario está inactivo.';
    if (normalized === 'Current password is incorrect') return 'La contraseña actual no es correcta.';
    if (normalized === 'No authenticated user') return 'Debes iniciar sesión para realizar esta acción.';
    if (normalized === 'Insufficient permissions') return 'No tienes permiso para realizar esta acción.';
    if (normalized === 'Only active movements can be updated') return 'Solo se pueden editar movimientos activos.';
    if (normalized === 'Movement is already cancelled') return 'El movimiento ya está anulado.';
    if (normalized === 'Cannot cancel movement that belongs to a closed cash period') {
      return 'No se puede anular un movimiento incluido en un cierre de caja.';
    }
    if (normalized === 'Only active receipts can be updated') return 'Solo se pueden editar tickets activos.';
    if (normalized === 'Receipt is already cancelled') return 'El ticket ya está anulado.';
    if (normalized === 'Cannot delete active receipt — cancel it first' || normalized === 'Cannot delete active receipt - cancel it first') {
      return 'No se puede eliminar un ticket activo. Primero debes anularlo.';
    }
    if (normalized === 'departmentId is required for municipalities') return 'Selecciona un departamento para crear o editar el municipio.';
    if (normalized === 'type (INGRESO|EGRESO) is required for financial-concepts') {
      return 'Selecciona si el concepto financiero es ingreso o egreso.';
    }

    return null;
  }

  private isTechnicalMessage(message: string, error?: string): boolean {
    const normalized = message.trim();
    if (!normalized) return true;

    const technical = [
      'Bad Request',
      'Unauthorized',
      'Forbidden',
      'Not Found',
      'Conflict',
      'Internal Server Error',
      'Payload Too Large',
    ];
    if (technical.includes(normalized) || (error && technical.includes(error))) return true;
    if (/^[A-Z_]+$/.test(normalized)) return true;
    if (/^\d{3}$/.test(normalized)) return true;
    if (/^[A-Za-z]+Error:/.test(normalized)) return true;
    return false;
  }

  private messageForStatus(status: number): string {
    switch (status) {
      case HttpStatus.BAD_REQUEST:
        return 'La solicitud tiene datos inválidos. Revisa el formulario e intenta de nuevo.';
      case HttpStatus.UNAUTHORIZED:
        return 'Debes iniciar sesión para continuar.';
      case HttpStatus.FORBIDDEN:
        return 'No tienes permiso para realizar esta acción.';
      case HttpStatus.NOT_FOUND:
        return 'No se encontró el recurso solicitado.';
      case HttpStatus.CONFLICT:
        return 'Ya existe un registro con esos datos o hay un conflicto con la información actual.';
      case HttpStatus.PAYLOAD_TOO_LARGE:
        return 'El archivo o la solicitud excede el tamaño permitido.';
      case HttpStatus.REQUEST_TIMEOUT:
        return 'La operación tardó demasiado. Intenta de nuevo.';
      case HttpStatus.SERVICE_UNAVAILABLE:
        return 'El servicio no está disponible. Verifica el servidor e intenta de nuevo.';
      default:
        return 'Ocurrió un error inesperado. Contacta al administrador.';
    }
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
      case HttpStatus.PAYLOAD_TOO_LARGE:
        return ResponseCodes.PAYLOAD_TOO_LARGE;
      case HttpStatus.REQUEST_TIMEOUT:
        return ResponseCodes.REQUEST_TIMEOUT;
      case HttpStatus.SERVICE_UNAVAILABLE:
        return ResponseCodes.DB_CONNECTION_ERROR;
      default:
        return ResponseCodes.INTERNAL_ERROR;
    }
  }
}
