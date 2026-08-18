import { useState } from 'react';
import { IconLoader } from '@maison/ui';
import { useVoiceSeed } from '../../hooks/useVoiceSeed';

const VOICE_USERNAME_PATTERN = /^[a-zA-Z0-9_-]+$/;

export function VoiceSeedForm() {
  const {
    submit,
    isSaving,
    error,
    savedUsername,
    generate,
    isGenerating,
    generateError,
    generatedSeedWord,
  } = useVoiceSeed();
  const [voiceUsername, setVoiceUsername] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setValidationError(null);

    if (voiceUsername.trim().length < 3 || !VOICE_USERNAME_PATTERN.test(voiceUsername.trim())) {
      setValidationError('El nombre de usuario para voz debe tener al menos 3 caracteres y solo puede contener letras, números, guiones y guiones bajos.');
      return;
    }

    const success = await submit({ voiceUsername: voiceUsername.trim() });
    if (success) {
      setVoiceUsername('');
    }
  }

  const displayError = validationError ?? error;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-5">
        <header>
          <h2 className="text-base font-medium text-maison-cream">Identidad de voz (Alexa)</h2>
          <p className="mt-1 text-xs text-maison-cream-muted">
            Configura el nombre de usuario con el que te identificas ante la skill de Alexa.
          </p>
        </header>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {displayError && (
            <p className="rounded border border-maison-ruby/30 bg-maison-ruby-bg px-3 py-2 text-xs text-maison-ruby">
              {displayError}
            </p>
          )}

          {savedUsername && !displayError && (
            <p className="rounded border border-maison-sage/30 bg-maison-sage-bg px-3 py-2 text-xs text-maison-sage">
              Tu nombre de usuario de voz quedó configurado. Dile a la skill: &quot;mi usuario es {savedUsername}&quot;.
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

          <div>
            <button type="submit" className="btn-primary" disabled={isSaving}>
              {isSaving && <IconLoader className="h-3.5 w-3.5 animate-spin" />}
              Guardar
            </button>
          </div>
        </form>
      </div>

      <div className="flex flex-col gap-3 border-t border-maison-cream/10 pt-5">
        <header>
          <h3 className="text-sm font-medium text-maison-cream">Palabra clave de voz</h3>
          <p className="mt-1 text-xs text-maison-cream-muted">
            La skill te pide esta palabra junto con tu nombre de usuario, para no decir tu contraseña en voz alta. La genera el sistema, no la eliges tú.
          </p>
        </header>

        <p className="rounded border border-maison-amber/30 bg-maison-amber-glow px-3 py-2 text-xs text-maison-amber">
          Generar una nueva palabra clave invalida cualquier palabra anterior de inmediato.
        </p>

        {generateError && (
          <p className="rounded border border-maison-ruby/30 bg-maison-ruby-bg px-3 py-2 text-xs text-maison-ruby">
            {generateError}
          </p>
        )}

        {generatedSeedWord && (
          <div className="rounded border border-maison-ruby/30 bg-maison-ruby-bg px-3 py-2 text-xs text-maison-ruby">
            <p className="font-medium">Anota esta palabra clave ahora — no volverá a mostrarse:</p>
            <p className="mt-1 select-all font-mono text-sm text-maison-cream">{generatedSeedWord}</p>
            <p className="mt-1 text-maison-cream-muted">
              Es de un solo uso: se invalida automáticamente en cuanto se use una vez para iniciar sesión por voz.
            </p>
          </div>
        )}

        <div>
          <button type="button" className="btn-ghost" onClick={generate} disabled={isGenerating}>
            {isGenerating && <IconLoader className="h-3.5 w-3.5 animate-spin" />}
            Generar nueva palabra clave
          </button>
        </div>
      </div>
    </div>
  );
}
