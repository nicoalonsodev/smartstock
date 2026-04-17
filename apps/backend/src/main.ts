import { NestFactory } from '@nestjs/core';
import { Logger } from 'nestjs-pino';

import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useLogger(app.get(Logger));
  app.setGlobalPrefix('api/v1');

  const port = Number.parseInt(process.env.PORT ?? '4000', 10);
  await app.listen(Number.isNaN(port) ? 4000 : port);
}
bootstrap();
