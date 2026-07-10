import { Module } from '@nestjs/common';
import { EventBusModule } from '../event-bus/event-bus.module';
import { ActivityLogModule } from '../activity-log/activity-log.module';
import { OrdersController } from './orders.controller';
import { OrdersRepository } from './orders.repository';
import { OrdersService } from './orders.service';

@Module({
  imports: [EventBusModule, ActivityLogModule],
  controllers: [OrdersController],
  providers: [OrdersService, OrdersRepository],
  exports: [OrdersService, OrdersRepository],
})
export class OrdersModule {}
