import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Global prefix for all routes (API Gateway ready)
  app.setGlobalPrefix('api/v1/social');

  // Enable CORS for all services
  app.enableCors({
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true,
  });

  // Enable validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  const port = process.env.PORT || 8082;
  await app.listen(port);

  console.log(`\n🚀 Social Service running on http://localhost:${port}`);
  console.log(
    `📊 MongoDB connected to ${process.env.MONGODB_URI || 'mongodb://localhost:27017/social_db'}\n`,
  );
}
bootstrap();
