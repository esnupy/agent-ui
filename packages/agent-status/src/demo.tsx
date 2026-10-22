"use client";

import { useReducedMotion } from "@componentes-ia/core";
import { useEffect, useState } from "react";
import { AgentStatus } from "./agent-status";
import type { AgentStatusSize, AgentStatusVariant } from "./schema";

const PROMPT = "¿Por qué el stream pierde el cursor al partir un token?";

const REPLY =
  "El cursor se pierde cuando el token llega partido. Si guardas el offset del último delimitador, el stream retoma sin repetir el prefijo.";

const TOKENS = REPLY.split(" ");

/** Tiempo con el indicador antes de soltar el primer token. */
const HOLD_MS = 2600;

/** Ritmo de la palabra dentro del ejemplo, para que alcance a rotar. */
const DEMO_INTERVAL = 1200;

/** Pausa entre tokens del agente de mentira. */
const TOKEN_MS = 42;

const SAMPLES: ReadonlyArray<{
  label: string;
  variant: AgentStatusVariant;
  size: AgentStatusSize;
  status: string;
}> = [
  { label: "Ambos", variant: "both", size: "md", status: "Pensándolo bien" },
  { label: "Puntos", variant: "dots", size: "md", status: "Buscando" },
  { label: "Brillo", variant: "shimmer", size: "md", status: "Analizando" },
  { label: "Chico", variant: "both", size: "sm", status: "Escribiendo" },
];

type Phase = "wait" | "stream" | "done";

/**
 * Hilo de un copiloto: el indicador ocupa el lugar de la respuesta
 * hasta que llega el primer token.
 *
 * @returns El hilo y el botón para verlo otra vez.
 */
const CopilotThread = () => {
  const reduced = useReducedMotion();
  const [phase, setPhase] = useState<Phase>("wait");
  const [count, setCount] = useState(0);
  const [run, setRun] = useState(0);

  useEffect(() => {
    if (reduced) {
      setPhase("done");
      setCount(TOKENS.length);
      return undefined;
    }

    if (phase === "done") return undefined;

    if (phase === "wait") {
      const id = window.setTimeout(() => {
        setPhase("stream");
      }, HOLD_MS);

      return () => {
        window.clearTimeout(id);
      };
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
  }, [count, phase, reduced]);

  const showStatus = !reduced && (phase === "wait" || count === 0);

  const handleReplay = () => {
    setRun((current) => current + 1);
    setCount(0);
    setPhase("wait");
  };

  return (
    <div className="activity-status-demo__block">
      <p className="activity-status-demo__kicker">Copiloto</p>
      <section aria-label="Conversación de ejemplo" className="activity-status-demo__thread">
        <p className="activity-status-demo__user">{PROMPT}</p>
        <div className="activity-status-demo__agent">
          {showStatus ? (
            <AgentStatus interval={DEMO_INTERVAL} key={run} />
          ) : (
            <p
              className="activity-status-demo__reply"
              data-streaming={phase === "stream" ? "true" : "false"}
            >
              {TOKENS.slice(0, count).join(" ")}
            </p>
          )}
        </div>
      </section>
      <p className="activity-status-demo__note">
        Aparece mientras el agente prepara la respuesta y se va con el primer token.
      </p>
      {phase === "done" && !reduced ? (
        <button className="activity-status-demo__replay" onClick={handleReplay} type="button">
          Ver de nuevo
        </button>
      ) : null}
    </div>
  );
};

/**
 * El hilo del copiloto, las variantes y el mismo indicador en claro y oscuro.
 *
 * @returns La demo del sitio.
 */
export const Demo = () => {
  return (
    <div className="activity-status-demo">
      <CopilotThread />
      <ul aria-label="Variantes" className="activity-status-demo__variants">
        {SAMPLES.map((sample) => (
          <li className="activity-status-demo__variant" key={sample.label}>
            <span className="activity-status-demo__label">{sample.label}</span>
            <AgentStatus size={sample.size} status={sample.status} variant={sample.variant} />
          </li>
        ))}
      </ul>
      <div className="activity-status-demo__themes">
        <div className="activity-status-demo__theme" data-theme="light">
          <span className="activity-status-demo__theme-label">Claro</span>
          <AgentStatus status="Pensándolo bien" />
        </div>
        <div className="activity-status-demo__theme" data-theme="dark">
          <span className="activity-status-demo__theme-label">Oscuro</span>
          <AgentStatus status="Pensándolo bien" />
        </div>
      </div>
    </div>
  );
};
