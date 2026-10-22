"use client";

import { useEffect, useMemo, useReducer, useRef } from "react";

export type Presence<T> = {
  item: T;
  key: string;
  /** `true` mientras se anima la entrada. Nunca en el primer render. */
  entering: boolean;
  /** `true` mientras se anima la salida. */
  exiting: boolean;
  until: number;
};

const now = () => globalThis.performance?.now() ?? Date.now();

/**
 * Conserva un momento los elementos que salen, en su lugar, para animar la salida,
 * y marca los que acaban de entrar.
 *
 * @param items - Lista actual.
 * @param getKey - Llave estable de cada elemento.
 * @param exitMs - Cuánto dura la salida.
 * @param enabled - Sin animaciones, los elementos salen de inmediato.
 * @returns La lista con los que salen intercalados.
 */
export const usePresence = <T>(
  items: readonly T[],
  getKey: (item: T) => string,
  exitMs: number,
  enabled: boolean,
): Presence<T>[] => {
  const previous = useRef<Presence<T>[] | null>(null);
  const entered = useRef(new Map<string, number>());
  const [version, refresh] = useReducer((value: number) => value + 1, 0);

  // biome-ignore lint/correctness/useExhaustiveDependencies: version fuerza a purgar los que ya salieron; getKey se asume estable.
  const result = useMemo(() => {
    const time = now();
    const before = previous.current;
    for (const [key, until] of entered.current) if (until <= time) entered.current.delete(key);
    const known = new Set(before?.filter((entry) => !entry.exiting).map((entry) => entry.key));

    const out: Presence<T>[] = items.map((item) => {
      const key = getKey(item);
      if (enabled && before && !known.has(key)) entered.current.set(key, time + exitMs);
      const enterUntil = entered.current.get(key) ?? 0;
      return { item, key, entering: enterUntil > time, exiting: false, until: enterUntil };
    });
    if (!enabled || !before) return out;

    const present = new Set(out.map((entry) => entry.key));
    let insertAt = 0;

    for (const entry of before) {
      if (present.has(entry.key)) {
        insertAt = out.findIndex((candidate) => candidate.key === entry.key) + 1;
        continue;
      }

      const until = entry.exiting ? entry.until : time + exitMs;
      if (until <= time) continue;
      entered.current.delete(entry.key);
      out.splice(insertAt, 0, { ...entry, entering: false, exiting: true, until });
      insertAt += 1;
    }

    return out;
  }, [items, enabled, exitMs, version]);

  useEffect(() => {
    previous.current = result;
    let next = Number.POSITIVE_INFINITY;
    for (const entry of result) {
      if (entry.exiting || entry.entering) next = Math.min(next, entry.until);
    }
    if (next === Number.POSITIVE_INFINITY) return undefined;

    const id = globalThis.setTimeout(refresh, Math.max(0, next - now()) + 16);
    return () => {
      globalThis.clearTimeout(id);
    };
  }, [result]);

  return result;
};
