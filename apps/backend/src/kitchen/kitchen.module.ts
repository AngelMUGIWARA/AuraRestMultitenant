import { Module } from '@nestjs/common';
import { DashboardModule } from '../dashboard/dashboard.module';
import { ActivityLogModule } from '../activity-log/activity-log.module';

import { KitchenController } from './kitchen.controller';
import { KitchenService } from './kitchen.service';
import { KitchenRepository } from './kitchen.repository';
import { KitchenGateway } from './kitchen.gateway';
import { KitchenDashboardController } from './kitchen-dashboard.controller';

@Module({
  imports: [ActivityLogModule, DashboardModule],
  controllers: [KitchenController, KitchenDashboardController],
  providers: [KitchenService, KitchenRepository, KitchenGateway],
})
export class KitchenModule {}


