"use client";

import { useLayoutEffect, useRef } from "react";
import { formatTime } from "../core/format";
import { REPLAY_SPEEDS, type ReplayStatus } from "../replay-store";
import { useReplayContext, useReplayStatus } from "./context";
import { CloseIcon, LoopIcon, NextIcon, PauseIcon, PlayIcon, PrevIcon } from "./icons";

const selectPlaying = (status: ReplayStatus) => status.playing;
const selectSpeed = (status: ReplayStatus) => status.speed;
const selectReverse = (status: ReplayStatus) => status.playing && status.direction < 0;
const selectRange = (status: ReplayStatus) => status.range;
const selectLive = (status: ReplayStatus) => status.live;
const selectFollowing = (status: ReplayStatus) => status.following;
const selectDuration = (status: ReplayStatus) => status.duration;

/**
 * Play, evento anterior y siguiente, reloj, rango, vivo y velocidad.
 *
 * @returns La barra de controles.
 */
export const Controls = () => {
  const { store } = useReplayContext();
  const playing = useReplayStatus(selectPlaying);
  const speed = useReplayStatus(selectSpeed);
  const reverse = useReplayStatus(selectReverse);
  const range = useReplayStatus(selectRange);
  const live = useReplayStatus(selectLive);
  const following = useReplayStatus(selectFollowing);
  const duration = useReplayStatus(selectDuration);
  const clockRef = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    const update = () => {
      if (clockRef.current) clockRef.current.textContent = formatTime(store.getTime());
    };
    update();
    return store.subscribeTime(update);
  }, [store]);

  return (
    <fieldset aria-label="Controles de reproducción" className="agent-replay__controls">
      <div className="agent-replay__transport">
        <button
          aria-label="Evento anterior"
          className="agent-replay__icon-button"
          onClick={() => store.stepEvent(-1)}
          type="button"
        >
          <PrevIcon />
        </button>
        <button
          aria-label={playing ? "Pausar" : "Reproducir"}
          className="agent-replay__play"
          onClick={store.toggle}
          type="button"
        >
          {playing ? <PauseIcon /> : <PlayIcon />}
        </button>
        <button
          aria-label="Evento siguiente"
          className="agent-replay__icon-button"
          onClick={() => store.stepEvent(1)}
          type="button"
        >
          <NextIcon />
        </button>
      </div>

      <span className="agent-replay__clock">
        <span ref={clockRef}>{formatTime(store.getTime())}</span>
        <span className="agent-replay__clock-total"> / {formatTime(duration)}</span>
      </span>

      {reverse ? <span className="agent-replay__chip">Reversa</span> : null}

      {range ? (
        <span className="agent-replay__chip" data-kind="loop">
          <LoopIcon />
          <span>
            {formatTime(range.a)} – {formatTime(range.b)}
          </span>
          <button
            aria-label="Quitar loop"
            className="agent-replay__chip-close"
            onClick={() => store.setRange(null)}
            type="button"
          >
            <CloseIcon />
          </button>
        </span>
      ) : null}

      <span className="agent-replay__spacer" />

      {live ? (
        following ? (
          <span className="agent-replay__live" data-following="true">
            <span aria-hidden="true" className="agent-replay__live-dot" />
            En vivo
          </span>
        ) : (
          <button className="agent-replay__live" onClick={store.goLive} type="button">
            <span aria-hidden="true" className="agent-replay__live-dot" />
            Volver a en vivo
          </button>
        )
      ) : null}

      <fieldset aria-label="Velocidad" className="agent-replay__speeds">
        {REPLAY_SPEEDS.map((value) => (
          <button
            aria-pressed={value === speed}
            className="agent-replay__speed"
            key={value}
            onClick={() => store.setSpeed(value)}
            type="button"
          >
            {value}×
          </button>
        ))}
      </fieldset>
    </fieldset>
  );
};
