import { Module } from '@nestjs/common';
import { PlanLimitsModule } from '../common/plan-limits/plan-limits.module';
import { DisabledInvitationNotifier } from '../notifications/disabled-invitation-notifier';
import { INVITATION_NOTIFIER } from '../notifications/invitation-notifier.interface';
import { UsersController } from './users.controller';
import { UsersRepository } from './users.repository';
import { UsersService } from './users.service';

@Module({
  imports: [PlanLimitsModule],
  controllers: [UsersController],
  providers: [
    UsersService,
    UsersRepository,
    {
      provide: INVITATION_NOTIFIER,
      useClass: DisabledInvitationNotifier,
    },
  ],
  exports: [UsersService],
})
export class UsersModule {}
