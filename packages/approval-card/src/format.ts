import type { ApprovalKind } from "./schema";

/** Tiempo que hay que sostener Allow cuando el riesgo es high. */
export const HOLD_MS = 1000;

/**
 * Tiempo relativo y corto para el recibo.
 *
 * @param elapsedMs - Milisegundos desde la decisión. Los negativos cuentan como cero.
 * @returns Texto como `12s ago` o `1m 4s ago`.
 */
export const formatAgo = (elapsedMs: number): string => {
  const seconds = Math.max(0, Math.round(elapsedMs / 1000));

  if (seconds < 60) return `${seconds}s ago`;

  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;

  if (rest === 0) return `${minutes}m ago`;

  return `${minutes}m ${rest}s ago`;
};

/**
 * Indenta JSON válido y deja el resto como llegó.
 *
 * @param value - Argumentos en texto.
 * @returns JSON con saltos de línea, o el texto original.
 */
export const prettyJson = (value: string): string => {
  const trimmed = value.trim();

  if (!trimmed) return "";

  try {
    return JSON.stringify(JSON.parse(trimmed), null, 2);
  } catch {
    return value;
  }
};

export type UrlParts = {
  before: string;
  domain: string;
  after: string;
};

/**
 * Separa el host para poder marcarlo.
 *
 * @param value - URL absoluta.
 * @returns Las tres partes, o null si no se puede leer.
 */
export const splitUrl = (value: string): UrlParts | null => {
  try {
    const domain = new URL(value).host;
    const start = value.indexOf(domain);

    if (!domain || start < 0) return null;

    return {
      before: value.slice(0, start),
      domain,
      after: value.slice(start + domain.length),
    };
  } catch {
    return null;
  }
};

/**
 * Texto del menú según el tipo de acción.
 *
 * @param kind - Tipo de permiso.
 * @returns La opción de permitir siempre.
 */
export const alwaysLabel = (kind: ApprovalKind): string => {
  if (kind === "edit") return "Always allow this file";
  if (kind === "network") return "Always allow this domain";
  if (kind === "tool") return "Always allow this tool";

  return "Always allow this command";
};

/**
 * Lo que queda en el recibo después del verbo.
 *
 * @param input - Datos visibles de la acción.
 * @returns Comando, archivo, petición o herramienta.
 */
export const receiptTarget = (input: {
  kind: ApprovalKind;
  command: string;
  filePath: string;
  method: string;
  url: string;
  toolName: string;
}): string => {
  if (input.kind === "edit") return input.filePath || "a file";
  if (input.kind === "tool") return input.toolName || "a tool";

  if (input.kind === "network") {
    const domain = splitUrl(input.url)?.domain || input.url || "a URL";

    return `${input.method} ${domain}`.trim();
  }

  return input.command || "a command";
};
