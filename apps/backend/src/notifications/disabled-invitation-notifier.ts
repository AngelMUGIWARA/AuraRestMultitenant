import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { InvitationNotifier } from './invitation-notifier.interface';

@Injectable()
export class DisabledInvitationNotifier implements InvitationNotifier {
  assertAvailable(): void {
    throw new ServiceUnavailableException(
      'El canal de invitación no está configurado. Contacte al administrador del sistema.',
    );
  }

  async sendInvitation(): Promise<void> {
    throw new ServiceUnavailableException(
      'El canal de invitación no está configurado. Contacte al administrador del sistema.',
    );
  }
}
