import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AgentStatusIndicator } from "./agent-status-indicator";
import { AgentTask } from "./agent-task";
import { schema } from "./schema";
import { AGENT_STATES, STATUS_LABEL } from "./states";

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

describe("AgentStatusIndicator", () => {
  afterEach(() => {
    mockReducedMotion(false);
  });

  it("anuncia cada estado y dibuja las nueve celdas", () => {
    for (const state of AGENT_STATES) {
      const view = render(<AgentStatusIndicator state={state} />);
      const indicator = screen.getByRole("img", { name: STATUS_LABEL[state] });

      expect(indicator).toHaveAttribute("data-state", state);
      expect(indicator.querySelectorAll("[data-cell]")).toHaveLength(9);
      view.unmount();
    }
  });

  it("se queda estático cuando el sistema pide menos movimiento", async () => {
    mockReducedMotion(true);
    render(<AgentStatusIndicator state="thinking" />);

    await waitFor(() => {
      expect(screen.getByRole("img", { name: "Thinking" })).toHaveAttribute(
        "data-reduced-motion",
        "true",
      );
    });
  });
});

describe("AgentTask", () => {
  afterEach(() => {
    mockReducedMotion(false);
  });

  it("anuncia el título y el estado", () => {
    const { rerender, container } = render(<AgentTask state="thinking" title="Ship the parser" />);

    for (const state of AGENT_STATES) {
      rerender(<AgentTask state={state} title="Ship the parser" />);
      expect(screen.getByText(`Ship the parser. ${STATUS_LABEL[state]}.`)).toBeInTheDocument();
      expect(container.querySelector(".agent-status")).toHaveAttribute("data-state", state);
    }
  });

  it("muestra la rama y el tiempo", () => {
    render(<AgentTask branch="feat/auth" elapsed="42s" state="writing" title="Patch auth" />);

    expect(screen.getByText("feat/auth")).toBeInTheDocument();
    expect(screen.getByText("42s")).toBeInTheDocument();
  });

  it("es un button cuando recibe onClick", async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();

    render(<AgentTask onClick={handleClick} state="done" title="Ship the parser" />);

    const button = screen.getByRole("button", { name: /ship the parser/i });
    expect(button).toHaveAttribute("type", "button");
    expect(button).toHaveAttribute("aria-pressed", "false");

    await user.click(button);
    expect(handleClick).toHaveBeenCalledOnce();
  });

  it("no es un button si no es clickeable y marca la selección", () => {
    const { container } = render(<AgentTask selected state="waiting" title="Esperar el sandbox" />);

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.getByText("Esperar el sandbox. Waiting.")).toBeInTheDocument();
    expect(container.querySelector(".agent-task")).toHaveAttribute("data-selected", "true");
  });

  it("solo hace shimmer en thinking", () => {
    const { rerender, container } = render(
      <AgentTask shimmer state="thinking" title="Pensar el plan" />,
    );

    expect(container.querySelector(".agent-task")).toHaveAttribute("data-shimmer", "true");

    rerender(<AgentTask shimmer state="writing" title="Pensar el plan" />);
    expect(container.querySelector(".agent-task")).toHaveAttribute("data-shimmer", "false");
  });

  it("apaga el shimmer cuando el sistema pide menos movimiento", async () => {
    mockReducedMotion(true);
    const { container } = render(<AgentTask shimmer state="thinking" title="Pensar el plan" />);

    await waitFor(() => {
      const row = container.querySelector(".agent-task");
      expect(row).toHaveAttribute("data-reduced-motion", "true");
      expect(row).toHaveAttribute("data-shimmer", "false");
    });
  });

  it("documenta los estados en el esquema", () => {
    expect(schema.name).toBe("AgentTask");
    expect(schema.props.state.options).toEqual([...AGENT_STATES]);
    expect(schema.props.speed.min).toBe(0.25);
    expect(schema.props.speed.max).toBe(3);
  });
});
