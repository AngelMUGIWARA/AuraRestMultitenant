import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { UsersRepository } from './users.repository';
import { INVITATION_NOTIFIER } from '../notifications/invitation-notifier.interface';
import { DisabledInvitationNotifier } from '../notifications/disabled-invitation-notifier';

@Module({
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
