"use client";

import {
  type PointerEvent as ReactPointerEvent,
  type RefObject,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { describeEvent, EVENT_LABEL, formatTime } from "../core/format";
import type { ReplayEvent } from "../core/types";
import type { ReplayRange, ReplayStatus } from "../replay-store";
import { clusterMarks, type MarkGroup, type Viewport } from "./cluster";
import { useReplayContext, useReplayStatus } from "./context";
import { EventIcon, ZoomInIcon, ZoomOutIcon } from "./icons";
import { Minimap } from "./minimap";
import {
  estimateVelocity,
  findSnapTarget,
  type PointerSample,
  REST_VELOCITY,
  stepInertia,
  stepSpring,
} from "./physics";
import { setCapture } from "./pointer";

/** Lo mínimo que se puede acercar, en ms visibles. */
const MIN_SPAN = 800;
/** Radio del snap magnético, en px. */
const SNAP_PX = 14;
/** Movimiento que convierte un clic en arrastre, en px. */
const DRAG_PX = 4;
/** Distancia para que el cursor cuente sobre una marca, en px. */
const HOVER_PX = 9;
/** Un rango más corto que esto se toma como clic. */
const MIN_RANGE_MS = 120;
/** Separación mínima entre marcas antes de agruparlas, en px. Un poco más que una marca. */
const CLUSTER_PX = 24;
/** Una etiqueta de la regla más cerca del borde derecho se cortaría. */
const TICK_LABEL_PX = 32;
/** Eventos que se listan en el tooltip de un grupo. */
const TOOLTIP_ITEMS = 3;
/** Pasos posibles de la regla, en ms. */
const TICK_STEPS = [
  100, 250, 500, 1000, 2000, 5000, 10_000, 15_000, 30_000, 60_000, 120_000, 300_000,
];

const selectDuration = (status: ReplayStatus) => status.duration;
const selectCount = (status: ReplayStatus) => status.count;
const selectRange = (status: ReplayStatus) => status.range;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const now = () => globalThis.performance?.now() ?? Date.now();

const requestFrame = (callback: (time: number) => void) =>
  typeof globalThis.requestAnimationFrame === "function"
    ? globalThis.requestAnimationFrame(callback)
    : (globalThis.setTimeout(() => callback(now()), 16) as unknown as number);

const cancelFrame = (id: number) => {
  if (typeof globalThis.cancelAnimationFrame === "function") globalThis.cancelAnimationFrame(id);
  globalThis.clearTimeout(id);
};

const formatTick = (t: number, step: number) => {
  const total = Math.round(t);
  const minutes = Math.floor(total / 60_000);
  const seconds = Math.floor((total % 60_000) / 1000);
  const base = `${minutes}:${String(seconds).padStart(2, "0")}`;
  return step < 1000 ? `${base}.${Math.floor((total % 1000) / 100)}` : base;
};

/**
 * Ancho de un elemento, al día con ResizeObserver cuando existe.
 *
 * @param ref - Elemento.
 * @returns El ancho en px.
 */
const useWidth = (ref: RefObject<HTMLElement | null>) => {
  const [width, setWidth] = useState(0);

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return undefined;

    const measure = () => setWidth(element.clientWidth);
    measure();
    if (typeof ResizeObserver === "undefined") return undefined;

    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref]);

  return width;
};

const valueText = (t: number, event: ReplayEvent | undefined) => {
  if (!event) return formatTime(t);
  return `${formatTime(t)}, ${EVENT_LABEL[event.type]}: ${describeEvent(event)}`;
};

/**
 * Pista inferior: regla, marcas agrupadas, playhead con física, rango A–B,
 * zoom y minimapa de densidad.
 *
 * El playhead, la hora y los atributos del slider se escriben directo al DOM
 * desde la suscripción al tiempo. React solo vuelve a renderizar cuando cambian
 * los eventos, el zoom, el ancho o el rango.
 *
 * @returns La línea de tiempo.
 */
export const Timeline = () => {
  const { store, reduced, renderEvent } = useReplayContext();
  const duration = useReplayStatus(selectDuration);
  const count = useReplayStatus(selectCount);
  const range = useReplayStatus(selectRange);

  const sliderRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const headRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLSpanElement>(null);
  const width = useWidth(trackRef);

  const [zoom, setZoom] = useState<Viewport | null>(null);
  const [draft, setDraft] = useState<ReplayRange | null>(null);
  const [hover, setHover] = useState<MarkGroup | null>(null);

  const total = Math.max(duration, 1);
  const view = useMemo<Viewport>(
    () => (zoom ? { start: zoom.start, end: Math.min(zoom.end, total) } : { start: 0, end: total }),
    [zoom, total],
  );
  const span = view.end - view.start;

  // Los manejadores nativos y los cuadros de física leen lo último por ref.
  const live = useRef({ view, width, total, zoomed: zoom !== null });
  live.current = { view, width, total, zoomed: zoom !== null };

  const timeline = store.getTimeline();

  // biome-ignore lint/correctness/useExhaustiveDependencies: count cambia cuando llegan eventos nuevos al mismo timeline.
  const groups = useMemo(
    () => clusterMarks(timeline.events, view, width, CLUSTER_PX),
    [timeline, count, view, width],
  );

  const ticks = useMemo(() => {
    if (width <= 0) return [];
    const scale = width / span;
    const step = TICK_STEPS.find((candidate) => candidate * scale >= 72) ?? 600_000;
    const list: { t: number; x: number; label: string }[] = [];
    for (let t = Math.ceil(view.start / step) * step; t <= view.end; t += step) {
      const x = (t - view.start) * scale;
      if (x > width - TICK_LABEL_PX) break;
      list.push({ t, x, label: formatTick(t, step) });
    }
    return list;
  }, [view, width, span]);

  const xToT = (x: number) => {
    const current = live.current;
    const currentSpan = current.view.end - current.view.start;
    return current.view.start + (x / Math.max(1, current.width)) * currentSpan;
  };

  const tToX = (t: number) => {
    const current = live.current;
    const currentSpan = current.view.end - current.view.start;
    return ((t - current.view.start) / currentSpan) * current.width;
  };

  const localX = (event: { clientX: number }) => {
    const rect = trackRef.current?.getBoundingClientRect();
    return rect ? event.clientX - rect.left : 0;
  };

  const zoomAround = (center: number, nextSpan: number, ratio: number) => {
    const { total: currentTotal } = live.current;
    const bounded = clamp(nextSpan, Math.min(MIN_SPAN, currentTotal), currentTotal);
    if (bounded >= currentTotal - 1) {
      setZoom(null);
      return;
    }
    const start = clamp(center - ratio * bounded, 0, currentTotal - bounded);
    setZoom({ start, end: start + bounded });
  };

  const panBy = (dx: number) => {
    const current = live.current;
    if (!current.zoomed) return;
    const currentSpan = current.view.end - current.view.start;
    const start = clamp(
      current.view.start + (dx / Math.max(1, current.width)) * currentSpan,
      0,
      current.total - currentSpan,
    );
    setZoom({ start, end: start + currentSpan });
  };

  const panTo = (center: number) => {
    const current = live.current;
    if (!current.zoomed) return;
    const currentSpan = current.view.end - current.view.start;
    const start = clamp(center - currentSpan / 2, 0, current.total - currentSpan);
    setZoom({ start, end: start + currentSpan });
  };

  // Playhead, hora, slider y seguimiento del zoom, sin pasar por React.
  const aria = useRef({ index: -1, playing: false });
  // biome-ignore lint/correctness/useExhaustiveDependencies: view y width se leen por ref; cambiarlos debe recolocar el playhead.
  useLayoutEffect(() => {
    const update = () => {
      const t = store.getTime();
      const status = store.getStatus();
      const current = live.current;
      const x = tToX(t);
      const head = headRef.current;

      if (head) {
        head.style.transform = `translateX(${x}px)`;
        head.dataset.hidden = String(x < -1 || x > current.width + 1);
      }
      if (labelRef.current) labelRef.current.textContent = formatTime(t);

      if (current.zoomed && status.playing && (t > current.view.end || t < current.view.start)) {
        const currentSpan = current.view.end - current.view.start;
        const lead = status.direction > 0 ? 0.15 : 0.85;
        const start = clamp(t - lead * currentSpan, 0, current.total - currentSpan);
        setZoom({ start, end: start + currentSpan });
      }

      const index = store.getTimeline().indexAt(t);
      const slider = sliderRef.current;
      if (!slider) return;
      // Mientras reproduce, el slider solo se anuncia al cruzar un evento.
      if (status.playing && aria.current.playing && index === aria.current.index) return;
      aria.current = { index, playing: status.playing };
      slider.setAttribute("aria-valuenow", String(Math.round(t)));
      slider.setAttribute("aria-valuetext", valueText(t, store.getTimeline().events[index - 1]));
    };

    update();
    const stopTime = store.subscribeTime(update);
    const stopStatus = store.subscribeStatus(update);
    return () => {
      stopTime();
      stopStatus();
    };
  }, [store, view, width]);

  // Rueda: Ctrl (o el pinch del trackpad) acerca; horizontal o con Shift, desplaza.
  // biome-ignore lint/correctness/useExhaustiveDependencies: los manejadores leen todo por ref.
  useEffect(() => {
    const element = sliderRef.current;
    if (!element) return undefined;

    const handleWheel = (event: WheelEvent) => {
      const current = live.current;
      if (event.ctrlKey || event.metaKey) {
        event.preventDefault();
        const x = localX(event);
        const ratio = clamp(x / Math.max(1, current.width), 0, 1);
        const currentSpan = current.view.end - current.view.start;
        zoomAround(xToT(x), currentSpan * Math.exp(event.deltaY * 0.01), ratio);
        return;
      }

      const dx = event.shiftKey ? event.deltaY : event.deltaX;
      if (current.zoomed && Math.abs(dx) > Math.abs(event.shiftKey ? 0 : event.deltaY)) {
        event.preventDefault();
        panBy(dx);
      }
    };

    element.addEventListener("wheel", handleWheel, { passive: false });
    return () => element.removeEventListener("wheel", handleWheel);
  }, []);

  // --- Scrub con física -------------------------------------------------------
  const drag = useRef<PointerSample[] | null>(null);
  const motion = useRef<number | null>(null);
  /** Si reproducía antes de agarrar el playhead, vuelve a reproducir al asentarse. */
  const resume = useRef(false);

  const stopMotion = () => {
    if (motion.current !== null) cancelFrame(motion.current);
    motion.current = null;
  };

  useEffect(
    () => () => {
      if (motion.current !== null) cancelFrame(motion.current);
    },
    [],
  );

  const seekX = (x: number) => {
    store.seek(xToT(clamp(x, 0, live.current.width)));
  };

  const snapFrom = (x: number) => {
    const current = live.current;
    const radius = (SNAP_PX / Math.max(1, current.width)) * (current.view.end - current.view.start);
    return findSnapTarget(store.getTimeline().times, xToT(x), radius);
  };

  const settle = (startX: number, startV: number) => {
    const finish = (target: number | null) => {
      motion.current = null;
      if (target !== null) store.seek(target);
      if (resume.current) store.play();
      resume.current = false;
    };

    if (reduced) {
      finish(snapFrom(startX));
      return;
    }

    let x = startX;
    let v = startV;
    let target: number | null = null;
    let phase: "inertia" | "snap" = Math.abs(v) > REST_VELOCITY ? "inertia" : "snap";
    let last = now();

    if (phase === "snap") {
      target = snapFrom(x);
      if (target === null) {
        finish(null);
        return;
      }
    }

    const step = (time: number) => {
      const dt = clamp(time - last, 0, 32);
      last = time;
      const { width: currentWidth } = live.current;

      if (phase === "inertia") {
        ({ x, v } = stepInertia(x, v, dt));
        if (x <= 0 || x >= currentWidth) {
          x = clamp(x, 0, currentWidth);
          v = 0;
        }
        seekX(x);
        if (Math.abs(v) < REST_VELOCITY) {
          target = snapFrom(x);
          if (target === null) {
            finish(null);
            return;
          }
          phase = "snap";
        }
      } else if (target !== null) {
        const goal = tToX(target);
        ({ x, v } = stepSpring(x, v, goal, dt));
        if (Math.abs(x - goal) < 0.3 && Math.abs(v) < 0.02) {
          finish(target);
          return;
        }
        seekX(x);
      }

      motion.current = requestFrame(step);
    };

    motion.current = requestFrame(step);
  };

  const handleScrubDown = (event: ReactPointerEvent<HTMLElement>) => {
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    // Si todavía se desliza del arrastre anterior, conserva lo que había antes.
    if (motion.current === null) resume.current = store.getStatus().playing;
    stopMotion();
    setCapture(event.currentTarget, event.pointerId, true);
    sliderRef.current?.focus({ preventScroll: true });
    if (store.getStatus().playing) store.pause();
    const x = localX(event);
    drag.current = [{ x, time: event.timeStamp }];
    seekX(x);
  };

  const handleScrubMove = (event: ReactPointerEvent<HTMLElement>) => {
    const samples = drag.current;
    if (!samples) return;
    const x = localX(event);
    samples.push({ x, time: event.timeStamp });
    if (samples.length > 12) samples.shift();
    seekX(x);
  };

  const handleScrubUp = (event: ReactPointerEvent<HTMLElement>) => {
    const samples = drag.current;
    if (!samples) return;
    drag.current = null;
    setCapture(event.currentTarget, event.pointerId, false);
    const x = clamp(localX(event), 0, live.current.width);
    settle(x, reduced ? 0 : estimateVelocity(samples));
  };

  // --- Pista: clic, rango A–B, pinch y hover -----------------------------------
  const selection = useRef<{ x0: number; moved: boolean } | null>(null);
  const pointers = useRef(new Map<number, number>());
  const pinch = useRef<{ distance: number; span: number; center: number; ratio: number } | null>(
    null,
  );

  const nearestGroup = (x: number) => {
    let best: MarkGroup | null = null;
    for (const group of groups) {
      if (Math.abs(group.x - x) > HOVER_PX) continue;
      if (!best || Math.abs(group.x - x) < Math.abs(best.x - x)) best = group;
    }
    return best;
  };

  const handleTrackDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    stopMotion();
    const x = localX(event);
    pointers.current.set(event.pointerId, x);
    setCapture(event.currentTarget, event.pointerId, true);
    sliderRef.current?.focus({ preventScroll: true });

    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()] as [number, number];
      const current = live.current;
      selection.current = null;
      setDraft(null);
      pinch.current = {
        distance: Math.max(1, Math.abs(a - b)),
        span: current.view.end - current.view.start,
        center: xToT((a + b) / 2),
        ratio: clamp((a + b) / 2 / Math.max(1, current.width), 0, 1),
      };
      return;
    }

    selection.current = { x0: x, moved: false };
  };

  const handleTrackMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const x = localX(event);

    if (pointers.current.has(event.pointerId)) pointers.current.set(event.pointerId, x);

    if (pinch.current && pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()] as [number, number];
      const distance = Math.max(1, Math.abs(a - b));
      const current = pinch.current;
      zoomAround(current.center, current.span * (current.distance / distance), current.ratio);
      return;
    }

    const current = selection.current;
    if (current) {
      if (Math.abs(x - current.x0) > DRAG_PX) current.moved = true;
      if (current.moved) {
        setHover(null);
        setDraft({ a: xToT(current.x0), b: xToT(clamp(x, 0, live.current.width)) });
      }
      return;
    }

    if (event.pointerType === "mouse") setHover(nearestGroup(x));
  };

  const handleTrackUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    pointers.current.delete(event.pointerId);
    setCapture(event.currentTarget, event.pointerId, false);

    if (pinch.current) {
      if (pointers.current.size < 2) pinch.current = null;
      return;
    }

    const current = selection.current;
    selection.current = null;
    if (!current) return;

    const x = clamp(localX(event), 0, live.current.width);
    setDraft(null);

    if (current.moved) {
      const a = xToT(current.x0);
      const b = xToT(x);
      if (Math.abs(b - a) >= MIN_RANGE_MS) {
        store.setRange({ a, b });
        return;
      }
    }

    const group = nearestGroup(x);
    store.seek(group ? group.t : xToT(x));
  };

  const handleTrackCancel = (event: ReactPointerEvent<HTMLDivElement>) => {
    pointers.current.delete(event.pointerId);
    pinch.current = null;
    selection.current = null;
    setDraft(null);
  };

  const zoomButton = (factor: number) => {
    const current = live.current;
    const currentSpan = current.view.end - current.view.start;
    zoomAround(store.getTime(), currentSpan * factor, 0.5);
  };

  const band = (value: ReplayRange | null, kind: "range" | "draft") => {
    if (!value || width <= 0) return null;
    const left = clamp(tToX(Math.min(value.a, value.b)), 0, width);
    const right = clamp(tToX(Math.max(value.a, value.b)), 0, width);
    if (right - left <= 0) return null;
    return (
      <span
        aria-hidden="true"
        className="agent-replay__band"
        data-kind={kind}
        style={{ left, width: right - left }}
      />
    );
  };

  const hoverEvents = hover
    ? timeline.events.slice(hover.first, Math.min(hover.last + 1, hover.first + TOOLTIP_ITEMS))
    : [];

  return (
    <div className="agent-replay__timeline">
      <div className="agent-replay__timeline-bar">
        <span className="agent-replay__hint">
          Arrastra en la pista para marcar un loop · Ctrl + rueda para acercar
        </span>
        <fieldset aria-label="Zoom" className="agent-replay__zoom">
          <button
            aria-label="Alejar"
            className="agent-replay__icon-button"
            disabled={!zoom}
            onClick={() => zoomButton(2)}
            type="button"
          >
            <ZoomOutIcon />
          </button>
          <button
            aria-label="Acercar"
            className="agent-replay__icon-button"
            disabled={span <= Math.min(MIN_SPAN, total) + 1}
            onClick={() => zoomButton(0.5)}
            type="button"
          >
            <ZoomInIcon />
          </button>
        </fieldset>
      </div>

      <div
        aria-label="Posición en el run"
        aria-valuemax={Math.round(duration)}
        aria-valuemin={0}
        aria-valuenow={Math.round(store.getTime())}
        className="agent-replay__scrubber"
        ref={sliderRef}
        role="slider"
        tabIndex={0}
      >
        <div
          aria-hidden="true"
          className="agent-replay__ruler"
          onPointerCancel={handleScrubUp}
          onPointerDown={handleScrubDown}
          onPointerMove={handleScrubMove}
          onPointerUp={handleScrubUp}
        >
          {ticks.map((tick) => (
            <span className="agent-replay__tick" key={tick.t} style={{ left: tick.x }}>
              {tick.label}
            </span>
          ))}
        </div>

        <div
          aria-hidden="true"
          className="agent-replay__track"
          onPointerCancel={handleTrackCancel}
          onPointerDown={handleTrackDown}
          onPointerLeave={() => setHover(null)}
          onPointerMove={handleTrackMove}
          onPointerUp={handleTrackUp}
          ref={trackRef}
        >
          <span className="agent-replay__lane" />
          {band(range, "range")}
          {band(draft, "draft")}
          {groups.map((group) => (
            <span
              className="agent-replay__mark"
              data-active={hover?.first === group.first}
              data-grouped={group.count > 1}
              data-type={group.type}
              key={group.first}
              style={{ left: group.x }}
            >
              <EventIcon type={group.type} />
              {group.count > 1 ? (
                <span className="agent-replay__mark-count">{group.count}</span>
              ) : null}
            </span>
          ))}
        </div>

        <div aria-hidden="true" className="agent-replay__playhead" ref={headRef}>
          <span
            className="agent-replay__playhead-handle"
            onPointerCancel={handleScrubUp}
            onPointerDown={handleScrubDown}
            onPointerMove={handleScrubMove}
            onPointerUp={handleScrubUp}
          >
            <span className="agent-replay__playhead-time" ref={labelRef} />
          </span>
        </div>

        {hover && hoverEvents.length > 0 ? (
          <div
            className="agent-replay__tooltip"
            role="tooltip"
            style={{ left: clamp(hover.x, 120, Math.max(120, width - 120)) }}
          >
            {hoverEvents.map((event) => (
              <div className="agent-replay__tooltip-row" key={event.id}>
                <span className="agent-replay__tooltip-head">
                  <EventIcon type={event.type} />
                  {EVENT_LABEL[event.type]}
                  <time>{formatTime(event.t)}</time>
                </span>
                <span className="agent-replay__tooltip-body">
                  {renderEvent?.(event) ?? describeEvent(event)}
                </span>
              </div>
            ))}
            {hover.count > TOOLTIP_ITEMS ? (
              <span className="agent-replay__tooltip-more">
                y {hover.count - TOOLTIP_ITEMS} más
              </span>
            ) : null}
          </div>
        ) : null}
      </div>

      <Minimap onPan={panTo} view={zoom ? view : null} />
    </div>
  );
};
