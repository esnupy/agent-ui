import { describe, expect, it } from "vitest";
import type { ReplayEvent } from "../core/types";
import { clusterMarks, densityBuckets } from "./cluster";

const at = (t: number, type: ReplayEvent["type"] = "thought"): ReplayEvent =>
  ({ id: `e${t}`, t, type, payload: {} }) as ReplayEvent;

describe("clusterMarks", () => {
  it("separa marcas lejanas y agrupa las encimadas", () => {
    const events = [at(0), at(5, "error"), at(500), at(1000)];
    const groups = clusterMarks(events, { start: 0, end: 1000 }, 1000, 12);

    expect(groups.map((group) => group.count)).toEqual([2, 1, 1]);
    expect(groups[0]).toMatchObject({ first: 0, last: 1, type: "error", t: 0 });
    expect(groups[0]?.types).toEqual(["thought", "error"]);
    expect(groups[0]?.x).toBe(2.5);
  });

  it("no encadena una fila densa en un solo grupo", () => {
    const events = Array.from({ length: 100 }, (_, index) => at(index * 5));
    const groups = clusterMarks(events, { start: 0, end: 500 }, 500, 12);
    expect(groups.length).toBeGreaterThan(30);
    expect(groups.reduce((sum, group) => sum + group.count, 0)).toBe(100);
  });

  it("al acercar solo mira la ventana visible", () => {
    const events = Array.from({ length: 10_000 }, (_, index) => at(index));
    const groups = clusterMarks(events, { start: 5000, end: 5010 }, 1000, 12);
    expect(groups).toHaveLength(11);
    expect(groups[0]?.first).toBe(5000);
  });

  it("cuenta la densidad por cubeta", () => {
    expect(densityBuckets([0, 1, 50, 99, 100], 100, 4)).toEqual([2, 0, 1, 2]);
  });
});
