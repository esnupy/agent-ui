"use client";

import { useMemo, useRef } from "react";
import { APPROVAL_STATUS_LABEL } from "../core/format";
import type { ReplayApproval, ReplayError, ReplayState, ReplayToolCall } from "../core/types";
import { useReplayContext, useReplayState } from "./context";
import { EventIcon } from "./icons";
import { Panel } from "./panel";
import { useFlip } from "./use-flip";

const selectTools = (state: ReplayState) => state.tools;
const selectApprovals = (state: ReplayState) => state.approvals;
const selectErrors = (state: ReplayState) => state.errors;

type Entry =
  | { kind: "tool"; key: string; t: number; tool: ReplayToolCall }
  | { kind: "approval"; key: string; t: number; approval: ReplayApproval }
  | { kind: "error"; key: string; t: number; error: ReplayError };

const TOOL_STATUS = { running: "En curso", ok: "Listo", error: "Falló" } as const;

/**
 * Una llamada: se abre al empezar y muestra la salida cuando llega el resultado.
 *
 * @returns La card.
 */
const ToolCard = ({ tool }: { tool: ReplayToolCall }) => {
  const open = tool.status !== "running";

  return (
    <article className="agent-replay__card" data-status={tool.status}>
      <header className="agent-replay__card-header">
        <EventIcon type="tool_call" />
        <span className="agent-replay__card-name">{tool.name}</span>
        <span className="agent-replay__card-status">
          {tool.status === "running" ? (
            <span aria-hidden="true" className="agent-replay__spinner" />
          ) : null}
          {TOOL_STATUS[tool.status]}
        </span>
      </header>
      <code className="agent-replay__card-input">{tool.input}</code>
      <div className="agent-replay__card-output" data-open={open}>
        <div>
          <pre>{tool.output ?? ""}</pre>
        </div>
      </div>
    </article>
  );
};

/**
 * Llamadas a herramientas, aprobaciones y errores. Lo más reciente arriba.
 *
 * @returns El panel.
 */
export const ToolsPanel = () => {
  const tools = useReplayState(selectTools);
  const approvals = useReplayState(selectApprovals);
  const errors = useReplayState(selectErrors);
  const { reduced } = useReplayContext();
  const listRef = useRef<HTMLOListElement>(null);

  const entries = useMemo<Entry[]>(() => {
    const all: Entry[] = [
      ...tools.map((tool) => ({ kind: "tool" as const, key: `t:${tool.callId}`, t: tool.t, tool })),
      ...approvals.map((approval) => ({
        kind: "approval" as const,
        key: `a:${approval.id}`,
        t: approval.t,
        approval,
      })),
      ...errors.map((error) => ({
        kind: "error" as const,
        key: `e:${error.id}`,
        t: error.t,
        error,
      })),
    ];
    return all.sort((a, b) => b.t - a.t);
  }, [tools, approvals, errors]);

  useFlip(listRef, !reduced);

  const running = tools.filter((tool) => tool.status === "running").length;

  return (
    <Panel
      id="tools"
      meta={
        tools.length > 0
          ? `${tools.length} ${tools.length === 1 ? "llamada" : "llamadas"}${running ? ` · ${running} abierta` : ""}`
          : undefined
      }
      title="Herramientas"
    >
      <div className="agent-replay__panel-body">
        {entries.length === 0 ? (
          <p className="agent-replay__empty">Sin llamadas todavía.</p>
        ) : (
          <ol className="agent-replay__cards" ref={listRef}>
            {entries.map((entry) => (
              <li data-flip={entry.key} key={entry.key}>
                {entry.kind === "tool" ? <ToolCard tool={entry.tool} /> : null}
                {entry.kind === "approval" ? (
                  <article className="agent-replay__notice" data-status={entry.approval.status}>
                    <EventIcon type="approval" />
                    <span>{entry.approval.title}</span>
                    <span className="agent-replay__notice-status">
                      {APPROVAL_STATUS_LABEL[entry.approval.status]}
                    </span>
                  </article>
                ) : null}
                {entry.kind === "error" ? (
                  <article className="agent-replay__notice" data-kind="error" role="note">
                    <EventIcon type="error" />
                    <span>{entry.error.message}</span>
                  </article>
                ) : null}
              </li>
            ))}
          </ol>
        )}
      </div>
    </Panel>
  );
};
