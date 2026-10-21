"use client";

import { AgentStatusIndicator } from "@ai-components/agent-task";
import { cn, Shimmer, useReducedMotion } from "@ai-components/core";
import {
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { ApprovalAction } from "./approval-action";
import { alwaysLabel, formatAgo, receiptTarget } from "./format";
import type { ApprovalDecision, ApprovalKind, ApprovalRisk, ApprovalTimeout } from "./schema";
import { useApprovalSession } from "./use-approval-session";

export type ApprovalCardProps = {
  /** Nombre del agente. */
  agentName?: string;
  /** Verbo de la frase «wants to». */
  verb?: string;
  /** Tipo de acción. */
  kind?: ApprovalKind;
  /** Riesgo. High pide sostener Allow. */
  risk?: ApprovalRisk;
  /** Motivo, en gris. Vacío lo oculta. */
  reason?: string;
  /** Aviso. Solo con risk high. */
  warning?: string;
  /** Comando. */
  command?: string;
  /** Directorio del comando. */
  cwd?: string;
  /** Archivo del diff. */
  filePath?: string;
  /** Líneas agregadas. */
  additions?: number;
  /** Líneas borradas. */
  deletions?: number;
  /** Diff corto. */
  diff?: string;
  /** Método HTTP. */
  method?: string;
  /** URL de la petición. */
  url?: string;
  /** Nombre de la herramienta. */
  toolName?: string;
  /** Argumentos JSON de la herramienta. */
  toolArguments?: string;
  /** Cuenta regresiva. 0 la apaga. */
  timeoutMs?: number;
  /** Qué hacer al acabarse el tiempo. */
  onTimeout?: ApprovalTimeout;
  /** Índice en la pila. 0 es la de enfrente. */
  stackIndex?: number;
  /** Tamaño de la pila, para «1 of 3». */
  stackTotal?: number;
  /** Estado controlado. Un clic local lo puede adelantar. */
  status?: ApprovalDecision;
  /** Enfoca al llegar si nadie está escribiendo. */
  autoFocus?: boolean;
  className?: string;
  /** Permitir una vez. */
  onAllow?: () => void;
  /** Rechazar. */
  onDeny?: () => void;
  /** Permitir siempre. */
  onAlwaysAllow?: () => void;
  /** Permitir en esta sesión. */
  onAllowSession?: () => void;
  /** El comando editado cambió. */
  onEdit?: (value: string) => void;
  /** El recibo ya terminó de plegarse. */
  onResolved?: (decision: "allowed" | "denied") => void;
};

const isTextField = (target: EventTarget | null) => {
  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    (target instanceof HTMLElement && target.isContentEditable)
  );
};

/**
 * Pide permiso antes de que el agente actúe, y se pliega en un recibo.
 *
 * @param props - Identidad, acción, riesgo, tiempo y callbacks.
 * @returns La tarjeta.
 */
export const ApprovalCard = ({
  agentName = "Codey",
  verb = "run a command",
  kind = "command",
  risk = "high",
  reason = "The build output is stale and the next step writes into it.",
  warning = "Deletes 214 files permanently",
  command = "rm -rf dist",
  cwd = "~/project",
  filePath = "src/parser.ts",
  additions = 12,
  deletions = 4,
  diff = "",
  method = "GET",
  url = "https://api.example.com/v1/files",
  toolName = "delete_file",
  toolArguments = '{"path":"dist"}',
  timeoutMs = 0,
  onTimeout = "deny",
  stackIndex = 0,
  stackTotal = 1,
  status = "pending",
  autoFocus = false,
  className,
  onAllow,
  onDeny,
  onAlwaysAllow,
  onAllowSession,
  onEdit,
  onResolved,
}: ApprovalCardProps) => {
  const reduced = useReducedMotion();
  const menuId = useId();
  const rootRef = useRef<HTMLElement>(null);
  const padRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const shouldEnter = useRef(stackIndex === 0);
  const [enter, setEnter] = useState<"pending" | "play" | "idle">(
    stackIndex === 0 ? "pending" : "idle",
  );
  const [animate, setAnimate] = useState(false);
  const [height, setHeight] = useState<number | null>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(command);
  const [modKey, setModKey] = useState("Ctrl");
  const session = useApprovalSession({
    status,
    risk,
    timeoutMs: Math.max(0, timeoutMs),
    onTimeout,
    onAllow,
    onDeny,
    onAlwaysAllow,
    onAllowSession,
    onResolved,
  });
  const front = stackIndex === 0;
  const pending = session.decision === "pending";
  const target = receiptTarget({
    kind,
    command: draft,
    filePath,
    method,
    url,
    toolName,
  });
  const ago = session.resolvedAt === null ? "0s ago" : formatAgo(session.now - session.resolvedAt);
  const contentKey = [
    session.decision,
    session.morph,
    session.menuOpen,
    editing,
    kind,
    draft,
    reason,
    warning,
    risk,
    diff,
    toolArguments,
    filePath,
    url,
  ].join("|");

  useEffect(() => {
    if (!editing) setDraft(command);
  }, [command, editing]);

  useEffect(() => {
    if (kind.length < 0) return;

    setEditing(false);
  }, [kind]);

  useEffect(() => {
    const apple = /Mac|iPhone|iPad/.test(navigator.platform);
    setModKey(apple ? "⌘" : "Ctrl");
  }, []);

  useEffect(() => {
    if (enter !== "pending") return undefined;

    if (reduced) {
      setEnter("idle");
      return undefined;
    }

    const frame = window.requestAnimationFrame(() => {
      setEnter("play");
    });

    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [enter, reduced]);

  useEffect(() => {
    if (!autoFocus || !pending || !front) return undefined;

    const active = document.activeElement;

    if (active instanceof HTMLElement) {
      const tag = active.tagName;
      const typing =
        tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || active.isContentEditable;

      if (typing) return undefined;
    }

    const frame = window.requestAnimationFrame(() => {
      rootRef.current?.focus({ preventScroll: true });
    });

    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [autoFocus, front, pending]);

  useEffect(() => {
    if (!session.menuOpen) return undefined;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;

      if (!(target instanceof Node) || menuRef.current?.contains(target)) return;

      session.setMenuOpen(false);
    };

    document.addEventListener("pointerdown", handlePointerDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [session.menuOpen, session.setMenuOpen]);

  useLayoutEffect(() => {
    const pad = padRef.current;

    if (!pad || contentKey.length < 0) return;

    setHeight(pad.scrollHeight);
  }, [contentKey]);

  useEffect(() => {
    const pad = padRef.current;

    if (!pad || typeof ResizeObserver === "undefined") return undefined;

    const observer = new ResizeObserver(() => {
      setHeight(pad.scrollHeight);
    });

    observer.observe(pad);

    return () => {
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!shouldEnter.current) return undefined;

    const frame = window.requestAnimationFrame(() => {
      setAnimate(true);
    });

    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, []);

  const handleDraft = (value: string) => {
    setDraft(value);
    onEdit?.(value);
  };

  const handleAllowClick = () => {
    if (risk === "high") return;

    session.allow("once");
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (risk !== "high" || !pending) return;

    const node = event.currentTarget;

    if (typeof node.setPointerCapture === "function") {
      try {
        node.setPointerCapture(event.pointerId);
      } catch {
        // jsdom no siempre implementa la captura del puntero.
      }
    }

    session.startHold();
  };

  const handlePointerLeave = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const node = event.currentTarget;
    const captured =
      typeof node.hasPointerCapture === "function" && node.hasPointerCapture(event.pointerId);

    if (captured) return;

    session.cancelHold();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (!pending) return;

    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
      event.preventDefault();
      session.allow("always");
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();

      if (session.menuOpen) {
        session.setMenuOpen(false);
        return;
      }

      if (editing) {
        setEditing(false);
        rootRef.current?.focus();
        return;
      }

      session.deny();
      return;
    }

    const confirming = event.key === "Enter" || event.key === " ";

    if (!confirming || event.metaKey || event.ctrlKey) return;
    if (isTextField(event.target)) return;

    if (event.target instanceof HTMLButtonElement && event.target.dataset.action !== "allow")
      return;

    event.preventDefault();

    if (event.repeat) return;

    if (risk === "high") session.startHold();
    else session.allow("once");
  };

  const handleKeyUp = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === "Enter" || event.key === " ") session.cancelHold();
  };

  const label =
    session.decision === "allowed"
      ? `Allowed ${target}`
      : session.decision === "denied"
        ? `Denied ${target}`
        : `${agentName} wants to ${verb}`;
  const showWarning = risk === "high" && warning.trim().length > 0;
  const showReason = reason.trim().length > 0;
  const holdLabel = risk === "high" ? "hold ↵" : "↵";

  return (
    <article
      aria-label={label}
      className={cn("approval-card", className)}
      data-animate={animate ? "true" : "false"}
      data-decision={session.decision}
      data-enter={enter}
      data-front={front ? "true" : "false"}
      data-reduced-motion={reduced ? "true" : "false"}
      data-risk={risk}
      inert={front ? undefined : true}
      onKeyDown={handleKeyDown}
      onKeyUp={handleKeyUp}
      ref={rootRef}
      tabIndex={front ? 0 : -1}
    >
      <div
        className="approval-card__surface"
        data-morph={session.morph ? "true" : "false"}
        data-timing={pending && timeoutMs > 0 ? "true" : "false"}
        style={{ "--approval-timeout": `${Math.max(0, timeoutMs)}ms` } as CSSProperties}
      >
        {enter === "play" && pending && front ? <Shimmer mode="once" /> : null}
        <div className="approval-card__clip" style={height === null ? undefined : { height }}>
          <div className="approval-card__pad" ref={padRef}>
            <div className="approval-card__headline">
              <AgentStatusIndicator
                className="approval-card__status"
                decorative
                size="sm"
                state={session.indicator}
              />
              {pending ? (
                <p className="approval-card__title">
                  <span className="approval-card__agent">{agentName}</span>
                  <span className="approval-card__wants"> wants to </span>
                  <span className="approval-card__verb">{verb}</span>
                </p>
              ) : (
                <p className="approval-card__receipt">
                  <span>{session.decision === "allowed" ? "Allowed" : "Denied"}</span>
                  <span aria-hidden="true" className="approval-card__dot">
                    ·
                  </span>
                  <span className="approval-card__receipt-target">{target}</span>
                  {session.decision === "allowed" ? (
                    <>
                      <span aria-hidden="true" className="approval-card__dot">
                        ·
                      </span>
                      <span className="approval-card__ago">{ago}</span>
                    </>
                  ) : null}
                </p>
              )}
              {pending && front && stackTotal > 1 ? (
                <span className="approval-card__count">{`${stackIndex + 1} of ${stackTotal}`}</span>
              ) : null}
            </div>
            {pending ? (
              <>
                {showReason ? <p className="approval-card__reason">{reason}</p> : null}
                {showWarning ? (
                  <p className="approval-card__warning">
                    <span aria-hidden="true" className="approval-card__warning-mark" />
                    {warning}
                  </p>
                ) : null}
                <ApprovalAction
                  additions={additions}
                  command={draft}
                  cwd={cwd}
                  deletions={deletions}
                  diff={diff}
                  editing={editing}
                  filePath={filePath}
                  kind={kind}
                  method={method}
                  onDraft={handleDraft}
                  toolArguments={toolArguments}
                  toolName={toolName}
                  url={url}
                />
                <div ref={menuRef}>
                  <div className="approval-card__actions">
                    <div className="approval-card__split">
                      <button
                        aria-keyshortcuts="Enter"
                        aria-label="Allow"
                        className="approval-card__allow"
                        data-action="allow"
                        data-holding={session.holding ? "true" : "false"}
                        data-morph={session.morph ? "true" : "false"}
                        disabled={session.morph}
                        onClick={handleAllowClick}
                        onPointerCancel={session.cancelHold}
                        onPointerDown={handlePointerDown}
                        onPointerLeave={handlePointerLeave}
                        onPointerUp={session.cancelHold}
                        type="button"
                      >
                        <span aria-hidden="true" className="approval-card__fill" />
                        <span className="approval-card__allow-label">
                          {session.morph ? <CheckIcon /> : "Allow"}
                          {session.morph ? null : (
                            <kbd className="approval-card__kbd">{holdLabel}</kbd>
                          )}
                        </span>
                      </button>
                      <button
                        aria-controls={menuId}
                        aria-expanded={session.menuOpen}
                        aria-haspopup="menu"
                        aria-label="More ways to allow"
                        className="approval-card__more"
                        disabled={session.morph}
                        onClick={() => {
                          session.setMenuOpen(!session.menuOpen);
                        }}
                        type="button"
                      >
                        <CaretIcon />
                      </button>
                    </div>
                    <button
                      aria-keyshortcuts="Escape"
                      aria-label="Deny"
                      className="approval-card__deny"
                      data-action="deny"
                      disabled={session.morph}
                      onClick={session.deny}
                      type="button"
                    >
                      Deny
                      <kbd className="approval-card__kbd">esc</kbd>
                    </button>
                    {kind === "command" ? (
                      <button
                        aria-label="Edit"
                        className="approval-card__edit"
                        data-action="edit"
                        disabled={session.morph}
                        onClick={() => {
                          setEditing((current) => !current);
                        }}
                        type="button"
                      >
                        Edit
                      </button>
                    ) : null}
                  </div>
                  {session.menuOpen ? (
                    <div className="approval-card__menu" id={menuId} role="menu">
                      <button
                        aria-label={alwaysLabel(kind)}
                        className="approval-card__menu-item"
                        onClick={() => {
                          session.allow("always");
                        }}
                        role="menuitem"
                        type="button"
                      >
                        <span>{alwaysLabel(kind)}</span>
                        <kbd className="approval-card__kbd">{`${modKey}↵`}</kbd>
                      </button>
                      <button
                        className="approval-card__menu-item"
                        onClick={() => {
                          session.allow("session");
                        }}
                        role="menuitem"
                        type="button"
                      >
                        Allow for this session
                      </button>
                    </div>
                  ) : null}
                </div>
              </>
            ) : null}
            <p aria-live="polite" className="ac-sr-only">
              {pending ? "" : label}
            </p>
          </div>
        </div>
        {timeoutMs > 0 ? <span aria-hidden="true" className="approval-card__timer" /> : null}
      </div>
    </article>
  );
};

/**
 * Palomita que reemplaza a Allow.
 *
 * @returns El ícono.
 */
const CheckIcon = () => {
  return (
    <svg aria-hidden="true" className="approval-card__check" viewBox="0 0 16 16">
      <path
        d="M3.5 8.5 6.5 11.5 12.5 4.5"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.6"
      />
    </svg>
  );
};

/**
 * Flecha del menú de permitir.
 *
 * @returns El ícono.
 */
const CaretIcon = () => {
  return (
    <svg aria-hidden="true" className="approval-card__caret" viewBox="0 0 16 16">
      <path
        d="M4.5 6.5 8 10l3.5-3.5"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.4"
      />
    </svg>
  );
};
