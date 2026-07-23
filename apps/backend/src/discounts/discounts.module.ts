import { forwardRef, Module } from '@nestjs/common';
import { DiscountsController } from './discounts.controller';
import { DiscountsRepository } from './discounts.repository';
import { DiscountsService } from './discounts.service';
import { DiscountValidationService } from './discount-validation.service';
import { DiscountCalculator } from './discount.calculator';
import { OrderDiscountService } from './order-discount.service';
import { TaxConfigModule } from '../tax-config/tax-config.module';
import { ActivityLogModule } from '../activity-log/activity-log.module';
import { EventBusModule } from '../event-bus/event-bus.module';
import { OrdersModule } from '../orders/orders.module';

@Module({
  imports: [
    TaxConfigModule,
    ActivityLogModule,
    EventBusModule,
    forwardRef(() => OrdersModule),
  ],
  controllers: [DiscountsController],
  providers: [
    DiscountsService,
    DiscountsRepository,
    DiscountValidationService,
    DiscountCalculator,
    OrderDiscountService,
  ],
  exports: [
    DiscountsService,
    DiscountsRepository,
    DiscountValidationService,
    DiscountCalculator,
    OrderDiscountService,
  ],
})
export class DiscountsModule {}
