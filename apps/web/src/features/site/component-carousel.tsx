"use client";

import { useReducedMotion } from "@componentes-ia/core";
import { type FocusEvent, useEffect, useRef } from "react";
import { components } from "@/generated/components";
import { DemoFrame } from "./demo-frame";
import { InstallChip } from "./install-chip";

const INTERVAL_MS = 7000;

type ComponentCarouselProps = {
  index: number;
  onIndexChange: (index: number) => void;
};

/**
 * Muestra las demos del catálogo, una a la vez.
 *
 * Avanza sola. Se detiene si el sistema pide menos movimiento o si el foco
 * está dentro, para no cortar a quien está escribiendo en la demo.
 *
 * @param props - Índice visible y el callback para cambiarlo.
 * @returns El marco, el nombre del componente y los controles.
 */
export const ComponentCarousel = ({ index, onIndexChange }: ComponentCarouselProps) => {
  const reduced = useReducedMotion();
  const pausedRef = useRef(false);
  const count = components.length;
  const entry = components[index];

  useEffect(() => {
    if (reduced || count < 2) return undefined;

    const id = window.setInterval(() => {
      if (pausedRef.current) return;
      onIndexChange((index + 1) % count);
    }, INTERVAL_MS);

    return () => {
      window.clearInterval(id);
    };
  }, [index, onIndexChange, reduced]);

  if (!entry || count === 0) return null;

  const Demo = entry.Demo;

  const handleStep = (direction: -1 | 1) => {
    onIndexChange((index + direction + count) % count);
  };

  const handleFocus = () => {
    pausedRef.current = true;
  };

  const handleBlur = (event: FocusEvent<HTMLElement>) => {
    const next = event.relatedTarget;
    if (next instanceof Node && event.currentTarget.contains(next)) return;
    pausedRef.current = false;
  };

  return (
    <section
      aria-label="Componentes de la biblioteca"
      aria-roledescription="carrusel"
      className="min-w-0 w-full"
      onBlurCapture={handleBlur}
      onFocusCapture={handleFocus}
    >
      <div className="mb-3">
        <InstallChip command={`npm install ${entry.packageName}`} />
      </div>
      <DemoFrame label={entry.packageName}>
        <div className="ac-slide" key={entry.slug}>
          <Demo />
        </div>
      </DemoFrame>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p aria-live="polite" className="font-serif text-xl tracking-[-0.03em]">
          {entry.title}
        </p>
        <div className="flex items-center gap-2">
          <button
            aria-label="Anterior"
            className="inline-flex size-9 items-center justify-center border border-zinc-300 text-zinc-800 hover:bg-zinc-100 focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-zinc-950 dark:border-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-900 dark:focus-visible:outline-zinc-50"
            onClick={() => {
              handleStep(-1);
            }}
            type="button"
          >
            <Arrow direction="left" />
          </button>
          <div className="flex items-center gap-1.5">
            {components.map((component, dotIndex) => {
              const selected = dotIndex === index;

              return (
                <button
                  aria-current={selected ? "true" : undefined}
                  aria-label={`Mostrar ${component.title}`}
                  className={
                    selected
                      ? "size-2.5 bg-zinc-950 focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-3 focus-visible:outline-zinc-950 dark:bg-zinc-50 dark:focus-visible:outline-zinc-50"
                      : "size-2.5 bg-zinc-300 hover:bg-zinc-500 focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-3 focus-visible:outline-zinc-950 dark:bg-zinc-700 dark:hover:bg-zinc-400 dark:focus-visible:outline-zinc-50"
                  }
                  key={component.slug}
                  onClick={() => {
                    onIndexChange(dotIndex);
                  }}
                  type="button"
                />
              );
            })}
          </div>
          <button
            aria-label="Siguiente"
            className="inline-flex size-9 items-center justify-center border border-zinc-300 text-zinc-800 hover:bg-zinc-100 focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-zinc-950 dark:border-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-900 dark:focus-visible:outline-zinc-50"
            onClick={() => {
              handleStep(1);
            }}
            type="button"
          >
            <Arrow direction="right" />
          </button>
        </div>
      </div>
    </section>
  );
};

type ArrowProps = {
  direction: "left" | "right";
};

/**
 * Flecha de los controles del carrusel.
 *
 * @param props - Hacia dónde apunta.
 * @returns El SVG.
 */
const Arrow = ({ direction }: ArrowProps) => {
  const path = direction === "left" ? "M9.5 3.5 5 8l4.5 4.5" : "M6.5 3.5 11 8l-4.5 4.5";

  return (
    <svg aria-hidden="true" className="size-4" viewBox="0 0 16 16">
      <path
        d={path}
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.4"
      />
    </svg>
  );
};
