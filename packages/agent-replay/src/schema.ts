import type { ComponentSchema } from "@componentes-ia/core";

export const schema = {
  name: "AgentReplay",
  description: "Reproductor de la ejecución de un agente, con scrub al instante exacto.",
  props: {
    seed: {
      type: "number",
      default: 7,
      min: 1,
      max: 999,
      description:
        "Semilla del run de ejemplo cuando no pasas events. En tu código pasa events con los ReplayEvent del run.",
    },
    live: {
      type: "boolean",
      default: false,
      description:
        "Sigue los eventos nuevos mientras el playhead esté al final. Si regresas, aparece Volver a en vivo.",
    },
    autoPlay: {
      type: "boolean",
      default: false,
      description: "Empieza a reproducir al montar.",
    },
    loop: {
      type: "boolean",
      default: false,
      description: "Vuelve a empezar al terminar. No aplica en vivo.",
    },
    defaultSpeed: {
      type: "enum",
      options: ["0.5", "1", "2", "4"],
      default: "1",
      description: "Velocidad inicial. [ y ] la cambian.",
    },
    panels: {
      type: "string",
      default: "chat,plan,tools,diff",
      description: "Paneles visibles y su orden, separados por comas. En código pasa un arreglo.",
    },
    className: {
      type: "string",
      default: "",
      description: "Clases adicionales en la raíz.",
    },
    onSeek: {
      type: "function",
      description: "Se llama con el tiempo en ms cada vez que el usuario mueve el playhead.",
    },
    renderEvent: {
      type: "function",
      description:
        "Vista previa propia de un evento en el tooltip. Regresa undefined para usar la de serie.",
    },
  },
} as const satisfies ComponentSchema;
