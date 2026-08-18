import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import type { ApiError } from '@app/shared';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();

    const isHttp = exception instanceof HttpException;
    const status = isHttp
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    let payload: ApiError;
    if (isHttp) {
      const resp = exception.getResponse();
      payload =
        typeof resp === 'string'
          ? { code: 'ERROR', message: resp }
          : ({
              code: (resp as { code?: string }).code ?? 'ERROR',
              message: (resp as { message?: string }).message ?? exception.message,
              details: (resp as { details?: unknown }).details,
            } as ApiError);
    } else {
      payload = { code: 'INTERNAL', message: 'Internal server error' };
      this.logger.error(`Unhandled exception on ${req.method} ${req.url}`, exception as Error);
    }

    res.status(status).json(payload);
  }
}
