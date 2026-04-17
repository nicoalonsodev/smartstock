import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api/v1');

  const port = Number.parseInt(process.env.PORT ?? '4000', 10);
  await app.listen(Number.isNaN(port) ? 4000 : port);
}
bootstrap();
