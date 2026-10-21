export const AGENT_STATES = ["thinking", "writing", "waiting", "done", "error"] as const;

/** Estado visible de un agente. */
export type AgentState = (typeof AGENT_STATES)[number];

export const AGENT_SIZES = ["sm", "md", "lg"] as const;

/** Escala del indicador y de la fila. */
export type AgentSize = (typeof AGENT_SIZES)[number];

/** Texto anunciado por los lectores de pantalla para cada estado. */
export const STATUS_LABEL: Record<AgentState, string> = {
  thinking: "Thinking",
  writing: "Writing",
  waiting: "Waiting",
  done: "Done",
  error: "Error",
};
