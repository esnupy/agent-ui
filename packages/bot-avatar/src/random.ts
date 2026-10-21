/**
 * Hash FNV-1a de 32 bits. Estable entre servidor y cliente.
 *
 * @param value - Texto a convertir.
 * @returns Un entero sin signo.
 */
export const hashString = (value: string): number => {
  let hash = 0x811c9dc5;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }

  return hash >>> 0;
};

/**
 * Generador pseudoaleatorio con semilla (mulberry32).
 *
 * @param seed - Semilla entera.
 * @returns Una función que devuelve números en [0, 1).
 */
export const createRandom = (seed: number): (() => number) => {
  let state = seed >>> 0;

  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let next = state;
    next = Math.imul(next ^ (next >>> 15), next | 1);
    next ^= next + Math.imul(next ^ (next >>> 7), next | 61);
    return ((next ^ (next >>> 14)) >>> 0) / 4294967296;
  };
};
