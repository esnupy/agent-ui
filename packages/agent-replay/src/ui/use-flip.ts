"use client";

import { type RefObject, useLayoutEffect, useRef } from "react";

type Position = { top: number; left: number };

const EASING = "cubic-bezier(0.2, 0, 0, 1)";

/**
 * Transiciones FLIP hechas a mano para los hijos directos con `data-flip`.
 *
 * Después de cada commit mide cada hijo (Last), lo compara con la medida del
 * commit anterior (First), lo regresa con un `transform` (Invert) y lo deja
 * llegar con la Web Animations API nativa (Play). Las posiciones son relativas
 * al contenedor, así que el scroll de la página no cuenta como movimiento.
 *
 * @param ref - Contenedor.
 * @param enabled - Apágalo con movimiento reducido.
 * @param duration - Duración, en ms.
 */
export const useFlip = (ref: RefObject<HTMLElement | null>, enabled: boolean, duration = 320) => {
  const positions = useRef(new Map<string, Position>());

  // Sin dependencias a propósito: mide después de cada render del dueño.
  useLayoutEffect(() => {
    const container = ref.current;
    if (!container) return;

    const base = container.getBoundingClientRect();
    const next = new Map<string, Position>();

    for (const child of Array.from(container.children)) {
      if (!(child instanceof HTMLElement) || !child.dataset.flip) continue;

      const rect = child.getBoundingClientRect();
      const position = {
        top: rect.top - base.top + container.scrollTop,
        left: rect.left - base.left + container.scrollLeft,
      };
      next.set(child.dataset.flip, position);

      const previous = positions.current.get(child.dataset.flip);
      if (!enabled || !previous || typeof child.animate !== "function") continue;

      const dx = previous.left - position.left;
      const dy = previous.top - position.top;
      if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) continue;

      child.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: "none" }], {
        duration,
        easing: EASING,
      });
    }

    positions.current = next;
  });
};
