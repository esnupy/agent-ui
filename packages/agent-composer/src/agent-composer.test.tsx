import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom/vitest";
import { describe, expect, it, vi } from "vitest";
import { AgentComposer } from "./agent-composer";
import { schema } from "./schema";

const getField = () => screen.getByRole("textbox", { name: "Mensaje" });

describe("AgentComposer", () => {
  it("muestra el texto, el modelo y las cuatro acciones", () => {
    render(<AgentComposer model="Modelo rápido" value="Hola" />);

    expect(getField()).toHaveValue("Hola");
    expect(screen.getByRole("button", { name: "Adjuntar" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Modelo rápido" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Dictar" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Enviar" })).toBeEnabled();
  });

  it("oculta cada acción cuando la prop está apagada", () => {
    render(
      <AgentComposer showAttach={false} showModel={false} showSend={false} showVoice={false} />,
    );

    expect(screen.queryByRole("button", { name: "Adjuntar" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Modelo rápido" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Dictar" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Enviar" })).not.toBeInTheDocument();
  });

  it("no envía un mensaje vacío y sí envía el texto recortado", async () => {
    const user = userEvent.setup();
    const handleSubmit = vi.fn();
    render(<AgentComposer onSubmit={handleSubmit} />);

    expect(screen.getByRole("button", { name: "Enviar" })).toBeDisabled();
    await user.type(getField(), "  Hola  ");
    await user.click(screen.getByRole("button", { name: "Enviar" }));

    expect(handleSubmit).toHaveBeenCalledOnce();
    expect(handleSubmit).toHaveBeenCalledWith("Hola");
    expect(getField()).toHaveValue("");
  });

  it("envía con Enter y deja el salto de línea con Shift+Enter", async () => {
    const user = userEvent.setup();
    const handleSubmit = vi.fn();
    render(<AgentComposer onSubmit={handleSubmit} />);

    await user.type(getField(), "Hola{Shift>}{Enter}{/Shift}mundo");
    expect(handleSubmit).not.toHaveBeenCalled();
    expect(getField()).toHaveValue("Hola\nmundo");

    await user.keyboard("{Enter}");
    expect(handleSubmit).toHaveBeenCalledWith("Hola\nmundo");
  });

  it("avisa al pulsar adjuntar, modelo y voz", async () => {
    const user = userEvent.setup();
    const handleAttach = vi.fn();
    const handleModel = vi.fn();
    const handleVoice = vi.fn();

    render(
      <AgentComposer
        model="Modelo rápido"
        onAttach={handleAttach}
        onModel={handleModel}
        onVoice={handleVoice}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Adjuntar" }));
    await user.click(screen.getByRole("button", { name: "Modelo rápido" }));
    await user.click(screen.getByRole("button", { name: "Dictar" }));

    expect(handleAttach).toHaveBeenCalledOnce();
    expect(handleModel).toHaveBeenCalledOnce();
    expect(handleVoice).toHaveBeenCalledOnce();
  });

  it("desactiva el campo y las acciones", () => {
    render(<AgentComposer disabled model="Modelo rápido" value="Hola" />);

    expect(getField()).toBeDisabled();
    expect(screen.getByRole("button", { name: "Adjuntar" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Modelo rápido" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Dictar" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Enviar" })).toBeDisabled();
  });

  it("declara las cuatro acciones encendidas por defecto", () => {
    expect(schema.props.showAttach.default).toBe(true);
    expect(schema.props.showModel.default).toBe(true);
    expect(schema.props.showVoice.default).toBe(true);
    expect(schema.props.showSend.default).toBe(true);
  });
});
