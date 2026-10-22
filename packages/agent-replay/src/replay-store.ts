import { createTimeline, type Timeline } from "./core/timeline";
import type { ReplayEvent, ReplayState } from "./core/types";

export const REPLAY_SPEEDS = [0.5, 1, 2, 4] as const;

export type ReplaySpeed = (typeof REPLAY_SPEEDS)[number];

export type ReplayRange = { a: number; b: number };

/** Lo que cambia poco: no se emite en cada cuadro. */
export type ReplayStatus = {
  playing: boolean;
  speed: ReplaySpeed;
  /** 1 hacia adelante, -1 en reversa (J). */
  direction: 1 | -1;
  range: ReplayRange | null;
  live: boolean;
  /** En vivo y pegado al final. */
  following: boolean;
  duration: number;
  /** Cuántos eventos hay. Cambia cuando llegan nuevos. */
  count: number;
};

export type ReplayScheduler = {
  now: () => number;
  request: (callback: (now: number) => void) => number;
  cancel: (id: number) => void;
};

export type ReplayStoreOptions = {
  live?: boolean;
  /** Al llegar al final vuelve a empezar. No aplica en vivo. */
  loop?: boolean;
  autoPlay?: boolean;
  speed?: ReplaySpeed;
  snapshotEvery?: number;
  /** Se llama en cada seek del usuario, no durante la reproducción. */
  onSeek?: (t: number) => void;
  /** Reloj y cuadros. Las pruebas pasan uno falso. */
  scheduler?: ReplayScheduler;
};

/** Distancia al final que todavía cuenta como "en vivo". */
const LIVE_EPSILON = 250;

/** Un cuadro largo (pestaña en segundo plano) no debe saltar medio run. */
const MAX_FRAME_MS = 100;

const defaultScheduler: ReplayScheduler = {
  now: () => globalThis.performance?.now() ?? Date.now(),
  request: (callback) => {
    if (typeof globalThis.requestAnimationFrame === "function") {
      return globalThis.requestAnimationFrame(callback);
    }
    return globalThis.setTimeout(() => callback(defaultScheduler.now()), 16) as unknown as number;
  },
  cancel: (id) => {
    if (typeof globalThis.cancelAnimationFrame === "function") {
      globalThis.cancelAnimationFrame(id);
    }
    globalThis.clearTimeout(id);
  },
};

type Listener = () => void;

const createChannel = () => {
  const listeners = new Set<Listener>();
  return {
    subscribe: (listener: Listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    emit: () => {
      for (const listener of listeners) listener();
    },
  };
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/**
 * Store externo del reproductor.
 *
 * Tiene tres canales: `time` se emite en cada cuadro, `state` solo cuando cambia
 * el estado derivado y `status` cuando cambia play, velocidad, rango o vivo.
 * Así cada parte de la UI se suscribe solo a lo que pinta.
 *
 * @param events - Eventos del run.
 * @param options - Vivo, loop, velocidad y reloj.
 * @returns El store.
 */
export const createReplayStore = (
  events: readonly ReplayEvent[],
  options: ReplayStoreOptions = {},
) => {
  const scheduler = options.scheduler ?? defaultScheduler;
  const snapshotEvery = options.snapshotEvery;
  let onSeek = options.onSeek;
  let loop = options.loop ?? false;
  let source = events;
  let timeline: Timeline = createTimeline(events, { snapshotEvery });
  const live = options.live ?? false;

  let t = live ? timeline.duration : 0;
  let state: ReplayState = timeline.stateAt(t);
  let status: ReplayStatus = {
    playing: live || (options.autoPlay ?? false),
    speed: options.speed ?? 1,
    direction: 1,
    range: null,
    live,
    following: live,
    duration: timeline.duration,
    count: timeline.events.length,
  };

  const time = createChannel();
  const derived = createChannel();
  const statusChannel = createChannel();

  let attached = false;
  let frame: number | null = null;
  let last = 0;

  const setStatus = (patch: Partial<ReplayStatus>) => {
    const next = { ...status, ...patch };
    const changed = (Object.keys(patch) as (keyof ReplayStatus)[]).some(
      (key) => next[key] !== status[key],
    );
    if (!changed) return;
    status = next;
    statusChannel.emit();
    schedule();
  };

  const commit = (next: number) => {
    t = next;
    const nextState = timeline.stateAt(t);
    time.emit();
    if (nextState !== state) {
      state = nextState;
      derived.emit();
    }
  };

  const advance = (dt: number) => {
    const { duration, range, direction, speed } = status;
    let next = t + dt * speed * direction;

    if (range && direction > 0 && t <= range.b && next >= range.b) {
      next = range.a;
    } else if (range && direction < 0 && t >= range.a && next <= range.a) {
      next = range.b;
    } else if (next >= duration && direction > 0) {
      if (live) {
        next = duration;
        if (!status.following) setStatus({ following: true });
      } else if (loop) {
        next = 0;
      } else {
        next = duration;
        setStatus({ playing: false });
      }
    } else if (next <= 0 && direction < 0) {
      next = 0;
      setStatus({ playing: false, direction: 1 });
    }

    if (next !== t) commit(next);
  };

  const tick = (now: number) => {
    frame = null;
    const dt = Math.min(MAX_FRAME_MS, Math.max(0, now - last));
    last = now;
    if (status.playing) advance(dt);
    schedule();
  };

  function schedule() {
    if (!attached || !status.playing) {
      if (frame !== null) {
        scheduler.cancel(frame);
        frame = null;
      }
      return;
    }
    if (frame !== null) return;
    if (last === 0) last = scheduler.now();
    frame = scheduler.request(tick);
  }

  const seek = (target: number) => {
    const next = clamp(target, 0, status.duration);
    if (live) setStatus({ following: next >= status.duration - LIVE_EPSILON });
    commit(next);
    onSeek?.(next);
  };

  const play = () => {
    if (!live && status.direction > 0 && t >= status.duration) {
      commit(status.range?.a ?? 0);
    }
    last = scheduler.now();
    setStatus({ playing: true });
  };

  const pause = () => {
    setStatus({ playing: false, following: false });
  };

  const toggle = () => {
    if (status.playing) pause();
    else play();
  };

  const setSpeed = (speed: ReplaySpeed) => {
    setStatus({ speed });
  };

  const shiftSpeed = (step: -1 | 1) => {
    const index = REPLAY_SPEEDS.indexOf(status.speed);
    const next = REPLAY_SPEEDS[clamp(index + step, 0, REPLAY_SPEEDS.length - 1)] as ReplaySpeed;
    setSpeed(next);
  };

  /**
   * J, K y L. Repetir la misma dirección acelera.
   */
  const shuttle = (direction: -1 | 0 | 1) => {
    if (direction === 0) {
      pause();
      return;
    }

    if (status.playing && status.direction === direction) {
      shiftSpeed(1);
      return;
    }

    setStatus({
      direction,
      speed: 1,
      following: direction < 0 ? false : status.following,
    });
    play();
  };

  const stepEvent = (direction: -1 | 1) => {
    const target =
      direction < 0
        ? (timeline.prevEventTime(t) ?? 0)
        : (timeline.nextEventTime(t) ?? status.duration);
    seek(target);
  };

  const setRange = (range: ReplayRange | null) => {
    if (!range) {
      setStatus({ range: null });
      return;
    }
    const a = clamp(Math.min(range.a, range.b), 0, status.duration);
    const b = clamp(Math.max(range.a, range.b), 0, status.duration);
    setStatus({ range: { a, b }, following: false });
    seek(a);
  };

  const goLive = () => {
    if (!live) return;
    setStatus({ direction: 1, range: null });
    seek(status.duration);
    play();
  };

  const setEvents = (next: readonly ReplayEvent[]) => {
    if (next === source) return;

    const isAppend =
      next.length >= source.length &&
      (source.length === 0 ||
        (next[0] === source[0] && next[source.length - 1] === source[source.length - 1]));

    if (isAppend) {
      timeline.append(next.slice(source.length));
    } else {
      timeline = createTimeline(next, { snapshotEvery });
    }
    source = next;

    const duration = timeline.duration;
    setStatus({ duration, count: timeline.events.length });
    commit(status.following ? t : clamp(t, 0, duration));
  };

  const setOptions = (next: Pick<ReplayStoreOptions, "loop" | "onSeek">) => {
    loop = next.loop ?? false;
    onSeek = next.onSeek;
  };

  /**
   * Arranca el loop de cuadros. Se llama en un efecto: en el servidor no corre nada.
   *
   * @returns La función para soltarlo.
   */
  const attach = () => {
    attached = true;
    last = scheduler.now();
    schedule();
    return () => {
      attached = false;
      schedule();
    };
  };

  return {
    subscribeTime: time.subscribe,
    subscribeState: derived.subscribe,
    subscribeStatus: statusChannel.subscribe,
    getTime: () => t,
    getState: () => state,
    getStatus: () => status,
    getTimeline: () => timeline,
    attach,
    seek,
    play,
    pause,
    toggle,
    setSpeed,
    faster: () => shiftSpeed(1),
    slower: () => shiftSpeed(-1),
    shuttle,
    stepEvent,
    setRange,
    goLive,
    setEvents,
    setOptions,
  };
};

export type ReplayStore = ReturnType<typeof createReplayStore>;
