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

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let code: ResponseCode = ResponseCodes.INTERNAL_ERROR;
    let message = 'Internal server error';
    let errors: ApiResponse['errors'] = null;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();

      const payload: HttpExceptionPayload =
        typeof res === 'string' ? { message: res } : (res as HttpExceptionPayload);

      message = Array.isArray(payload.message)
        ? 'Validation failed'
        : payload.message ?? exception.message;

      code = (payload.code as ResponseCode) ?? this.statusToCode(status);

      if (status === HttpStatus.BAD_REQUEST && Array.isArray(payload.message)) {
        code = ResponseCodes.VALIDATION_ERROR;
        errors = payload.message;
      } else if (payload.errors !== undefined) {
        errors = payload.errors as ApiResponse['errors'];
      }
    } else if (exception instanceof Error) {
      this.logger.error(exception.message, exception.stack);
      message = exception.message;
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
