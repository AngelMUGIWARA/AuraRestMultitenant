import { Module } from '@nestjs/common';
import { ActivityLogModule } from '../activity-log/activity-log.module';
import { ReservationsService } from './reservations.service';
import { ReservationsController } from './reservations.controller';
import { TenantPrismaService } from '../database/tenant-prisma.service';
import { ReservationRepository } from './reservations.repository';

@Module({
  imports: [ActivityLogModule],
  controllers: [ReservationsController],
  providers: [ReservationsService, ReservationRepository, TenantPrismaService],
})
export class ReservationsModule {}