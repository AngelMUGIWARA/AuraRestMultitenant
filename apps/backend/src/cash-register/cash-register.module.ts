import { Module } from '@nestjs/common';
import { ActivityLogModule } from '../activity-log/activity-log.module';
import { EventBusModule } from '../event-bus/event-bus.module';
import { CashRegisterController } from './cash-register.controller';
import { CashRegisterService } from './cash-register.service';
import { CashRegisterRepository } from './cash-register.repository';

@Module({
  imports: [ActivityLogModule, EventBusModule],
  controllers: [CashRegisterController],
  providers: [CashRegisterService, CashRegisterRepository],
  exports: [CashRegisterService, CashRegisterRepository],
})
export class CashRegisterModule {}
