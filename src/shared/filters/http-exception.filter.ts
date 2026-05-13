import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Request, Response } from 'express';
import { MulterError } from 'multer';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    if (exception instanceof MulterError && exception.code === 'LIMIT_FILE_SIZE') {
      return response.status(HttpStatus.PAYLOAD_TOO_LARGE).json({
        success: false,
        statusCode: HttpStatus.PAYLOAD_TOO_LARGE,
        message: 'File is too large. Maximum allowed sizes: images 10 MB, documents 50 MB, videos 200 MB.',
        errors: {},
        path: request.url,
        timestamp: new Date().toISOString(),
      });
    }

    const status =
      exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

    const raw = exception instanceof HttpException ? (exception.getResponse() as any) : null;

    let message: string;
    let errors: Record<string, string> = {};
    let extra: Record<string, unknown> = {};

    if (Array.isArray(raw?.message)) {
      message = 'Validation failed';
      errors = this.parseValidationErrors(raw.message as string[]);
    } else if (typeof raw === 'string') {
      message = raw;
    } else if (raw && typeof raw === 'object') {
      const { message: rawMessage, ...rest } = raw as any;
      message = rawMessage || 'Internal server error';
      if (Object.keys(rest).length) extra = rest;
    } else {
      message = 'Internal server error';
    }

    const log = `${request.method} ${request.url} ${status} — ${message}`;
    if (status >= 500) {
      this.logger.error(log, exception instanceof Error ? exception.stack : undefined);
    } else {
      this.logger.warn(log);
    }

    response.status(status).json({
      success: false,
      statusCode: status,
      message,
      errors,
      ...extra,
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }

  // Extracts the field name from class-validator error strings.
  // e.g. "email must be an email" → { email: "must be an email" }
  // When multiple errors exist for the same field, the first one wins.
  private parseValidationErrors(messages: string[]): Record<string, string> {
    const errors: Record<string, string> = {};
    for (const msg of messages) {
      const spaceIndex = msg.indexOf(' ');
      if (spaceIndex === -1) continue;
      const field = msg.slice(0, spaceIndex);
      if (!errors[field]) {
        errors[field] = msg.slice(spaceIndex + 1);
      }
    }
    return errors;
  }
}
