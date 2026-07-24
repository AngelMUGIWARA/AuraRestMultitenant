import { Module } from '@nestjs/common';
import { RefundsController } from './refunds.controller';
import { RefundsService } from './refunds.service';
import { RefundValidationService } from './refund-validation.service';
import { RefundsRepository } from './refunds.repository';
import { ActivityLogModule } from '../activity-log/activity-log.module';
import { DatabaseModule } from '../database/database.module';
import { EventBusModule } from '../event-bus/event-bus.module';

@Module({
  imports: [DatabaseModule, ActivityLogModule, EventBusModule],
  controllers: [RefundsController],
  providers: [RefundsService, RefundValidationService, RefundsRepository],
  exports: [RefundsService],
})
export class RefundsModule {}
