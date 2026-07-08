import { Module } from '@nestjs/common';
import { EventBusModule } from '../event-bus/event-bus.module';
import { ActivityLogModule } from '../activity-log/activity-log.module';
import { PaymentsController } from './payments.controller';
import { PaymentsRepository } from './payments.repository';
import { PaymentsService } from './payments.service';

@Module({
  imports: [EventBusModule, ActivityLogModule],
  controllers: [PaymentsController],
  providers: [PaymentsService, PaymentsRepository],
  exports: [PaymentsService, PaymentsRepository],
})
export class PaymentsModule {}
