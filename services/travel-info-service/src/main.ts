import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['log', 'error', 'warn', 'debug', 'verbose'],
  });

  // Global prefix for all routes (API Gateway ready)
  app.setGlobalPrefix('api/v1/travel-info');

  // Enable CORS for all services
  app.enableCors({
    origin: '*',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  const port = process.env.PORT ?? 8083;
  await app.listen(port);
  Logger.log(`Travel Info Service is running on port ${port}`, 'Bootstrap');
}
void bootstrap();
