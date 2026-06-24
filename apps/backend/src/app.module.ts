import {
  MiddlewareConsumer,
  Module,
  NestModule,
  RequestMethod,
} from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';

import { AuthModule } from './auth/auth.module';
import { BranchesModule } from './branches/branches.module';
import { DatabaseModule } from './database/database.module';
import { ReportsModule } from './reports/reports.module';
import { TenantsModule } from './tenants/tenants.module';
import { UsersModule } from './users/users.module';

import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { TenantMiddleware } from './common/middleware/tenant.middleware';

@Module({
  imports: [
    // Carga variables de entorno desde .env globalmente
    ConfigModule.forRoot({ isGlobal: true }),

    // DatabaseModule es @Global() — PrismaService y TenantPrismaService
    // quedan disponibles en todos los módulos sin importarlos de nuevo
    DatabaseModule,

    AuthModule,
    BranchesModule,
    UsersModule,
    TenantsModule,
    ReportsModule,
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
