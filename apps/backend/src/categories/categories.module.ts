import { Module } from "@nestjs/common";

import { CategoriesController } from "./categories.controller";
import { CategoriesService } from "./categories.service";
import { CategoriesRepository } from "./categories.repository";
import { ActivityLogModule } from "../activity-log/activity-log.module";

@Module({
  imports: [ActivityLogModule],
  controllers: [CategoriesController],
  providers: [CategoriesService, CategoriesRepository],
  exports: [CategoriesService],
})
export class CategoriesModule {}
