import { describe, expect, it } from "vitest";
import { createMockRun } from "./mock-run";
import { reduceState } from "./reduce";
import { createTimeline } from "./timeline";

describe("createMockRun", () => {
  it("es determinista por semilla", () => {
    expect(createMockRun({ seed: 3 })).toEqual(createMockRun({ seed: 3 }));
    expect(createMockRun({ seed: 3 })).not.toEqual(createMockRun({ seed: 4 }));
  });

  it("dura lo pedido y llega ordenado", () => {
    const events = createMockRun({ seed: 1, durationMs: 45_000 });
    const timeline = createTimeline(events);

    expect(Math.abs(timeline.duration - 45_000)).toBeLessThan(200);
    expect(events.map((event) => event.t)).toEqual(
      [...events.map((event) => event.t)].sort((a, b) => a - b),
    );
    expect(new Set(events.map((event) => event.id)).size).toBe(events.length);
  });

  it("cuenta la historia completa de un arreglo", () => {
    const events = createMockRun({ seed: 9 });
    const state = reduceState(events, Number.POSITIVE_INFINITY);

    expect(state.plan).toHaveLength(5);
    expect(state.plan.every((step) => step.status === "done")).toBe(true);
    expect(state.files.map((file) => file.path)).toEqual([
      "src/parser/stream.ts",
      "src/parser/stream.test.ts",
    ]);
    expect(state.approvals[0]?.status).toBe("approved");
    expect(state.errors).toHaveLength(1);
    expect(state.tools.at(-1)?.status).toBe("ok");
    expect(state.messages.map((message) => message.role)).toEqual(["user", "assistant"]);
    expect(state.messages[1]?.text).toContain("buffer += chunk");

    const stream = state.files[0]?.lines.filter((line) => line.kind !== "del").map((l) => l.text);
    expect(stream).toContain("    buffer += chunk;");
    expect(stream).toContain("  if (buffer) events.push(toEvent(buffer));");
  });
});
