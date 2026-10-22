"use client";

import { type PointerEvent as ReactPointerEvent, useLayoutEffect, useMemo, useRef } from "react";
import type { ReplayStatus } from "../replay-store";
import { densityBuckets, type Viewport } from "./cluster";
import { useReplayContext, useReplayStatus } from "./context";
import { setCapture } from "./pointer";

const BUCKETS = 120;
const HEIGHT = 20;

const selectDuration = (status: ReplayStatus) => status.duration;
const selectCount = (status: ReplayStatus) => status.count;

type MinimapProps = {
  /** Ventana visible cuando hay zoom. */
  view: Viewport | null;
  /** Centra la ventana en un tiempo. */
  onPan: (t: number) => void;
};

/**
 * Densidad de eventos en todo el run, con la ventana del zoom encima.
 *
 * Sin zoom, un clic hace seek. Con zoom, arrastrar mueve la ventana.
 *
 * @param props - Ventana y callback para moverla.
 * @returns El minimapa.
 */
export const Minimap = ({ view, onPan }: MinimapProps) => {
  const { store } = useReplayContext();
  const duration = useReplayStatus(selectDuration);
  const count = useReplayStatus(selectCount);
  const rootRef = useRef<HTMLDivElement>(null);
  const headRef = useRef<HTMLSpanElement>(null);
  const dragging = useRef(false);

  // biome-ignore lint/correctness/useExhaustiveDependencies: count cambia cuando llegan eventos al mismo timeline.
  const path = useMemo(() => {
    const counts = densityBuckets(store.getTimeline().times, duration, BUCKETS);
    const max = Math.max(1, ...counts);
    // Raíz cuadrada: una ráfaga no aplasta al resto.
    return counts
      .map((value, index) => {
        if (value === 0) return "";
        const height = Math.max(1.5, Math.sqrt(value / max) * HEIGHT);
        return `M${index + 0.5} ${HEIGHT}V${(HEIGHT - height).toFixed(2)}`;
      })
      .join("");
  }, [store, duration, count]);

  useLayoutEffect(() => {
    const update = () => {
      const head = headRef.current;
      const total = store.getStatus().duration;
      if (head) head.style.left = `${total > 0 ? (store.getTime() / total) * 100 : 0}%`;
    };
    update();
    return store.subscribeTime(update);
  }, [store]);

  const timeAt = (event: { clientX: number }) => {
    const rect = rootRef.current?.getBoundingClientRect();
    if (!rect || rect.width <= 0) return 0;
    return Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width)) * duration;
  };

  const handleDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    if (!view) {
      store.seek(timeAt(event));
      return;
    }
    dragging.current = true;
    setCapture(event.currentTarget, event.pointerId, true);
    onPan(timeAt(event));
  };

  const handleMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (dragging.current) onPan(timeAt(event));
  };

  const handleUp = () => {
    dragging.current = false;
  };

  const total = Math.max(1, duration);

  return (
    <div
      aria-hidden="true"
      className="agent-replay__minimap"
      onPointerCancel={handleUp}
      onPointerDown={handleDown}
      onPointerMove={handleMove}
      onPointerUp={handleUp}
      ref={rootRef}
    >
      <svg
        aria-hidden="true"
        className="agent-replay__minimap-bars"
        preserveAspectRatio="none"
        viewBox={`0 0 ${BUCKETS} ${HEIGHT}`}
      >
        <path d={path} />
      </svg>
      {view ? (
        <span
          className="agent-replay__minimap-window"
          style={{
            left: `${(view.start / total) * 100}%`,
            width: `${((view.end - view.start) / total) * 100}%`,
          }}
        />
      ) : null}
      <span className="agent-replay__minimap-head" ref={headRef} />
    </div>
  );
};
