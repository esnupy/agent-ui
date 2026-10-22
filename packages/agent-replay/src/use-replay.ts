"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import type { ReplayEvent, ReplayState } from "./core/types";
import {
  createReplayStore,
  type ReplaySpeed,
  type ReplayStore,
  type ReplayStoreOptions,
} from "./replay-store";

export type UseReplayOptions = ReplayStoreOptions;

/**
 * Crea el store una vez y lo mantiene al día con `events`, `loop` y `onSeek`.
 *
 * @param events - Eventos del run.
 * @param options - Opciones del store.
 * @returns El store.
 */
export const useReplayStore = (
  events: readonly ReplayEvent[],
  options: UseReplayOptions = {},
): ReplayStore => {
  const live = options.live ?? false;
  const [store, setStore] = useState(() => createReplayStore(events, options));
  const { loop, onSeek, speed } = options;

  // Vivo cambia cómo arranca el store: si cambia, se crea otro.
  if (store.getStatus().live !== live) {
    setStore(createReplayStore(events, options));
  }

  useEffect(() => store.attach(), [store]);

  useEffect(() => {
    store.setEvents(events);
  }, [store, events]);

  useEffect(() => {
    store.setOptions({ loop, onSeek });
  }, [store, loop, onSeek]);

  useEffect(() => {
    if (speed !== undefined) store.setSpeed(speed);
  }, [store, speed]);

  return store;
};

export type UseReplayResult = {
  /** Tiempo del playhead, en ms. */
  t: number;
  /** Estado del agente en `t`. */
  state: ReplayState;
  duration: number;
  playing: boolean;
  speed: ReplaySpeed;
  play: () => void;
  pause: () => void;
  toggle: () => void;
  seek: (t: number) => void;
  setSpeed: (speed: ReplaySpeed) => void;
  /** El store completo, para suscripciones finas, rangos o vivo. */
  store: ReplayStore;
};

/**
 * Reproductor sin UI. Arma tu propia interfaz con el tiempo y el estado.
 *
 * Vuelve a renderizar en cada cuadro mientras reproduce. Si solo necesitas una
 * parte, usa `store` con `useStoreSelector`.
 *
 * @param events - Eventos del run.
 * @param options - Vivo, loop, autoplay, velocidad y `onSeek`.
 * @returns Tiempo, estado y controles.
 */
export const useReplay = (
  events: readonly ReplayEvent[],
  options: UseReplayOptions = {},
): UseReplayResult => {
  const store = useReplayStore(events, options);
  const t = useSyncExternalStore(store.subscribeTime, store.getTime, store.getTime);
  const state = useSyncExternalStore(store.subscribeState, store.getState, store.getState);
  const status = useSyncExternalStore(store.subscribeStatus, store.getStatus, store.getStatus);

  return {
    t,
    state,
    duration: status.duration,
    playing: status.playing,
    speed: status.speed,
    play: store.play,
    pause: store.pause,
    toggle: store.toggle,
    seek: store.seek,
    setSpeed: store.setSpeed,
    store,
  };
};
