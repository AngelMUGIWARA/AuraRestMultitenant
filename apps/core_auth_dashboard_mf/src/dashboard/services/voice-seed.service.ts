import { apiClient } from '@maison/api-client';
import type {
  VoiceSeedPayload,
  VoiceSeedResponse,
  VoiceSeedGenerateResponse,
} from '@maison/types';

export const voiceSeedService = {
  setVoiceSeed: (payload: VoiceSeedPayload) =>
    apiClient.patch<VoiceSeedResponse>('/auth/voice-seed', payload),
  generateVoiceSeed: () =>
    apiClient.post<VoiceSeedGenerateResponse>('/auth/voice-seed/generate', {}),
};
