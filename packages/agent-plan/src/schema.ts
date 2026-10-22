import type { ComponentSchema } from "@componentes-ia/core";
import { DEFAULT_STEPS_CONTROL, DEFAULT_TITLE } from "./plan";

export const schema = {
  name: "AgentPlan",
  description: "Plan en vivo del agente: una lista de pasos que se van completando.",
  props: {
    steps: {
      type: "string",
      default: DEFAULT_STEPS_CONTROL,
      description:
        "Pasos separados por comas, con el estado después de |. En código pasa un arreglo con id, title, status, detail y substeps.",
    },
    title: {
      type: "string",
      default: DEFAULT_TITLE,
      description: "Texto del encabezado.",
    },
    collapsible: {
      type: "boolean",
      default: true,
      description: "Si está activo, el encabezado contrae la lista y deja solo el paso actual.",
    },
    defaultOpen: {
      type: "boolean",
      default: true,
      description: "Empieza abierto. Si lo apagas, solo se ve el paso en curso.",
    },
    className: {
      type: "string",
      default: "",
      description: "Clases adicionales en la raíz.",
    },
    onStepClick: {
      type: "function",
      description: "Se llama con el id del paso al activarlo.",
    },
  },
} as const satisfies ComponentSchema;
