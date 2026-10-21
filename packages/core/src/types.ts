/** Tipos de prop que el sitio sabe convertir en controles. */
export type PropType = "string" | "number" | "boolean" | "enum" | "function";

/** Descripción de una prop para la tabla, el playground y el prompt. */
export type PropSchema = {
  type: PropType;
  description: string;
  default?: string | number | boolean;
  options?: readonly string[];
  min?: number;
  max?: number;
};

/** Contrato que exporta cada paquete de componente. */
export type ComponentSchema = {
  name: string;
  description: string;
  props: Record<string, PropSchema>;
};
