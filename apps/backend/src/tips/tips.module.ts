import { Module, forwardRef } from '@nestjs/common';
import { OrderTipService } from './order-tip.service';
import { TipCalculator } from './tip-calculator';
import { TipValidationService } from './tip-validation.service';
import { TipsController } from './tips.controller';
import { OrdersModule } from '../orders/orders.module';
import { CommonModule } from '../common/common.module';

@Module({
  imports: [
    CommonModule,
    forwardRef(() => OrdersModule),
  ],
  controllers: [TipsController],
  providers: [
    OrderTipService,
    TipCalculator,
    TipValidationService,
  ],
  exports: [
    OrderTipService,
    TipCalculator,
    TipValidationService,
  ],
})
export class TipsModule {}
