import type { ReplayEvent, ReplayEventType } from "../core/types";

export type Viewport = { start: number; end: number };

export type MarkGroup = {
  /** Índice del primer evento. Sirve de key estable. */
  first: number;
  last: number;
  count: number;
  /** Centro del grupo, en px. */
  x: number;
  /** Tiempo del primer evento. */
  t: number;
  /** El tipo más importante del grupo. Define el icono. */
  type: ReplayEventType;
  types: readonly ReplayEventType[];
};

/** Cuál tipo representa a un grupo mezclado. */
const PRIORITY: Record<ReplayEventType, number> = {
  error: 8,
  approval: 7,
  file_diff: 6,
  tool_call: 5,
  tool_result: 4,
  plan_update: 3,
  thought: 2,
  message_delta: 1,
};

/**
 * Junta las marcas que quedarían encimadas.
 *
 * Solo mira los eventos visibles: busca el rango en O(log n) y recorre lo que cabe.
 * Un grupo se cierra cuando la siguiente marca queda a `minGap` px o más de la
 * primera del grupo, así una fila densa no se encadena en un solo grupo eterno.
 *
 * @param events - Eventos ordenados por tiempo.
 * @param view - Ventana visible, en ms.
 * @param width - Ancho de la pista, en px.
 * @param minGap - Separación mínima entre marcas, en px.
 * @returns Los grupos, de izquierda a derecha.
 */
export const clusterMarks = (
  events: readonly ReplayEvent[],
  view: Viewport,
  width: number,
  minGap = 12,
): MarkGroup[] => {
  const span = view.end - view.start;
  if (span <= 0 || width <= 0 || events.length === 0) return [];

  const scale = width / span;
  let low = 0;
  let high = events.length;
  while (low < high) {
    const middle = (low + high) >>> 1;
    if ((events[middle] as ReplayEvent).t < view.start) low = middle + 1;
    else high = middle;
  }

  const groups: MarkGroup[] = [];
  let current: (MarkGroup & { firstX: number; lastX: number; seen: Set<ReplayEventType> }) | null =
    null;

  const close = () => {
    if (!current) return;
    const { firstX, lastX, seen, ...group } = current;
    groups.push({ ...group, x: (firstX + lastX) / 2, types: [...seen] });
    current = null;
  };

  for (let index = low; index < events.length; index += 1) {
    const event = events[index] as ReplayEvent;
    if (event.t > view.end) break;

    const x = (event.t - view.start) * scale;

    if (current && x - current.firstX < minGap) {
      current.last = index;
      current.count += 1;
      current.lastX = x;
      current.seen.add(event.type);
      if (PRIORITY[event.type] > PRIORITY[current.type]) current.type = event.type;
      continue;
    }

    close();
    current = {
      first: index,
      last: index,
      count: 1,
      x,
      t: event.t,
      type: event.type,
      types: [],
      firstX: x,
      lastX: x,
      seen: new Set([event.type]),
    };
  }

  close();
  return groups;
};

/**
 * Cuenta eventos por cubeta para el minimapa.
 *
 * @param times - Tiempos ordenados.
 * @param duration - Duración total.
 * @param buckets - Cuántas cubetas.
 * @returns Conteo por cubeta.
 */
export const densityBuckets = (times: readonly number[], duration: number, buckets: number) => {
  const counts = new Array<number>(buckets).fill(0);
  if (duration <= 0) return counts;
  for (const time of times) {
    const index = Math.min(buckets - 1, Math.max(0, Math.floor((time / duration) * buckets)));
    counts[index] = (counts[index] as number) + 1;
  }
  return counts;
};
