"use client";

import type { AgentState } from "@ai-components/agent-task";
import { useEffect, useRef, useState } from "react";
import { HOLD_MS } from "./format";
import type { ApprovalDecision, ApprovalTimeout } from "./schema";

export type ApprovalScope = "once" | "session" | "always";

type SessionInput = {
  status: ApprovalDecision;
  risk: "low" | "medium" | "high";
  timeoutMs: number;
  onTimeout: ApprovalTimeout;
  onAllow?: () => void;
  onDeny?: () => void;
  onAlwaysAllow?: () => void;
  onAllowSession?: () => void;
  onResolved?: (decision: "allowed" | "denied") => void;
};

export type ApprovalSession = {
  decision: ApprovalDecision;
  indicator: AgentState;
  morph: boolean;
  holding: boolean;
  menuOpen: boolean;
  now: number;
  resolvedAt: number | null;
  setMenuOpen: (open: boolean) => void;
  allow: (scope: ApprovalScope) => void;
  deny: () => void;
  startHold: () => void;
  cancelHold: () => void;
};

const indicatorFor = (status: ApprovalDecision): AgentState => {
  if (status === "allowed") return "done";
  if (status === "denied") return "error";

  return "waiting";
};

/**
 * Coordina la espera, el sostener para confirmar y el cierre de la tarjeta.
 *
 * @param input - Estado controlado, riesgo, tiempo límite y callbacks.
 * @returns El estado visible y las acciones.
 */
export const useApprovalSession = ({
  status,
  risk,
  timeoutMs,
  onTimeout,
  onAllow,
  onDeny,
  onAlwaysAllow,
  onAllowSession,
  onResolved,
}: SessionInput): ApprovalSession => {
  const [decision, setDecision] = useState(status);
  const [indicator, setIndicator] = useState<AgentState>(indicatorFor(status));
  const [morph, setMorph] = useState(false);
  const [holding, setHolding] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [resolvedAt, setResolvedAt] = useState<number | null>(
    status === "pending" ? null : Date.now(),
  );
  const [now, setNow] = useState(() => Date.now());
  const decisionRef = useRef(status);
  const lockedRef = useRef(false);
  const holdTimer = useRef<number | null>(null);
  const laterIds = useRef<number[]>([]);
  const riskRef = useRef(risk);
  const onAllowRef = useRef(onAllow);
  const onDenyRef = useRef(onDeny);
  const onAlwaysAllowRef = useRef(onAlwaysAllow);
  const onAllowSessionRef = useRef(onAllowSession);
  const onResolvedRef = useRef(onResolved);
  const allowRef = useRef<(scope: ApprovalScope) => void>(() => undefined);
  const denyRef = useRef<() => void>(() => undefined);

  decisionRef.current = decision;
  riskRef.current = risk;
  onAllowRef.current = onAllow;
  onDenyRef.current = onDeny;
  onAlwaysAllowRef.current = onAlwaysAllow;
  onAllowSessionRef.current = onAllowSession;
  onResolvedRef.current = onResolved;

  const clearHold = () => {
    if (holdTimer.current === null) return;

    window.clearTimeout(holdTimer.current);
    holdTimer.current = null;
  };

  const cancelHold = () => {
    clearHold();
    setHolding(false);
  };

  const allow = (scope: ApprovalScope) => {
    if (lockedRef.current || decisionRef.current !== "pending") return;

    lockedRef.current = true;
    clearHold();
    setHolding(false);
    setMenuOpen(false);

    if (scope === "always") onAlwaysAllowRef.current?.();
    else if (scope === "session") onAllowSessionRef.current?.();
    else onAllowRef.current?.();

    setMorph(true);
    setIndicator("writing");

    const showReceipt = window.setTimeout(() => {
      const stamp = Date.now();
      decisionRef.current = "allowed";
      setResolvedAt(stamp);
      setNow(stamp);
      setDecision("allowed");
      setIndicator("done");
    }, 560);
    const finish = window.setTimeout(() => {
      onResolvedRef.current?.("allowed");
    }, 1200);

    laterIds.current.push(showReceipt, finish);
  };

  const deny = () => {
    if (lockedRef.current || decisionRef.current !== "pending") return;

    lockedRef.current = true;
    clearHold();
    setHolding(false);
    setMenuOpen(false);
    onDenyRef.current?.();

    const stamp = Date.now();
    decisionRef.current = "denied";
    setResolvedAt(stamp);
    setNow(stamp);
    setDecision("denied");
    setIndicator("error");

    const finish = window.setTimeout(() => {
      onResolvedRef.current?.("denied");
    }, 900);

    laterIds.current.push(finish);
  };

  allowRef.current = allow;
  denyRef.current = deny;

  const startHold = () => {
    if (riskRef.current !== "high") return;
    if (lockedRef.current || decisionRef.current !== "pending" || holdTimer.current !== null)
      return;

    setHolding(true);
    holdTimer.current = window.setTimeout(() => {
      holdTimer.current = null;
      setHolding(false);
      allowRef.current("once");
    }, HOLD_MS);
  };

  useEffect(() => {
    lockedRef.current = false;
    decisionRef.current = status;
    setDecision(status);
    setMorph(false);
    setHolding(false);
    setMenuOpen(false);
    setResolvedAt(status === "pending" ? null : Date.now());
    setIndicator(indicatorFor(status));

    return () => {
      for (const id of laterIds.current) window.clearTimeout(id);
      laterIds.current = [];
      if (holdTimer.current !== null) {
        window.clearTimeout(holdTimer.current);
        holdTimer.current = null;
      }
    };
  }, [status]);

  useEffect(() => {
    if (timeoutMs <= 0 || status !== "pending") return undefined;

    const id = window.setTimeout(() => {
      if (decisionRef.current !== "pending" || lockedRef.current) return;

      if (onTimeout === "allow") allowRef.current("once");
      else denyRef.current();
    }, timeoutMs);

    return () => {
      window.clearTimeout(id);
    };
  }, [onTimeout, status, timeoutMs]);

  useEffect(() => {
    if (decision === "pending") return undefined;

    const id = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => {
      window.clearInterval(id);
    };
  }, [decision]);

  return {
    decision,
    indicator,
    morph,
    holding,
    menuOpen,
    now,
    resolvedAt,
    setMenuOpen,
    allow,
    deny,
    startHold,
    cancelHold,
  };
};
