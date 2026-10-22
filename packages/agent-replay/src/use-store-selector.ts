"use client";

import { useRef, useSyncExternalStore } from "react";

/**
 * `useSyncExternalStore` con selector. Solo vuelve a renderizar cuando lo
 * seleccionado cambia según `isEqual`.
 *
 * React 19 no trae `with-selector`, y la biblioteca no suma dependencias.
 *
 * @param subscribe - Suscripción del canal.
 * @param getSnapshot - Lectura del canal.
 * @param selector - Qué parte importa.
 * @param isEqual - Comparación. Por defecto, referencia.
 * @returns El valor seleccionado.
 */
export const useStoreSelector = <S, T>(
  subscribe: (listener: () => void) => () => void,
  getSnapshot: () => S,
  selector: (snapshot: S) => T,
  isEqual: (a: T, b: T) => boolean = Object.is,
): T => {
  const memo = useRef<{ snapshot: S; selector: (snapshot: S) => T; value: T } | null>(null);

  const read = () => {
    const snapshot = getSnapshot();
    const current = memo.current;

    if (current && current.snapshot === snapshot && current.selector === selector) {
      return current.value;
    }

    const value = selector(snapshot);
    if (current && isEqual(current.value, value)) {
      memo.current = { snapshot, selector, value: current.value };
      return current.value;
    }

    memo.current = { snapshot, selector, value };
    return value;
  };

  return useSyncExternalStore(subscribe, read, read);
};
