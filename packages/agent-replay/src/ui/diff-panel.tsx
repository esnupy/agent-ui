"use client";

import { useMemo, useState } from "react";
import type { ReplayFile, ReplayFileLine, ReplayState } from "../core/types";
import { useReplayContext, useReplayState } from "./context";
import { Panel } from "./panel";
import { usePresence } from "./use-presence";

const selectFiles = (state: ReplayState) => state.files;

const EXIT_MS = 260;

const lineKey = (line: ReplayFileLine) => line.id;

const lastChange = (file: ReplayFile) => {
  let latest = file.t;
  for (const line of file.lines) if (line.kind !== "context" && line.t > latest) latest = line.t;
  return latest;
};

/**
 * Las líneas de un archivo. Las que entran o salen al cruzar su `t` se animan.
 *
 * @returns La lista de líneas.
 */
const FileLines = ({ file }: { file: ReplayFile }) => {
  const { reduced } = useReplayContext();
  const entries = usePresence(file.lines, lineKey, EXIT_MS, !reduced);

  const rows = useMemo(() => {
    let before = 0;
    let after = 0;
    return entries.map((entry) => {
      const { kind } = entry.item;
      // Una línea que sale ya no cuenta para la numeración.
      if (entry.exiting) return { entry, old: "", next: "" };
      if (kind !== "add") before += 1;
      if (kind !== "del") after += 1;
      return {
        entry,
        old: kind === "add" ? "" : String(before),
        next: kind === "del" ? "" : String(after),
      };
    });
  }, [entries]);

  return (
    <ol aria-label={file.path} className="agent-replay__code">
      {rows.map(({ entry, old, next }) => (
        <li
          className="agent-replay__line"
          data-entering={entry.entering}
          data-exiting={entry.exiting}
          data-kind={entry.item.kind}
          key={entry.key}
        >
          <span aria-hidden="true" className="agent-replay__gutter">
            {old}
          </span>
          <span aria-hidden="true" className="agent-replay__gutter">
            {next}
          </span>
          <span aria-hidden="true" className="agent-replay__sign">
            {entry.item.kind === "add" ? "+" : entry.item.kind === "del" ? "−" : ""}
          </span>
          <span className="agent-replay__text">
            {entry.item.kind === "add" ? (
              <span className="agent-replay__sr">Agregada: </span>
            ) : null}
            {entry.item.kind === "del" ? <span className="agent-replay__sr">Borrada: </span> : null}
            {entry.item.text || " "}
          </span>
        </li>
      ))}
    </ol>
  );
};

/**
 * Visor de diff con una pestaña por archivo. Sigue al último archivo tocado
 * hasta que eliges una pestaña.
 *
 * @returns El panel.
 */
export const DiffPanel = () => {
  const files = useReplayState(selectFiles);
  const [picked, setPicked] = useState<string | null>(null);

  const latest = useMemo(() => {
    let best: ReplayFile | undefined;
    for (const file of files) if (!best || lastChange(file) >= lastChange(best)) best = file;
    return best;
  }, [files]);

  const active = files.find((file) => file.path === picked) ?? latest;

  let added = 0;
  let removed = 0;
  for (const file of files) {
    for (const line of file.lines) {
      if (line.kind === "add") added += 1;
      if (line.kind === "del") removed += 1;
    }
  }

  return (
    <Panel id="diff" meta={files.length > 0 ? `+${added} −${removed}` : undefined} title="Cambios">
      {files.length > 0 ? (
        <div aria-label="Archivos" className="agent-replay__tabs" role="tablist">
          {files.map((file) => (
            <button
              aria-selected={file === active}
              className="agent-replay__tab"
              key={file.path}
              onClick={() => setPicked(file.path)}
              role="tab"
              type="button"
            >
              {file.path.split("/").pop()}
            </button>
          ))}
        </div>
      ) : null}
      <div className="agent-replay__panel-body" role={active ? "tabpanel" : undefined}>
        {active ? (
          <FileLines file={active} key={active.path} />
        ) : (
          <p className="agent-replay__empty">Sin cambios en archivos.</p>
        )}
      </div>
    </Panel>
  );
};
