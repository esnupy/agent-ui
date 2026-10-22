"use client";

import { cn, useReducedMotion } from "@componentes-ia/core";
import {
  type ComponentPropsWithoutRef,
  type CSSProperties,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { AgentStatusSize, AgentStatusVariant } from "./schema";

/** Palabras que rotan si no pasas `words` ni `status`. */
export const DEFAULT_WORDS = [
  "Pensando",
  "Buscando",
  "Leyendo",
  "Analizando",
  "Escribiendo",
] as const;

/** Milisegundos entre una palabra y la siguiente. */
export const DEFAULT_INTERVAL = 2200;

/** Duración del fundido y del ancho. El CSS lee la misma variable. */
const FADE_MS = 380;

type AgentStatusStyle = CSSProperties & {
  "--activity-status-width"?: string;
  "--activity-status-fade"?: string;
};

export type AgentStatusProps = Omit<ComponentPropsWithoutRef<"div">, "children"> & {
  /** Palabras que rotan. Un arreglo, o una lista separada por comas. */
  words?: readonly string[] | string;
  /** Si lo pasas, el texto se queda fijo y deja de rotar. */
  status?: string;
  /** Milisegundos entre palabras. */
  interval?: number;
  /** Puntos, texto con brillo, o los dos. */
  variant?: AgentStatusVariant;
  /** sm es más chico. md acompaña una línea de chat. */
  size?: AgentStatusSize;
};

/**
 * Parte `words` en una lista limpia. Una cadena se separa por comas
 * porque el playground del sitio solo sabe mandar texto.
 *
 * @param value - Arreglo, lista separada por comas, o nada.
 * @returns Al menos una palabra.
 */
const resolveWords = (value: readonly string[] | string | undefined): readonly string[] => {
  const source = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.split(",")
      : DEFAULT_WORDS;
  const cleaned = source.map((word) => word.trim()).filter((word) => word.length > 0);

  return cleaned.length > 0 ? cleaned : DEFAULT_WORDS;
};

/**
 * Indicador de que el agente sigue trabajando: tres puntos y una palabra.
 *
 * Sin `status`, la palabra rota. Con `prefers-reduced-motion` se queda
 * quieta, sin brillo y sin cambiar de texto.
 *
 * @param props - Palabras, texto fijo, ritmo, variante, tamaño y props de div.
 * @returns El estado, anunciado con `aria-live`.
 */
export const AgentStatus = ({
  words,
  status,
  interval = DEFAULT_INTERVAL,
  variant = "both",
  size = "md",
  className,
  style,
  ...rest
}: AgentStatusProps) => {
  const reduced = useReducedMotion();
  const list = useMemo(() => resolveWords(words), [words]);
  const listKey = list.join("\u0000");
  const listRef = useRef(list);
  listRef.current = list;

  const controlled = typeof status === "string" && status.trim().length > 0 ? status : undefined;
  const [index, setIndex] = useState(0);
  const rotating = list[index] ?? list[0] ?? "Pensando";
  const shown = controlled ?? rotating;

  const measureRef = useRef<HTMLSpanElement>(null);
  const shownRef = useRef(shown);
  const [outgoing, setOutgoing] = useState<string | null>(null);
  const [boxWidth, setBoxWidth] = useState<number | undefined>(undefined);

  // listKey no se lee dentro: solo tiene que reiniciar el índice cuando cambia la lista.
  // biome-ignore lint/correctness/useExhaustiveDependencies: la lista nueva vuelve a la primera palabra
  useEffect(() => {
    setIndex(0);
  }, [listKey]);

  useEffect(() => {
    // El hook arranca en false para que el HTML del servidor coincida.
    // Aquí leemos la preferencia real antes de programar el intervalo.
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const currentList = listRef.current;
    const delay = Number.isFinite(interval) && interval > 0 ? interval : DEFAULT_INTERVAL;

    if (listKey.length === 0 || reduced || prefersReduced || controlled || currentList.length < 2) {
      return undefined;
    }

    const id = window.setInterval(() => {
      const nextList = listRef.current;
      setIndex((current) => (current + 1) % nextList.length);
    }, delay);

    return () => {
      window.clearInterval(id);
    };
  }, [controlled, interval, listKey, reduced]);

  useEffect(() => {
    if (reduced) {
      shownRef.current = shown;
      setOutgoing(null);
      return undefined;
    }

    if (shown === shownRef.current) return undefined;

    const previous = shownRef.current;
    shownRef.current = shown;
    setOutgoing(previous);

    const id = window.setTimeout(() => {
      setOutgoing(null);
    }, FADE_MS);

    return () => {
      window.clearTimeout(id);
    };
  }, [reduced, shown]);

  // Hay que volver a medir cuando cambia la palabra, el tamaño o la variante.
  // biome-ignore lint/correctness/useExhaustiveDependencies: el ancho sale del DOM, no de esos valores
  useLayoutEffect(() => {
    const node = measureRef.current;
    if (!node) return undefined;

    const update = () => {
      const next = Math.ceil(node.getBoundingClientRect().width);
      if (next <= 0) return;

      setBoxWidth((current) => (current === next ? current : next));
    };

    update();

    if (typeof ResizeObserver === "undefined") return undefined;

    const observer = new ResizeObserver(update);
    observer.observe(node);

    return () => {
      observer.disconnect();
    };
  }, [shown, size, variant]);

  const mergedStyle = {
    ...style,
    "--activity-status-fade": `${FADE_MS}ms`,
    ...(boxWidth ? { "--activity-status-width": `${boxWidth}px` } : {}),
  } as AgentStatusStyle;

  const showDots = variant === "dots" || variant === "both";

  return (
    <div
      {...rest}
      aria-atomic="true"
      aria-live="polite"
      className={cn("activity-status", className)}
      data-ready={boxWidth ? "true" : "false"}
      data-reduced-motion={reduced ? "true" : "false"}
      data-size={size}
      data-variant={variant}
      data-word={shown}
      role="status"
      style={mergedStyle}
    >
      {showDots ? (
        <span aria-hidden="true" className="activity-status__dots">
          <span className="activity-status__dot" />
          <span className="activity-status__dot" />
          <span className="activity-status__dot" />
        </span>
      ) : null}
      <span className="activity-status__word">
        <span className="activity-status__clip">
          {outgoing ? (
            <span
              aria-hidden="true"
              className="activity-status__label"
              data-phase="out"
              key={outgoing}
            >
              <span className="activity-status__text">{outgoing}</span>
            </span>
          ) : null}
          <span
            className="activity-status__label"
            data-phase={outgoing ? "in" : "idle"}
            key={shown}
          >
            <span className="activity-status__text">{shown}</span>
          </span>
        </span>
        <span aria-hidden="true" className="activity-status__measure" ref={measureRef}>
          {shown}
        </span>
      </span>
    </div>
  );
};
