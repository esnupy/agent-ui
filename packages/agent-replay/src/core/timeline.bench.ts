import { bench, describe } from "vitest";
import { createRandom } from "./prng";
import { createRandomRun } from "./random-run";
import { reduceState } from "./reduce";
import { createTimeline } from "./timeline";

const COUNT = 10_000;
const DURATION = 600_000;
const events = createRandomRun(42, COUNT, DURATION);
const timeline = createTimeline(events);
const random = createRandom(7);
const probes = Array.from({ length: 1000 }, () => random() * DURATION);

describe(`10k eventos (${COUNT})`, () => {
  bench("construir el timeline (snapshots cada 128)", () => {
    createTimeline(events);
  });

  bench("1000 seeks al azar con snapshots", () => {
    for (const t of probes) timeline.stateAt(t);
  });

  bench("reproducir 10 s a 60 fps (600 cuadros)", () => {
    const start = random() * (DURATION - 10_000);
    for (let frame = 0; frame < 600; frame += 1) timeline.stateAt(start + frame * 16.67);
  });

  bench(
    "referencia: 10 seeks reproduciendo desde 0",
    () => {
      for (const t of probes.slice(0, 10)) reduceState(events, t);
    },
    { iterations: 20 },
  );
});
