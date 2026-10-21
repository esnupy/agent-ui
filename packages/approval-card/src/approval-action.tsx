"use client";

import { useEffect, useId, useRef, useState } from "react";
import { prettyJson, splitUrl } from "./format";
import type { ApprovalKind } from "./schema";

export type ApprovalActionProps = {
  kind: ApprovalKind;
  command: string;
  cwd: string;
  editing: boolean;
  onDraft: (value: string) => void;
  filePath: string;
  additions: number;
  deletions: number;
  diff: string;
  method: string;
  url: string;
  toolName: string;
  toolArguments: string;
};

/**
 * Cuerpo de la acción: comando, diff, URL o herramienta.
 *
 * @param props - Datos del tipo elegido y la edición del comando.
 * @returns El bloque de la acción.
 */
export const ApprovalAction = ({
  kind,
  command,
  cwd,
  editing,
  onDraft,
  filePath,
  additions,
  deletions,
  diff,
  method,
  url,
  toolName,
  toolArguments,
}: ApprovalActionProps) => {
  const detailsId = useId();
  const fieldRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (kind.length < 0) return;

    setOpen(false);
  }, [kind]);

  useEffect(() => {
    if (!editing) return;

    fieldRef.current?.focus();
    fieldRef.current?.select();
  }, [editing]);

  if (kind === "edit") {
    return (
      <div className="approval-card__panel">
        <div className="approval-card__summary">
          <span className="approval-card__path">{filePath}</span>
          <span className="approval-card__stat approval-card__stat--add">{`+${additions}`}</span>
          <span className="approval-card__stat approval-card__stat--del">{`−${deletions}`}</span>
          <button
            aria-controls={detailsId}
            aria-expanded={open}
            className="approval-card__ghost"
            onClick={() => {
              setOpen((current) => !current);
            }}
            type="button"
          >
            {open ? "Hide diff" : "Show diff"}
          </button>
        </div>
        {open ? (
          <pre className="approval-card__pre" id={detailsId}>
            {diff}
          </pre>
        ) : null}
      </div>
    );
  }

  if (kind === "network") {
    const parts = splitUrl(url);

    return (
      <p className="approval-card__request">
        <span className="approval-card__method">{method}</span>
        {parts ? (
          <span className="approval-card__url">
            {parts.before}
            <span className="approval-card__domain">{parts.domain}</span>
            {parts.after}
          </span>
        ) : (
          <span className="approval-card__url">{url}</span>
        )}
      </p>
    );
  }

  if (kind === "tool") {
    return (
      <div className="approval-card__panel">
        <div className="approval-card__summary">
          <span className="approval-card__path">{toolName}</span>
          <button
            aria-controls={detailsId}
            aria-expanded={open}
            className="approval-card__ghost"
            onClick={() => {
              setOpen((current) => !current);
            }}
            type="button"
          >
            {open ? "Hide arguments" : "Show arguments"}
          </button>
        </div>
        {open ? (
          <pre className="approval-card__pre" id={detailsId}>
            {prettyJson(toolArguments)}
          </pre>
        ) : null}
      </div>
    );
  }

  return (
    <div className="approval-card__command">
      <span aria-hidden="true" className="approval-card__prompt">
        ❯
      </span>
      {editing ? (
        <input
          aria-label="Command"
          autoComplete="off"
          className="approval-card__command-input"
          onChange={(event) => {
            onDraft(event.target.value);
          }}
          ref={fieldRef}
          spellCheck={false}
          value={command}
        />
      ) : (
        <code className="approval-card__code">{command}</code>
      )}
      {cwd ? <span className="approval-card__cwd">{cwd}</span> : null}
    </div>
  );
};
