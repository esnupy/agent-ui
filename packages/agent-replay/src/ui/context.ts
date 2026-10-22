"use client";

import { createContext, type ReactNode, useContext } from "react";
import type { ReplayEvent, ReplayState } from "../core/types";
import type { ReplayStatus, ReplayStore } from "../replay-store";
import { useStoreSelector } from "../use-store-selector";

export type RenderEvent = (event: ReplayEvent) => ReactNode | undefined;

export type ReplayContextValue = {
  store: ReplayStore;
  reduced: boolean;
  renderEvent?: RenderEvent;
};

export const ReplayContext = createContext<ReplayContextValue | null>(null);

/**
 * Store y preferencias del reproductor más cercano.
 *
 * @returns El contexto.
 */
export const useReplayContext = (): ReplayContextValue => {
  const value = useContext(ReplayContext);
  if (!value) throw new Error("Usa este componente dentro de <AgentReplay>.");
  return value;
};

/**
 * Una parte del estado del agente. Pasa selectores estables (definidos fuera del componente).
 *
 * @param selector - Qué parte.
 * @returns El valor. Solo cambia cuando cambia esa parte.
 */
export const useReplayState = <T>(selector: (state: ReplayState) => T): T => {
  const { store } = useReplayContext();
  return useStoreSelector(store.subscribeState, store.getState, selector);
};

/**
 * Una parte del estado de reproducción: play, velocidad, rango, vivo.
 *
 * @param selector - Qué parte.
 * @returns El valor.
 */
export const useReplayStatus = <T>(selector: (status: ReplayStatus) => T): T => {
  const { store } = useReplayContext();
  return useStoreSelector(store.subscribeStatus, store.getStatus, selector);
};
