import { Module } from '@nestjs/common';
import { BranchesController } from './branches.controller';
import { BranchesRepository } from './branches.repository';
import { BranchesService } from './branches.service';
import { ActivityLogModule } from '../activity-log/activity-log.module';
import { TablesModule } from '../tables/tables.module';

@Module({
  imports: [ActivityLogModule, TablesModule],
  controllers: [BranchesController],
  providers: [BranchesService, BranchesRepository],
  exports: [BranchesService],
})
export class BranchesModule {}
