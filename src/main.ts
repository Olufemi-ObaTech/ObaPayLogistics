import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { Logger } from 'nestjs-pino';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  app.useLogger(app.get(Logger));
  app.use(helmet());

  // This API is credentialed (bearer tokens); a wildcard CORS origin combined
  // with a browser client would let any site read authenticated responses.
  // Only fall back to permissive localhost origins outside production.
  const corsOrigin = process.env.CORS_ORIGIN?.split(',');
  if (!corsOrigin && process.env.NODE_ENV === 'production') {
    throw new Error('CORS_ORIGIN must be set in production');
  }
  app.enableCors({ origin: corsOrigin ?? ['http://localhost:3001'], credentials: true });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`ObaPay Logistics API listening on :${port}`);
}

bootstrap();
