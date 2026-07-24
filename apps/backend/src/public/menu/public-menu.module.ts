import { Module } from '@nestjs/common';
import { PublicMenuController } from './public-menu.controller';
import { PublicMenuService } from './public-menu.service';
import { PublicMenuRepository } from './public-menu.repository';
import { DatabaseModule } from '../../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [PublicMenuController],
  providers: [PublicMenuService, PublicMenuRepository],
  exports: [PublicMenuService, PublicMenuRepository],
})
export class PublicMenuModule {}
