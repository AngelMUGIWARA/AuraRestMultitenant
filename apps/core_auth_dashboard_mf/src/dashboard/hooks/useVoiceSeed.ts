import { useState } from 'react';
import { ApiClientError } from '@maison/api-client';
import type { VoiceSeedPayload } from '@maison/types';
import { voiceSeedService } from '../services/voice-seed.service';

export function useVoiceSeed() {
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedUsername, setSavedUsername] = useState<string | null>(null);

  const [isGenerating, setIsGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [generatedSeedWord, setGeneratedSeedWord] = useState<string | null>(null);

  async function submit(payload: VoiceSeedPayload): Promise<boolean> {
    setIsSaving(true);
    setError(null);
    setSavedUsername(null);
    try {
      const response = await voiceSeedService.setVoiceSeed(payload);
      setSavedUsername(response.voiceUsername);
      return true;
    } catch (err) {
      if (err instanceof ApiClientError && err.statusCode === 409) {
        setError('Ese nombre de usuario para voz ya está en uso, intenta con otro.');
      } else if (err instanceof ApiClientError && err.statusCode === 403) {
        setError('No tienes permiso para configurar la palabra clave de voz.');
      } else {
        setError('No se pudo guardar. Verifica tu conexión e intenta de nuevo.');
      }
      return false;
    } finally {
      setIsSaving(false);
    }
  }

  async function generate(): Promise<void> {
    setIsGenerating(true);
    setGenerateError(null);
    setGeneratedSeedWord(null);
    try {
      const response = await voiceSeedService.generateVoiceSeed();
      setGeneratedSeedWord(response.seedWord);
    } catch (err) {
      if (err instanceof ApiClientError && err.statusCode === 403) {
        setGenerateError('No tienes permiso para generar una palabra clave de voz.');
      } else {
        setGenerateError('No se pudo generar la palabra clave. Verifica tu conexión e intenta de nuevo.');
      }
    } finally {
      setIsGenerating(false);
    }
  }

  return {
    submit,
    isSaving,
    error,
    savedUsername,
    generate,
    isGenerating,
    generateError,
    generatedSeedWord,
  };
}
