import { createRandom, hashString } from "./random";
import type { BotShape } from "./schema";

/** Puntos del contorno. Todas las formas usan los mismos ángulos, así se pueden mezclar. */
export const SAMPLES = 64;

/** Medio lado del cuerpo, en unidades del viewBox de 100. */
export const BODY = 30;

/** Escala base de la cara: ojos grandes leen mejor en tamaños chicos. */
const FACE_SCALE = 1.14;

const TAU = Math.PI * 2;
const TOP = -Math.PI / 2;

/** El índice 0 es la coronilla: el ángulo que apunta hacia arriba. */
const ANGLES = Float64Array.from({ length: SAMPLES }, (_, index) => TOP + (index / SAMPLES) * TAU);
const COS = ANGLES.map(Math.cos);
const SIN = ANGLES.map(Math.sin);

type Phases = readonly [number, number, number];

type ShapeDef = {
  /** Radio en el ángulo dado. El tiempo solo importa si `animated`. */
  radius: (theta: number, time: number, phases: Phases) => number;
  /** Pasadas de suavizado: redondea esquinas sin perder el carácter. */
  soften: number;
  animated: boolean;
  /** Desplazamiento vertical de la cara, en medios lados. */
  faceY: number;
  faceScale: number;
};

/** Color de cada forma cuando no se pasa `color`. */
export const SHAPE_COLORS: Record<BotShape, string> = {
  orb: "#7c8cff",
  blob: "#ff7a93",
  squircle: "#ffb347",
  drop: "#4cc3f5",
  ghost: "#ece8f7",
  gem: "#3ccf91",
  tri: "#ff8552",
  star: "#ffd23f",
  flower: "#f47fc0",
  cloud: "#9fd4ff",
  cat: "#a68bff",
  droid: "#98a6b8",
  pill: "#53dcc8",
};

const at = (values: Float64Array, index: number): number => values[index] ?? 0;

/** Distancia angular con signo, en (-π, π]. */
const gap = (a: number, b: number): number => {
  let delta = (a - b) % TAU;
  if (delta > Math.PI) delta -= TAU;
  if (delta <= -Math.PI) delta += TAU;
  return delta;
};

const superellipse = (exponent: number, ax: number, ay: number) => (theta: number) => {
  const x = Math.abs(Math.cos(theta)) / ax;
  const y = Math.abs(Math.sin(theta)) / ay;
  return (x ** exponent + y ** exponent) ** (-1 / exponent);
};

const polygon = (sides: number, rotation: number) => (theta: number) => {
  const sector = TAU / sides;
  const phi = ((((theta - rotation) % sector) + sector) % sector) - sector / 2;
  return Math.cos(Math.PI / sides) / Math.cos(phi);
};

const catHead = superellipse(2.2, 1, 0.92);
const cloudBase = superellipse(2.6, 1.18, 0.82);

/**
 * Domo arriba, paredes rectas y un faldón ondulado que se mueve con el tiempo.
 * Busca por bisección dónde el rayo cruza el faldón.
 */
const ghostRadius = (theta: number, time: number): number => {
  const sin = Math.sin(theta);
  const cos = Math.cos(theta);

  if (sin <= 0) return 1;

  const wall = 1 / Math.max(Math.abs(cos), 1e-6);
  const hem = (r: number) => 0.9 + 0.11 * Math.cos(r * cos * 3 * Math.PI + time * 2.4);

  if (wall * sin <= hem(wall)) return wall;

  let low = 0;
  let high = Math.min(wall, 1.02 / sin);

  for (let step = 0; step < 14; step += 1) {
    const mid = (low + high) / 2;
    if (mid * sin < hem(mid)) low = mid;
    else high = mid;
  }

  return (low + high) / 2;
};

const SHAPES: Record<BotShape, ShapeDef> = {
  orb: {
    radius: superellipse(2, 1, 0.95),
    soften: 0,
    animated: false,
    faceY: 0,
    faceScale: 1,
  },
  blob: {
    radius: (theta, time, [a, b, c]) =>
      1 +
      0.075 * Math.sin(2 * theta + a + time * 0.55) +
      0.055 * Math.sin(3 * theta + b - time * 0.7) +
      0.035 * Math.sin(5 * theta + c + time * 0.9),
    soften: 0,
    animated: true,
    faceY: 0,
    faceScale: 1,
  },
  squircle: {
    radius: superellipse(4, 1, 0.96),
    soften: 1,
    animated: false,
    faceY: 0,
    faceScale: 1,
  },
  drop: {
    radius: (theta) => {
      const distance = Math.abs(gap(theta, TOP));
      return 0.84 + 0.56 * Math.max(0, 1 - distance / 1.25) ** 2.2;
    },
    soften: 2,
    animated: false,
    faceY: 0.2,
    faceScale: 0.92,
  },
  ghost: {
    radius: (theta, time) => ghostRadius(theta, time),
    soften: 1,
    animated: true,
    faceY: -0.12,
    faceScale: 1,
  },
  gem: {
    radius: polygon(6, TOP),
    soften: 3,
    animated: false,
    faceY: 0,
    faceScale: 0.95,
  },
  tri: {
    radius: polygon(3, TOP),
    soften: 4,
    animated: false,
    faceY: 0.24,
    faceScale: 0.78,
  },
  star: {
    radius: (theta) => 0.62 + 0.38 * ((1 + Math.cos(5 * (theta - TOP))) / 2) ** 1.4,
    soften: 2,
    animated: false,
    faceY: 0.06,
    faceScale: 0.8,
  },
  flower: {
    radius: (theta) => 0.76 + 0.24 * Math.abs(Math.cos(3 * (theta - TOP))) ** 0.6,
    soften: 1,
    animated: false,
    faceY: 0.02,
    faceScale: 0.92,
  },
  cloud: {
    radius: (theta) => {
      const weight = Math.min(1, Math.max(0, (0.35 - Math.sin(theta)) / 0.7));
      return cloudBase(theta) + 0.14 * Math.abs(Math.cos(2.5 * (theta - TOP))) ** 0.8 * weight;
    },
    soften: 1,
    animated: false,
    faceY: 0.12,
    faceScale: 0.92,
  },
  cat: {
    radius: (theta) => {
      const left = gap(theta, TOP - 0.62) / 0.17;
      const right = gap(theta, TOP + 0.62) / 0.17;
      return catHead(theta) + 0.48 * Math.exp(-left * left) + 0.48 * Math.exp(-right * right);
    },
    soften: 1,
    animated: false,
    faceY: 0.12,
    faceScale: 0.95,
  },
  droid: {
    radius: superellipse(3.4, 1, 0.78),
    soften: 0,
    animated: false,
    faceY: 0,
    faceScale: 1.05,
  },
  pill: {
    radius: superellipse(2.4, 0.72, 1),
    soften: 0,
    animated: false,
    faceY: -0.04,
    faceScale: 0.85,
  },
};

/** Forma ya normalizada para caber en el cuadro del cuerpo. */
export type BotGeometry = {
  key: string;
  shape: BotShape;
  animated: boolean;
  /** Coronilla en reposo (y de la muestra 0). */
  top: number;
  /** Punto más alto del contorno. Distinto de `top` en el gato, por las orejas. */
  peak: number;
  bottom: number;
  halfWidth: number;
  /** Altura y medio ancho donde van los audífonos. */
  earY: number;
  earX: number;
  faceY: number;
  faceScale: number;
  /** Interno: transformación del radio unitario a unidades del viewBox. */
  def: ShapeDef;
  phases: Phases;
  cx: number;
  cy: number;
  scale: number;
};

const scratch = new Float64Array(SAMPLES);
const radii = new Float64Array(SAMPLES);

const fillRadii = (
  def: ShapeDef,
  phases: Phases,
  time: number,
  wobble: number,
  wobblePhase: number,
): void => {
  for (let index = 0; index < SAMPLES; index += 1) {
    radii[index] = def.radius(at(ANGLES, index), time, phases);
  }

  for (let pass = 0; pass < def.soften; pass += 1) {
    scratch.set(radii);

    for (let index = 0; index < SAMPLES; index += 1) {
      const previous = at(scratch, (index - 1 + SAMPLES) % SAMPLES);
      const next = at(scratch, (index + 1) % SAMPLES);
      radii[index] = previous * 0.25 + at(scratch, index) * 0.5 + next * 0.25;
    }
  }

  if (wobble <= 0.001) return;

  for (let index = 0; index < SAMPLES; index += 1) {
    const theta = at(ANGLES, index);
    const jelly =
      0.05 * Math.sin(3 * theta + wobblePhase) +
      0.035 * Math.sin(2 * theta - wobblePhase * 1.3 + 1);
    radii[index] = at(radii, index) * (1 + wobble * jelly);
  }
};

/**
 * Llena los contornos con la forma en un instante.
 *
 * @param geometry - Forma normalizada.
 * @param time - Segundos, para formas que se mueven solas (blob, ghost).
 * @param wobble - Amplitud de la gelatina, de 0 a 1.
 * @param wobblePhase - Fase de la gelatina.
 * @param xs - Salida: x de cada muestra, relativa al centro del cuerpo.
 * @param ys - Salida: y de cada muestra.
 */
export const fillPoints = (
  geometry: Pick<BotGeometry, "def" | "phases" | "cx" | "cy" | "scale">,
  time: number,
  wobble: number,
  wobblePhase: number,
  xs: Float64Array,
  ys: Float64Array,
): void => {
  fillRadii(geometry.def, geometry.phases, time, wobble, wobblePhase);

  for (let index = 0; index < SAMPLES; index += 1) {
    const radius = at(radii, index);
    xs[index] = (radius * at(COS, index) - geometry.cx) * geometry.scale;
    ys[index] = (radius * at(SIN, index) - geometry.cy) * geometry.scale;
  }
};

const round = (value: number): number => Math.round(value * 100) / 100;

/**
 * Convierte el contorno en un trazo cerrado y suave (Catmull-Rom a Bézier).
 *
 * @param xs - Coordenadas x.
 * @param ys - Coordenadas y.
 * @returns El atributo `d`.
 */
export const toPath = (xs: Float64Array, ys: Float64Array): string => {
  const count = xs.length;
  let d = `M${round(at(xs, 0))} ${round(at(ys, 0))}`;

  for (let index = 0; index < count; index += 1) {
    const before = (index - 1 + count) % count;
    const next = (index + 1) % count;
    const after = (index + 2) % count;
    const c1x = at(xs, index) + (at(xs, next) - at(xs, before)) / 6;
    const c1y = at(ys, index) + (at(ys, next) - at(ys, before)) / 6;
    const c2x = at(xs, next) - (at(xs, after) - at(xs, index)) / 6;
    const c2y = at(ys, next) - (at(ys, after) - at(ys, index)) / 6;

    d += `C${round(c1x)} ${round(c1y)} ${round(c2x)} ${round(c2y)} ${round(at(xs, next))} ${round(at(ys, next))}`;
  }

  return `${d}Z`;
};

const cache = new Map<string, BotGeometry>();
const CACHE_LIMIT = 256;

/**
 * Normaliza una forma para que su lado mayor mida `2 * BODY` y quede centrada.
 *
 * Solo el blob depende de la semilla. El resultado se guarda en caché.
 *
 * @param shape - Silueta.
 * @param seed - Semilla del blob.
 * @returns La geometría lista para dibujar.
 */
export const getGeometry = (shape: BotShape, seed: string): BotGeometry => {
  const key = shape === "blob" ? `blob:${seed}` : shape;
  const cached = cache.get(key);
  if (cached) return cached;

  const def = SHAPES[shape];
  const random = createRandom(hashString(seed) ^ 0x9e3779b9);
  const phases: Phases = [random() * TAU, random() * TAU, random() * TAU];

  fillRadii(def, phases, 0, 0, 0);

  let minX = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;

  for (let index = 0; index < SAMPLES; index += 1) {
    const x = at(radii, index) * at(COS, index);
    const y = at(radii, index) * at(SIN, index);
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
  }

  const scale = (2 * BODY) / Math.max(maxX - minX, maxY - minY);
  const base = {
    key,
    shape,
    animated: def.animated,
    def,
    phases,
    cx: (minX + maxX) / 2,
    cy: (minY + maxY) / 2,
    scale,
  };

  const xs = new Float64Array(SAMPLES);
  const ys = new Float64Array(SAMPLES);
  fillPoints(base, 0, 0, 0, xs, ys);

  const peak = (minY - base.cy) * scale;
  const bottom = (maxY - base.cy) * scale;
  const halfWidth = ((maxX - minX) / 2) * scale;
  const earY = peak + (bottom - peak) * 0.42;
  let earX = 0;

  for (let index = 0; index < SAMPLES; index += 1) {
    if (Math.abs(at(ys, index) - earY) < 5) earX = Math.max(earX, Math.abs(at(xs, index)));
  }

  const geometry: BotGeometry = {
    ...base,
    top: at(ys, 0),
    peak,
    bottom,
    halfWidth,
    earX: earX || halfWidth,
    earY,
    faceY: def.faceY * BODY,
    faceScale: def.faceScale * FACE_SCALE,
  };

  if (cache.size >= CACHE_LIMIT) cache.clear();
  cache.set(key, geometry);

  return geometry;
};

/**
 * Contorno en reposo, para el primer render y para el modo sin movimiento.
 *
 * @param geometry - Forma normalizada.
 * @returns El atributo `d`.
 */
export const restPath = (geometry: BotGeometry): string => {
  const xs = new Float64Array(SAMPLES);
  const ys = new Float64Array(SAMPLES);
  fillPoints(geometry, 0, 0, 0, xs, ys);
  return toPath(xs, ys);
};
