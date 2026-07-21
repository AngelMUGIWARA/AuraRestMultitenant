import { apiClient } from '@maison/api-client';
import type { VoiceSeedPayload, VoiceSeedResponse } from '@maison/types';

export const voiceSeedService = {
  setVoiceSeed: (payload: VoiceSeedPayload) =>
    apiClient.patch<VoiceSeedResponse>('/auth/voice-seed', payload),
};
