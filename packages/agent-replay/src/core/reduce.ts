import { applyEvent, EMPTY_STATE, materialize } from "./apply";
import type { ReplayEvent, ReplayState } from "./types";

/**
 * Ordena por tiempo. El orden es estable: dos eventos en el mismo ms
 * conservan el orden en que llegaron.
 *
 * @param events - Eventos en cualquier orden.
 * @returns Una copia ordenada.
 */
export const sortEvents = (events: readonly ReplayEvent[]): ReplayEvent[] => {
  return events.slice().sort((a, b) => a.t - b.t);
};

/**
 * Cuándo termina de verse un evento. Un fragmento de mensaje dura lo que tarda en escribirse.
 *
 * @param event - El evento.
 * @returns El instante final, en ms.
 */
export const eventEnd = (event: ReplayEvent): number => {
  if (event.type === "message_delta") return event.t + Math.max(0, event.payload.durationMs ?? 0);
  return event.t;
};

/**
 * Estado del agente en `t`, reproduciendo desde cero.
 *
 * Es la referencia: O(n) en cada llamada. Para hacer scrub usa `createTimeline`.
 *
 * @param events - Eventos del run.
 * @param t - Instante, en ms desde el inicio.
 * @returns El estado derivado.
 */
export const reduceState = (events: readonly ReplayEvent[], t: number): ReplayState => {
  let state = EMPTY_STATE;

  for (const event of sortEvents(events)) {
    if (event.t > t) break;
    state = applyEvent(state, event);
  }

  return materialize(state, t);
};
