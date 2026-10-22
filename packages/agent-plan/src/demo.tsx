"use client";

import { useReducedMotion } from "@componentes-ia/core";
import { useCallback, useEffect, useState } from "react";
import { AgentPlan } from "./agent-plan";
import { flattenPlan, type PlanStep } from "./plan";
import { usePlanSimulation } from "./use-plan-simulation";

const PROMPT = "¿Cómo retomo el stream si el token llega partido?";

const REPLY =
  "Guardo el offset del último delimitador. El siguiente fragmento continúa desde ahí y no repito el prefijo.";

const TOKENS = REPLY.split(" ");

/** Pausa entre tokens, ya con el plan cerrado. */
const TOKEN_MS = 42;

/** Ritmo del plan dentro del hilo, para que se note antes de la respuesta. */
const COPILOT_INTERVAL = 700;

/** Ritmo del plan suelto de la demo. */
const DEMO_INTERVAL = 1100;

const COPILOT_PLAN: readonly PlanStep[] = [
  { id: "corte", title: "Ubicar el corte del token", status: "in_progress" },
  { id: "offset", title: "Guardar el offset del delimitador", status: "pending" },
  { id: "stream", title: "Retomar el stream sin repetir", status: "pending" },
];

const LIVE_PLAN: readonly PlanStep[] = [
  { id: "leer", title: "Leer el hilo", status: "done" },
  {
    id: "buscar",
    title: "Buscar el offset del token",
    status: "in_progress",
    detail: "El corte va en el último delimitador, no en el byte suelto.",
  },
  { id: "ajustar", title: "Ajustar el cursor", status: "pending" },
  {
    id: "probar",
    title: "Probar el stream partido",
    status: "pending",
    substeps: [
      { id: "caso", title: "Caso con el token a la mitad", status: "pending" },
      { id: "prefijo", title: "Revisar que no repita el prefijo", status: "pending" },
    ],
  },
];

const ERROR_PLAN: readonly PlanStep[] = [
  { id: "config", title: "Leer la configuración", status: "done" },
  {
    id: "rama",
    title: "Abrir la rama",
    status: "error",
    detail: "La rama no existe en el remoto.",
  },
  { id: "parche", title: "Publicar el parche", status: "skipped" },
];

const COLLAPSED_PLAN: readonly PlanStep[] = [
  { id: "diff", title: "Revisar el diff", status: "done" },
  { id: "cursor", title: "Ajustar el offset", status: "in_progress" },
  { id: "prueba", title: "Escribir la prueba", status: "pending" },
];

const THEME_PLAN: readonly PlanStep[] = [
  { id: "hecho", title: "Revisar el diff", status: "done" },
  { id: "ahora", title: "Ajustar el offset", status: "in_progress" },
];

type Phase = "plan" | "stream" | "done";

/**
 * @param steps - Plan que se está simulando.
 * @returns Si ya no queda nada pendiente ni en curso.
 */
const isSettled = (steps: readonly PlanStep[]): boolean => {
  const flat = flattenPlan(steps);
  if (flat.length === 0) return false;

  return flat.every(
    (step) => step.status === "done" || step.status === "skipped" || step.status === "error",
  );
};

/**
 * Hilo de un copiloto: primero publica el plan y, al cerrarlo, escribe.
 *
 * @returns La conversación y el botón para verla otra vez.
 */
const CopilotRun = ({ onDone }: { onDone: (done: boolean) => void }) => {
  const reduced = useReducedMotion();
  const [phase, setPhase] = useState<Phase>(reduced ? "done" : "plan");
  const [count, setCount] = useState(reduced ? TOKENS.length : 0);
  const live = usePlanSimulation(COPILOT_PLAN, {
    interval: COPILOT_INTERVAL,
    enabled: !reduced && phase === "plan",
  });
  const settled = isSettled(live);
  const steps = reduced ? COPILOT_PLAN.map((step) => ({ ...step, status: "done" as const })) : live;
  const showReply = reduced || count > 0 || phase === "done";

  useEffect(() => {
    if (reduced) {
      setPhase("done");
      setCount(TOKENS.length);
      return undefined;
    }

    if (phase === "done") return undefined;

    if (phase === "plan") {
      if (!settled) return undefined;
      setPhase("stream");
      return undefined;
    }

    if (count >= TOKENS.length) {
      setPhase("done");
      return undefined;
    }

    const id = window.setTimeout(() => {
      setCount((current) => current + 1);
    }, TOKEN_MS);

    return () => {
      window.clearTimeout(id);
    };
  }, [count, phase, reduced, settled]);

  useEffect(() => {
    onDone(phase === "done");
  }, [onDone, phase]);

  return (
    <section aria-label="Conversación de ejemplo" className="agent-plan-demo__thread">
      <p className="agent-plan-demo__user">{PROMPT}</p>
      <div className="agent-plan-demo__agent">
        <AgentPlan steps={steps} />
        {showReply ? (
          <p
            className="agent-plan-demo__reply"
            data-streaming={phase === "stream" ? "true" : "false"}
          >
            {TOKENS.slice(0, reduced ? TOKENS.length : count).join(" ")}
          </p>
        ) : null}
      </div>
    </section>
  );
};

/**
 * El plan del hilo. El botón vive afuera para poder remontar la corrida.
 *
 * @returns El bloque del copiloto.
 */
const CopilotThread = () => {
  const reduced = useReducedMotion();
  const [run, setRun] = useState(0);
  const [done, setDone] = useState(false);

  const handleReplay = () => {
    setDone(false);
    setRun((current) => current + 1);
  };

  const handleDone = useCallback((next: boolean) => {
    setDone(next);
  }, []);

  return (
    <div className="agent-plan-demo__block">
      <p className="agent-plan-demo__kicker">Copiloto</p>
      <CopilotRun key={run} onDone={handleDone} />
      <p className="agent-plan-demo__note">
        El agente publica el plan y, al terminarlo, escribe la respuesta.
      </p>
      {done && !reduced ? (
        <button className="agent-plan-demo__replay" onClick={handleReplay} type="button">
          Ver de nuevo
        </button>
      ) : null}
    </div>
  );
};

/**
 * Plan que avanza solo, para ver el paso en curso y los subpasos.
 *
 * @returns El plan simulado.
 */
const LiveSample = () => {
  const reduced = useReducedMotion();
  const steps = usePlanSimulation(LIVE_PLAN, { interval: DEMO_INTERVAL, enabled: !reduced });

  return <AgentPlan steps={steps} />;
};

/**
 * El hilo, un plan que avanza, uno con error, uno contraído, y claro/oscuro.
 *
 * @returns La demo del sitio.
 */
export const Demo = () => {
  return (
    <div className="agent-plan-demo">
      <CopilotThread />
      <div className="agent-plan-demo__sample">
        <p className="agent-plan-demo__kicker">En curso</p>
        <LiveSample />
      </div>
      <div className="agent-plan-demo__sample">
        <p className="agent-plan-demo__kicker">Con error</p>
        <AgentPlan steps={ERROR_PLAN} title="Publicar" />
      </div>
      <div className="agent-plan-demo__sample">
        <p className="agent-plan-demo__kicker">Colapsado</p>
        <AgentPlan defaultOpen={false} steps={COLLAPSED_PLAN} />
      </div>
      <div className="agent-plan-demo__themes">
        <div className="agent-plan-demo__theme" data-theme="light">
          <span className="agent-plan-demo__kicker">Claro</span>
          <AgentPlan collapsible={false} steps={THEME_PLAN} />
        </div>
        <div className="agent-plan-demo__theme" data-theme="dark">
          <span className="agent-plan-demo__kicker">Oscuro</span>
          <AgentPlan collapsible={false} steps={THEME_PLAN} />
        </div>
      </div>
    </div>
  );
};
