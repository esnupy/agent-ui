"use client";

import { cn, useReducedMotion } from "@componentes-ia/core";
import {
  type ComponentPropsWithoutRef,
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  countPlan,
  DEFAULT_TITLE,
  findCurrent,
  flattenPlan,
  type PlanStep,
  type PlanStepStatus,
  resolveSteps,
  STATUS_LABEL,
} from "./plan";

/** Tiempo que un paso nuevo conserva la clase de entrada. */
const ENTER_MS = 360;

type AgentPlanStyle = CSSProperties & {
  "--agent-plan-progress"?: string;
};

export type AgentPlanProps = Omit<ComponentPropsWithoutRef<"div">, "children"> & {
  /**
   * Pasos del plan. En código es un arreglo. El playground manda
   * `título|estado` separado por comas.
   */
  steps: readonly PlanStep[] | string;
  /** Texto del encabezado. */
  title?: string;
  /** El encabezado puede contraer la lista. */
  collapsible?: boolean;
  /** Arranca abierto. El playground puede cambiarlo después del montaje. */
  defaultOpen?: boolean;
  /** Recibe el id del paso activado. */
  onStepClick?: (id: string) => void;
};

type PlanListProps = {
  steps: readonly PlanStep[];
  nested?: boolean;
  live?: boolean;
  announcement?: string;
  listId?: string;
  label: string;
  currentId?: string;
  openIds: ReadonlySet<string>;
  entering: ReadonlySet<string>;
  onToggle: (id: string) => void;
  onStepClick?: (id: string) => void;
};

/**
 * @param step - Paso a revisar.
 * @returns Si hay detalle o subpasos que se puedan abrir.
 */
const isExpandable = (step: PlanStep): boolean => {
  const hasDetail =
    step.detail !== undefined &&
    step.detail !== null &&
    step.detail !== false &&
    step.detail !== "";

  if (hasDetail) return true;

  return Boolean(step.substeps && step.substeps.length > 0);
};

/**
 * Ícono fijo de 16px. El palomazo se dibuja al montar el estado listo.
 *
 * @param props - Estado del paso.
 * @returns El svg del estado.
 */
const StepIcon = ({ status }: { status: PlanStepStatus }) => {
  if (status === "pending") {
    return (
      <svg aria-hidden="true" viewBox="0 0 16 16">
        <circle cx="8" cy="8" fill="none" r="5.25" stroke="currentColor" strokeWidth="1.25" />
      </svg>
    );
  }

  if (status === "in_progress") {
    return (
      <svg aria-hidden="true" className="agent-plan__spin" viewBox="0 0 16 16">
        <circle
          cx="8"
          cy="8"
          fill="none"
          opacity="0.28"
          r="5.25"
          stroke="currentColor"
          strokeWidth="1.25"
        />
        <path
          d="M8 2.75a5.25 5.25 0 0 1 5.25 5.25"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeWidth="1.25"
        />
      </svg>
    );
  }

  if (status === "done") {
    return (
      <svg aria-hidden="true" viewBox="0 0 16 16">
        <path
          className="agent-plan__check"
          d="M3.8 8.2 6.7 11.1 12.2 4.8"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.4"
        />
      </svg>
    );
  }

  if (status === "error") {
    return (
      <svg aria-hidden="true" viewBox="0 0 16 16">
        <path
          d="M5 5 11 11M11 5 5 11"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeWidth="1.4"
        />
      </svg>
    );
  }

  return (
    <svg aria-hidden="true" viewBox="0 0 16 16">
      <path
        d="M4.5 8h7"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.4"
      />
    </svg>
  );
};

/**
 * Flecha del encabezado. Gira con CSS cuando el plan está abierto.
 *
 * @returns El svg.
 */
const Chevron = () => {
  return (
    <svg aria-hidden="true" className="agent-plan__chevron" viewBox="0 0 16 16">
      <path
        d="M6 4.5 10 8 6 11.5"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.25"
      />
    </svg>
  );
};

/**
 * Sube y baja entre los pasos de este nivel. No se mete a los subpasos:
 * cada lista anidada tiene el suyo.
 *
 * @param event - Tecla sobre la lista.
 */
const handleListKeyDown = (event: KeyboardEvent<HTMLUListElement>) => {
  if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;

  const items = [...event.currentTarget.children].flatMap((child) => {
    if (!(child instanceof HTMLElement) || !child.classList.contains("agent-plan__item")) return [];

    const row = [...child.children].find(
      (node) => node instanceof HTMLElement && node.classList.contains("agent-plan__row"),
    );
    const target = row?.querySelector<HTMLElement>("[data-plan-focus='true']");
    return target ? [target] : [];
  });

  const active = document.activeElement;
  if (!(active instanceof HTMLElement)) return;

  const index = items.indexOf(active);
  if (index < 0) return;

  event.preventDefault();
  event.stopPropagation();

  const next = items[event.key === "ArrowDown" ? index + 1 : index - 1];
  next?.focus();
};

/**
 * Una lista de pasos. La raíz anuncia cambios; las anidadas no,
 * para no leer dos veces el mismo avance.
 *
 * @param props - Pasos visibles y el estado de apertura.
 * @returns La lista.
 */
const PlanList = ({
  steps,
  nested = false,
  live = false,
  announcement = "",
  listId,
  label,
  currentId,
  openIds,
  entering,
  onToggle,
  onStepClick,
}: PlanListProps) => {
  return (
    <ul
      aria-label={label}
      aria-live={live ? "polite" : undefined}
      className="agent-plan__list"
      data-nested={nested ? "true" : "false"}
      id={listId}
      onKeyDown={handleListKeyDown}
    >
      {live && announcement.length > 0 ? <li className="agent-plan__sr">{announcement}</li> : null}
      {steps.map((step) => (
        <PlanItem
          currentId={currentId}
          entering={entering}
          key={step.id}
          onStepClick={onStepClick}
          onToggle={onToggle}
          openIds={openIds}
          step={step}
        />
      ))}
    </ul>
  );
};

type PlanItemProps = {
  step: PlanStep;
  currentId?: string;
  openIds: ReadonlySet<string>;
  entering: ReadonlySet<string>;
  onToggle: (id: string) => void;
  onStepClick?: (id: string) => void;
};

/**
 * Fila de un paso: ícono, título y, si aplica, detalle y subpasos.
 *
 * @param props - El paso y si está abierto.
 * @returns El ítem de la lista.
 */
const PlanItem = ({ step, currentId, openIds, entering, onToggle, onStepClick }: PlanItemProps) => {
  const expandable = isExpandable(step);
  const interactive = expandable || Boolean(onStepClick);
  const isOpen = openIds.has(step.id);
  const hasDetail =
    step.detail !== undefined &&
    step.detail !== null &&
    step.detail !== false &&
    step.detail !== "";
  const hasSubsteps = Boolean(step.substeps && step.substeps.length > 0);

  const handleActivate = () => {
    onStepClick?.(step.id);
    if (expandable) onToggle(step.id);
  };

  const body: ReactNode = (
    <>
      <span className="agent-plan__label">
        <span className="agent-plan__text">{step.title}</span>
        {step.status === "done" ? <span aria-hidden="true" className="agent-plan__strike" /> : null}
      </span>
      <span className="agent-plan__sr">{STATUS_LABEL[step.status]}</span>
    </>
  );

  return (
    <li
      aria-current={step.id === currentId ? "step" : undefined}
      className="agent-plan__item"
      data-enter={entering.has(step.id) ? "true" : undefined}
      data-status={step.status}
    >
      <div className="agent-plan__row">
        <span
          aria-hidden="true"
          className="agent-plan__icon"
          data-icon={step.status}
          key={step.status}
        >
          <StepIcon status={step.status} />
        </span>
        {interactive ? (
          <button
            aria-expanded={expandable ? isOpen : undefined}
            className="agent-plan__main"
            data-plan-focus="true"
            onClick={handleActivate}
            type="button"
          >
            {body}
          </button>
        ) : (
          <div className="agent-plan__main" data-static="true">
            {body}
          </div>
        )}
      </div>
      {isOpen && (hasDetail || hasSubsteps) ? (
        <div className="agent-plan__body">
          {hasDetail ? <div className="agent-plan__detail">{step.detail}</div> : null}
          {hasSubsteps ? (
            <PlanList
              currentId={currentId}
              entering={entering}
              label={`Subpasos de ${step.title}`}
              nested
              onStepClick={onStepClick}
              onToggle={onToggle}
              openIds={openIds}
              steps={step.substeps ?? []}
            />
          ) : null}
        </div>
      ) : null}
    </li>
  );
};

/**
 * Plan en vivo: encabezado con avance y la lista de pasos del agente.
 *
 * Al contraerse deja solo el paso actual. Los cambios de estado se anuncian
 * con `aria-live`. Con `prefers-reduced-motion` no hay brillo, giro ni trazos.
 *
 * @param props - Pasos, título, colapso y props de div.
 * @returns El plan.
 */
export const AgentPlan = ({
  steps,
  title = DEFAULT_TITLE,
  collapsible = true,
  defaultOpen = true,
  onStepClick,
  className,
  style,
  ...rest
}: AgentPlanProps) => {
  const reduced = useReducedMotion();
  const listId = useId();
  const resolved = useMemo(() => resolveSteps(steps), [steps]);
  const flat = useMemo(() => flattenPlan(resolved), [resolved]);
  const { done, total } = countPlan(resolved);
  const current = findCurrent(resolved);
  const idKey = flat.map((step) => step.id).join("\u0000");

  const [open, setOpen] = useState(defaultOpen);
  const [openIds, setOpenIds] = useState<ReadonlySet<string>>(new Set());
  const [entering, setEntering] = useState<ReadonlySet<string>>(new Set());
  const [announcement, setAnnouncement] = useState("");
  const seenRef = useRef<Set<string> | null>(null);
  const previousRef = useRef<Map<string, PlanStepStatus> | null>(null);

  const expanded = collapsible ? open : true;
  const visible = expanded ? resolved : current ? [current] : [];
  const progress = total === 0 ? 0 : done / total;

  // El control del sitio cambia defaultOpen ya montado el plan.
  useEffect(() => {
    setOpen(defaultOpen);
  }, [defaultOpen]);

  useEffect(() => {
    const ids = idKey.length > 0 ? idKey.split("\u0000") : [];
    const seen = seenRef.current;

    if (!seen) {
      seenRef.current = new Set(ids);
      return undefined;
    }

    const fresh = ids.filter((id) => !seen.has(id));
    for (const id of ids) seen.add(id);

    if (reduced || fresh.length === 0) {
      if (reduced) setEntering((current) => (current.size === 0 ? current : new Set()));
      return undefined;
    }

    setEntering(new Set(fresh));
    const timeout = window.setTimeout(() => {
      setEntering(new Set());
    }, ENTER_MS);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [idKey, reduced]);

  useEffect(() => {
    const next = new Map(flat.map((step) => [step.id, step.status]));
    const previous = previousRef.current;
    previousRef.current = next;
    if (!previous) return;

    const changes: string[] = [];

    for (const step of flat) {
      const before = previous.get(step.id);
      if (before && before !== step.status) {
        changes.push(`${step.title}, ${STATUS_LABEL[step.status]}`);
      }
    }

    const added = flat.filter((step) => !previous.has(step.id));
    if (added.length === 1) changes.push(`Nuevo paso: ${added[0]?.title ?? ""}`);
    if (added.length > 1) changes.push(`${added.length} pasos nuevos`);

    if (changes.length === 0) return;
    setAnnouncement(`${changes.join(". ")}. ${done} de ${total}.`);
  }, [done, flat, total]);

  const handleToggle = () => {
    setOpen((currentOpen) => !currentOpen);
  };

  const handleStepToggle = (id: string) => {
    setOpenIds((currentIds) => {
      const next = new Set(currentIds);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const mergedStyle = {
    ...style,
    "--agent-plan-progress": String(progress),
  } as AgentPlanStyle;

  return (
    <div
      {...rest}
      className={cn("agent-plan", className)}
      data-open={expanded ? "true" : "false"}
      data-reduced-motion={reduced ? "true" : "false"}
      style={mergedStyle}
    >
      <div className="agent-plan__header">
        {collapsible ? (
          <button
            aria-controls={listId}
            aria-expanded={expanded}
            className="agent-plan__toggle"
            onClick={handleToggle}
            type="button"
          >
            <Chevron />
            <span className="agent-plan__heading">{title}</span>
          </button>
        ) : (
          <span className="agent-plan__heading">{title}</span>
        )}
        <span className="agent-plan__count">
          {done} de {total}
        </span>
        <div
          aria-label="Avance del plan"
          aria-valuemax={total}
          aria-valuemin={0}
          aria-valuenow={done}
          aria-valuetext={`${done} de ${total}`}
          className="agent-plan__track"
          role="progressbar"
        >
          <span className="agent-plan__bar" />
        </div>
      </div>
      <PlanList
        announcement={announcement}
        currentId={current?.id}
        entering={entering}
        label={title}
        listId={listId}
        live
        onStepClick={onStepClick}
        onToggle={handleStepToggle}
        openIds={openIds}
        steps={visible}
      />
    </div>
  );
};
