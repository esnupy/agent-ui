import { act, fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ApprovalCard } from "./approval-card";
import { formatAgo, HOLD_MS, prettyJson, receiptTarget, splitUrl } from "./format";
import { schema } from "./schema";

describe("formatAgo", () => {
  it("redondea segundos y minutos", () => {
    expect(formatAgo(0)).toBe("0s ago");
    expect(formatAgo(12000)).toBe("12s ago");
    expect(formatAgo(60000)).toBe("1m ago");
    expect(formatAgo(64000)).toBe("1m 4s ago");
    expect(formatAgo(-20)).toBe("0s ago");
  });
});

describe("prettyJson", () => {
  it("indenta JSON y conserva el texto inválido", () => {
    expect(prettyJson('{"path":"dist"}')).toBe('{\n  "path": "dist"\n}');
    expect(prettyJson("not json")).toBe("not json");
  });
});

describe("splitUrl", () => {
  it("separa el dominio", () => {
    expect(splitUrl("https://api.example.com/v1/files")).toEqual({
      before: "https://",
      domain: "api.example.com",
      after: "/v1/files",
    });
    expect(splitUrl("no-es-url")).toBeNull();
  });
});

describe("receiptTarget", () => {
  it("elige el texto del recibo según el tipo", () => {
    expect(
      receiptTarget({
        kind: "network",
        command: "",
        filePath: "",
        method: "POST",
        url: "https://api.example.com/v1/files",
        toolName: "",
      }),
    ).toBe("POST api.example.com");
    expect(
      receiptTarget({
        kind: "command",
        command: "rm -rf dist",
        filePath: "",
        method: "",
        url: "",
        toolName: "",
      }),
    ).toBe("rm -rf dist");
  });
});

describe("ApprovalCard", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("presenta al agente, el comando y el aviso de riesgo alto", async () => {
    render(<ApprovalCard />);

    expect(screen.getByRole("article", { name: "Codey wants to run a command" })).toHaveAttribute(
      "data-risk",
      "high",
    );
    expect(screen.getByText("rm -rf dist")).toBeInTheDocument();
    expect(screen.getByText("~/project")).toBeInTheDocument();
    expect(screen.getByText("Deletes 214 files permanently")).toBeInTheDocument();
    expect(document.querySelector(".agent-status")).toHaveAttribute("data-state", "waiting");
    expect(document.querySelector(".ac-shimmer")).not.toBeInTheDocument();

    await act(async () => {
      await new Promise((resolve) => {
        requestAnimationFrame(() => resolve(undefined));
      });
    });

    expect(document.querySelector(".ac-shimmer")).toBeInTheDocument();
  });

  it("esconde el aviso cuando el riesgo no es alto", () => {
    render(<ApprovalCard risk="low" warning="Deletes 214 files permanently" />);

    expect(screen.queryByText("Deletes 214 files permanently")).not.toBeInTheDocument();
  });

  it("muestra el diff, la URL y la herramienta según el tipo", () => {
    const { rerender } = render(
      <ApprovalCard
        additions={12}
        deletions={4}
        diff={"- removed\n+ added"}
        filePath="src/parser.ts"
        kind="edit"
      />,
    );

    expect(screen.getByText("src/parser.ts")).toBeInTheDocument();
    expect(screen.getByText("+12")).toBeInTheDocument();
    expect(screen.getByText("−4")).toBeInTheDocument();
    expect(screen.queryByText(/removed/)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Show diff" }));
    expect(screen.getByText(/- removed/)).toBeInTheDocument();

    rerender(<ApprovalCard kind="network" method="POST" url="https://api.example.com/v1/files" />);
    expect(screen.getByText("api.example.com")).toHaveClass("approval-card__domain");
    expect(screen.getByText("POST")).toBeInTheDocument();

    rerender(<ApprovalCard kind="tool" toolArguments='{"path":"dist"}' toolName="delete_file" />);
    fireEvent.click(screen.getByRole("button", { name: "Show arguments" }));
    expect(screen.getByText(/"path": "dist"/)).toBeInTheDocument();
  });

  it("permite con un clic si el riesgo es bajo y se pliega en un recibo", () => {
    vi.useFakeTimers();
    const onAllow = vi.fn();
    const onResolved = vi.fn();
    render(
      <ApprovalCard command="rm -rf dist" onAllow={onAllow} onResolved={onResolved} risk="low" />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Allow" }));
    expect(onAllow).toHaveBeenCalledTimes(1);

    act(() => {
      vi.advanceTimersByTime(560);
    });

    expect(screen.getByRole("article", { name: "Allowed rm -rf dist" })).toBeInTheDocument();
    expect(screen.getByText("0s ago")).toBeInTheDocument();
    expect(document.querySelector(".agent-status")).toHaveAttribute("data-state", "done");

    act(() => {
      vi.advanceTimersByTime(640);
    });
    expect(onResolved).toHaveBeenCalledWith("allowed");
  });

  it("en riesgo alto solo permite si se sostiene el botón", () => {
    vi.useFakeTimers();
    const onAllow = vi.fn();
    render(<ApprovalCard onAllow={onAllow} risk="high" />);
    const allow = screen.getByRole("button", { name: "Allow" });

    fireEvent.click(allow);
    expect(onAllow).not.toHaveBeenCalled();

    fireEvent.pointerDown(allow);
    act(() => {
      vi.advanceTimersByTime(HOLD_MS - 1);
    });
    expect(onAllow).not.toHaveBeenCalled();

    fireEvent.pointerUp(allow);
    act(() => {
      vi.advanceTimersByTime(HOLD_MS);
    });
    expect(onAllow).not.toHaveBeenCalled();

    fireEvent.pointerDown(allow);
    act(() => {
      vi.advanceTimersByTime(HOLD_MS);
    });
    expect(onAllow).toHaveBeenCalledTimes(1);
  });

  it("rechaza con Escape y permite siempre con Cmd+Enter", () => {
    const onDeny = vi.fn();
    const onAlwaysAllow = vi.fn();
    const first = render(<ApprovalCard onDeny={onDeny} />);

    fireEvent.keyDown(screen.getByRole("article"), { key: "Escape" });
    expect(onDeny).toHaveBeenCalledTimes(1);
    first.unmount();

    render(<ApprovalCard onAlwaysAllow={onAlwaysAllow} />);
    fireEvent.keyDown(screen.getByRole("article"), { key: "Enter", metaKey: true });
    expect(onAlwaysAllow).toHaveBeenCalledTimes(1);
  });

  it("abre el menú de la sesión", () => {
    const onAllowSession = vi.fn();
    render(<ApprovalCard onAllowSession={onAllowSession} />);

    fireEvent.click(screen.getByRole("button", { name: "More ways to allow" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Allow for this session" }));

    expect(onAllowSession).toHaveBeenCalledTimes(1);
  });

  it("deja editar el comando antes de permitir", () => {
    const onEdit = vi.fn();
    render(<ApprovalCard onEdit={onEdit} risk="low" />);

    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    fireEvent.change(screen.getByRole("textbox", { name: "Command" }), {
      target: { value: "rm -rf build" },
    });

    expect(onEdit).toHaveBeenCalledWith("rm -rf build");
    expect(screen.getByRole("textbox", { name: "Command" })).toHaveValue("rm -rf build");
  });

  it("niega solo cuando se acaba el tiempo", () => {
    vi.useFakeTimers();
    const onDeny = vi.fn();
    const onAllow = vi.fn();
    const first = render(<ApprovalCard onDeny={onDeny} timeoutMs={500} />);

    act(() => {
      vi.advanceTimersByTime(499);
    });
    expect(onDeny).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(onDeny).toHaveBeenCalledTimes(1);
    first.unmount();

    render(<ApprovalCard onAllow={onAllow} onTimeout="allow" timeoutMs={300} />);
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(onAllow).toHaveBeenCalledTimes(1);
  });

  it("cuenta la pila y no roba el foco de un campo", () => {
    const { rerender } = render(<input aria-label="Borrador" />);
    const input = screen.getByRole("textbox", { name: "Borrador" });
    input.focus();

    rerender(
      <>
        <input aria-label="Borrador" />
        <ApprovalCard autoFocus stackTotal={3} />
      </>,
    );

    expect(input).toHaveFocus();
    expect(screen.getByText("1 of 3")).toBeInTheDocument();
  });

  it("declara el riesgo y los tipos en el esquema", () => {
    expect(schema.props.kind.default).toBe("command");
    expect(schema.props.kind.options).toEqual(["command", "edit", "network", "tool"]);
    expect(schema.props.risk.default).toBe("high");
    expect(schema.props.timeoutMs.default).toBe(0);
    expect(schema.props.onTimeout.default).toBe("deny");
    expect(schema.props.autoFocus.default).toBe(false);
  });
});
