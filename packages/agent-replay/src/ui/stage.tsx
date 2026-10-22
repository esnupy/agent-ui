"use client";

import { type ReactNode, useRef } from "react";
import { ChatPanel } from "./chat-panel";
import { useReplayContext } from "./context";
import { DiffPanel } from "./diff-panel";
import { PlanPanel } from "./plan-panel";
import { ToolsPanel } from "./tools-panel";
import { useFlip } from "./use-flip";

export const REPLAY_PANELS = ["chat", "plan", "tools", "diff"] as const;

export type ReplayPanel = (typeof REPLAY_PANELS)[number];

const PANELS: Record<ReplayPanel, () => ReactNode> = {
  chat: ChatPanel,
  plan: PlanPanel,
  tools: ToolsPanel,
  diff: DiffPanel,
};

/**
 * Lista de paneles válida, sin repetidos. Acepta un arreglo o texto separado por comas.
 *
 * @param panels - Lo que llegó en la prop.
 * @returns Los paneles en orden.
 */
export const resolvePanels = (panels: readonly string[] | string): ReplayPanel[] => {
  const list = typeof panels === "string" ? panels.split(",") : panels;
  const out: ReplayPanel[] = [];
  for (const raw of list) {
    const name = raw.trim() as ReplayPanel;
    if (REPLAY_PANELS.includes(name) && !out.includes(name)) out.push(name);
  }
  return out;
};

/**
 * Escenario con los paneles. Cada panel se suscribe solo a su parte del estado.
 *
 * @param props - Paneles visibles.
 * @returns La grilla.
 */
export const Stage = ({ panels }: { panels: readonly ReplayPanel[] }) => {
  const { reduced } = useReplayContext();
  const ref = useRef<HTMLDivElement>(null);

  useFlip(ref, !reduced, 380);

  if (panels.length === 0) return null;

  return (
    <div className="agent-replay__stage" data-count={panels.length} ref={ref}>
      {panels.map((panel) => {
        const Component = PANELS[panel];
        return <Component key={panel} />;
      })}
    </div>
  );
};
