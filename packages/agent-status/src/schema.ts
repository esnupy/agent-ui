import type { ComponentSchema } from "@componentes-ia/core";
import { DEFAULT_INTERVAL, DEFAULT_WORDS } from "./agent-status";

export const AGENT_STATUS_VARIANTS = ["dots", "shimmer", "both"] as const;

/** Qué partes del indicador se dibujan. */
export type AgentStatusVariant = (typeof AGENT_STATUS_VARIANTS)[number];

export const AGENT_STATUS_SIZES = ["sm", "md"] as const;

/** Escala del indicador. */
export type AgentStatusSize = (typeof AGENT_STATUS_SIZES)[number];

export const schema = {
  name: "AgentStatus",
  description:
    "Indicador de que el agente está trabajando: puntos animados y una palabra con brillo.",
  props: {
    words: {
      type: "string",
      default: DEFAULT_WORDS.join(", "),
      description:
        "Palabras que rotan, separadas por comas. En código también puedes pasar un arreglo.",
    },
    status: {
      type: "string",
      default: "",
      description: "Texto fijo. Si lo dejas vacío, las palabras rotan solas.",
    },
    interval: {
      type: "number",
      default: DEFAULT_INTERVAL,
      min: 400,
      max: 8000,
      description: "Milisegundos entre palabras. No aplica si hay un texto fijo.",
    },
    variant: {
      type: "enum",
      options: AGENT_STATUS_VARIANTS,
      default: "both",
      description: "dots solo los puntos. shimmer solo el texto. both los dos.",
    },
    size: {
      type: "enum",
      options: AGENT_STATUS_SIZES,
      default: "md",
      description: "sm cabe en una fila apretada. md es el de una línea de chat.",
    },
    className: {
      type: "string",
      default: "",
      description: "Clases adicionales en la raíz.",
    },
  },
} as const satisfies ComponentSchema;
