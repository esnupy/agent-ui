import { act, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AgentReplay } from "./agent-replay";
import { createMockRun } from "./core/mock-run";
import type { ReplayEvent } from "./core/types";
import { schema } from "./schema";

const thought = (id: string, t: number): ReplayEvent => ({
  id,
  t,
  type: "thought",
  payload: { text: `idea ${id}` },
});

const EVENTS = [thought("a", 0), thought("b", 1000), thought("c", 2000)];

const getSlider = () => screen.getByRole("slider", { name: "Posición en el run" });

const setReducedMotion = (reduce: boolean) => {
  window.matchMedia = ((query: string) => ({
    matches: reduce && query.includes("reduce"),
    media: query,
    onchange: null,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    addListener: () => undefined,
    removeListener: () => undefined,
    dispatchEvent: () => false,
  })) as typeof window.matchMedia;
};

afterEach(() => {
  setReducedMotion(false);
  vi.restoreAllMocks();
});

describe("AgentReplay", () => {
  it("expone un slider accesible con el tiempo y el evento", async () => {
    const user = userEvent.setup();
    render(<AgentReplay events={EVENTS} />);
    const slider = getSlider();

    expect(slider).toHaveAttribute("aria-valuemin", "0");
    expect(slider).toHaveAttribute("aria-valuemax", "2000");

    slider.focus();
    await user.keyboard("{End}");
    expect(slider).toHaveAttribute("aria-valuenow", "2000");
    expect(slider.getAttribute("aria-valuetext")).toBe("00:02.000, Pensamiento: idea c");

    await user.keyboard("{Home}");
    expect(slider).toHaveAttribute("aria-valuenow", "0");
  });

  it("responde a los atajos", async () => {
    const user = userEvent.setup();
    render(<AgentReplay events={EVENTS} />);
    const slider = getSlider();
    slider.focus();

    await user.keyboard("{ArrowRight}");
    expect(slider).toHaveAttribute("aria-valuenow", "1000");
    await user.keyboard("{ArrowRight}{ArrowLeft}");
    expect(slider).toHaveAttribute("aria-valuenow", "1000");

    await user.keyboard("]");
    expect(screen.getByRole("button", { name: "2×" })).toHaveAttribute("aria-pressed", "true");
    // En user-event, "[[" es un "[" escapado.
    await user.keyboard("[[[[");
    expect(screen.getByRole("button", { name: "0.5×" })).toHaveAttribute("aria-pressed", "true");

    await user.keyboard(" ");
    expect(screen.getByRole("button", { name: "Pausar" })).toBeInTheDocument();
    await user.keyboard("k");
    expect(screen.getByRole("button", { name: "Reproducir" })).toBeInTheDocument();

    await user.keyboard("j");
    expect(screen.getByText("Reversa")).toBeInTheDocument();
    await user.keyboard("l");
    expect(screen.queryByText("Reversa")).not.toBeInTheDocument();
    await user.keyboard("k");
  });

  it("no roba las teclas de los campos de texto", async () => {
    const user = userEvent.setup();
    render(<AgentReplay events={EVENTS} />);
    const input = document.createElement("input");
    screen.getByRole("region", { name: "Reproducción del agente" }).append(input);
    input.focus();
    await user.keyboard("{End}");
    expect(getSlider()).toHaveAttribute("aria-valuenow", "0");
  });

  it("reconstruye el escenario en el instante pedido", async () => {
    const user = userEvent.setup();
    const onSeek = vi.fn();
    const events = createMockRun({ seed: 2, durationMs: 30_000 });
    render(<AgentReplay events={events} onSeek={onSeek} />);

    const plan = screen.getByRole("region", { name: "Plan" });
    expect(within(plan).getByText("El agente no ha publicado un plan.")).toBeInTheDocument();

    getSlider().focus();
    await user.keyboard("{End}");

    expect(within(plan).getByText("5 de 5")).toBeInTheDocument();
    expect(
      within(screen.getByRole("region", { name: "Conversación" })).getByText(/buffer \+= chunk/),
    ).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "stream.test.ts" })).toBeInTheDocument();
    expect(onSeek).toHaveBeenLastCalledWith(30_000);

    await user.keyboard("{Home}");
    expect(within(plan).queryByText("5 de 5")).not.toBeInTheDocument();
  });

  it("muestra solo los paneles pedidos, como arreglo o como texto", () => {
    const { rerender } = render(<AgentReplay events={EVENTS} panels={["diff", "chat"]} />);
    expect(screen.getByRole("region", { name: "Cambios" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Conversación" })).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Plan" })).not.toBeInTheDocument();

    rerender(<AgentReplay events={EVENTS} panels="plan, nada, plan" />);
    expect(screen.getByRole("region", { name: "Plan" })).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Cambios" })).not.toBeInTheDocument();
  });

  it("en vivo ofrece volver al final después de regresar", async () => {
    const user = userEvent.setup();
    const { rerender } = render(<AgentReplay events={EVENTS} live />);
    expect(screen.getByText("En vivo")).toBeInTheDocument();

    getSlider().focus();
    await user.keyboard("{Home}");
    const back = screen.getByRole("button", { name: "Volver a en vivo" });

    rerender(<AgentReplay events={[...EVENTS, thought("d", 3000)]} live />);
    expect(getSlider()).toHaveAttribute("aria-valuemax", "3000");

    await user.click(back);
    expect(screen.getByText("En vivo")).toBeInTheDocument();
    expect(getSlider()).toHaveAttribute("aria-valuenow", "3000");
    await user.keyboard("k");
  });

  it("sin events reproduce el run de ejemplo", () => {
    render(<AgentReplay seed={3} />);
    expect(Number(getSlider().getAttribute("aria-valuemax"))).toBeGreaterThan(40_000);
  });

  describe("scrub con el puntero", () => {
    const stubLayout = () => {
      vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(1000);
      vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
        x: 0,
        y: 0,
        top: 0,
        left: 0,
        right: 1000,
        bottom: 40,
        width: 1000,
        height: 40,
        toJSON: () => ({}),
      });
    };

    const drag = (container: HTMLElement) => {
      const ruler = container.querySelector(".agent-replay__ruler") as HTMLElement;
      fireEvent.pointerDown(ruler, { button: 0, clientX: 400, pointerId: 1 });
      fireEvent.pointerMove(ruler, { clientX: 505, pointerId: 1 });
      fireEvent.pointerUp(ruler, { clientX: 505, pointerId: 1 });
    };

    it("se asienta con un resorte hacia el evento cercano", () => {
      stubLayout();
      const raf = vi.spyOn(window, "requestAnimationFrame");
      const { container } = render(<AgentReplay events={EVENTS} />);

      drag(container);
      expect(getSlider()).toHaveAttribute("aria-valuenow", "1010");
      expect(raf).toHaveBeenCalled();
    });

    it("con movimiento reducido no hay inercia: el snap es inmediato", () => {
      setReducedMotion(true);
      stubLayout();
      const { container } = render(<AgentReplay events={EVENTS} />);
      const root = screen.getByRole("region", { name: "Reproducción del agente" });
      expect(root).toHaveAttribute("data-reduced-motion", "true");

      const raf = vi.spyOn(window, "requestAnimationFrame");
      act(() => drag(container));
      expect(getSlider()).toHaveAttribute("aria-valuenow", "1000");
      expect(raf).not.toHaveBeenCalled();
    });
  });

  it("el schema describe las props del playground", () => {
    expect(schema.name).toBe("AgentReplay");
    expect(Object.keys(schema.props)).toEqual(
      expect.arrayContaining(["seed", "live", "autoPlay", "panels", "onSeek", "renderEvent"]),
    );
  });
});
