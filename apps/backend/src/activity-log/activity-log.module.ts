import { Module } from '@nestjs/common';
import { ActivityLogService } from './activity-log.service';
import { ActivityLogRepository } from './activity-log.repository';
import { ActivityLogController } from './activity-log.controller';

@Module({
  controllers: [ActivityLogController],
  providers: [ActivityLogService, ActivityLogRepository],
  exports: [ActivityLogService],
})
export class ActivityLogModule {}
