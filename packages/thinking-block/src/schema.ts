import type { ComponentSchema } from "@componentes-ia/core";

export const THINKING_STATUSES = ["thinking", "done"] as const;

export type ThinkingStatus = (typeof THINKING_STATUSES)[number];

export const schema = {
  name: "ThinkingBlock",
  description: "Bloque plegable del razonamiento de un agente, con brillo mientras piensa.",
  props: {
    status: {
      type: "enum",
      options: THINKING_STATUSES,
      default: "thinking",
      description: "thinking muestra el brillo. done cambia la etiqueta a la duración.",
    },
    text: {
      type: "string",
      default:
        "Reviso el diff antes de tocar el parser.\nEl cursor se pierde cuando el token se parte en dos chunks.\nVoy a guardar el offset del último delimitador.",
      description: "Razonamiento completo. Los saltos de línea se conservan.",
    },
    preview: {
      type: "string",
      default: "El cursor se pierde cuando el token se parte.",
      description: "Última línea, en gris, cuando está pensando y cerrado.",
    },
    duration: {
      type: "number",
      default: 12,
      min: 0,
      max: 3600,
      description: "Segundos que duró el razonamiento. Se muestra al terminar.",
    },
    defaultOpen: {
      type: "boolean",
      default: false,
      description:
        "Si empieza abierto. Al terminar se cierra solo, salvo que la persona lo haya abierto.",
    },
    className: {
      type: "string",
      default: "",
      description: "Clases adicionales en la raíz.",
    },
  },
} as const satisfies ComponentSchema;
