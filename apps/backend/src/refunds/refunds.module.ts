import { Module } from '@nestjs/common';
import { RefundsController } from './refunds.controller';
import { RefundsService } from './refunds.service';
import { RefundValidationService } from './refund-validation.service';
import { RefundsRepository } from './refunds.repository';
import { ActivityLogModule } from '../activity-log/activity-log.module';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule, ActivityLogModule],
  controllers: [RefundsController],
  providers: [RefundsService, RefundValidationService, RefundsRepository],
  exports: [RefundsService],
})
export class RefundsModule {}
