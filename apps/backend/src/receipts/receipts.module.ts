import { Module } from '@nestjs/common';
import { ActivityLogModule } from '../activity-log/activity-log.module';
import { ReceiptsController } from './receipts.controller';
import { ReceiptsService } from './receipts.service';
import { ReceiptsRepository } from './receipts.repository';
import { ReceiptValidationService } from './receipt-validation.service';
import { ReceiptNumberService } from './receipt-number.service';

@Module({
  imports: [ActivityLogModule],
  controllers: [ReceiptsController],
  providers: [
    ReceiptsService,
    ReceiptsRepository,
    ReceiptValidationService,
    ReceiptNumberService,
  ],
  exports: [ReceiptsService],
})
export class ReceiptsModule {}
