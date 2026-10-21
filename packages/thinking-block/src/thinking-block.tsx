"use client";

import { cn, useReducedMotion } from "@componentes-ia/core";
import { type CSSProperties, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { formatDuration, isPinnedToBottom } from "./format";
import type { ThinkingStatus } from "./schema";

export type ThinkingBlockProps = {
  /** `thinking` mientras llega el texto. `done` cuando ya terminó. */
  status?: ThinkingStatus;
  /** Razonamiento. Los saltos de línea se respetan. */
  text?: string;
  /** Última línea, visible en el encabezado mientras piensa y está cerrado. */
  preview?: string;
  /** Segundos del razonamiento, para la etiqueta final. */
  duration?: number;
  /** Abierto al montar. Si nadie lo toca, se cierra al terminar. */
  defaultOpen?: boolean;
  className?: string;
};

/**
 * Bloque plegable del razonamiento, al estilo de un agente que piensa en voz baja.
 *
 * El encabezado brilla mientras llega el texto. Al terminar, la etiqueta pasa a
 * la duración y, si se había abierto solo, se pliega. Si la persona lo abrió, se queda.
 *
 * @param props - Estado, texto, vista previa, duración y si empieza abierto.
 * @returns El bloque.
 */
export const ThinkingBlock = ({
  status = "thinking",
  text = "",
  preview = "",
  duration = 12,
  defaultOpen = false,
  className,
}: ThinkingBlockProps) => {
  const reduced = useReducedMotion();
  const panelId = useId();
  const innerRef = useRef<HTMLDivElement>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const manualRef = useRef(false);
  const pinnedRef = useRef(true);
  const [open, setOpen] = useState(status === "thinking" && defaultOpen);
  const [height, setHeight] = useState(0);
  const [animate, setAnimate] = useState(false);
  const label = status === "done" ? `Thought for ${formatDuration(duration)}` : "Thinking";
  const showPreview = status === "thinking" && !open && preview.trim().length > 0;

  const defaultOpenRef = useRef(defaultOpen);

  useEffect(() => {
    const defaultChanged = defaultOpenRef.current !== defaultOpen;
    defaultOpenRef.current = defaultOpen;

    if (defaultChanged) manualRef.current = false;
    if (manualRef.current) return;

    if (status === "done") {
      setOpen(false);
      return;
    }

    setOpen(defaultOpen);
  }, [defaultOpen, status]);

  const contentKey = `${status}:${text}:${preview}`;

  useLayoutEffect(() => {
    const inner = innerRef.current;
    if (!inner || contentKey.length < 0) return;

    setHeight(open ? inner.scrollHeight : 0);
  }, [contentKey, open]);

  useEffect(() => {
    const inner = innerRef.current;
    if (!inner || typeof ResizeObserver === "undefined") return undefined;

    const observer = new ResizeObserver(() => {
      if (!open) return;
      setHeight(inner.scrollHeight);
    });

    observer.observe(inner);

    return () => {
      observer.disconnect();
    };
  }, [open]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setAnimate(true);
    });

    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, []);

  useLayoutEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller || status !== "thinking" || !open || !pinnedRef.current) return;
    if (contentKey.length === 0) return;

    scroller.scrollTop = scroller.scrollHeight;
  }, [contentKey, open, status]);

  const handleToggle = () => {
    manualRef.current = true;
    setOpen((current) => !current);
  };

  const handleScroll = () => {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    pinnedRef.current = isPinnedToBottom(
      scroller.scrollTop,
      scroller.clientHeight,
      scroller.scrollHeight,
    );
  };

  return (
    <div
      className={cn("thinking-block", className)}
      data-animate={animate && !reduced ? "true" : "false"}
      data-open={open ? "true" : "false"}
      data-reduced-motion={reduced ? "true" : "false"}
      data-status={status}
      style={{ "--thinking-height": `${height}px` } as CSSProperties}
    >
      <button
        aria-controls={panelId}
        aria-expanded={open}
        className="thinking-block__header"
        onClick={handleToggle}
        type="button"
      >
        <span className="thinking-block__label">
          {label}
          <span aria-hidden="true" className="thinking-block__shine">
            {label}
          </span>
        </span>
        <Chevron />
        {showPreview ? <span className="thinking-block__preview">{preview}</span> : null}
      </button>
      <div className="thinking-block__clip">
        <div className="thinking-block__panel" id={panelId} ref={innerRef}>
          <div
            aria-hidden={open ? undefined : true}
            className="thinking-block__scroller"
            onScroll={handleScroll}
            ref={scrollerRef}
          >
            <p className="thinking-block__text">{text}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Chevrón pequeño. Gira cuando el bloque está abierto.
 *
 * @returns El ícono.
 */
const Chevron = () => {
  return (
    <svg aria-hidden="true" className="thinking-block__chevron" viewBox="0 0 16 16">
      <path
        d="M6 3.5 10.5 8 6 12.5"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.35"
      />
    </svg>
  );
};
