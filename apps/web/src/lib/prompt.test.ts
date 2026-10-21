import type { ComponentSchema } from "@componentes-ia/core";
import { describe, expect, it } from "vitest";
import { buildComponentJsx, buildPrompt, buildUsage, getPlaygroundDefaults } from "./prompt";

const schema = {
  name: "AgentTask",
  description: "Fila de una tarea de agente.",
  props: {
    state: {
      type: "enum",
      options: ["thinking", "writing", "waiting", "done", "error"],
      default: "thinking",
      description: "Estado de la tarea.",
    },
    title: {
      type: "string",
      default: "Parser",
      description: "Texto principal.",
    },
    shimmer: {
      type: "boolean",
      default: true,
      description: "Barrido del título.",
    },
    speed: {
      type: "number",
      default: 1,
      min: 0.25,
      max: 3,
      description: "Velocidad.",
    },
    className: {
      type: "string",
      default: "",
      description: "Clases extra.",
    },
    onClick: {
      type: "function",
      description: "Vuelve la fila un botón.",
    },
  },
} as const satisfies ComponentSchema;

describe("prompt", () => {
  it("toma los defaults del esquema", () => {
    const values = getPlaygroundDefaults(schema);

    expect(values.state).toBe("thinking");
    expect(values.shimmer).toBe(true);
    expect(values.speed).toBe(1);
    expect(values.onClick).toBe(false);
  });

  it("incluye los valores actuales y omite onClick apagado", () => {
    const values = getPlaygroundDefaults(schema);
    values.state = "writing";
    values.title = 'Parser "stream"';

    const jsx = buildComponentJsx("AgentTask", schema, values);

    expect(jsx).toContain('state="writing"');
    expect(jsx).toContain('title="Parser \\"stream\\""');
    expect(jsx).not.toContain("onClick");
  });

  it("agrega el callback cuando la fila es clickeable", () => {
    const values = getPlaygroundDefaults(schema);
    values.onClick = true;

    expect(buildComponentJsx("AgentTask", schema, values)).toContain("onClick={() => {}}");
  });

  it("arma el prompt con el paquete, las props y el JSX", () => {
    const values = getPlaygroundDefaults(schema);
    const prompt = buildPrompt({
      name: "AgentTask",
      packageName: "@componentes-ia/agent-task",
      description: schema.description,
      schema,
      values,
    });

    expect(prompt).toContain("Use AgentTask from @componentes-ia/agent-task.");
    expect(prompt).toContain('current "thinking"');
    expect(prompt).toContain("min 0.25");
    expect(prompt).toContain("max 3");
    expect(prompt).toContain("<AgentTask");
  });

  it("arma el snippet de uso con los CSS del paquete", () => {
    const usage = buildUsage({
      name: "AgentTask",
      packageName: "@componentes-ia/agent-task",
      schema,
      values: getPlaygroundDefaults(schema),
    });

    expect(usage).toContain('from "@componentes-ia/agent-task"');
    expect(usage).toContain('import "@componentes-ia/core/styles.css"');
    expect(usage).toContain('import "@componentes-ia/agent-task/styles.css"');
    expect(usage).toContain("return (");
  });
});
