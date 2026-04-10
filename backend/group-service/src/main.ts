import 'reflect-metadata';
import 'dotenv/config';

import { NestFactory } from '@nestjs/core';
import { AppModule } from './modules/app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  app.enableCors({ origin: true, credentials: true });

  const port = Number(process.env.PORT || 3003);
  await app.listen(port);
}

bootstrap();
