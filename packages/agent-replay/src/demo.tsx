"use client";

import { type CSSProperties, useMemo } from "react";
import { AgentReplay } from "./agent-replay";
import { formatTime } from "./core/format";
import { createMockRun } from "./core/mock-run";
import type { ReplayEvent } from "./core/types";
import { useReplay } from "./use-replay";

const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;

/**
 * Un reproductor propio con `useReplay`: barra, paso actual y conteos.
 *
 * @returns El mini reproductor.
 */
const HeadlessDemo = ({ events }: { events: readonly ReplayEvent[] }) => {
  const { t, state, duration, playing, toggle, seek } = useReplay(events, {
    autoPlay: true,
    loop: true,
    speed: 2,
  });
  const current =
    state.plan.find((step) => step.status === "in_progress") ??
    state.plan.find((step) => step.status === "error") ??
    state.plan.at(-1);
  const progress = duration > 0 ? (t / duration) * 100 : 0;

  return (
    <div className="agent-replay-headless">
      <button
        aria-label={playing ? "Pausar" : "Reproducir"}
        className="agent-replay-headless__play"
        onClick={toggle}
        type="button"
      >
        {playing ? "❚❚" : "▶"}
      </button>
      <div className="agent-replay-headless__body">
        <div className="agent-replay-headless__row">
          <span className="agent-replay-headless__step">{current?.title ?? "Esperando plan"}</span>
          <span className="agent-replay-headless__time">{formatTime(t)}</span>
        </div>
        <input
          aria-label="Posición"
          className="agent-replay-headless__range"
          max={duration}
          min={0}
          onChange={(event) => seek(Number(event.target.value))}
          step={1}
          style={{ "--progress": `${progress}%` } as CSSProperties}
          type="range"
          value={Math.round(t)}
        />
        <div className="agent-replay-headless__row agent-replay-headless__stats">
          <span>{plural(state.tools.length, "herramienta", "herramientas")}</span>
          <span>{plural(state.files.length, "archivo", "archivos")}</span>
          <span>
            {state.messages.at(-1)?.streaming ? "escribiendo…" : `${state.index} eventos`}
          </span>
        </div>
      </div>
    </div>
  );
};

/**
 * Un run de ejemplo de ~45 s en autoplay, y debajo el mismo run con el hook headless.
 *
 * @returns La demo.
 */
export const Demo = () => {
  const events = useMemo(() => createMockRun({ seed: 7, durationMs: 45_000 }), []);

  return (
    <div className="agent-replay-demo">
      <AgentReplay autoPlay events={events} loop />
      <p className="agent-replay-demo__label">useReplay, con tu propia UI</p>
      <HeadlessDemo events={events} />
    </div>
  );
};
