import { describe, expect, it } from "vitest";
import { createRandom } from "./prng";
import { createRandomRun } from "./random-run";
import { reduceState } from "./reduce";
import { createTimeline } from "./timeline";

describe("createTimeline", () => {
  it("cualquier t da el mismo estado que reproducir desde cero", () => {
    for (let seed = 1; seed <= 50; seed += 1) {
      const events = createRandomRun(seed, 300, 6000);
      const timeline = createTimeline(events, { snapshotEvery: 16 });
      const random = createRandom(seed * 7919);

      for (let probe = 0; probe < 40; probe += 1) {
        // Saltos al azar: adelante, atrás y entre bloques.
        const t = Math.round(random() * 6600) - 300;
        expect(timeline.stateAt(t)).toEqual(reduceState(events, t));
      }
    }
  });

  it("reproducir hacia adelante cuadro por cuadro coincide con la referencia", () => {
    const events = createRandomRun(3, 400, 4000);
    const timeline = createTimeline(events, { snapshotEvery: 32 });

    for (let t = 0; t <= 4200; t += 16.7) {
      expect(timeline.stateAt(t)).toEqual(reduceState(events, t));
    }
  });

  it("append incremental equivale a construir todo de nuevo", () => {
    const events = createRandomRun(11, 600, 6000).sort((a, b) => a.t - b.t);
    const live = createTimeline(events.slice(0, 100), { snapshotEvery: 32 });
    live.stateAt(2000);

    for (let start = 100; start < events.length; start += 50) {
      live.append(events.slice(start, start + 50));
    }

    const full = createTimeline(events, { snapshotEvery: 32 });
    expect(live.events).toEqual(full.events);
    expect(live.duration).toBe(full.duration);
    for (const t of [0, 500, 1999, 2000, 3500, 6100]) {
      expect(live.stateAt(t)).toEqual(full.stateAt(t));
    }
  });

  it("append con eventos viejos reconstruye y sigue siendo correcto", () => {
    const events = createRandomRun(5, 200, 2000);
    const timeline = createTimeline(events.slice(0, 150));
    timeline.append(events.slice(150));
    expect(timeline.stateAt(1500)).toEqual(reduceState(events, 1500));
  });

  it("con 10k eventos cada seek aplica como máximo snapshotEvery eventos", () => {
    const events = createRandomRun(42, 10_000, 600_000);
    const timeline = createTimeline(events, { snapshotEvery: 128 });
    const random = createRandom(1);

    expect(timeline.stats.snapshots).toBe(Math.floor(10_000 / 128) + 1);

    for (let probe = 0; probe < 500; probe += 1) {
      timeline.stateAt(random() * 600_000);
      expect(timeline.stats.lastApplied).toBeLessThanOrEqual(128);
    }
  });

  it("encuentra el evento anterior y el siguiente", () => {
    const timeline = createTimeline([
      { id: "a", t: 100, type: "thought", payload: { text: "a" } },
      { id: "b", t: 300, type: "thought", payload: { text: "b" } },
    ]);

    expect(timeline.prevEventTime(300)).toBe(100);
    expect(timeline.prevEventTime(100)).toBeNull();
    expect(timeline.nextEventTime(100)).toBe(300);
    expect(timeline.nextEventTime(300)).toBeNull();
    expect(timeline.indexAt(299)).toBe(1);
    expect(timeline.indexAt(300)).toBe(2);
  });

  it("la duración incluye lo que tarda en escribirse el último mensaje", () => {
    const timeline = createTimeline([
      {
        id: "a",
        t: 1000,
        type: "message_delta",
        payload: { messageId: "m", role: "assistant", text: "hola", durationMs: 500 },
      },
    ]);
    expect(timeline.duration).toBe(1500);
  });
});
