import { randomInt } from 'crypto';

export const VOICE_SEED_WORDS = [
  'manzana', 'azul', 'girasol', 'montaña', 'rio', 'bosque', 'estrella', 'luna',
  'nube', 'fuego', 'piedra', 'arena', 'oceano', 'jardin', 'colibri', 'delfin',
  'tigre', 'aguila', 'violeta', 'coral', 'ambar', 'jade', 'perla', 'brisa',
  'trueno', 'cascada', 'sendero', 'faro', 'vela', 'ancla', 'brujula', 'pino',
  'roble', 'cedro', 'laurel', 'jazmin', 'lirio', 'dalia', 'magnolia', 'sauce',
];

export function pickRandomSeedWords(count = 3): string[] {
  const pool = [...VOICE_SEED_WORDS];
  const picked: string[] = [];

  for (let i = 0; i < count && pool.length > 0; i++) {
    const index = randomInt(0, pool.length);
    picked.push(pool[index]);
    pool.splice(index, 1);
  }

  return picked;
}
