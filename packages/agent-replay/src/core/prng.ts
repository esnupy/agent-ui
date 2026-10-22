/**
 * Generador pseudoaleatorio mulberry32. La misma semilla da la misma secuencia.
 *
 * @param seed - Semilla entera.
 * @returns Una función que regresa números en [0, 1).
 */
export const createRandom = (seed: number) => {
  let state = seed >>> 0;

  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
};

export type Random = ReturnType<typeof createRandom>;

/** Entero en [min, max]. */
export const randomInt = (random: Random, min: number, max: number) => {
  return min + Math.floor(random() * (max - min + 1));
};

/** Un elemento al azar. */
export const pick = <T>(random: Random, list: readonly T[]): T => {
  return list[Math.floor(random() * list.length)] as T;
};
