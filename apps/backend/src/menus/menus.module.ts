import { Module } from '@nestjs/common';

import { MenusController } from './menus.controller';
import { MenusService } from './menus.service';
import { MenusRepository } from './menus.repository';

import { ActivityLogModule } from '../activity-log/activity-log.module';
import { UploadModule } from '../upload/upload.module';

@Module({
  imports: [
    ActivityLogModule,
    UploadModule,
  ],
  controllers: [MenusController],
  providers: [MenusService, MenusRepository],
  exports: [MenusService],
})
export class MenusModule {}