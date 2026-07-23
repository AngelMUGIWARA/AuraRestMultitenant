import { Module } from '@nestjs/common';
import { TaxConfigService } from './tax-config.service';

@Module({
  providers: [TaxConfigService],
  exports: [TaxConfigService],
})
export class TaxConfigModule {}
