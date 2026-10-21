"use client";

import { cn, useReducedMotion } from "@ai-components/core";
import type { CSSProperties } from "react";
import { type AgentSize, type AgentState, STATUS_LABEL } from "./states";

const CELL = 3;
const STEP = 4.5;
const ORIGIN = 1;

const CELLS = [0, 1, 2, 3, 4, 5, 6, 7, 8] as const;

/** Duración irregular, en segundos, para que writing no parezca un metrónomo. */
const TOKEN_DURATION = [2.4, 3.3, 1.9, 4.1, 2.7, 4.6, 2.1, 3.6, 2.9] as const;

/** Desfase negativo para que cada celda entre en un punto distinto del ciclo. */
const TOKEN_DELAY = [-0.2, -1.1, -0.55, -1.9, -0.35, -1.5, -0.8, -2.3, -1.2] as const;

export type AgentStatusIndicatorProps = {
  /** Estado que dibuja la retícula. */
  state?: AgentState;
  /** Tamaño del SVG. */
  size?: AgentSize;
  /** Multiplicador de la duración. 1 es la velocidad base. */
  speed?: number;
  /** Oculta el indicador de la accesibilidad cuando la fila ya anuncia el estado. */
  decorative?: boolean;
  className?: string;
};

const cellStyle = (index: number): CSSProperties => {
  const column = index % 3;
  const row = Math.floor(index / 3);

  return {
    "--cell-delay": `${row * 0.42 + column * 0.28}`,
    "--token-duration": `${TOKEN_DURATION[index] ?? 0.8}`,
    "--token-delay": `${TOKEN_DELAY[index] ?? 0}`,
  } as CSSProperties;
};

/**
 * Retícula de 3×3 que transiciona entre los estados de un agente.
 *
 * Thinking respira en onda, writing parpadea como tokens, waiting pulsa
 * despacio y done/error se resuelven en una palomita o una cruz.
 *
 * @param props - Estado, tamaño, velocidad y si es decorativo.
 * @returns El SVG del indicador.
 */
export const AgentStatusIndicator = ({
  state = "thinking",
  size = "md",
  speed = 1,
  decorative = false,
  className,
}: AgentStatusIndicatorProps) => {
  const reduced = useReducedMotion();

  return (
    <svg
      aria-hidden={decorative ? true : undefined}
      aria-label={decorative ? undefined : STATUS_LABEL[state]}
      className={cn("agent-status", className)}
      data-reduced-motion={reduced ? "true" : "false"}
      data-size={size}
      data-state={state}
      focusable="false"
      role={decorative ? undefined : "img"}
      style={{ "--agent-speed": speed } as CSSProperties}
      viewBox="0 0 14 14"
    >
      {CELLS.map((index) => {
        const column = index % 3;
        const row = Math.floor(index / 3);

        return (
          <rect
            className="agent-status__cell"
            data-cell={index}
            height={CELL}
            key={index}
            rx="0.45"
            style={cellStyle(index)}
            width={CELL}
            x={ORIGIN + column * STEP}
            y={ORIGIN + row * STEP}
          />
        );
      })}
    </svg>
  );
};
