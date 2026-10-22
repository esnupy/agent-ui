"use client";

import { cn, useReducedMotion } from "@componentes-ia/core";
import {
  type ComponentPropsWithoutRef,
  type KeyboardEvent,
  type PointerEvent,
  useMemo,
  useRef,
} from "react";
import { createMockRun } from "./core/mock-run";
import type { ReplayEvent } from "./core/types";
import { REPLAY_SPEEDS, type ReplaySpeed } from "./replay-store";
import { type RenderEvent, ReplayContext, type ReplayContextValue } from "./ui/context";
import { Controls } from "./ui/controls";
import { resolveShortcut, runShortcut } from "./ui/shortcuts";
import { REPLAY_PANELS, type ReplayPanel, resolvePanels, Stage } from "./ui/stage";
import { Timeline } from "./ui/timeline";
import { useReplayStore } from "./use-replay";

export type AgentReplayProps = Omit<ComponentPropsWithoutRef<"section">, "children" | "onSeek"> & {
  /** Eventos del run. Sin esta prop se reproduce `createMockRun({ seed })`. */
  events?: readonly ReplayEvent[];
  /** Semilla del run de ejemplo cuando no pasas `events`. */
  seed?: number;
  /** Sigue los eventos nuevos mientras el playhead esté al final. */
  live?: boolean;
  /** Empieza a reproducir al montar. */
  autoPlay?: boolean;
  /** Vuelve a empezar al terminar. No aplica en vivo. */
  loop?: boolean;
  /** Velocidad inicial. */
  defaultSpeed?: ReplaySpeed | `${ReplaySpeed}`;
  /** Paneles visibles, en orden. También acepta texto separado por comas. */
  panels?: readonly ReplayPanel[] | string;
  /** Se llama con el tiempo en ms cada vez que el usuario mueve el playhead. */
  onSeek?: (t: number) => void;
  /** Vista previa propia de un evento en el tooltip. Regresa `undefined` para usar la de serie. */
  renderEvent?: RenderEvent;
};

const DEFAULT_PANELS: readonly ReplayPanel[] = REPLAY_PANELS;

const parseSpeed = (value: AgentReplayProps["defaultSpeed"]): ReplaySpeed => {
  const speed = Number(value);
  return (REPLAY_SPEEDS as readonly number[]).includes(speed) ? (speed as ReplaySpeed) : 1;
};

const isEditable = (target: EventTarget) => {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.isContentEditable ||
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement
  );
};

/**
 * Reproductor de la ejecución de un agente.
 *
 * Arrastra el playhead y el escenario reconstruye el estado exacto en ese
 * instante: el texto se escribe y se borra, el plan avanza y retrocede, las
 * cards se abren y se cierran, y el diff gana o pierde líneas.
 *
 * Atajos con el foco dentro: espacio, ← →, J K L, Inicio y Fin, [ y ].
 *
 * @param props - Eventos, modo vivo, paneles y callbacks.
 * @returns El reproductor.
 */
export const AgentReplay = ({
  events,
  seed = 7,
  live = false,
  autoPlay = false,
  loop = false,
  defaultSpeed = 1,
  panels = DEFAULT_PANELS,
  onSeek,
  renderEvent,
  className,
  onKeyDown,
  onPointerDown,
  ...rest
}: AgentReplayProps) => {
  const fallback = useMemo(() => (events ? null : createMockRun({ seed })), [events, seed]);
  const source = events ?? fallback ?? [];
  const store = useReplayStore(source, {
    live,
    loop,
    autoPlay,
    speed: parseSpeed(defaultSpeed),
    onSeek,
  });
  const reduced = useReducedMotion();
  const rootRef = useRef<HTMLElement>(null);
  const visible = useMemo(() => resolvePanels(panels), [panels]);

  const context = useMemo<ReplayContextValue>(
    () => ({ store, reduced, renderEvent }),
    [store, reduced, renderEvent],
  );

  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    onKeyDown?.(event);
    if (event.defaultPrevented || isEditable(event.target)) return;

    const action = resolveShortcut(event);
    if (!action) return;

    // Espacio sobre un botón ya lo activa el navegador.
    if (action === "toggle" && event.target instanceof HTMLButtonElement) return;

    event.preventDefault();
    runShortcut(store, action);
  };

  // Un clic en una zona sin foco deja el foco en el reproductor, para que sigan los atajos.
  const handlePointerDown = (event: PointerEvent<HTMLElement>) => {
    onPointerDown?.(event);
    const target = event.target;
    if (
      target instanceof HTMLElement &&
      target.closest("button, a, input, [tabindex]") !== rootRef.current
    ) {
      return;
    }
    rootRef.current?.focus({ preventScroll: true });
  };

  return (
    <ReplayContext.Provider value={context}>
      <section
        aria-label="Reproducción del agente"
        aria-keyshortcuts="Space ArrowLeft ArrowRight J K L Home End [ ]"
        className={cn("agent-replay", className)}
        data-reduced-motion={reduced}
        onKeyDown={handleKeyDown}
        onPointerDown={handlePointerDown}
        ref={rootRef}
        tabIndex={-1}
        {...rest}
      >
        <Stage panels={visible} />
        <div className="agent-replay__dock">
          <Timeline />
          <Controls />
        </div>
      </section>
    </ReplayContext.Provider>
  );
};
