import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api/v1');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const corsOrigins = process.env.CORS_ORIGINS?.split(',').filter(Boolean) ?? [];
  const isDev = process.env.NODE_ENV === 'development';
  app.enableCors({
    origin: corsOrigins.length > 0
      ? corsOrigins
      : isDev
        ? ['http://localhost:3030', 'http://localhost:5001', 'http://localhost:5002', 'http://localhost:5003', 'http://localhost:5004', 'http://localhost:5005', 'http://localhost:5006', 'http://localhost:5007', 'http://localhost:5008, http://localhost:5014']
        : [],
    credentials: true,
  });

  const swaggerConfig = new DocumentBuilder()
    .setTitle('AuraRest API')
    .setDescription('Sistema Integral Multi-Tenant para Restaurantes — API REST v1')
    .setVersion('1.0')
    .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }, 'JWT')
    .addApiKey({ type: 'apiKey', in: 'header', name: 'x-tenant-slug' }, 'TenantSlug')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: { persistAuthorization: true },
  });

  const port = process.env.PORT ?? 4000;
  await app.listen(port);

  const logger = new Logger('Bootstrap');
  logger.log(`API: http://localhost:${port}/api/v1`);
  logger.log(`Swagger: http://localhost:${port}/api/docs`);
}

bootstrap();
