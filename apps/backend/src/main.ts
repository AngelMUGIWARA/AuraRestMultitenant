import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { parseAllowedOrigins, isOriginAllowed } from './cors/cors-utils';
import { isSwaggerEnabled, shouldPersistAuthorization } from './config/swagger';
import { ValidationExceptionFilter } from './common/exception-filters/validation.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api/v1');

  app.useGlobalFilters(new ValidationExceptionFilter());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const allowedOrigins = parseAllowedOrigins(process.env.CORS_ORIGINS);
  const isDev = process.env.NODE_ENV === 'development';
  const origins =
    allowedOrigins.length > 0
      ? allowedOrigins
      : isDev
        ? parseAllowedOrigins(
            'http://localhost:3030,http://localhost:5001,http://localhost:5002,http://localhost:5003,http://localhost:5004,http://localhost:5005,http://localhost:5006,http://localhost:5007,http://localhost:5008,http://localhost:5014',
          )
        : [];

  app.enableCors({
    origin(origin, callback) {
      if (!origin) return callback(null, true);
      callback(null, isOriginAllowed(origin, origins));
    },
  });

  const nodeEnv = process.env.NODE_ENV ?? 'development';
  const swaggerEnabled = isSwaggerEnabled(nodeEnv, process.env.SWAGGER_ENABLED);

  if (swaggerEnabled) {
    const persistAuth = shouldPersistAuthorization(nodeEnv, process.env.SWAGGER_ENABLED);

    const swaggerConfig = new DocumentBuilder()
      .setTitle('AuraRest API')
      .setDescription('Sistema Integral Multi-Tenant para Restaurantes — API REST v1')
      .setVersion('1.0')
      .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }, 'JWT')
      .addApiKey({ type: 'apiKey', in: 'header', name: 'x-tenant-slug' }, 'TenantSlug')
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, document, {
      swaggerOptions: { persistAuthorization: persistAuth },
    });
  }

  const port = process.env.PORT ?? 4000;
  await app.listen(port);

  const logger = new Logger('Bootstrap');
  logger.log(`API: http://localhost:${port}/api/v1`);
  if (swaggerEnabled) {
    logger.log(`Swagger: http://localhost:${port}/api/docs`);
  }
}

bootstrap();
