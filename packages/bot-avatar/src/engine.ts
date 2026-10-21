import { type BotPose, createMotion, mouthFor } from "./motion";
import { hashString } from "./random";
import type { BotFace, BotShape, BotState } from "./schema";
import { type BotGeometry, fillPoints, getGeometry, SAMPLES, toPath } from "./shapes";
import { pointer, subscribe } from "./ticker";

/** Centro del cuerpo dentro del viewBox de 100. */
export const CENTER_X = 50;
export const CENTER_Y = 56;

/** Cuánto se hunde el sombrero en la cabeza. */
export const HAT_INSET = 3;

const TAU = Math.PI * 2;
const MORPH_SECONDS = 0.55;
const POINTER_IDLE_MS = 2600;

const r = (value: number): number => Math.round(value * 100) / 100;
const r3 = (value: number): number => Math.round(value * 1000) / 1000;

/** Medidas de la forma que cambian al transformarse. */
export type BotFrame = {
  top: number;
  bottom: number;
  faceY: number;
  faceScale: number;
};

/**
 * Medidas en reposo de una geometría.
 *
 * @param geometry - Forma normalizada.
 * @returns Las medidas.
 */
export const frameOf = (geometry: BotGeometry): BotFrame => ({
  top: geometry.top,
  bottom: geometry.bottom,
  faceY: geometry.faceY,
  faceScale: geometry.faceScale,
});

/** Salto, estiramiento e inclinación. El estiramiento se ancla en la base. */
export const figureTransform = (pose: BotPose, bottom: number): string =>
  `translate(${r(CENTER_X + pose.x)} ${r(CENTER_Y + pose.y + bottom)}) scale(${r3(pose.sx)} ${r3(pose.sy)}) translate(0 ${r(-bottom)}) rotate(${r(pose.roll)})`;

/** La cara se corre con la mirada y se aplana al girar, como sobre una esfera. */
export const faceTransform = (pose: BotPose, frame: BotFrame): string => {
  const front = Math.max(0, Math.cos(pose.yaw));
  const x = pose.gazeX * 4.6 + Math.sin(pose.yaw) * 22;
  const y = frame.faceY + pose.gazeY * 3.4;
  const sx = frame.faceScale * (1 - Math.abs(pose.gazeX) * 0.1) * front;
  return `translate(${r(x)} ${r(y)}) scale(${r3(sx)} ${r3(frame.faceScale)})`;
};

/** El visor se mueve menos que los ojos: da profundidad. */
export const visorTransform = (pose: BotPose, frame: BotFrame): string => {
  const front = Math.max(0, Math.cos(pose.yaw));
  const x = pose.gazeX * 1.8 + Math.sin(pose.yaw) * 22;
  const y = frame.faceY + pose.gazeY * 1.4;
  return `translate(${r(x)} ${r(y)}) scale(${r3(frame.faceScale * front)} ${r3(frame.faceScale)})`;
};

/** Parpadeo y un poco de paralaje extra de los ojos. */
export const eyeTransform = (pose: BotPose): string =>
  `translate(${r(pose.gazeX * 0.9)} ${r(pose.gazeY * 0.7)}) scale(1 ${r3(1 - 0.92 * pose.blink)})`;

/** La sombra se encoge y se aclara mientras el cuerpo está en el aire. */
export const shadowTransform = (pose: BotPose, bottom: number): string => {
  const lift = 1 - Math.min(0.5, -pose.y / 30);
  return `translate(${r(CENTER_X + pose.x * 0.5)} ${r(CENTER_Y + bottom + 1.5)}) scale(${r3(lift * pose.sx)} ${r3(lift)})`;
};

export const shadowOpacity = (pose: BotPose): number => r(1 - Math.min(0.6, -pose.y / 24));

/** Boca abierta para hablar. `open` va de 0 a 1. */
export const talkPath = (open: number): string => {
  const w = 3.2 + open * 1.1;
  const h = 0.9 + open * 5.6;
  return `M${r(-w)} 0Q0 0.9 ${r(w)} 0Q${r(w * 0.92)} ${r(h)} 0 ${r(h)}Q${r(-w * 0.92)} ${r(h)} ${r(-w)} 0Z`;
};

/** Lengua dentro de la boca abierta. */
export const tongueOf = (open: number) => {
  const w = 3.2 + open * 1.1;
  const h = 0.9 + open * 5.6;
  return { cy: r(h * 0.86), rx: r(w * 0.55), ry: r(Math.max(0.01, h * 0.34)) };
};

/** Punta de la antena, con retraso de resorte. */
export const antennaOf = (pose: BotPose) => {
  const x = pose.antennaX;
  const y = -13 + pose.antennaY;
  return {
    stem: `M0 2Q${r(x * 0.2)} -5 ${r(x)} ${r(y + 2.6)}`,
    tip: `translate(${r(x)} ${r(y)})`,
  };
};

/** Tres puntos que orbitan el cuerpo. Los de atrás se dibujan detrás. */
export const orbitOf = (angle: number, index: number) => {
  const a = angle + (index * TAU) / 3;
  const depth = Math.sin(a);
  return { cx: r(Math.cos(a) * 38), cy: r(-4 + depth * 8), r: r(2.1 + depth * 0.7), depth };
};

/** Props que el motor lee en cada cuadro. */
export type EngineProps = {
  state: BotState;
  shape: BotShape;
  seed: string;
  face: BotFace;
  level: number;
  speed: number;
  interactive: boolean;
};

type Nodes = {
  body: SVGPathElement | null;
  figure: SVGGElement | null;
  face: SVGGElement | null;
  visor: SVGGElement | null;
  eyes: SVGGElement[];
  talk: SVGPathElement | null;
  tongue: SVGEllipseElement | null;
  hat: SVGGElement | null;
  antennaStem: SVGPathElement | null;
  antennaTip: SVGGElement | null;
  sprout: SVGGElement | null;
  halo: SVGGElement | null;
  headphones: SVGGElement | null;
  orbitBack: SVGCircleElement[];
  orbitFront: SVGCircleElement[];
  shadow: SVGEllipseElement | null;
};

const collect = (root: HTMLElement): Nodes => {
  const one = <T extends Element>(part: string) => root.querySelector<T>(`[data-part="${part}"]`);
  const all = <T extends Element>(part: string) =>
    Array.from(root.querySelectorAll<T>(`[data-part="${part}"]`));

  return {
    body: one("body"),
    figure: one("figure"),
    face: one("face"),
    visor: one("visor"),
    eyes: all("eye"),
    talk: one("talk"),
    tongue: one("tongue"),
    hat: one("hat"),
    antennaStem: one("antenna-stem"),
    antennaTip: one("antenna-tip"),
    sprout: one("sprout"),
    halo: one("halo"),
    headphones: one("headphones"),
    orbitBack: all("orbit-back"),
    orbitFront: all("orbit-front"),
    shadow: one("shadow"),
  };
};

const paint = (
  root: HTMLElement,
  nodes: Nodes,
  pose: BotPose,
  frame: BotFrame,
  props: EngineProps,
) => {
  nodes.figure?.setAttribute("transform", figureTransform(pose, frame.bottom));
  nodes.face?.setAttribute("transform", faceTransform(pose, frame));
  nodes.visor?.setAttribute("transform", visorTransform(pose, frame));
  nodes.hat?.setAttribute("transform", `translate(0 ${r(frame.top + HAT_INSET)})`);

  const eye = eyeTransform(pose);
  for (const node of nodes.eyes) node.setAttribute("transform", eye);

  if (nodes.shadow) {
    nodes.shadow.setAttribute("transform", shadowTransform(pose, frame.bottom));
    nodes.shadow.setAttribute("opacity", String(shadowOpacity(pose)));
  }

  const mouth = mouthFor(props.state, pose.expression, props.face);
  if (root.dataset.expression !== pose.expression) root.dataset.expression = pose.expression;
  if (root.dataset.mouth !== mouth) root.dataset.mouth = mouth;

  if (mouth === "talk") {
    nodes.talk?.setAttribute("d", talkPath(pose.mouth));
    const tongue = tongueOf(pose.mouth);
    nodes.tongue?.setAttribute("cy", String(tongue.cy));
    nodes.tongue?.setAttribute("rx", String(tongue.rx));
    nodes.tongue?.setAttribute("ry", String(tongue.ry));
  }

  if (props.state === "listening") root.style.setProperty("--bot-level", String(r(pose.level)));

  if (nodes.antennaStem && nodes.antennaTip) {
    const antenna = antennaOf(pose);
    nodes.antennaStem.setAttribute("d", antenna.stem);
    nodes.antennaTip.setAttribute("transform", antenna.tip);
  }

  nodes.sprout?.setAttribute(
    "transform",
    `rotate(${r(Math.sin(pose.time * 1.7) * 7 - pose.roll * 0.4)})`,
  );
  nodes.halo?.setAttribute("transform", `translate(0 ${r(Math.sin(pose.time * 2.1) * 1.5)})`);
  nodes.headphones?.setAttribute(
    "transform",
    `scale(${r3(Math.max(0.12, Math.abs(Math.cos(pose.yaw))))} 1)`,
  );

  for (let index = 0; index < nodes.orbitFront.length; index += 1) {
    const dot = orbitOf(pose.orbit, index);
    const front = nodes.orbitFront[index];
    const back = nodes.orbitBack[index];

    for (const node of [front, back]) {
      node?.setAttribute("cx", String(dot.cx));
      node?.setAttribute("cy", String(dot.cy));
      node?.setAttribute("r", String(dot.r));
    }

    front?.setAttribute("opacity", dot.depth > 0 ? "1" : "0");
    back?.setAttribute("opacity", dot.depth > 0 ? "0" : "0.7");
  }
};

const easeInOut = (value: number): number =>
  value < 0.5 ? 4 * value * value * value : 1 - (-2 * value + 2) ** 3 / 2;

const lerp = (from: number, to: number, amount: number): number => from + (to - from) * amount;

/** Control del motor de un avatar montado. */
export type BotEngine = {
  stop: () => void;
  /** Vuelve a buscar los nodos después de que React cambió el árbol. */
  refresh: () => void;
  poke: () => void;
  hover: () => void;
};

/**
 * Arranca el movimiento de un avatar sobre el reloj compartido.
 *
 * Escribe atributos directo en el DOM: React no vuelve a renderizar en cada cuadro.
 * Fuera de pantalla no calcula nada.
 *
 * @param root - Elemento raíz del avatar.
 * @param read - Devuelve las props actuales.
 * @returns El control del motor.
 */
export const startEngine = (root: HTMLElement, read: () => EngineProps): BotEngine => {
  const initial = read();
  const motion = createMotion(hashString(initial.seed) ^ Math.floor(Math.random() * 0x7fffffff));
  const xs = new Float64Array(SAMPLES);
  const ys = new Float64Array(SAMPLES);
  const fromXs = new Float64Array(SAMPLES);
  const fromYs = new Float64Array(SAMPLES);

  let nodes = collect(root);
  let geometry = getGeometry(initial.shape, initial.seed);
  let lastFrame = frameOf(geometry);
  let morph: { start: number; from: BotFrame } | null = null;
  let lastPath = "";
  let visible = true;
  let relative: { x: number; y: number } | null = null;

  const observer =
    typeof IntersectionObserver === "undefined"
      ? null
      : new IntersectionObserver((entries) => {
          for (const entry of entries) visible = entry.isIntersecting;
        });

  observer?.observe(root);

  const unsubscribe = subscribe({
    read: (now) => {
      relative = null;
      if (!visible || !read().interactive) return;
      if (!pointer.active || now - pointer.movedAt > POINTER_IDLE_MS) return;

      const rect = root.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;

      relative = {
        x: (pointer.x - (rect.left + rect.width / 2)) / rect.width,
        y: (pointer.y - (rect.top + rect.height * 0.56)) / rect.height,
      };
    },
    write: (_now, dt) => {
      if (!visible) return;

      const props = read();
      const pose = motion.step(
        { state: props.state, level: props.level, pointer: relative },
        dt * props.speed,
      );
      const next = getGeometry(props.shape, props.seed);

      if (next !== geometry) {
        fromXs.set(xs);
        fromYs.set(ys);
        morph = { start: pose.time, from: lastFrame };
        geometry = next;
        motion.kick(1);
      }

      fillPoints(geometry, pose.time, pose.wobble, pose.wobblePhase, xs, ys);
      let frame: BotFrame = { ...frameOf(geometry), top: ys[0] ?? geometry.top };

      if (morph) {
        const progress = (pose.time - morph.start) / MORPH_SECONDS;

        if (progress >= 1) {
          morph = null;
        } else {
          const amount = easeInOut(progress);

          for (let index = 0; index < SAMPLES; index += 1) {
            xs[index] = lerp(fromXs[index] ?? 0, xs[index] ?? 0, amount);
            ys[index] = lerp(fromYs[index] ?? 0, ys[index] ?? 0, amount);
          }

          frame = {
            top: ys[0] ?? frame.top,
            bottom: lerp(morph.from.bottom, frame.bottom, amount),
            faceY: lerp(morph.from.faceY, frame.faceY, amount),
            faceScale: lerp(morph.from.faceScale, frame.faceScale, amount),
          };
        }
      }

      lastFrame = frame;

      const path = toPath(xs, ys);
      if (path !== lastPath) {
        nodes.body?.setAttribute("d", path);
        lastPath = path;
      }

      paint(root, nodes, pose, frame, props);
    },
  });

  return {
    stop: () => {
      unsubscribe();
      observer?.disconnect();
    },
    refresh: () => {
      nodes = collect(root);
      lastPath = "";
    },
    poke: motion.poke,
    hover: motion.hover,
  };
};
