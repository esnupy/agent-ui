"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
import type { ReplayMessage, ReplayState, ReplayThought } from "../core/types";
import { useReplayState } from "./context";
import { Panel } from "./panel";

const selectMessages = (state: ReplayState) => state.messages;
const selectThoughts = (state: ReplayState) => state.thoughts;

type FeedItem =
  | { kind: "message"; t: number; message: ReplayMessage }
  | { kind: "thought"; t: number; thought: ReplayThought };

/** Distancia al fondo que todavía cuenta como "pegado abajo". */
const STICK_PX = 56;

/**
 * Conversación: mensajes con texto parcial y pensamientos atenuados.
 *
 * @returns El panel.
 */
export const ChatPanel = () => {
  const messages = useReplayState(selectMessages);
  const thoughts = useReplayState(selectThoughts);
  const bodyRef = useRef<HTMLDivElement>(null);
  const stick = useRef(true);

  const items = useMemo<FeedItem[]>(() => {
    const feed: FeedItem[] = [
      ...messages.map((message) => ({ kind: "message" as const, t: message.t, message })),
      ...thoughts.map((thought) => ({ kind: "thought" as const, t: thought.t, thought })),
    ];
    return feed.sort((a, b) => a.t - b.t);
  }, [messages, thoughts]);

  useLayoutEffect(() => {
    const body = bodyRef.current;
    if (body && stick.current) body.scrollTop = body.scrollHeight;
  });

  const handleScroll = () => {
    const body = bodyRef.current;
    if (!body) return;
    stick.current = body.scrollHeight - body.scrollTop - body.clientHeight < STICK_PX;
  };

  return (
    <Panel id="chat" title="Conversación">
      <div className="agent-replay__panel-body" onScroll={handleScroll} ref={bodyRef}>
        {items.length === 0 ? (
          <p className="agent-replay__empty">Todavía no hay mensajes.</p>
        ) : (
          <ol className="agent-replay__feed">
            {items.map((item) =>
              item.kind === "message" ? (
                <li
                  className="agent-replay__message"
                  data-role={item.message.role}
                  data-streaming={item.message.streaming}
                  key={item.message.id}
                >
                  <span className="agent-replay__sr">
                    {item.message.role === "user" ? "Usuario: " : "Agente: "}
                  </span>
                  {item.message.text}
                  {item.message.streaming ? (
                    <span aria-hidden="true" className="agent-replay__caret" />
                  ) : null}
                </li>
              ) : (
                <li className="agent-replay__thought" key={item.thought.id}>
                  <span className="agent-replay__thought-label">Pensando</span>
                  {item.thought.text}
                </li>
              ),
            )}
          </ol>
        )}
      </div>
    </Panel>
  );
};
