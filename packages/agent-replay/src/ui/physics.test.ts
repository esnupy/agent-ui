import { describe, expect, it } from "vitest";
import {
  estimateVelocity,
  findSnapTarget,
  INERTIA_TAU,
  REST_VELOCITY,
  stepInertia,
  stepSpring,
} from "./physics";

describe("física del scrubber", () => {
  it("estima la velocidad con la ventana reciente", () => {
    const samples = [
      { x: 0, time: 0 },
      { x: 10, time: 100 },
      { x: 20, time: 150 },
      { x: 40, time: 170 },
    ];
    expect(estimateVelocity(samples, 80)).toBeCloseTo(30 / 70);
    expect(estimateVelocity([])).toBe(0);
    expect(estimateVelocity([{ x: 5, time: 10 }])).toBe(0);
  });

  it("la inercia frena hacia x + v·τ sin importar cuántos cuadros haya", () => {
    let coarse = { x: 0, v: 1 };
    let fine = { x: 0, v: 1 };
    for (let frame = 0; frame < 10; frame += 1) coarse = stepInertia(coarse.x, coarse.v, 32);
    for (let frame = 0; frame < 40; frame += 1) fine = stepInertia(fine.x, fine.v, 8);

    expect(coarse.x).toBeCloseTo(fine.x, 6);
    expect(coarse.v).toBeLessThan(1);

    const rest = stepInertia(0, 1, 10_000);
    expect(rest.x).toBeCloseTo(INERTIA_TAU, 3);
    expect(Math.abs(rest.v)).toBeLessThan(REST_VELOCITY);
  });

  it("el resorte llega al objetivo sin pasarse", () => {
    let state = { x: 0, v: 0 };
    let max = 0;
    for (let frame = 0; frame < 120; frame += 1) {
      state = stepSpring(state.x, state.v, 100, 16);
      max = Math.max(max, state.x);
    }
    expect(state.x).toBeCloseTo(100, 1);
    expect(max).toBeLessThanOrEqual(100.0001);
  });

  it("el snap busca el evento más cercano dentro del radio", () => {
    const times = [100, 200, 400];
    expect(findSnapTarget(times, 190, 20)).toBe(200);
    expect(findSnapTarget(times, 210, 20)).toBe(200);
    expect(findSnapTarget(times, 300, 20)).toBeNull();
    expect(findSnapTarget(times, 95, 10)).toBe(100);
    expect(findSnapTarget([], 5, 10)).toBeNull();
  });
});
