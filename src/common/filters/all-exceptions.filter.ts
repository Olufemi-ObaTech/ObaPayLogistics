import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';

/**
 * Central error handler: normalizes all thrown errors into a consistent JSON
 * shape and logs them in structured form (fields, not string concatenation)
 * so they can be parsed by log aggregators in production.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'Internal server error';
    let code = 'INTERNAL_ERROR';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const body = exception.getResponse();
      message = typeof body === 'string' ? body : (body as any).message ?? exception.message;
      code = (body as any)?.error ?? exception.name;
    } else if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      // Common ACID-violation cases surfaced with clear, non-leaky messages.
      status = HttpStatus.CONFLICT;
      code = `DB_${exception.code}`;
      message = 'A data conflict occurred while processing your request';
    }

    this.logger.error({
      msg: 'unhandled_exception',
      path: request.url,
      method: request.method,
      status,
      code,
      error: exception instanceof Error ? exception.message : String(exception),
      stack: exception instanceof Error ? exception.stack : undefined,
    });

    response.status(status).json({
      statusCode: status,
      code,
      message,
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }
}
