import { describe, expect, it, vi } from "vitest";
import type { ReplayEvent } from "./core/types";
import { createReplayStore, type ReplayScheduler } from "./replay-store";

/** Reloj manual: cada `frame(ms)` avanza el tiempo y corre el cuadro pendiente. */
const createClock = () => {
  let time = 1000;
  let pending: ((now: number) => void) | null = null;
  const scheduler: ReplayScheduler = {
    now: () => time,
    request: (callback) => {
      pending = callback;
      return 1;
    },
    cancel: () => {
      pending = null;
    },
  };
  const frame = (ms: number) => {
    time += ms;
    const callback = pending;
    pending = null;
    callback?.(time);
  };
  const run = (ms: number, step = 16) => {
    for (let elapsed = 0; elapsed < ms; elapsed += step) frame(step);
  };
  return { scheduler, frame, run, hasFrame: () => pending !== null };
};

const thought = (id: string, t: number): ReplayEvent => ({
  id,
  t,
  type: "thought",
  payload: { text: id },
});

const EVENTS = [thought("a", 0), thought("b", 500), thought("c", 1000), thought("d", 2000)];

describe("createReplayStore", () => {
  it("reproduce, pausa y respeta la velocidad", () => {
    const clock = createClock();
    const store = createReplayStore(EVENTS, { scheduler: clock.scheduler });
    store.attach();

    expect(clock.hasFrame()).toBe(false);
    store.play();
    clock.run(400);
    expect(store.getTime()).toBeCloseTo(400, -1);

    store.setSpeed(2);
    clock.run(200, 20);
    expect(store.getTime()).toBeCloseTo(800, -1);
    expect(store.getState().thoughts).toHaveLength(2);

    store.pause();
    expect(clock.hasFrame()).toBe(false);
  });

  it("se detiene al final y vuelve a empezar con play", () => {
    const clock = createClock();
    const store = createReplayStore(EVENTS, { scheduler: clock.scheduler, autoPlay: true });
    store.attach();
    clock.run(2600);

    expect(store.getTime()).toBe(2000);
    expect(store.getStatus().playing).toBe(false);

    store.play();
    expect(store.getTime()).toBe(0);
  });

  it("con loop vuelve al inicio sin pararse", () => {
    const clock = createClock();
    const store = createReplayStore(EVENTS, {
      scheduler: clock.scheduler,
      autoPlay: true,
      loop: true,
    });
    store.attach();
    clock.run(2100);
    expect(store.getStatus().playing).toBe(true);
    expect(store.getTime()).toBeLessThan(200);
  });

  it("repite el rango A–B", () => {
    const clock = createClock();
    const store = createReplayStore(EVENTS, { scheduler: clock.scheduler });
    store.attach();
    store.setRange({ a: 1200, b: 600 });

    expect(store.getStatus().range).toEqual({ a: 600, b: 1200 });
    expect(store.getTime()).toBe(600);

    store.play();
    clock.run(800);
    expect(store.getTime()).toBeGreaterThanOrEqual(600);
    expect(store.getTime()).toBeLessThan(1200);
  });

  it("emite el estado solo cuando cambia", () => {
    const store = createReplayStore(EVENTS);
    const onState = vi.fn();
    const onTime = vi.fn();
    store.subscribeState(onState);
    store.subscribeTime(onTime);

    store.seek(100);
    store.seek(200);
    expect(onTime).toHaveBeenCalledTimes(2);
    expect(onState).toHaveBeenCalledTimes(0);

    store.seek(600);
    expect(onState).toHaveBeenCalledTimes(1);
  });

  it("salta entre eventos y avisa onSeek", () => {
    const onSeek = vi.fn();
    const store = createReplayStore(EVENTS, { onSeek });

    store.stepEvent(1);
    expect(store.getTime()).toBe(500);
    store.stepEvent(1);
    store.stepEvent(-1);
    expect(store.getTime()).toBe(500);
    expect(onSeek).toHaveBeenLastCalledWith(500);
  });

  it("J, K y L cambian dirección y aceleran", () => {
    const clock = createClock();
    const store = createReplayStore(EVENTS, { scheduler: clock.scheduler });
    store.attach();
    store.seek(1500);

    store.shuttle(-1);
    expect(store.getStatus()).toMatchObject({ playing: true, direction: -1, speed: 1 });
    clock.run(200);
    expect(store.getTime()).toBeLessThan(1500);

    store.shuttle(-1);
    expect(store.getStatus().speed).toBe(2);

    store.shuttle(0);
    expect(store.getStatus().playing).toBe(false);

    store.shuttle(1);
    expect(store.getStatus()).toMatchObject({ playing: true, direction: 1, speed: 1 });
  });

  it("en vivo sigue los eventos nuevos y deja de seguir al regresar", () => {
    const clock = createClock();
    const first = EVENTS.slice(0, 2);
    const store = createReplayStore(first, { scheduler: clock.scheduler, live: true });
    store.attach();

    expect(store.getStatus()).toMatchObject({ following: true, playing: true });
    expect(store.getTime()).toBe(500);

    store.setEvents([...first, thought("c", 1000)]);
    expect(store.getStatus().duration).toBe(1000);
    clock.run(600);
    expect(store.getTime()).toBe(1000);
    expect(store.getStatus().following).toBe(true);

    store.seek(200);
    expect(store.getStatus().following).toBe(false);

    store.setEvents([...first, thought("c", 1000), thought("d", 2000)]);
    expect(store.getTime()).toBeLessThan(1000);

    store.goLive();
    expect(store.getTime()).toBe(2000);
    expect(store.getStatus().following).toBe(true);
  });

  it("si cambia el arreglo por completo, reconstruye", () => {
    const store = createReplayStore(EVENTS);
    store.seek(2000);
    store.setEvents([thought("x", 300)]);
    expect(store.getStatus().duration).toBe(300);
    expect(store.getTime()).toBe(300);
    expect(store.getState().thoughts.map((item) => item.text)).toEqual(["x"]);
  });
});
