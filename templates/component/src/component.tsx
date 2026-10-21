import { cn } from "@componentes-ia/core";

export type __PASCAL__Props = {
  /** Texto visible. */
  label?: string;
  className?: string;
};

/**
 * __TITLE__.
 *
 * @param props - Contenido y clases del componente.
 * @returns El elemento renderizado.
 */
export const __PASCAL__ = ({ label = "Etiqueta", className }: __PASCAL__Props) => {
  return <div className={cn("__KEBAB__", className)}>{label}</div>;
};
