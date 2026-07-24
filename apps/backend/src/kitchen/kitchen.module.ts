import { Module } from '@nestjs/common';
import { ActivityLogModule } from '../activity-log/activity-log.module';
import { KitchenController } from './kitchen.controller';
import { KitchenService } from './kitchen.service';
import { KitchenRepository } from './kitchen.repository';

@Module({
  imports: [ActivityLogModule],
  controllers: [KitchenController],
  providers: [KitchenService, KitchenRepository],
})
export class KitchenModule {}
