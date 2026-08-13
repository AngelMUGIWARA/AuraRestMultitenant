import { useState } from 'react';
import { IconLoader } from '@maison/ui';
import { useVoiceSeed } from '../../hooks/useVoiceSeed';

const VOICE_USERNAME_PATTERN = /^[a-zA-Z0-9_-]+$/;

export function VoiceSeedForm() {
  const { submit, isSaving, error, savedUsername } = useVoiceSeed();
  const [voiceUsername, setVoiceUsername] = useState('');
  const [seedWord, setSeedWord] = useState('');
  const [confirmSeedWord, setConfirmSeedWord] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  function resetForm() {
    setVoiceUsername('');
    setSeedWord('');
    setConfirmSeedWord('');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setValidationError(null);

    if (voiceUsername.trim().length < 3 || !VOICE_USERNAME_PATTERN.test(voiceUsername.trim())) {
      setValidationError('El nombre de usuario para voz debe tener al menos 3 caracteres y solo puede contener letras, números, guiones y guiones bajos.');
      return;
    }
    if (seedWord.length < 4) {
      setValidationError('La palabra clave debe tener al menos 4 caracteres.');
      return;
    }
    if (seedWord !== confirmSeedWord) {
      setValidationError('La confirmación no coincide con la palabra clave.');
      return;
    }

    const success = await submit({ voiceUsername: voiceUsername.trim(), seedWord });
    if (success) {
      resetForm();
    }
  }

  const displayError = validationError ?? error;

  return (
    <div className="flex flex-col gap-5">
      <header>
        <h2 className="text-base font-medium text-maison-cream">Identidad de voz (Alexa)</h2>
        <p className="mt-1 text-xs text-maison-cream-muted">
          Configura una palabra clave para identificarte ante la skill de Alexa sin decir tu contraseña en voz alta.
        </p>
      </header>

      <p className="rounded border border-maison-amber/30 bg-maison-amber-glow px-3 py-2 text-xs text-maison-amber">
        Evita usar números en tu palabra clave — pueden causar errores de reconocimiento por voz.
        Usa palabras simples, por ejemplo: <strong>manzana azul girasol</strong>.
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {displayError && (
          <p className="rounded border border-maison-ruby/30 bg-maison-ruby-bg px-3 py-2 text-xs text-maison-ruby">
            {displayError}
          </p>
        )}

        {savedUsername && !displayError && (
          <p className="rounded border border-maison-sage/30 bg-maison-sage-bg px-3 py-2 text-xs text-maison-sage">
            Tu palabra clave de voz quedó configurada. Dile a la skill: &quot;mi usuario es {savedUsername}&quot;.
          </p>
        )}

        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-maison-cream-muted">Nombre de usuario para voz</span>
          <input
            type="text"
            value={voiceUsername}
            onChange={(e) => setVoiceUsername(e.target.value)}
            className="input-base w-full"
            placeholder="Ej. ana"
            autoComplete="off"
            disabled={isSaving}
            required
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-maison-cream-muted">Palabra clave</span>
          <input
            type="password"
            value={seedWord}
            onChange={(e) => setSeedWord(e.target.value)}
            className="input-base w-full"
            placeholder="manzana azul girasol"
            autoComplete="new-password"
            disabled={isSaving}
            required
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-maison-cream-muted">Confirmar palabra clave</span>
          <input
            type="password"
            value={confirmSeedWord}
            onChange={(e) => setConfirmSeedWord(e.target.value)}
            className="input-base w-full"
            placeholder="Repite la palabra clave"
            autoComplete="new-password"
            disabled={isSaving}
            required
          />
        </label>

        <div>
          <button type="submit" className="btn-primary" disabled={isSaving}>
            {isSaving && <IconLoader className="h-3.5 w-3.5 animate-spin" />}
            Guardar
          </button>
        </div>
      </form>
    </div>
  );
}
