import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it } from "vitest";
import { formatDuration, isPinnedToBottom } from "./format";
import { schema } from "./schema";
import { ThinkingBlock } from "./thinking-block";

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

const getHeader = () => screen.getByRole("button");

describe("formatDuration", () => {
  it("formatea segundos y minutos", () => {
    expect(formatDuration(12)).toBe("12s");
    expect(formatDuration(64)).toBe("1m 4s");
    expect(formatDuration(60)).toBe("1m");
    expect(formatDuration(-4)).toBe("0s");
  });
});

describe("isPinnedToBottom", () => {
  it("detecta si el lector se quedó abajo", () => {
    expect(isPinnedToBottom(80, 20, 100)).toBe(true);
    expect(isPinnedToBottom(40, 20, 100)).toBe(false);
  });
});

describe("ThinkingBlock", () => {
  afterEach(() => {
    mockReducedMotion(false);
  });

  it("brilla con Thinking y muestra la vista previa cuando está cerrado", () => {
    render(<ThinkingBlock preview="Última línea" status="thinking" text="Uno\nDos" />);

    const header = getHeader();

    expect(header).toHaveAttribute("aria-expanded", "false");
    expect(header).toHaveTextContent("Thinking");
    expect(header).toHaveTextContent("Última línea");
    expect(header.closest(".thinking-block")).toHaveAttribute("data-status", "thinking");
    expect(header.querySelector(".thinking-block__shine")).toHaveTextContent("Thinking");
  });

  it("al terminar dice Thought for y oculta el brillo", () => {
    render(<ThinkingBlock duration={12} status="done" text="Listo" />);

    expect(getHeader()).toHaveTextContent("Thought for 12s");
    expect(getHeader().querySelector(".thinking-block__shine")).toHaveTextContent(
      "Thought for 12s",
    );
    expect(getHeader().closest(".thinking-block")).toHaveAttribute("data-status", "done");
  });

  it("formatea más de un minuto", () => {
    render(<ThinkingBlock duration={64} status="done" />);

    expect(getHeader()).toHaveTextContent("Thought for 1m 4s");
  });

  it("abre y cierra con clic, Enter y espacio", async () => {
    const user = userEvent.setup();
    render(<ThinkingBlock text="El razonamiento" />);

    const header = getHeader();

    await user.click(header);
    expect(header).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("El razonamiento")).toBeInTheDocument();

    header.focus();
    await user.keyboard("{Enter}");
    expect(header).toHaveAttribute("aria-expanded", "false");

    await user.keyboard(" ");
    expect(header).toHaveAttribute("aria-expanded", "true");
  });

  it("empieza abierto y se pliega solo al terminar", () => {
    const { rerender } = render(
      <ThinkingBlock defaultOpen status="thinking" text="Sigo pensando" />,
    );

    expect(getHeader()).toHaveAttribute("aria-expanded", "true");

    rerender(<ThinkingBlock defaultOpen status="done" text="Sigo pensando" duration={12} />);

    expect(getHeader()).toHaveAttribute("aria-expanded", "false");
    expect(getHeader()).toHaveTextContent("Thought for 12s");
  });

  it("no se pliega si la persona lo abrió", async () => {
    const user = userEvent.setup();
    const { rerender } = render(<ThinkingBlock status="thinking" text="Manual" />);

    await user.click(getHeader());
    expect(getHeader()).toHaveAttribute("aria-expanded", "true");

    rerender(<ThinkingBlock duration={8} status="done" text="Manual" />);

    expect(getHeader()).toHaveAttribute("aria-expanded", "true");
    expect(getHeader()).toHaveTextContent("Thought for 8s");
  });

  it("se queda estático cuando el sistema pide menos movimiento", async () => {
    mockReducedMotion(true);
    render(<ThinkingBlock status="thinking" />);

    await waitFor(() => {
      expect(getHeader().closest(".thinking-block")).toHaveAttribute("data-reduced-motion", "true");
    });
  });

  it("declara el estado y la duración en el esquema", () => {
    expect(schema.props.status.default).toBe("thinking");
    expect(schema.props.status.options).toEqual(["thinking", "done"]);
    expect(schema.props.duration.default).toBe(12);
    expect(schema.props.duration.min).toBe(0);
    expect(schema.props.defaultOpen.default).toBe(false);
  });
});
