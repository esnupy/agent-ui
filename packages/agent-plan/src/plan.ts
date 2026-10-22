import type { ReactNode } from "react";

export const PLAN_STATUSES = ["pending", "in_progress", "done", "error", "skipped"] as const;

/** Estado de un paso del plan. */
export type PlanStepStatus = (typeof PLAN_STATUSES)[number];

export type PlanStep = {
  id: string;
  title: string;
  status: PlanStepStatus;
  /** Texto o nodo extra, oculto hasta que se abre el paso. */
  detail?: ReactNode;
  /** Pasos hijos. Se completan antes de cerrar al padre. */
  substeps?: readonly PlanStep[];
};

/** Cómo se anuncia cada estado. */
export const STATUS_LABEL: Record<PlanStepStatus, string> = {
  pending: "pendiente",
  in_progress: "en curso",
  done: "listo",
  error: "error",
  skipped: "omitido",
};

/** Título del encabezado si no pasas `title`. */
export const DEFAULT_TITLE = "Plan";

/** Milisegundos entre un avance y el siguiente en `usePlanSimulation`. */
export const DEFAULT_PLAN_INTERVAL = 1400;

/** Plan de ejemplo para el playground y para cuando `steps` llega vacío. */
export const DEFAULT_STEPS: readonly PlanStep[] = [
  { id: "revisar", title: "Revisar el diff", status: "done" },
  { id: "offset", title: "Ajustar el offset", status: "in_progress" },
  { id: "prueba", title: "Escribir la prueba", status: "pending" },
];

/** Lista corta que el playground puede editar: título|estado, separados por comas. */
export const DEFAULT_STEPS_CONTROL = DEFAULT_STEPS.map(
  (step) => `${step.title}|${step.status}`,
).join(", ");

const STATUS_SET: ReadonlySet<string> = new Set(PLAN_STATUSES);

/**
 * @param value - Texto del segmento después de `|`.
 * @returns Si es uno de los cinco estados.
 */
const isStatus = (value: string): value is PlanStepStatus => STATUS_SET.has(value);

/**
 * Recorre el árbol en preorden.
 *
 * @param steps - Pasos de un nivel.
 * @returns Todos los pasos, padres antes que sus hijos.
 */
export const flattenPlan = (steps: readonly PlanStep[]): PlanStep[] => {
  const result: PlanStep[] = [];

  const walk = (list: readonly PlanStep[]) => {
    for (const step of list) {
      result.push(step);
      if (step.substeps && step.substeps.length > 0) walk(step.substeps);
    }
  };

  walk(steps);
  return result;
};

/**
 * Cuenta el avance sobre todo el árbol, no solo lo que está abierto.
 *
 * @param steps - Plan completo.
 * @returns Listos contra el total, incluidos los subpasos.
 */
export const countPlan = (steps: readonly PlanStep[]): { done: number; total: number } => {
  let done = 0;
  let total = 0;

  for (const step of flattenPlan(steps)) {
    total += 1;
    if (step.status === "done") done += 1;
  }

  return { done, total };
};

/**
 * El paso que conviene mostrar cuando el plan está contraído.
 * Si hay varios en curso, gana el más profundo.
 *
 * @param steps - Plan completo.
 * @returns El paso actual, o undefined si no hay ninguno.
 */
export const findCurrent = (steps: readonly PlanStep[]): PlanStep | undefined => {
  const flat = flattenPlan(steps);
  const active = flat.filter((step) => step.status === "in_progress");

  return (
    active.at(-1) ??
    flat.find((step) => step.status === "error") ??
    flat.find((step) => step.status === "pending") ??
    flat.at(-1)
  );
};

/**
 * Firma estable del árbol. La identidad del arreglo no cuenta:
 * un render con el mismo contenido no debe reiniciar la simulación.
 *
 * @param steps - Plan de origen.
 * @returns Una cadena con profundidad, id, estado y título.
 */
export const serializePlan = (steps: readonly PlanStep[]): string => {
  const lines: string[] = [];

  const walk = (list: readonly PlanStep[], depth: number) => {
    for (const step of list) {
      lines.push(`${depth}:${step.id}:${step.status}:${step.title}`);
      if (step.substeps && step.substeps.length > 0) walk(step.substeps, depth + 1);
    }
  };

  walk(steps, 0);
  return lines.join("\n");
};

/**
 * Interpreta la cadena del playground. El arreglo real, con detalle
 * y subpasos, se pasa directo desde el código.
 *
 * @param value - Pasos `título|estado` separados por comas.
 * @returns Los pasos, o el plan de ejemplo si no se pudo leer ninguno.
 */
export const parseSteps = (value: string): readonly PlanStep[] => {
  const steps = value
    .split(",")
    .map((part) => part.trim())
    .filter((part) => part.length > 0)
    .flatMap((part, index) => {
      const pipe = part.lastIndexOf("|");
      if (pipe <= 0) return [];

      const title = part.slice(0, pipe).trim();
      const status = part.slice(pipe + 1).trim();
      if (title.length === 0 || !isStatus(status)) return [];

      return [{ id: `paso-${index + 1}`, title, status }];
    });

  return steps.length > 0 ? steps : DEFAULT_STEPS;
};

/**
 * Normaliza lo que llega de código o del playground.
 *
 * @param value - Arreglo, lista `título|estado`, o nada.
 * @returns Al menos el plan de ejemplo.
 */
export const resolveSteps = (
  value: readonly PlanStep[] | string | undefined,
): readonly PlanStep[] => {
  if (Array.isArray(value)) return value.length > 0 ? value : DEFAULT_STEPS;
  if (typeof value !== "string" || value.trim().length === 0) return DEFAULT_STEPS;
  return parseSteps(value);
};

/**
 * Copia el árbol para poder cambiar un estado sin tocar el plan original.
 *
 * @param step - Paso y, si tiene, sus hijos.
 * @returns Una copia superficial del nodo y profunda de los subpasos.
 */
const cloneStep = (step: PlanStep): PlanStep => ({
  ...step,
  substeps: step.substeps?.map(cloneStep),
});

/**
 * Siguiente paso que la simulación debe tocar.
 * Un padre en curso no se cierra mientras le quede un hijo pendiente:
 * primero se trabaja el hijo.
 * Un paso en error o omitido se salta, y también su rama.
 *
 * @param list - Nivel actual del árbol ya copiado.
 * @returns El paso a avanzar, o undefined si el plan ya terminó.
 */
const findFrontier = (list: readonly PlanStep[]): PlanStep | undefined => {
  for (const step of list) {
    if (step.status === "error" || step.status === "skipped") continue;

    if (step.status === "pending") return step;

    if (step.status === "in_progress") {
      const child = step.substeps ? findFrontier(step.substeps) : undefined;
      return child ?? step;
    }

    if (step.substeps) {
      const child = findFrontier(step.substeps);
      if (child) return child;
    }
  }

  return undefined;
};

/**
 * Un latido del plan: el pendiente entra en curso, o el que está en curso
 * pasa a listo y el siguiente pendiente arranca en el mismo latido.
 *
 * @param steps - Plan actual.
 * @returns El mismo arreglo si ya no hay nada que avanzar; si no, una copia.
 */
export const advancePlan = (steps: readonly PlanStep[]): readonly PlanStep[] => {
  const next = steps.map(cloneStep);
  const target = findFrontier(next);
  if (!target) return steps;

  if (target.status === "pending") {
    target.status = "in_progress";
    return next;
  }

  target.status = "done";
  const follow = findFrontier(next);
  if (follow?.status === "pending") follow.status = "in_progress";

  return next;
};
