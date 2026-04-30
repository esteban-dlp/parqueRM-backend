import { Injectable } from '@nestjs/common';
import { ApiResponse } from '../interfaces/api-response.interface';
import { ResponseCode, ResponseCodes } from '../constants/response-codes';

@Injectable()
export class ResponseService {
  ok<T>(data: T, message = 'OK', meta?: Record<string, unknown>): ApiResponse<T> {
    return {
      success: true,
      code: ResponseCodes.OK,
      message,
      data,
      ...(meta ? { meta } : {}),
    };
  }

  created<T>(data: T, message = 'Created'): ApiResponse<T> {
    return {
      success: true,
      code: ResponseCodes.CREATED,
      message,
      data,
    };
  }

  updated<T>(data: T, message = 'Updated'): ApiResponse<T> {
    return {
      success: true,
      code: ResponseCodes.UPDATED,
      message,
      data,
    };
  }

  deleted(message = 'Deleted'): ApiResponse<null> {
    return {
      success: true,
      code: ResponseCodes.DELETED,
      message,
      data: null,
    };
  }

  error(
    code: ResponseCode,
    message: string,
    errors: Record<string, unknown> | string[] | null = null,
  ): ApiResponse<null> {
    return {
      success: false,
      code,
      message,
      data: null,
      errors,
    };
  }
}
