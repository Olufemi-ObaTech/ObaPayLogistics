import { Module } from '@nestjs/common';
import { LoggerModule as PinoLoggerModule } from 'nestjs-pino';

/**
 * Structured (JSON) request logging via pino. In development it's rendered
 * human-readable via pino-pretty; in production it emits raw JSON lines
 * suitable for shipping to a log aggregator (ELK/Datadog/CloudWatch).
 */
@Module({
  imports: [
    PinoLoggerModule.forRoot({
      pinoHttp: {
        level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
        transport:
          process.env.NODE_ENV === 'production'
            ? undefined
            : { target: 'pino-pretty', options: { colorize: true, singleLine: true } },
        redact: ['req.headers.authorization', 'req.headers["idempotency-key"]', 'req.body.password', 'req.body.totpCode'],
        customProps: (req) => ({
          userId: (req as any).user?.id ?? undefined,
        }),
        serializers: {
          req(req) {
            return { method: req.method, url: req.url, id: req.id };
          },
        },
      },
    }),
  ],
})
export class LoggerModule {}
