import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Enable validation pipes for DTOs
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  
  const port = process.env.PORT || 8080;
  await app.listen(port);
  console.log(`[Infrastructure Provisioner] Running on port ${port}`);
  console.log(`[Environment] ${process.env.NODE_ENV || 'development'}`);
}
bootstrap();
