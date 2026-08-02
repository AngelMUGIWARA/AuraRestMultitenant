import {
  MiddlewareConsumer,
  Module,
  NestModule,
  RequestMethod,
} from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD, Reflector } from '@nestjs/core';
import { validateEnv } from './config/env.validation';
import { createThrottlerOptions } from './config/throttler.config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';

import { AuthModule } from './auth/auth.module';
import { BranchesModule } from './branches/branches.module';
import { DatabaseModule } from './database/database.module';
import { DiscountsModule } from './discounts/discounts.module';
import { OrdersModule } from './orders/orders.module';
import { PaymentsModule } from './payments/payments.module';
import { PromotionsModule } from './promotions/promotions.module';
import { ReportsModule } from './reports/reports.module';
import { TablesModule } from './tables/tables.module';
import { SystemAdminModule } from './system-admin/system-admin.module';
import { UsersModule } from './users/users.module';
import { TipsModule } from './tips/tips.module';
import { RefundsModule } from './refunds/refunds.module';

import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { TenantMiddleware } from './common/middleware/tenant.middleware';
import { ActivityLogModule } from './activity-log/activity-log.module';
import { MenusModule } from './menus/menus.module';

import { CategoriesModule } from './categories/categories.module';
import { PublicModule } from './public/public.module';
import { HealthModule } from './health/health.module';
import { KitchenModule } from './kitchen/kitchen.module';
import { ReservationsModule } from './reservations/reservations.module';
import { ReceiptsModule } from './receipts/receipts.module';
import { CashRegisterModule } from './cash-register/cash-register.module';
import { InventoryModule } from './inventory/inventory.module';
import { UploadModule } from './upload/upload.module';
import { DashboardModule } from './dashboard/dashboard.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),

    ThrottlerModule.forRootAsync({
      useFactory: (config: ConfigService, reflector: Reflector) =>
        createThrottlerOptions(config, reflector),
      inject: [ConfigService, Reflector],
    }),

    DatabaseModule,

    AuthModule,
    BranchesModule,
    UsersModule,
    SystemAdminModule,
    ReportsModule,
    OrdersModule,
    TablesModule,
    PaymentsModule,
    DiscountsModule,
    PromotionsModule,
    CategoriesModule,
    HealthModule,
    MenusModule,
    KitchenModule,
    ReservationsModule,
    ActivityLogModule,
    TipsModule,
    RefundsModule,
    ReceiptsModule,
    CashRegisterModule,
    InventoryModule,
    PublicModule,
    UploadModule,
    DashboardModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(TenantMiddleware)
      .exclude({ path: 'system-admin/(.*)', method: RequestMethod.ALL })
      .forRoutes({ path: '*', method: RequestMethod.ALL });
  }
}