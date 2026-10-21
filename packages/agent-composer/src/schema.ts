import type { ComponentSchema } from "@componentes-ia/core";

export const schema = {
  name: "AgentComposer",
  description: "Campo de mensaje con adjuntar, modelo, voz y enviar.",
  props: {
    value: {
      type: "string",
      default: "Ajusta el parser para que el stream no pierda el cursor.",
      description: "Texto del campo. Si lo pasas, el compositor queda controlado.",
    },
    placeholder: {
      type: "string",
      default: "Escribe un mensaje",
      description: "Texto cuando el campo está vacío.",
    },
    model: {
      type: "string",
      default: "Modelo rápido",
      description: "Nombre del modelo, a la derecha de la barra.",
    },
    showAttach: {
      type: "boolean",
      default: true,
      description: "Muestra el botón de adjuntar.",
    },
    showModel: {
      type: "boolean",
      default: true,
      description: "Muestra el selector de modelo.",
    },
    showVoice: {
      type: "boolean",
      default: true,
      description: "Muestra el botón de voz.",
    },
    showSend: {
      type: "boolean",
      default: true,
      description: "Muestra el botón de enviar.",
    },
    disabled: {
      type: "boolean",
      default: false,
      description: "Desactiva el campo y las acciones.",
    },
    className: {
      type: "string",
      default: "",
      description: "Clases adicionales en el formulario.",
    },
    onValueChange: {
      type: "function",
      description: "Se llama con el texto cada vez que cambia.",
    },
    onAttach: {
      type: "function",
      description: "Se llama al pulsar adjuntar.",
    },
    onModel: {
      type: "function",
      description: "Se llama al pulsar el modelo.",
    },
    onVoice: {
      type: "function",
      description: "Se llama al pulsar el micrófono.",
    },
    onSubmit: {
      type: "function",
      description: "Se llama con el texto al enviar. Enter envía; Shift+Enter hace un salto.",
    },
  },
} as const satisfies ComponentSchema;
