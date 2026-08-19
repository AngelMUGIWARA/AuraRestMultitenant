import { Module } from '@nestjs/common';

import { MenusController } from './menus.controller';
import { MenusRepository } from './menus.repository';
import { MenusService } from './menus.service';

import { ActivityLogModule } from '../activity-log/activity-log.module';
import { PlanLimitsModule } from '../common/plan-limits/plan-limits.module';
import { UploadModule } from '../upload/upload.module';

@Module({
  imports: [
    ActivityLogModule,
    UploadModule,
    PlanLimitsModule,
  ],
  controllers: [MenusController],
  providers: [MenusService, MenusRepository],
  exports: [MenusService],
})
export class MenusModule {}