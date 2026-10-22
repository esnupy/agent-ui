"use client";

import { useReducedMotion } from "@componentes-ia/core";
import { useEffect, useRef, useState } from "react";
import { advancePlan, DEFAULT_PLAN_INTERVAL, type PlanStep, serializePlan } from "./plan";

export type PlanSimulationOptions = {
  /** Milisegundos entre un avance y el siguiente. */
  interval?: number;
  /** En false, el plan se queda como lo recibiste. */
  enabled?: boolean;
};

/**
 * Avanza un plan en el cliente para demos y para el copiloto de ejemplo.
 * No llama a ningún backend: solo recorre los estados.
 *
 * Con `prefers-reduced-motion` no arranca el intervalo y devuelve los pasos
 * tal como llegaron.
 *
 * @param steps - Plan inicial. Si cambia el contenido, la simulación reinicia.
 * @param options - Ritmo y si está activa.
 * @returns Los pasos ya avanzados.
 */
export const usePlanSimulation = (
  steps: readonly PlanStep[],
  options?: PlanSimulationOptions,
): readonly PlanStep[] => {
  const interval = options?.interval ?? DEFAULT_PLAN_INTERVAL;
  const enabled = options?.enabled ?? true;
  const reduced = useReducedMotion();
  const stepsRef = useRef(steps);
  stepsRef.current = steps;
  const inputKey = serializePlan(steps);
  const keyRef = useRef(inputKey);
  const [live, setLive] = useState<readonly PlanStep[]>(steps);

  // El arreglo suele ser nuevo en cada render. Solo el contenido debe reiniciar.
  useEffect(() => {
    if (keyRef.current === inputKey) return;
    keyRef.current = inputKey;
    setLive(stepsRef.current);
  }, [inputKey]);

  useEffect(() => {
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const delay = Number.isFinite(interval) && interval > 0 ? interval : DEFAULT_PLAN_INTERVAL;

    if (!enabled || reduced || prefersReduced) return undefined;

    const id = window.setInterval(() => {
      setLive((current) => advancePlan(current));
    }, delay);

    return () => {
      window.clearInterval(id);
    };
  }, [enabled, interval, reduced]);

  return live;
};
