"use client";

import type { ReactNode } from "react";
import { cn } from "./cn";
import { useReducedMotion } from "./use-reduced-motion";

export type ShimmerProps = {
  /** `once` cruza una sola vez. `loop` se queda barriendo. */
  mode?: "once" | "loop";
  className?: string;
  /** Si hay hijos, el brillo va sobre el texto. Si no, sobre el borde del padre. */
  children?: ReactNode;
};

/**
 * Barrido de luz para llamar la atención sin cambiar de color.
 *
 * El padre del modo borde necesita `position: relative`.
 *
 * @param props - Modo, clases y, si aplica, el texto que brilla.
 * @returns La capa del barrido.
 */
export const Shimmer = ({ mode = "once", className, children }: ShimmerProps) => {
  const reduced = useReducedMotion();
  const text = children !== undefined && children !== null && children !== false;

  return (
    <span
      aria-hidden="true"
      className={cn("ac-shimmer", className)}
      data-mode={reduced ? "off" : mode}
      data-text={text ? "true" : "false"}
    >
      {text ? (
        <>
          {children}
          <span className="ac-shimmer__band">{children}</span>
        </>
      ) : null}
    </span>
  );
};
