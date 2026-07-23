import { forwardRef, Module } from '@nestjs/common';
import { EventBusModule } from '../event-bus/event-bus.module';
import { ActivityLogModule } from '../activity-log/activity-log.module';
import { TaxConfigModule } from '../tax-config/tax-config.module';
import { OrdersController } from './orders.controller';
import { OrdersRepository } from './orders.repository';
import { OrdersService } from './orders.service';
import { DiscountsModule } from '../discounts/discounts.module';
import { PromotionsModule } from '../promotions/promotions.module';

@Module({
  imports: [
    EventBusModule,
    ActivityLogModule,
    TaxConfigModule,
    forwardRef(() => DiscountsModule),
    forwardRef(() => PromotionsModule),
  ],
  controllers: [OrdersController],
  providers: [OrdersService, OrdersRepository],
  exports: [OrdersService, OrdersRepository],
})
export class OrdersModule {}
