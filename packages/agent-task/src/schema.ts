import type { ComponentSchema } from "@componentes-ia/core";
import { AGENT_SIZES, AGENT_STATES } from "./states";

export const schema = {
  name: "AgentTask",
  description:
    "Fila de una tarea de agente: indicador animado, título, rama y tiempo transcurrido.",
  props: {
    state: {
      type: "enum",
      options: AGENT_STATES,
      default: "thinking",
      description: "Estado de la tarea. Cambia la animación del indicador.",
    },
    title: {
      type: "string",
      default: "Reescribir el parser de tokens para el stream",
      description: "Texto principal. Si no cabe, se desvanece al final.",
    },
    branch: {
      type: "string",
      default: "feat/parser",
      description: "Rama de git que se muestra a la derecha.",
    },
    elapsed: {
      type: "string",
      default: "1m 04s",
      description: "Tiempo transcurrido, ya formateado.",
    },
    selected: {
      type: "boolean",
      default: false,
      description: "Resalta la fila como selección actual.",
    },
    shimmer: {
      type: "boolean",
      default: true,
      description: "Barrido sobre el título cuando el estado es thinking.",
    },
    speed: {
      type: "number",
      default: 1,
      min: 0.25,
      max: 3,
      description: "Multiplicador de la velocidad de animación.",
    },
    size: {
      type: "enum",
      options: AGENT_SIZES,
      default: "md",
      description: "Tamaño del indicador y de la fila.",
    },
    className: {
      type: "string",
      default: "",
      description: "Clases adicionales en el elemento de la fila.",
    },
    onClick: {
      type: "function",
      description: "Si existe, la fila se renderiza como button.",
    },
  },
} as const satisfies ComponentSchema;
