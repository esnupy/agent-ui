"use client";

import { useReducedMotion } from "@componentes-ia/core";
import { useEffect, useState } from "react";
import { AgentTask } from "./agent-task";
import { AGENT_STATES, type AgentState } from "./states";

const ROWS: ReadonlyArray<{ title: string; branch: string; elapsed: string }> = [
  {
    title: "Leer el diff y proponer el plan",
    branch: "main",
    elapsed: "18s",
  },
  {
    title: "Reescribir el parser de tokens para que el stream no pierda el cursor",
    branch: "feat/parser",
    elapsed: "1m 04s",
  },
  {
    title: "Esperar la revisión del sandbox",
    branch: "feat/parser",
    elapsed: "3m 12s",
  },
  {
    title: "Aplicar el parche en auth middleware",
    branch: "feat/auth",
    elapsed: "42s",
  },
  {
    title: "Correr la suite y reportar el fallo",
    branch: "fix/suite",
    elapsed: "2m 27s",
  },
];

/**
 * Varias filas a la vez, cada una en un estado distinto, rotando.
 *
 * @returns La lista viva de tareas.
 */
export const Demo = () => {
  const reduced = useReducedMotion();
  const [tick, setTick] = useState(0);
  const [selected, setSelected] = useState(1);

  useEffect(() => {
    if (reduced) return undefined;

    const id = window.setInterval(() => {
      setTick((current) => current + 1);
    }, 5200);

    return () => {
      window.clearInterval(id);
    };
  }, [reduced]);

  return (
    <ul aria-label="Tareas del agente" className="agent-task-demo">
      {ROWS.map((row, index) => {
        const state: AgentState = AGENT_STATES[(index + tick) % AGENT_STATES.length] ?? "thinking";

        return (
          <li key={row.title}>
            <AgentTask
              branch={row.branch}
              elapsed={row.elapsed}
              onClick={() => {
                setSelected(index);
              }}
              selected={selected === index}
              shimmer
              state={state}
              title={row.title}
            />
          </li>
        );
      })}
    </ul>
  );
};
