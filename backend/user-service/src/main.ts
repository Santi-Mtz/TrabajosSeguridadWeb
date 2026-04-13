import 'reflect-metadata';
import 'dotenv/config';

import { NestFactory } from '@nestjs/core';
import { AppModule } from './modules/app.module';
import type { NextFunction, Request, Response } from 'express';
import { DatabaseService } from './services/database.service';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  app.enableCors({ origin: true, credentials: true });

  const database = app.get(DatabaseService);
  await database.ensureObservabilitySchema();

  app.use((req: Request, res: Response, next: NextFunction) => {
    const start = process.hrtime.bigint();
    let intOpCode: string | null = null;
    let errorMessage: string | null = null;

    const originalJson = res.json.bind(res);
    res.json = ((body: unknown) => {
      if (body && typeof body === 'object') {
        const maybeCode = (body as { intOpCode?: unknown }).intOpCode;
        if (typeof maybeCode === 'string' && maybeCode.trim().length > 0) {
          intOpCode = maybeCode.trim();
        }
      }

      return originalJson(body);
    }) as Response['json'];

    res.on('finish', () => {
      const elapsedMs = Number((process.hrtime.bigint() - start) / BigInt(1000000));
      const statusCode = res.statusCode;
      const userIdHeader = Array.isArray(req.headers['x-user-id']) ? req.headers['x-user-id'][0] : req.headers['x-user-id'];
      const parsedUserId = Number(userIdHeader);
      const userId = Number.isInteger(parsedUserId) && parsedUserId > 0 ? parsedUserId : null;
      const endpoint = req.route?.path ? `${req.baseUrl || ''}${req.route.path}` : req.originalUrl || req.url;
      const method = req.method;
      const ipAddress = req.headers['x-forwarded-for']?.toString() || req.ip;

      if (statusCode >= 500) {
        errorMessage = `HTTP_${statusCode}`;
      }

      void database.query(
        `INSERT INTO microservice_request_logs
          (service_name, endpoint, method, user_id, ip_address, status_code, int_op_code, response_time_ms, error_message)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        ['user-service', endpoint, method, userId, ipAddress, statusCode, intOpCode, elapsedMs, errorMessage]
      ).catch(() => undefined);

      void database.query(
        `INSERT INTO microservice_endpoint_metrics
          (service_name, endpoint, method, request_count, total_response_time_ms, avg_response_time_ms, updated_at)
         VALUES ($1, $2, $3, 1, $4::bigint, $5::numeric, NOW())
         ON CONFLICT (service_name, endpoint, method)
         DO UPDATE SET
           request_count = microservice_endpoint_metrics.request_count + 1,
           total_response_time_ms = microservice_endpoint_metrics.total_response_time_ms + EXCLUDED.total_response_time_ms,
           avg_response_time_ms =
             ROUND(
               (microservice_endpoint_metrics.total_response_time_ms + EXCLUDED.total_response_time_ms)::numeric
               / (microservice_endpoint_metrics.request_count + 1),
               2
             ),
           updated_at = NOW()`,
        ['user-service', endpoint, method, elapsedMs, elapsedMs]
      ).catch(() => undefined);
    });

    next();
  });

  const port = Number(process.env.PORT || 3001);
  await app.listen(port);
}

bootstrap();
