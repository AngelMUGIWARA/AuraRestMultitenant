export interface InvitationDetails {
  name: string;
  email: string;
  temporaryPassword: string;
}

export const INVITATION_NOTIFIER = 'INVITATION_NOTIFIER';

export interface InvitationNotifier {
  assertAvailable(): void;
  sendInvitation(details: InvitationDetails): Promise<void>;
}
