import {
  Module,
  NestModule,
  MiddlewareConsumer,
  RequestMethod,
} from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';

import { DatabaseModule } from './database/database.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';

import { TenantMiddleware } from './common/middleware/tenant.middleware';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';

@Module({
  imports: [
    // Carga variables de entorno desde .env globalmente
    ConfigModule.forRoot({ isGlobal: true }),

    // DatabaseModule es @Global() — PrismaService y TenantPrismaService
    // quedan disponibles en todos los módulos sin importarlos de nuevo
    DatabaseModule,

    AuthModule,
    UsersModule,
    // ↑ Agrega aquí los demás módulos: MenuModule, OrdersModule, etc.
  ],
  providers: [
    // Guards globales: se aplican a TODOS los endpoints
    // Los endpoints públicos usan @Public() para saltarlos
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // TenantMiddleware corre en todas las rutas y resuelve request.tenant
    consumer
      .apply(TenantMiddleware)
      .forRoutes({ path: '*', method: RequestMethod.ALL });
  }
}
