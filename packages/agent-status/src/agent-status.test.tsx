import { act, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AgentStatus, DEFAULT_INTERVAL, DEFAULT_WORDS } from "./agent-status";
import { schema } from "./schema";

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

const getStatus = () => screen.getByRole("status");

/** La palabra que se anuncia: el rol status no usa el texto como nombre. */
const expectWord = (word: string) => {
  const status = getStatus();
  const label = status.querySelector(".activity-status__label:not([aria-hidden='true'])");

  expect(status).toHaveAttribute("data-word", word);
  expect(label).toHaveTextContent(word);
};

describe("AgentStatus", () => {
  beforeEach(() => {
    mockReducedMotion(false);
  });

  afterEach(() => {
    vi.useRealTimers();
    mockReducedMotion(false);
  });

  it("anuncia la primera palabra y las props de accesibilidad", () => {
    render(<AgentStatus />);

    const status = getStatus();

    expectWord("Pensando");
    expect(status).toHaveAttribute("aria-live", "polite");
    expect(status).toHaveAttribute("aria-atomic", "true");
    expect(status).toHaveAttribute("data-variant", "both");
    expect(status).toHaveAttribute("data-size", "md");
    expect(status.querySelectorAll(".activity-status__dot")).toHaveLength(3);
  });

  it("rota las palabras con el intervalo", () => {
    vi.useFakeTimers();
    render(<AgentStatus />);

    expectWord("Pensando");

    act(() => {
      vi.advanceTimersByTime(DEFAULT_INTERVAL);
    });

    expectWord("Buscando");

    act(() => {
      vi.advanceTimersByTime(DEFAULT_INTERVAL);
    });

    expectWord("Leyendo");
  });

  it("respeta una lista y un intervalo propios, y vuelve al inicio", () => {
    vi.useFakeTimers();
    render(<AgentStatus interval={1000} words={["Uno", "Dos"]} />);

    expectWord("Uno");

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expectWord("Dos");

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expectWord("Uno");
  });

  it("acepta la lista separada por comas que manda el playground", () => {
    vi.useFakeTimers();
    render(<AgentStatus interval={800} words="Hola, Mundo" />);

    expectWord("Hola");

    act(() => {
      vi.advanceTimersByTime(800);
    });

    expectWord("Mundo");
  });

  it("con status muestra ese texto y no rota", () => {
    vi.useFakeTimers();
    const { rerender } = render(<AgentStatus status="Revisando" words={["Uno", "Dos"]} />);

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expectWord("Revisando");
    expect(getStatus()).toHaveAttribute("data-word", "Revisando");

    rerender(<AgentStatus status="Listo" />);

    expectWord("Listo");
  });

  it("un status vacío deja que las palabras roten", () => {
    vi.useFakeTimers();
    render(<AgentStatus interval={900} status="   " words={["Uno", "Dos"]} />);

    act(() => {
      vi.advanceTimersByTime(900);
    });

    expectWord("Dos");
  });

  it("dibuja solo puntos o solo el texto según la variante", () => {
    const { rerender } = render(<AgentStatus status="Buscando" variant="dots" />);

    expect(getStatus()).toHaveAttribute("data-variant", "dots");
    expect(getStatus().querySelectorAll(".activity-status__dot")).toHaveLength(3);
    expectWord("Buscando");

    rerender(<AgentStatus status="Analizando" variant="shimmer" />);

    expect(getStatus()).toHaveAttribute("data-variant", "shimmer");
    expect(getStatus().querySelector(".activity-status__dots")).toBeNull();
    expectWord("Analizando");
  });

  it("aplica el tamaño, la clase y las props del div", () => {
    render(
      <AgentStatus
        className="extra"
        data-testid="estado"
        id="estado-1"
        size="sm"
        title="Trabajando"
      />,
    );

    const status = screen.getByTestId("estado");

    expect(status).toHaveAttribute("data-size", "sm");
    expect(status).toHaveAttribute("id", "estado-1");
    expect(status).toHaveAttribute("title", "Trabajando");
    expect(status).toHaveClass("activity-status", "extra");
  });

  it("mide la palabra para animar el ancho sin saltos", () => {
    const rect = {
      width: 96,
      height: 18,
      top: 0,
      left: 0,
      bottom: 18,
      right: 96,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    } as DOMRect;
    const spy = vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue(rect);

    try {
      render(<AgentStatus status="Pensando" />);

      expect(getStatus().style.getPropertyValue("--activity-status-width")).toBe("96px");
      expect(getStatus()).toHaveAttribute("data-ready", "true");
    } finally {
      spy.mockRestore();
    }
  });

  it("se queda en la primera palabra cuando el sistema pide menos movimiento", async () => {
    mockReducedMotion(true);
    render(<AgentStatus interval={40} words={["Uno", "Dos"]} />);

    await waitFor(() => {
      expect(getStatus()).toHaveAttribute("data-reduced-motion", "true");
    });

    await act(async () => {
      await new Promise((resolve) => {
        setTimeout(resolve, 90);
      });
    });

    expectWord("Uno");
    expect(getStatus()).toHaveAttribute("data-word", "Uno");
  });

  it("si la lista llega vacía, usa las palabras por defecto", () => {
    render(<AgentStatus words={[]} />);

    expectWord("Pensando");
  });

  it("declara variantes, tamaño e intervalo en el esquema", () => {
    expect(schema.name).toBe("AgentStatus");
    expect(schema.props.variant.default).toBe("both");
    expect(schema.props.variant.options).toEqual(["dots", "shimmer", "both"]);
    expect(schema.props.size.default).toBe("md");
    expect(schema.props.size.options).toEqual(["sm", "md"]);
    expect(schema.props.interval.default).toBe(DEFAULT_INTERVAL);
    expect(schema.props.interval.min).toBe(400);
    expect(schema.props.interval.max).toBe(8000);
    expect(schema.props.words.default).toBe(DEFAULT_WORDS.join(", "));
    expect(schema.props.status.default).toBe("");
  });
});
