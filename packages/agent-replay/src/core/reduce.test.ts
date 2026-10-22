import { describe, expect, it } from "vitest";
import { applyHunks } from "./apply";
import { reduceState } from "./reduce";
import { createTimeline } from "./timeline";
import type { ReplayEvent, ReplayFileLine } from "./types";

const delta = (id: string, t: number, text: string, durationMs = 0): ReplayEvent => ({
  id,
  t,
  type: "message_delta",
  payload: { messageId: "m", role: "assistant", text, durationMs },
});

const kinds = (lines: readonly ReplayFileLine[]) =>
  lines.map((line) => `${line.kind}:${line.text}`);

describe("reduceState", () => {
  it("no aplica nada antes del primer evento", () => {
    const state = reduceState([delta("a", 100, "Hola")], 99);
    expect(state.index).toBe(0);
    expect(state.messages).toHaveLength(0);
  });

  it("escribe un fragmento según t y lo borra al volver", () => {
    const events = [delta("a", 0, "Hola mundo", 1000)];

    expect(reduceState(events, 0).messages[0]?.text).toBe("");
    expect(reduceState(events, 500).messages[0]).toMatchObject({ text: "Hola ", streaming: true });
    expect(reduceState(events, 1000).messages[0]).toMatchObject({
      text: "Hola mundo",
      streaming: false,
    });
    expect(reduceState(events, 200).messages[0]?.text).toBe("Ho");
  });

  it("da por completo el fragmento anterior cuando empieza el siguiente", () => {
    const events = [delta("a", 0, "Hola ", 1000), delta("b", 200, "mundo", 500)];
    const state = reduceState(events, 200);
    expect(state.messages[0]?.text).toBe("Hola ");
    expect(reduceState(events, 450).messages[0]?.text).toBe("Hola mun");
  });

  it("aplica plan, herramientas, aprobaciones y errores", () => {
    const events: ReplayEvent[] = [
      {
        id: "1",
        t: 0,
        type: "plan_update",
        payload: { stepId: "s", title: "Leer", status: "pending" },
      },
      { id: "2", t: 10, type: "plan_update", payload: { stepId: "s", status: "done" } },
      { id: "3", t: 20, type: "tool_call", payload: { callId: "c", name: "grep", input: "x" } },
      { id: "4", t: 30, type: "tool_result", payload: { callId: "c", ok: false, output: "nada" } },
      { id: "5", t: 30, type: "tool_result", payload: { callId: "otro", ok: true, output: "" } },
      {
        id: "6",
        t: 40,
        type: "approval",
        payload: { id: "a", title: "Correr", status: "requested" },
      },
      {
        id: "7",
        t: 50,
        type: "approval",
        payload: { id: "a", title: "Correr", status: "approved" },
      },
      { id: "8", t: 60, type: "error", payload: { message: "falló", callId: "c" } },
      { id: "9", t: 70, type: "thought", payload: { text: "hmm" } },
    ];

    expect(reduceState(events, 25).tools[0]).toMatchObject({ status: "running" });

    const state = reduceState(events, 100);
    expect(state.plan).toEqual([{ id: "s", title: "Leer", status: "done", t: 10 }]);
    expect(state.tools).toHaveLength(1);
    expect(state.tools[0]).toMatchObject({ status: "error", output: "nada", endT: 30 });
    expect(state.approvals[0]).toMatchObject({ status: "approved", t: 40 });
    expect(state.errors[0]).toMatchObject({ message: "falló", callId: "c" });
    expect(state.thoughts[0]?.text).toBe("hmm");
    expect(state.index).toBe(9);
  });

  it("conserva las colecciones que no cambian", () => {
    const events: ReplayEvent[] = [
      { id: "1", t: 0, type: "plan_update", payload: { stepId: "s", status: "pending" } },
      { id: "2", t: 10, type: "thought", payload: { text: "a" } },
    ];
    const timeline = createTimeline(events);
    expect(timeline.stateAt(0).plan).toBe(timeline.stateAt(10).plan);
    expect(timeline.stateAt(10).thoughts).not.toBe(timeline.stateAt(0).thoughts);
  });
});

describe("applyHunks", () => {
  const base: ReplayFileLine[] = ["a", "b", "c"].map((text, index) => ({
    id: String(index),
    text,
    kind: "context",
    t: 0,
  }));

  it("marca las líneas originales quitadas y agrega las nuevas después", () => {
    const lines = applyHunks(base, [{ start: 1, remove: 1, add: ["B"] }], "e", 5);
    expect(kinds(lines)).toEqual(["context:a", "del:b", "add:B", "context:c"]);
  });

  it("cuenta solo líneas vivas y borra del todo una línea agregada", () => {
    const first = applyHunks(base, [{ start: 1, remove: 1, add: ["B"] }], "e1", 5);
    const second = applyHunks(first, [{ start: 1, remove: 1, add: ["β"] }], "e2", 9);
    expect(kinds(second)).toEqual(["context:a", "del:b", "add:β", "context:c"]);
  });

  it("aguanta tramos fuera de rango", () => {
    const lines = applyHunks(base, [{ start: 99, remove: 5, add: ["z"] }], "e", 1);
    expect(kinds(lines)).toEqual(["context:a", "context:b", "context:c", "add:z"]);
    expect(kinds(applyHunks(base, [{ start: -3, remove: 0, add: ["0"] }], "e", 1))[0]).toBe(
      "add:0",
    );
  });
});
