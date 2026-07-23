import { forwardRef, Module } from '@nestjs/common';
import { PromotionsController } from './promotions.controller';
import { PromotionsRepository } from './promotions.repository';
import { PromotionsService } from './promotions.service';
import { PromotionValidationService } from './promotion-validation.service';
import { PromotionCalculator } from './promotion.calculator';
import { PromotionResolver } from './promotion.resolver';
import { OrderPromotionService } from './order-promotion.service';
import { OrdersModule } from '../orders/orders.module';
import { TaxConfigModule } from '../tax-config/tax-config.module';
import { DiscountsModule } from '../discounts/discounts.module';
import { ActivityLogModule } from '../activity-log/activity-log.module';
import { EventBusModule } from '../event-bus/event-bus.module';

@Module({
  imports: [
    forwardRef(() => OrdersModule),
    TaxConfigModule,
    forwardRef(() => DiscountsModule),
    ActivityLogModule,
    EventBusModule,
  ],
  controllers: [PromotionsController],
  providers: [
    PromotionsService,
    PromotionsRepository,
    PromotionValidationService,
    PromotionCalculator,
    PromotionResolver,
    OrderPromotionService,
  ],
  exports: [
    PromotionsService,
    PromotionsRepository,
    PromotionValidationService,
    PromotionCalculator,
    PromotionResolver,
    OrderPromotionService,
  ],
})
export class PromotionsModule {}
