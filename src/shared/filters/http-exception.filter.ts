import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

    const raw = exception instanceof HttpException ? (exception.getResponse() as any) : null;

    let message: string;
    let errors: Record<string, string> = {};

    if (Array.isArray(raw?.message)) {
      // class-validator validation errors — each string is like:
      // "email must be an email" or "password must be longer than or equal to 8 characters"
      message = 'Validation failed';
      errors = this.parseValidationErrors(raw.message as string[]);
    } else {
      message = raw?.message || 'Internal server error';
    }

    response.status(status).json({
      success: false,
      statusCode: status,
      message,
      errors,
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
