import { Module } from '@nestjs/common';
import { ActivityLogModule } from '../activity-log/activity-log.module';
import { PlanLimitsModule } from '../common/plan-limits/plan-limits.module';
import { TablesModule } from '../tables/tables.module';
import { BranchesController } from './branches.controller';
import { BranchesRepository } from './branches.repository';
import { BranchesService } from './branches.service';

@Module({
  imports: [ActivityLogModule, PlanLimitsModule, TablesModule],
  controllers: [BranchesController],
  providers: [BranchesService, BranchesRepository],
  exports: [BranchesService],
})
export class BranchesModule {}
