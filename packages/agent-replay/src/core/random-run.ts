import { createRandom, pick, randomInt } from "./prng";
import type { PlanStatus, ReplayEvent } from "./types";

const STATUSES: readonly PlanStatus[] = ["pending", "in_progress", "done", "error", "skipped"];
const PATHS = ["src/a.ts", "src/b.ts", "src/c.ts"] as const;

/**
 * Eventos al azar de todos los tipos, para pruebas de propiedades y el benchmark.
 *
 * No intenta ser coherente: hay resultados sin llamada, tramos fuera de rango y
 * eventos en el mismo milisegundo. El reducer tiene que aguantarlo todo.
 *
 * @param seed - Semilla.
 * @param count - Cuántos eventos.
 * @param durationMs - Duración aproximada.
 * @returns Eventos en desorden.
 */
export const createRandomRun = (seed: number, count: number, durationMs = count * 20) => {
  const random = createRandom(seed);
  const events: ReplayEvent[] = [];
  const openCalls: string[] = [];

  for (let index = 0; index < count; index += 1) {
    // Tiempos enteros y con repeticiones a propósito.
    const t = randomInt(random, 0, durationMs);
    const id = `r${index}`;
    const roll = random();

    if (roll < 0.3) {
      events.push({
        id,
        t,
        type: "message_delta",
        payload: {
          messageId: `m${randomInt(random, 0, 4)}`,
          role: pick(random, ["user", "assistant"] as const),
          text: `palabra${index} `,
          durationMs: randomInt(random, 0, 400),
        },
      });
    } else if (roll < 0.4) {
      events.push({ id, t, type: "thought", payload: { text: `idea ${index}` } });
    } else if (roll < 0.5) {
      events.push({
        id,
        t,
        type: "plan_update",
        payload: {
          stepId: `p${randomInt(random, 0, 7)}`,
          title: random() < 0.5 ? `Paso ${index}` : undefined,
          status: pick(random, STATUSES),
        },
      });
    } else if (roll < 0.62) {
      const callId = `c${index}`;
      openCalls.push(callId);
      events.push({
        id,
        t,
        type: "tool_call",
        payload: { callId, name: "grep", input: `q${index}` },
      });
    } else if (roll < 0.72) {
      const callId =
        openCalls.length > 0 && random() < 0.85
          ? (openCalls.splice(randomInt(random, 0, openCalls.length - 1), 1)[0] as string)
          : `huerfano${index}`;
      events.push({
        id,
        t,
        type: "tool_result",
        payload: { callId, ok: random() < 0.8, output: `salida ${index}` },
      });
    } else if (roll < 0.86) {
      const lines = randomInt(random, 0, 3);
      events.push({
        id,
        t,
        type: "file_diff",
        payload: {
          path: pick(random, PATHS),
          before: Array.from({ length: 20 }, (_, line) => `línea ${line}`),
          hunks: Array.from({ length: randomInt(random, 1, 2) }, () => ({
            start: randomInt(random, -1, 30),
            remove: randomInt(random, 0, 3),
            add: Array.from({ length: lines }, (_, line) => `nueva ${index}.${line}`),
          })),
        },
      });
    } else if (roll < 0.94) {
      events.push({
        id,
        t,
        type: "approval",
        payload: {
          id: `a${randomInt(random, 0, 5)}`,
          title: `Permiso ${index}`,
          status: pick(random, ["requested", "approved", "rejected"] as const),
        },
      });
    } else {
      events.push({ id, t, type: "error", payload: { message: `falla ${index}` } });
    }
  }

  return events;
};
