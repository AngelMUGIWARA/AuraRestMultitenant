import { Module } from '@nestjs/common';
import { PublicMenuModule } from './menu/public-menu.module';

@Module({
  imports: [PublicMenuModule],
  exports: [PublicMenuModule],
})
export class PublicModule {}
