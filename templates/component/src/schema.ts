import type { ComponentSchema } from "@componentes-ia/core";

export const schema = {
  name: "__PASCAL__",
  description: "Componente __TITLE__.",
  props: {
    label: {
      type: "string",
      default: "Etiqueta",
      description: "Texto que muestra el componente.",
    },
    className: {
      type: "string",
      default: "",
      description: "Clases extra para el elemento raíz.",
    },
  },
} as const satisfies ComponentSchema;
