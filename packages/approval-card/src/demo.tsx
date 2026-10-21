"use client";

import { AgentStatusIndicator } from "@componentes-ia/agent-task";
import { type CSSProperties, useLayoutEffect, useRef, useState } from "react";
import { ApprovalCard } from "./approval-card";
import type { ApprovalDecision, ApprovalKind, ApprovalRisk } from "./schema";

const SAMPLE_DIFF = [
  '- const out = "dist";',
  '+ const out = "build";',
  "+ await rm(out, { recursive: true });",
].join("\n");

type Request = {
  id: string;
  summary: string;
  agentName: string;
  verb: string;
  kind: ApprovalKind;
  risk: ApprovalRisk;
  reason: string;
  warning?: string;
  command?: string;
  cwd?: string;
  filePath?: string;
  additions?: number;
  deletions?: number;
  diff?: string;
  method?: string;
  url?: string;
  timeoutMs?: number;
};

const REQUESTS: Request[] = [
  {
    id: "rm",
    summary: "rm -rf dist",
    agentName: "Codey",
    verb: "run a command",
    kind: "command",
    risk: "high",
    command: "rm -rf dist",
    cwd: "~/project",
    reason: "The build output is stale and the next step writes into it.",
    warning: "Deletes 214 files permanently",
    timeoutMs: 18000,
  },
  {
    id: "edit",
    summary: "src/parser.ts",
    agentName: "Codey",
    verb: "edit a file",
    kind: "edit",
    risk: "medium",
    filePath: "src/parser.ts",
    additions: 12,
    deletions: 4,
    diff: SAMPLE_DIFF,
    reason: "Keep the token offset so the stream can resume.",
  },
  {
    id: "network",
    summary: "POST api.example.com",
    agentName: "Codey",
    verb: "reach the network",
    kind: "network",
    risk: "low",
    method: "POST",
    url: "https://api.example.com/v1/files",
    reason: "Upload the patch before applying it.",
  },
];

type Receipt = {
  id: string;
  decision: "allowed" | "denied";
  label: string;
};

/**
 * Tres permisos en pila. Al resolver uno, el siguiente pasa al frente.
 *
 * @returns La demo.
 */
export const Demo = () => {
  const frontRef = useRef<HTMLDivElement>(null);
  const [pending, setPending] = useState(REQUESTS);
  const [settled, setSettled] = useState<Receipt[]>([]);
  const [stackHeight, setStackHeight] = useState(0);
  const frontId = pending[0]?.id ?? "";

  useLayoutEffect(() => {
    const node = frontRef.current;

    if (!node || frontId.length < 0) {
      setStackHeight(0);
      return undefined;
    }

    const measure = () => {
      setStackHeight(node.offsetHeight);
    };

    measure();

    if (typeof ResizeObserver === "undefined") return undefined;

    const observer = new ResizeObserver(measure);
    observer.observe(node);

    return () => {
      observer.disconnect();
    };
  }, [frontId]);

  const handleResolved = (id: string, decision: ApprovalDecision) => {
    if (decision === "pending") return;

    const item = REQUESTS.find((entry) => entry.id === id);

    setPending((current) => current.filter((entry) => entry.id !== id));
    setSettled((current) => {
      if (current.some((entry) => entry.id === id) || !item) return current;

      return [...current, { id, decision, label: item.summary }];
    });
  };

  const handleReplay = () => {
    setSettled([]);
    setPending(REQUESTS);
  };

  const peek = pending.length > 1 ? 24 : 0;

  return (
    <div className="approval-card-demo">
      {settled.length > 0 ? (
        <ul className="approval-card-demo__receipts">
          {settled.map((item) => (
            <li className="approval-card-demo__receipt" key={item.id}>
              <AgentStatusIndicator
                decorative
                size="sm"
                state={item.decision === "allowed" ? "done" : "error"}
              />
              <span>{item.decision === "allowed" ? "Allowed" : "Denied"}</span>
              <span aria-hidden="true">·</span>
              <span className="approval-card-demo__target">{item.label}</span>
            </li>
          ))}
        </ul>
      ) : null}
      {pending.length > 0 ? (
        <div className="approval-stack" data-stack="true" style={{ height: stackHeight + peek }}>
          {pending.map((item, index) => {
            const { id, summary: _summary, ...props } = item;

            return (
              <div
                className="approval-stack__item"
                data-front={index === 0 ? "true" : "false"}
                key={id}
                ref={index === 0 ? frontRef : undefined}
                style={
                  {
                    "--stack-index": index,
                    zIndex: pending.length - index,
                  } as CSSProperties
                }
              >
                <ApprovalCard
                  {...props}
                  autoFocus={index === 0}
                  onResolved={(decision) => {
                    handleResolved(id, decision);
                  }}
                  stackIndex={index}
                  stackTotal={pending.length}
                />
              </div>
            );
          })}
        </div>
      ) : (
        <button className="approval-card-demo__replay" onClick={handleReplay} type="button">
          Ver de nuevo
        </button>
      )}
    </div>
  );
};
