import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AgentPlan } from "./agent-plan";
import {
  advancePlan,
  DEFAULT_PLAN_INTERVAL,
  DEFAULT_STEPS,
  DEFAULT_STEPS_CONTROL,
  DEFAULT_TITLE,
  type PlanStep,
} from "./plan";
import { schema } from "./schema";
import { usePlanSimulation } from "./use-plan-simulation";

const mockReducedMotion = (matches: boolean) => {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    configurable: true,
    value: (query: string) => ({
      matches,
      media: query,
      onchange: null,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      addListener: () => undefined,
      removeListener: () => undefined,
      dispatchEvent: () => false,
    }),
  });
};

const item = (title: string) => {
  const node = screen.getByText(title).closest("li");
  if (!node) throw new Error(`No encontré el paso ${title}`);
  return node;
};

const Probe = ({ interval, steps }: { interval?: number; steps: readonly PlanStep[] }) => {
  const live = usePlanSimulation(steps, { interval });

  return (
    <ul>
      {live.flatMap((step) => [
        <li data-status={step.status} key={step.id}>
          {step.title}
        </li>,
        ...(step.substeps ?? []).map((child) => (
          <li data-status={child.status} key={child.id}>
            {child.title}
          </li>
        )),
      ])}
    </ul>
  );
};

describe("advancePlan", () => {
  it("pone en curso al primero y luego lo cierra al arrancar el siguiente", () => {
    const start: PlanStep[] = [
      { id: "a", title: "A", status: "pending" },
      { id: "b", title: "B", status: "pending" },
    ];

    const started = advancePlan(start);
    expect(started.map((step) => step.status)).toEqual(["in_progress", "pending"]);
    expect(start[0]?.status).toBe("pending");

    const moved = advancePlan(started);
    expect(moved.map((step) => step.status)).toEqual(["done", "in_progress"]);
  });

  it("no cierra al padre mientras un hijo siga pendiente y se salta el error", () => {
    const start: PlanStep[] = [
      {
        id: "padre",
        title: "Padre",
        status: "in_progress",
        substeps: [{ id: "hijo", title: "Hijo", status: "pending" }],
      },
      { id: "roto", title: "Roto", status: "error" },
      { id: "luego", title: "Luego", status: "pending" },
    ];

    const withChild = advancePlan(start);
    expect(withChild[0]?.status).toBe("in_progress");
    expect(withChild[0]?.substeps?.[0]?.status).toBe("in_progress");
    expect(withChild[1]?.status).toBe("error");

    const childDone = advancePlan(withChild);
    expect(childDone[0]?.status).toBe("in_progress");
    expect(childDone[0]?.substeps?.[0]?.status).toBe("done");

    const parentDone = advancePlan(childDone);
    expect(parentDone[0]?.status).toBe("done");
    expect(parentDone[2]?.status).toBe("in_progress");
  });
});

describe("usePlanSimulation", () => {
  afterEach(() => {
    vi.useRealTimers();
    mockReducedMotion(false);
  });

  it("avanza con el intervalo y no muta el plan original", () => {
    vi.useFakeTimers();
    const steps: PlanStep[] = [
      { id: "a", title: "Leer", status: "pending" },
      { id: "b", title: "Escribir", status: "pending" },
    ];

    render(<Probe interval={1000} steps={steps} />);

    expect(screen.getByText("Leer").closest("li")).toHaveAttribute("data-status", "pending");

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(screen.getByText("Leer").closest("li")).toHaveAttribute("data-status", "in_progress");
    expect(steps[0]?.status).toBe("pending");

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(screen.getByText("Leer").closest("li")).toHaveAttribute("data-status", "done");
    expect(screen.getByText("Escribir").closest("li")).toHaveAttribute(
      "data-status",
      "in_progress",
    );
  });

  it("se queda quieto cuando el sistema pide menos movimiento", () => {
    mockReducedMotion(true);
    vi.useFakeTimers();

    render(<Probe interval={200} steps={[{ id: "a", title: "Quieto", status: "pending" }]} />);

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(screen.getByText("Quieto").closest("li")).toHaveAttribute("data-status", "pending");
  });
});

describe("AgentPlan", () => {
  afterEach(() => {
    vi.useRealTimers();
    mockReducedMotion(false);
  });

  it("dibuja cada estado, el avance y el anuncio", () => {
    const { rerender } = render(
      <AgentPlan
        steps={[
          { id: "a", title: "Leer el diff", status: "pending" },
          { id: "b", title: "Abrir la rama", status: "in_progress" },
          { id: "c", title: "Falló el push", status: "error" },
          { id: "d", title: "Saltar el formato", status: "skipped" },
          { id: "e", title: "Cerrar el plan", status: "done" },
        ]}
      />,
    );

    expect(screen.getByRole("list", { name: "Plan" })).toHaveAttribute("aria-live", "polite");
    expect(screen.getByRole("progressbar", { name: "Avance del plan" })).toHaveAttribute(
      "aria-valuenow",
      "1",
    );
    expect(screen.getByText("1 de 5")).toBeInTheDocument();
    expect(item("Leer el diff")).toHaveAttribute("data-status", "pending");
    expect(item("Abrir la rama")).toHaveAttribute("data-status", "in_progress");
    expect(item("Abrir la rama").querySelector(".agent-plan__spin")).toBeTruthy();
    expect(item("Falló el push")).toHaveAttribute("data-status", "error");
    expect(item("Saltar el formato")).toHaveAttribute("data-status", "skipped");
    expect(item("Cerrar el plan")).toHaveAttribute("data-status", "done");
    expect(item("Cerrar el plan").querySelector(".agent-plan__strike")).toBeTruthy();
    expect(item("Abrir la rama")).toHaveAttribute("aria-current", "step");

    rerender(
      <AgentPlan
        steps={[
          { id: "a", title: "Leer el diff", status: "done" },
          { id: "b", title: "Abrir la rama", status: "in_progress" },
          { id: "c", title: "Falló el push", status: "error" },
          { id: "d", title: "Saltar el formato", status: "skipped" },
          { id: "e", title: "Cerrar el plan", status: "done" },
        ]}
      />,
    );

    expect(screen.getByText("Leer el diff, listo. 2 de 5.")).toBeInTheDocument();
  });

  it("cuenta los subpasos aunque sigan cerrados", () => {
    render(
      <AgentPlan
        steps={[
          {
            id: "a",
            title: "Probar",
            status: "done",
            substeps: [
              { id: "a1", title: "Caso feliz", status: "done" },
              { id: "a2", title: "Caso roto", status: "pending" },
            ],
          },
        ]}
      />,
    );

    expect(screen.getByText("2 de 3")).toBeInTheDocument();
    expect(screen.queryByText("Caso feliz")).not.toBeInTheDocument();
  });

  it("al contraer deja solo el paso actual y al abrir vuelve la lista", async () => {
    const user = userEvent.setup();

    render(
      <AgentPlan
        defaultOpen={false}
        steps={[
          { id: "a", title: "Ya quedó", status: "done" },
          { id: "b", title: "Sigue aquí", status: "in_progress" },
          { id: "c", title: "Después", status: "pending" },
        ]}
      />,
    );

    const toggle = screen.getByRole("button", { name: "Plan" });

    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(
      screen.getAllByRole("listitem").filter((node) => node.hasAttribute("data-status")),
    ).toHaveLength(1);
    expect(screen.getByText("Sigue aquí")).toBeInTheDocument();
    expect(screen.queryByText("Ya quedó")).not.toBeInTheDocument();
    expect(screen.getByText("1 de 3")).toBeInTheDocument();

    await user.click(toggle);

    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("Ya quedó")).toBeInTheDocument();
    expect(screen.getByText("Después")).toBeInTheDocument();
  });

  it("sin colapso no hay botón de encabezado", () => {
    render(
      <AgentPlan
        collapsible={false}
        steps={[{ id: "a", title: "Quieto", status: "pending" }]}
        title="Fijo"
      />,
    );

    expect(screen.queryByRole("button", { name: "Fijo" })).not.toBeInTheDocument();
    expect(screen.getByText("Fijo")).toBeInTheDocument();
    expect(screen.getByText("Quieto").closest("li")).toHaveAttribute("data-status", "pending");
  });

  it("abre el detalle, avisa el clic y se mueve con las flechas", async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();

    render(
      <AgentPlan
        collapsible={false}
        onStepClick={handleClick}
        steps={[
          {
            id: "buscar",
            title: "Buscar el offset",
            status: "in_progress",
            detail: "El corte va en el último delimitador.",
            substeps: [{ id: "caso", title: "Caso a la mitad", status: "pending" }],
          },
          { id: "ajustar", title: "Ajustar el cursor", status: "pending" },
        ]}
        title="Fijo"
      />,
    );

    const first = screen.getByRole("button", { name: /Buscar el offset/ });
    const second = screen.getByRole("button", { name: /Ajustar el cursor/ });

    expect(first).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText("El corte va en el último delimitador.")).not.toBeInTheDocument();

    await user.click(first);

    expect(handleClick).toHaveBeenCalledWith("buscar");
    expect(first).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("El corte va en el último delimitador.")).toBeInTheDocument();
    expect(screen.getByRole("list", { name: "Subpasos de Buscar el offset" })).toBeInTheDocument();
    expect(screen.getByText("Caso a la mitad")).toBeInTheDocument();

    first.focus();
    await user.keyboard("{ArrowDown}");
    expect(second).toHaveFocus();

    await user.keyboard("{ArrowUp}");
    expect(first).toHaveFocus();
  });

  it("marca un paso nuevo para la entrada y lee la lista del playground", () => {
    const { rerender } = render(
      <AgentPlan steps={[{ id: "a", title: "Primero", status: "pending" }]} />,
    );

    expect(item("Primero")).not.toHaveAttribute("data-enter");

    rerender(
      <AgentPlan
        steps={[
          { id: "a", title: "Primero", status: "pending" },
          { id: "b", title: "Segundo", status: "pending" },
        ]}
      />,
    );

    expect(item("Segundo")).toHaveAttribute("data-enter", "true");

    rerender(<AgentPlan steps="Hola|done, Mundo|in_progress" />);

    expect(screen.getByText("Hola")).toBeInTheDocument();
    expect(item("Mundo")).toHaveAttribute("data-status", "in_progress");
    expect(screen.queryByText("Primero")).not.toBeInTheDocument();
  });

  it("si la lista llega vacía, usa el plan de ejemplo", () => {
    render(<AgentPlan steps={[]} />);

    expect(screen.getByText("Revisar el diff")).toBeInTheDocument();
    expect(screen.getByText(DEFAULT_STEPS[1]?.title ?? "")).toBeInTheDocument();
  });

  it("aplica la clase, el id y la variable de avance", () => {
    render(
      <AgentPlan
        className="extra"
        data-testid="plan"
        id="plan-1"
        steps={[
          { id: "a", title: "Uno", status: "done" },
          { id: "b", title: "Dos", status: "pending" },
        ]}
        title="Hecho"
      />,
    );

    const plan = screen.getByTestId("plan");

    expect(plan).toHaveClass("agent-plan", "extra");
    expect(plan).toHaveAttribute("id", "plan-1");
    expect(plan).toHaveAttribute("data-open", "true");
    expect(plan.style.getPropertyValue("--agent-plan-progress")).toBe("0.5");
  });

  it("apaga el movimiento cuando el sistema lo pide", async () => {
    mockReducedMotion(true);
    render(<AgentPlan steps={[{ id: "a", title: "Quieto", status: "in_progress" }]} />);

    await waitFor(() => {
      expect(screen.getByRole("list", { name: "Plan" }).parentElement).toHaveAttribute(
        "data-reduced-motion",
        "true",
      );
    });
  });

  it("declara el esquema que arma el sitio", () => {
    expect(schema.name).toBe("AgentPlan");
    expect(schema.props.title.default).toBe(DEFAULT_TITLE);
    expect(schema.props.steps.default).toBe(DEFAULT_STEPS_CONTROL);
    expect(schema.props.collapsible.default).toBe(true);
    expect(schema.props.defaultOpen.default).toBe(true);
    expect(DEFAULT_PLAN_INTERVAL).toBe(1400);
  });
});
