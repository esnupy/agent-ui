"use client";

import { useEffect, useState } from "react";

/**
 * Lee la preferencia del sistema para reducir movimiento.
 *
 * El primer render es `false` a propósito, para que el HTML del servidor
 * y el del cliente coincidan. El efecto corrige el valor enseguida.
 *
 * @returns `true` si `prefers-reduced-motion` es `reduce`.
 */
export const useReducedMotion = (): boolean => {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");

    const handleChange = () => {
      setReduced(query.matches);
    };

    handleChange();
    query.addEventListener("change", handleChange);

    return () => {
      query.removeEventListener("change", handleChange);
    };
  }, []);

  return reduced;
};
