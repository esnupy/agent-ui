import type { ApprovalStatus, PlanStatus, ReplayEvent, ReplayEventType } from "./types";

/** Nombre corto de cada tipo de evento. */
export const EVENT_LABEL: Record<ReplayEventType, string> = {
  thought: "Pensamiento",
  message_delta: "Mensaje",
  plan_update: "Plan",
  tool_call: "Herramienta",
  tool_result: "Resultado",
  file_diff: "Diff",
  approval: "Aprobación",
  error: "Error",
};

export const PLAN_STATUS_LABEL: Record<PlanStatus, string> = {
  pending: "pendiente",
  in_progress: "en curso",
  done: "listo",
  error: "error",
  skipped: "omitido",
};

export const APPROVAL_STATUS_LABEL: Record<ApprovalStatus, string> = {
  requested: "pedida",
  approved: "aprobada",
  rejected: "rechazada",
};

const pad = (value: number, size: number) => String(value).padStart(size, "0");

/**
 * Tiempo como `mm:ss.mmm`.
 *
 * @param ms - Milisegundos.
 * @returns El texto. Los negativos cuentan como cero.
 */
export const formatTime = (ms: number): string => {
  const total = Math.max(0, Math.round(ms));
  const minutes = Math.floor(total / 60_000);
  const seconds = Math.floor((total % 60_000) / 1000);
  return `${pad(minutes, 2)}:${pad(seconds, 2)}.${pad(total % 1000, 3)}`;
};

/**
 * Tiempo para lector de pantalla: "1 minuto 23 segundos".
 *
 * @param ms - Milisegundos.
 * @returns El texto.
 */
export const speakTime = (ms: number): string => {
  const total = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  const secondsText = `${seconds} ${seconds === 1 ? "segundo" : "segundos"}`;
  if (minutes === 0) return secondsText;
  return `${minutes} ${minutes === 1 ? "minuto" : "minutos"} ${secondsText}`;
};

const clip = (text: string, max = 80) => {
  const flat = text.replace(/\s+/g, " ").trim();
  return flat.length > max ? `${flat.slice(0, max - 1)}…` : flat;
};

/**
 * Resumen de una línea para el tooltip y el slider.
 *
 * @param event - El evento.
 * @returns El texto, sin el tipo.
 */
export const describeEvent = (event: ReplayEvent): string => {
  switch (event.type) {
    case "thought":
      return clip(event.payload.text);
    case "message_delta":
      return `${event.payload.role === "user" ? "Usuario" : "Agente"}: “${clip(event.payload.text, 60)}”`;
    case "plan_update":
      return `${event.payload.title ?? event.payload.stepId} → ${PLAN_STATUS_LABEL[event.payload.status]}`;
    case "tool_call":
      return `${event.payload.name} · ${clip(event.payload.input, 60)}`;
    case "tool_result":
      return `${event.payload.ok ? "Correcto" : "Falló"} · ${clip(event.payload.output, 60)}`;
    case "file_diff": {
      let added = 0;
      let removed = 0;
      for (const hunk of event.payload.hunks) {
        added += hunk.add.length;
        removed += hunk.remove;
      }
      return `${event.payload.path} (+${added} −${removed})`;
    }
    case "approval":
      return `${clip(event.payload.title, 60)} · ${APPROVAL_STATUS_LABEL[event.payload.status]}`;
    case "error":
      return clip(event.payload.message);
  }
};
