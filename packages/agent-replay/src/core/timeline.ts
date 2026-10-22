import { applyEvent, EMPTY_STATE, materialize } from "./apply";
import { eventEnd, sortEvents } from "./reduce";
import type { ReplayEvent, ReplayState } from "./types";

export type TimelineOptions = {
  /** Cada cuántos eventos se guarda un snapshot. */
  snapshotEvery?: number;
};

export type TimelineStats = {
  /** Eventos aplicados en la última consulta. Nunca pasa de `snapshotEvery`. */
  lastApplied: number;
  /** Snapshots guardados, incluido el estado vacío. */
  snapshots: number;
};

export type Timeline = {
  /** Eventos ordenados por tiempo. */
  readonly events: readonly ReplayEvent[];
  /** Tiempo de cada evento, en el mismo orden. */
  readonly times: readonly number[];
  /** Final del run, contando lo que tarda en escribirse el último mensaje. */
  readonly duration: number;
  readonly snapshotEvery: number;
  readonly stats: Readonly<TimelineStats>;
  /** Cuántos eventos ocurrieron hasta `t`, inclusive. */
  indexAt: (t: number) => number;
  /** Estado en `t`. O(log n + k), con k como máximo `snapshotEvery`. */
  stateAt: (t: number) => ReplayState;
  /** Tiempo del evento anterior a `t`, o `null`. */
  prevEventTime: (t: number) => number | null;
  /** Tiempo del evento siguiente a `t`, o `null`. */
  nextEventTime: (t: number) => number | null;
  /** Agrega eventos. Si todos van después del último, extiende sin reconstruir. */
  append: (events: readonly ReplayEvent[]) => void;
};

/** Margen para que ← y → no se queden en el evento donde ya está el playhead. */
const EPSILON = 0.5;

/**
 * Primer índice cuyo tiempo cumple `test`. Los tiempos están ordenados.
 */
const search = (times: readonly number[], test: (time: number) => boolean): number => {
  let low = 0;
  let high = times.length;

  while (low < high) {
    const middle = (low + high) >>> 1;
    if (test(times[middle] as number)) {
      high = middle;
    } else {
      low = middle + 1;
    }
  }

  return low;
};

/**
 * Prepara un run para hacer scrub rápido.
 *
 * Guarda un snapshot cada `snapshotEvery` eventos. Como los estados comparten
 * estructura, un snapshot es solo una referencia. Consultar `t` busca el índice
 * en O(log n) y reproduce como máximo `snapshotEvery` eventos desde el snapshot.
 * Si la consulta anterior quedó en el mismo bloque y más atrás, sigue desde ahí.
 *
 * @param input - Eventos en cualquier orden.
 * @param options - Frecuencia de snapshots.
 * @returns La línea de tiempo.
 */
export const createTimeline = (
  input: readonly ReplayEvent[],
  { snapshotEvery = 128 }: TimelineOptions = {},
): Timeline => {
  const every = Math.max(1, Math.floor(snapshotEvery));
  let events: ReplayEvent[] = [];
  let times: number[] = [];
  let snapshots: ReplayState[] = [];
  let tail: ReplayState = EMPTY_STATE;
  let duration = 0;
  let cache: { index: number; state: ReplayState } | null = null;
  const stats: TimelineStats = { lastApplied: 0, snapshots: 0 };

  const push = (event: ReplayEvent) => {
    events.push(event);
    times.push(event.t);
    tail = applyEvent(tail, event);
    duration = Math.max(duration, eventEnd(event));
    if (events.length % every === 0) snapshots.push(tail);
  };

  const rebuild = (all: readonly ReplayEvent[]) => {
    events = [];
    times = [];
    snapshots = [EMPTY_STATE];
    tail = EMPTY_STATE;
    duration = 0;
    cache = null;
    for (const event of sortEvents(all)) push(event);
    stats.snapshots = snapshots.length;
  };

  rebuild(input);

  const indexAt = (t: number) => search(times, (time) => time > t);

  const stateAt = (t: number): ReplayState => {
    const index = indexAt(t);
    const block = Math.floor(index / every);
    let from = block * every;
    let state = snapshots[block] as ReplayState;

    if (cache && cache.index <= index && cache.index >= from) {
      from = cache.index;
      state = cache.state;
    }

    for (let position = from; position < index; position += 1) {
      state = applyEvent(state, events[position] as ReplayEvent);
    }

    stats.lastApplied = index - from;
    cache = { index, state };
    return materialize(state, t);
  };

  const prevEventTime = (t: number) => {
    const position = search(times, (time) => time >= t - EPSILON);
    return position > 0 ? (times[position - 1] as number) : null;
  };

  const nextEventTime = (t: number) => {
    const position = search(times, (time) => time > t + EPSILON);
    return position < times.length ? (times[position] as number) : null;
  };

  const append = (incoming: readonly ReplayEvent[]) => {
    if (incoming.length === 0) return;

    const sorted = sortEvents(incoming);
    const last = times[times.length - 1];

    if (last !== undefined && (sorted[0] as ReplayEvent).t < last) {
      rebuild([...events, ...sorted]);
      return;
    }

    for (const event of sorted) push(event);
    stats.snapshots = snapshots.length;
  };

  return {
    get events() {
      return events;
    },
    get times() {
      return times;
    },
    get duration() {
      return duration;
    },
    snapshotEvery: every,
    stats,
    indexAt,
    stateAt,
    prevEventTime,
    nextEventTime,
    append,
  };
};
