"use client";

import { cn, useReducedMotion } from "@componentes-ia/core";
import type { CSSProperties } from "react";
import { AgentStatusIndicator } from "./agent-status-indicator";
import { type AgentSize, type AgentState, STATUS_LABEL } from "./states";

export type AgentTaskProps = {
  /** Estado de la tarea. */
  state?: AgentState;
  /** Título visible. Se trunca con una máscara. */
  title: string;
  /** Rama de git. */
  branch?: string;
  /** Tiempo ya formateado, por ejemplo `1m 04s`. */
  elapsed?: string;
  /** Resalta la fila. */
  selected?: boolean;
  /** Barrido sobre el título mientras el estado es thinking. */
  shimmer?: boolean;
  /** Multiplicador de velocidad de las animaciones. */
  speed?: number;
  /** Escala de la fila y del indicador. */
  size?: AgentSize;
  /** Si existe, la fila es un button. */
  onClick?: () => void;
  className?: string;
};

/**
 * Ícono de rama, en trazo fino para no competir con el título.
 *
 * @returns El SVG decorativo.
 */
const BranchIcon = () => {
  return (
    <svg aria-hidden="true" className="agent-task__branch-icon" viewBox="0 0 16 16">
      <path
        d="M4 4.8v6.4"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.3"
      />
      <path
        d="M4 7.6c1.8 0 2.7-.9 3.7-1.9.8-.8 1.7-1.4 4.5-1.4"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.3"
      />
      <circle cx="4" cy="3.1" fill="currentColor" r="1.45" />
      <circle cx="4" cy="12.9" fill="currentColor" r="1.45" />
      <circle cx="12.2" cy="4.3" fill="currentColor" r="1.45" />
    </svg>
  );
};

/**
 * Fila de una tarea de agente con indicador, título, rama y tiempo.
 *
 * Con `onClick` es un button de verdad. Sin él, es un grupo estático.
 * El estado se anuncia en un texto con aria-live, fuera del nombre accesible.
 *
 * @param props - Contenido y estado visual de la fila.
 * @returns La fila, como button o como grupo.
 */
export const AgentTask = ({
  state = "thinking",
  title,
  branch,
  elapsed,
  selected = false,
  shimmer = true,
  speed = 1,
  size = "md",
  onClick,
  className,
}: AgentTaskProps) => {
  const reduced = useReducedMotion();
  const showShimmer = shimmer && state === "thinking" && !reduced;
  const status = STATUS_LABEL[state];
  const shared = {
    className: cn("agent-task", className),
    "data-reduced-motion": reduced ? "true" : "false",
    "data-selected": selected ? "true" : "false",
    "data-shimmer": showShimmer ? "true" : "false",
    "data-size": size,
    "data-state": state,
    style: { "--agent-speed": speed } as CSSProperties,
  };

  const content = (
    <>
      <span className="agent-task__main">
        <AgentStatusIndicator decorative size={size} speed={speed} state={state} />
        <span className="agent-task__title">
          <span className="agent-task__title-text">{title}</span>
        </span>
      </span>
      {branch || elapsed ? (
        <span className="agent-task__meta">
          {branch ? (
            <span className="agent-task__branch">
              <BranchIcon />
              <span className="agent-task__branch-name">{branch}</span>
            </span>
          ) : null}
          {branch && elapsed ? <span aria-hidden="true" className="agent-task__dot" /> : null}
          {elapsed ? <span className="agent-task__elapsed">{elapsed}</span> : null}
        </span>
      ) : null}
    </>
  );

  return (
    <div className="agent-task-root">
      {onClick ? (
        <button {...shared} aria-pressed={selected} onClick={onClick} type="button">
          {content}
        </button>
      ) : (
        <div {...shared}>{content}</div>
      )}
      <span aria-live="polite" className="ac-sr-only">
        {`${title}. ${status}.`}
      </span>
    </div>
  );
};
