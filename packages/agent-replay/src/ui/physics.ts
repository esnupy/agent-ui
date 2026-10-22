/** Constante de tiempo de la fricción, en ms. Más alto, más se desliza. */
export const INERTIA_TAU = 325;

/** Por debajo de esta velocidad (px/ms) la inercia se detiene. */
export const REST_VELOCITY = 0.04;

/** Frecuencia del resorte del snap, en 1/ms. Críticamente amortiguado. */
export const SPRING_OMEGA = 0.028;

export type PointerSample = { x: number; time: number };

/**
 * Velocidad del puntero con las muestras recientes.
 *
 * @param samples - Posiciones con su tiempo, en orden.
 * @param windowMs - Cuánto mirar hacia atrás.
 * @returns px/ms. Cero si no hay datos suficientes.
 */
export const estimateVelocity = (samples: readonly PointerSample[], windowMs = 80): number => {
  const last = samples[samples.length - 1];
  if (!last) return 0;

  let first = last;
  for (let index = samples.length - 1; index >= 0; index -= 1) {
    const sample = samples[index] as PointerSample;
    if (last.time - sample.time > windowMs) break;
    first = sample;
  }

  const elapsed = last.time - first.time;
  return elapsed > 0 ? (last.x - first.x) / elapsed : 0;
};

/**
 * Un paso de inercia con fricción exponencial. Es la solución exacta, no
 * depende de cuántos cuadros haya.
 *
 * @returns Posición y velocidad después de `dt`.
 */
export const stepInertia = (x: number, v: number, dt: number, tau = INERTIA_TAU) => {
  const decay = Math.exp(-dt / tau);
  return { x: x + v * tau * (1 - decay), v: v * decay };
};

/**
 * Un paso de un resorte críticamente amortiguado hacia `target`. Llega sin rebotar.
 *
 * @returns Posición y velocidad después de `dt`.
 */
export const stepSpring = (
  x: number,
  v: number,
  target: number,
  dt: number,
  omega = SPRING_OMEGA,
) => {
  const offset = x - target;
  const decay = Math.exp(-omega * dt);
  const slope = v + omega * offset;
  return {
    x: target + (offset + slope * dt) * decay,
    v: (v - omega * slope * dt) * decay,
  };
};

/**
 * El tiempo de evento más cercano a `t`, si está dentro del radio.
 *
 * @param times - Tiempos ordenados.
 * @param t - Dónde soltó el usuario.
 * @param radius - Distancia máxima, en ms.
 * @returns El tiempo del evento o `null`.
 */
export const findSnapTarget = (times: readonly number[], t: number, radius: number) => {
  let low = 0;
  let high = times.length;
  while (low < high) {
    const middle = (low + high) >>> 1;
    if ((times[middle] as number) < t) low = middle + 1;
    else high = middle;
  }

  let best: number | null = null;
  for (const candidate of [times[low - 1], times[low]]) {
    if (candidate === undefined || Math.abs(candidate - t) > radius) continue;
    if (best === null || Math.abs(candidate - t) < Math.abs(best - t)) best = candidate;
  }
  return best;
};
