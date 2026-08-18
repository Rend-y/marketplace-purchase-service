import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { ClsService } from 'nestjs-cls';

import { DOMAIN_ERROR_KIND, DomainError, type DomainErrorKind } from '../../domain/errors';
import { serializeError } from '../../infrastructure/logger';
import { API_ERROR_CODE } from '../errors/api-error-code.constant';

interface NormalizedError {
  readonly statusCode: number;
  readonly code: string;
  readonly message: string;
  readonly details?: Record<string, unknown>;
}

const DOMAIN_KIND_TO_STATUS: Readonly<Record<DomainErrorKind, number>> = {
  [DOMAIN_ERROR_KIND.NOT_FOUND]: HttpStatus.NOT_FOUND,
  [DOMAIN_ERROR_KIND.CONFLICT]: HttpStatus.CONFLICT,
  [DOMAIN_ERROR_KIND.UNPROCESSABLE]: HttpStatus.UNPROCESSABLE_ENTITY,
  [DOMAIN_ERROR_KIND.INVARIANT_VIOLATION]: HttpStatus.INTERNAL_SERVER_ERROR,
};

const STATUS_TO_API_CODE: Readonly<Record<number, string>> = {
  [HttpStatus.BAD_REQUEST]: API_ERROR_CODE.BAD_REQUEST,
  [HttpStatus.NOT_FOUND]: API_ERROR_CODE.NOT_FOUND,
  [HttpStatus.METHOD_NOT_ALLOWED]: API_ERROR_CODE.METHOD_NOT_ALLOWED,
  [HttpStatus.CONFLICT]: API_ERROR_CODE.CONFLICT,
  [HttpStatus.PAYLOAD_TOO_LARGE]: API_ERROR_CODE.PAYLOAD_TOO_LARGE,
  [HttpStatus.UNPROCESSABLE_ENTITY]: API_ERROR_CODE.UNPROCESSABLE_ENTITY,
  [HttpStatus.SERVICE_UNAVAILABLE]: API_ERROR_CODE.SERVICE_UNAVAILABLE,
};

const INTERNAL_ERROR_MESSAGE = 'Internal server error';
const SERVER_ERROR_STATUS_THRESHOLD: number = HttpStatus.INTERNAL_SERVER_ERROR;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

/**
 * Single place where any failure becomes an HTTP response, so the error contract stays
 * identical for domain errors, validation errors and unexpected exceptions.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  constructor(private readonly cls: ClsService) {}

  public catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();

    const normalized = this.normalize(exception);
    const requestId = this.cls.isActive() ? this.cls.getId() : 'unknown';

    this.log(exception, normalized, request);

    response.status(normalized.statusCode).json({
      statusCode: normalized.statusCode,
      code: normalized.code,
      message: normalized.message,
      ...(normalized.details === undefined ? {} : { details: normalized.details }),
      requestId,
      timestamp: new Date().toISOString(),
      path: request.originalUrl,
    });
  }

  private normalize(exception: unknown): NormalizedError {
    if (exception instanceof DomainError) {
      return {
        statusCode: DOMAIN_KIND_TO_STATUS[exception.kind],
        code: exception.code,
        message:
          exception.kind === DOMAIN_ERROR_KIND.INVARIANT_VIOLATION
            ? INTERNAL_ERROR_MESSAGE
            : exception.message,
        details:
          exception.kind === DOMAIN_ERROR_KIND.INVARIANT_VIOLATION
            ? undefined
            : { ...exception.details },
      };
    }

    if (exception instanceof HttpException) {
      return this.normalizeHttpException(exception);
    }

    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      code: API_ERROR_CODE.INTERNAL_ERROR,
      message: INTERNAL_ERROR_MESSAGE,
    };
  }

  private normalizeHttpException(exception: HttpException): NormalizedError {
    const statusCode = exception.getStatus();
    const payload: unknown = exception.getResponse();
    const fallbackCode = STATUS_TO_API_CODE[statusCode] ?? API_ERROR_CODE.INTERNAL_ERROR;

    if (!isRecord(payload)) {
      return { statusCode, code: fallbackCode, message: exception.message };
    }

    const rawMessage: unknown = payload.message;

    // `ValidationPipe` reports every violation as an array of strings.
    if (Array.isArray(rawMessage)) {
      const violations = rawMessage.filter((item): item is string => typeof item === 'string');

      return {
        statusCode,
        code: API_ERROR_CODE.VALIDATION_FAILED,
        message: 'Request validation failed',
        details: { violations },
      };
    }

    const code: unknown = payload.code;

    return {
      statusCode,
      code: typeof code === 'string' ? code : fallbackCode,
      message: typeof rawMessage === 'string' ? rawMessage : exception.message,
    };
  }

  private log(exception: unknown, normalized: NormalizedError, request: Request): void {
    const context = {
      method: request.method,
      path: request.originalUrl,
      statusCode: normalized.statusCode,
      code: normalized.code,
    };

    if (normalized.statusCode >= SERVER_ERROR_STATUS_THRESHOLD) {
      this.logger.error({
        message: 'Request failed with an unexpected error',
        ...context,
        err: serializeError(exception),
      });
      return;
    }

    this.logger.debug({ message: 'Request rejected', ...context });
  }
}
