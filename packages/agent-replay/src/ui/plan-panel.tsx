"use client";

import { useRef } from "react";
import { PLAN_STATUS_LABEL } from "../core/format";
import type { ReplayState } from "../core/types";
import { useReplayContext, useReplayState } from "./context";
import { Panel } from "./panel";
import { useFlip } from "./use-flip";

const selectPlan = (state: ReplayState) => state.plan;

/**
 * Icono de estado. El palomazo y la cruz se dibujan con `stroke-dashoffset`,
 * así la animación corre hacia adelante y hacia atrás al hacer scrub.
 *
 * @returns El SVG.
 */
const StatusIcon = () => {
  return (
    <svg aria-hidden="true" className="agent-replay__step-icon" viewBox="0 0 16 16">
      <circle className="agent-replay__step-ring" cx="8" cy="8" r="6.25" />
      <circle className="agent-replay__step-arc" cx="8" cy="8" r="6.25" />
      <path className="agent-replay__step-check" d="M5.2 8.3 7.1 10.1 10.9 6" pathLength="1" />
      <path
        className="agent-replay__step-cross"
        d="M5.8 5.8 10.2 10.2M10.2 5.8 5.8 10.2"
        pathLength="1"
      />
      <path className="agent-replay__step-skip" d="M5.5 8h5" />
    </svg>
  );
};

/**
 * Plan del agente con su avance.
 *
 * @returns El panel.
 */
export const PlanPanel = () => {
  const plan = useReplayState(selectPlan);
  const { reduced } = useReplayContext();
  const listRef = useRef<HTMLOListElement>(null);
  const done = plan.filter((step) => step.status === "done").length;

  useFlip(listRef, !reduced);

  return (
    <Panel id="plan" meta={plan.length > 0 ? `${done} de ${plan.length}` : undefined} title="Plan">
      <div className="agent-replay__panel-body">
        {plan.length === 0 ? (
          <p className="agent-replay__empty">El agente no ha publicado un plan.</p>
        ) : (
          <ol className="agent-replay__steps" ref={listRef}>
            {plan.map((step) => (
              <li
                className="agent-replay__step"
                data-flip={step.id}
                data-status={step.status}
                key={step.id}
              >
                <StatusIcon />
                <span className="agent-replay__step-title">
                  {step.title}
                  <span aria-hidden="true" className="agent-replay__step-strike" />
                </span>
                <span className="agent-replay__sr">, {PLAN_STATUS_LABEL[step.status]}</span>
              </li>
            ))}
          </ol>
        )}
      </div>
    </Panel>
  );
};
