import { createRandom } from "./random";
import type { BotExpression, BotFace, BotMouth, BotState } from "./schema";

const TAU = Math.PI * 2;

/** Lo que el modelo necesita saber en cada cuadro. */
export type MotionInput = {
  state: BotState;
  /** Volumen de 0 a 1. */
  level: number;
  /** Puntero relativo al centro del avatar, en lados del avatar. `null` si no hay. */
  pointer: { x: number; y: number } | null;
};

/** Pose completa en un instante. Todo en unidades del viewBox salvo que diga otra cosa. */
export type BotPose = {
  /** Desplazamiento horizontal (sacudida). */
  x: number;
  /** Altura del salto. Negativo es arriba. */
  y: number;
  sx: number;
  sy: number;
  /** Inclinación, en grados. */
  roll: number;
  /** Giro sobre el eje vertical, en radianes. 0 es de frente. */
  yaw: number;
  /** Mirada, de -1 a 1. */
  gazeX: number;
  gazeY: number;
  /** 0 abierto, 1 cerrado. */
  blink: number;
  /** Apertura de la boca, de 0 a 1. */
  mouth: number;
  /** Volumen suavizado. */
  level: number;
  wobble: number;
  wobblePhase: number;
  /** Segundos acumulados, escalados por la velocidad. */
  time: number;
  /** Ángulo de los puntos que orbitan mientras piensa. */
  orbit: number;
  /** Retraso de la punta de la antena. */
  antennaX: number;
  antennaY: number;
  expression: BotExpression;
};

/** Cuánto dura el gesto de esfuerzo antes de pasar a la tristeza. */
const SQUEEZE_SECONDS = 0.9;

/**
 * Gesto de los ojos que corresponde a un estado.
 *
 * @param state - Estado del agente.
 * @param since - Segundos desde que entró al estado.
 * @returns La expresión.
 */
export const expressionFor = (state: BotState, since = Number.POSITIVE_INFINITY): BotExpression => {
  switch (state) {
    case "thinking":
      return "think";
    case "working":
      return "focus";
    case "listening":
      return "wide";
    case "sleeping":
      return "closed";
    case "success":
      return "happy";
    case "error":
      return since < SQUEEZE_SECONDS ? "squeeze" : "sad";
    default:
      return "open";
  }
};

/**
 * Boca que corresponde al estado, la expresión y el tipo de cara.
 *
 * Con `face="eyes"` solo aparece al hablar.
 *
 * @param state - Estado del agente.
 * @param expression - Gesto actual de los ojos.
 * @param face - Tipo de cara.
 * @returns La boca.
 */
export const mouthFor = (state: BotState, expression: BotExpression, face: BotFace): BotMouth => {
  if (state === "speaking") return "talk";
  if (face === "eyes") return "none";

  switch (expression) {
    case "happy":
      return "grin";
    case "closed":
    case "wide":
      return "o";
    case "squeeze":
    case "sad":
      return "wavy";
    case "focus":
      return "flat";
    default:
      return "smile";
  }
};

/** Expresiones en las que los ojos están abiertos y pueden parpadear. */
const BLINKS: ReadonlySet<BotExpression> = new Set(["open", "wide", "focus", "think", "sad"]);

const REST_ROLL: Partial<Record<BotState, number>> = {
  thinking: 4,
  listening: 9,
  sleeping: 7,
  error: -5,
};

const REST_GAZE: Partial<Record<BotState, [number, number]>> = {
  thinking: [0.6, -0.8],
  working: [0, 0.35],
  sleeping: [0, 0.5],
  error: [0, 0.4],
  success: [0, -0.15],
};

/**
 * Pose quieta de un estado. Es el primer cuadro y la pose sin movimiento.
 *
 * @param state - Estado del agente.
 * @returns La pose.
 */
export const restPose = (state: BotState): BotPose => {
  const [gazeX, gazeY] = REST_GAZE[state] ?? [0, 0];
  const sink = state === "sleeping" ? 0.05 : state === "error" ? 0.03 : 0;

  return {
    x: 0,
    y: 0,
    sx: 1 + sink * 0.6,
    sy: 1 - sink,
    roll: REST_ROLL[state] ?? 0,
    yaw: 0,
    gazeX,
    gazeY,
    blink: 0,
    mouth: state === "speaking" ? 0.45 : 0,
    level: 0,
    wobble: 0,
    wobblePhase: 0,
    time: 0,
    orbit: 0.6,
    antennaX: 0,
    antennaY: 0,
    expression: expressionFor(state),
  };
};

const HOP_ANTICIPATION = 0.18;
const HOP_LANDING = 0.2;

/** Cuadro de un salto: altura, estiramiento y giro. */
export type HopFrame = { y: number; squash: number; yaw: number };

const easeInOut = (value: number): number =>
  value < 0.5 ? 4 * value * value * value : 1 - (-2 * value + 2) ** 3 / 2;

/**
 * Evalúa un salto con anticipación, vuelo y aterrizaje.
 *
 * `squash` negativo aplasta, positivo estira.
 *
 * @param progress - Avance de 0 a 1.
 * @param height - Altura máxima.
 * @param spin - Si da la vuelta completa en el aire.
 * @returns El cuadro.
 */
export const evaluateHop = (progress: number, height: number, spin: boolean): HopFrame => {
  if (progress <= 0 || progress >= 1) return { y: 0, squash: 0, yaw: 0 };

  if (progress < HOP_ANTICIPATION) {
    const k = progress / HOP_ANTICIPATION;
    return { y: 0, squash: -0.15 * Math.sin((k * Math.PI) / 2), yaw: 0 };
  }

  const landing = 1 - HOP_LANDING;

  if (progress > landing) {
    const k = (progress - landing) / HOP_LANDING;
    return { y: 0, squash: -0.17 * Math.sin(k * Math.PI), yaw: 0 };
  }

  const k = (progress - HOP_ANTICIPATION) / (landing - HOP_ANTICIPATION);

  return {
    y: -height * 4 * k * (1 - k),
    squash: 0.11 * Math.abs(1 - 2 * k) ** 1.5,
    yaw: spin ? TAU * easeInOut(k) : 0,
  };
};

/**
 * Sílabas falsas para cuando habla sin volumen real.
 *
 * @param time - Segundos.
 * @returns Apertura de 0 a 1.
 */
export const syntheticSpeech = (time: number): number => {
  const pause = Math.sin(time * 1.9 + 0.6) > -0.55 ? 1 : 0.08;
  const syllables = 0.55 + 0.45 * Math.sin(time * 13.7) * Math.sin(time * 4.1 + 1.3);
  const accent = 0.2 * Math.sin(time * 7.3 + 0.4);
  return Math.min(1, Math.max(0, (syllables + accent) * pause));
};

type Spring = { value: number; velocity: number };

const spring = (value = 0): Spring => ({ value, velocity: 0 });

const follow = (
  current: Spring,
  target: number,
  stiffness: number,
  damping: number,
  dt: number,
): number => {
  current.velocity += (stiffness * (target - current.value) - damping * current.velocity) * dt;
  current.value += current.velocity * dt;
  return current.value;
};

type Hop = { start: number; duration: number; height: number; spin: boolean; landed: boolean };

/** Modelo de movimiento de un avatar. No toca el DOM. */
export type BotMotion = {
  /** Avanza el reloj y devuelve la pose. */
  step: (input: MotionInput, dt: number) => BotPose;
  /** Toque: salta y gira. Si está dormido, se despierta un momento. */
  poke: () => void;
  /** Puntero encima: un temblor de gelatina. */
  hover: () => void;
  /** Impulso de gelatina, por ejemplo al cambiar de forma. */
  kick: (amount: number) => void;
};

/**
 * Crea el modelo de movimiento: mirada, parpadeo, saltos, gelatina y gestos de cada estado.
 *
 * @param seed - Semilla para el ritmo de los gestos.
 * @returns El modelo.
 */
export const createMotion = (seed: number): BotMotion => {
  const random = createRandom(seed);
  const between = (min: number, max: number) => min + random() * (max - min);

  const gazeX = spring();
  const gazeY = spring();
  const roll = spring();
  const mouth = spring();
  const level = spring();
  const squash = spring();
  const sink = spring();
  const antennaX = spring();
  const antennaY = spring();

  let time = 0;
  let state: BotState | null = null;
  let enteredAt = 0;
  let hop: Hop | null = null;
  let wobble = 0;
  let wobblePhase = 0;
  let orbit = 0.6;
  let blinkStart = Number.NEGATIVE_INFINITY;
  let nextBlink = between(0.8, 2.6);
  let lookX = 0;
  let lookY = 0;
  let nextLook = between(0.4, 1.6);
  let nextHop = between(3, 7);
  let beat = 0;
  let nextBeat = 0;
  let shakeStart = Number.NEGATIVE_INFINITY;
  let override: { expression: BotExpression; until: number } | null = null;
  let lastY = 0;

  const startHop = (height: number, duration: number, spin: boolean, force = false) => {
    if (hop && !force) return;
    hop = { start: time, duration, height, spin, landed: false };
  };

  const enter = (next: BotState) => {
    const first = state === null;
    state = next;
    enteredAt = time;
    override = null;
    if (!first) wobble = Math.max(wobble, 0.5);

    switch (next) {
      case "success":
        if (!first) startHop(14, 0.9, true, true);
        nextHop = time + between(1.6, 2.4);
        break;
      case "error":
        if (!first) shakeStart = time;
        break;
      case "working":
        beat = 0;
        nextBeat = time + 0.2;
        break;
      case "idle":
        nextHop = time + between(4, 8);
        break;
      default:
        break;
    }
  };

  const step = (input: MotionInput, rawDt: number): BotPose => {
    const dt = Math.min(Math.max(rawDt, 0), 1 / 30);
    time += dt;

    if (input.state !== state) enter(input.state);

    const current = input.state;
    const since = time - enteredAt;
    let targetX = 0;
    let targetY = 0;
    let targetRoll = 0;
    let targetMouth = 0;
    let targetSink = 0;
    let breathRate = 0.28;
    let breathAmp = 0.014;

    if (time >= nextLook) {
      const center = random() < 0.25;
      lookX = center ? 0 : between(-0.85, 0.85);
      lookY = center ? 0 : between(-0.5, 0.45);
      nextLook = time + between(1.1, 3.4);
    }

    switch (current) {
      case "idle":
        targetX = lookX;
        targetY = lookY;
        targetRoll = lookX * 3;
        if (time >= nextHop) {
          startHop(6, 0.62, random() < 0.3);
          nextHop = time + between(6, 11);
        }
        break;
      case "thinking":
        targetX = Math.sin(time * 0.45) > 0 ? 0.6 : -0.6;
        targetY = -0.8;
        targetRoll = Math.sin(time * 1.1) * 5;
        breathRate = 0.34;
        orbit += dt * 2.6;
        break;
      case "working":
        targetX = Math.sin(time * 1.3) * 0.4;
        targetY = 0.35;
        if (time >= nextBeat) {
          beat += 1;
          const big = beat % 5 === 0;
          if (big) startHop(12, 0.82, true);
          else startHop(3.2, 0.36, false);
          nextBeat = time + (big ? 1 : 0.46);
        }
        break;
      case "speaking":
        targetMouth = input.level > 0.01 ? input.level : syntheticSpeech(time);
        targetY = 0.05;
        targetRoll = Math.sin(time * 2.6) * 2.5;
        break;
      case "listening":
        targetRoll = Math.sin(time * 0.6) > -0.2 ? 9 : -7;
        targetX = targetRoll > 0 ? 0.15 : -0.15;
        targetY = -0.12;
        break;
      case "sleeping":
        breathRate = 0.16;
        breathAmp = 0.035;
        targetSink = 0.05;
        targetRoll = 7;
        targetY = 0.5;
        break;
      case "success":
        targetX = lookX * 0.5;
        targetY = -0.15;
        if (time >= nextHop) {
          startHop(4.5, 0.42, false);
          nextHop = time + between(1.3, 2.1);
        }
        break;
      case "error":
        targetSink = 0.03;
        targetRoll = since > SQUEEZE_SECONDS ? -5 : 0;
        targetY = 0.4;
        break;
    }

    const pointer = input.pointer;
    const watches =
      current === "idle" ||
      current === "listening" ||
      current === "speaking" ||
      current === "success" ||
      current === "working";

    if (pointer && watches) {
      const distance = Math.max(Math.hypot(pointer.x, pointer.y), 1.1);
      targetX = pointer.x / distance;
      targetY = (pointer.y / distance) * 0.8;
      if (current === "idle") targetRoll = targetX * 4;
    }

    let y = 0;
    let hopSquash = 0;
    let yaw = 0;

    if (hop) {
      const progress = (time - hop.start) / hop.duration;

      if (progress >= 1) {
        hop = null;
      } else {
        const frame = evaluateHop(progress, hop.height, hop.spin);
        y = frame.y;
        hopSquash = frame.squash;
        yaw = frame.yaw;

        if (!hop.landed && progress >= 1 - HOP_LANDING) {
          hop.landed = true;
          wobble = Math.max(wobble, 0.35 + hop.height / 22);
        }
      }
    }

    const shake = time - shakeStart;
    const x = shake < 0.9 ? 3.2 * Math.sin(shake * 42) * Math.exp(-shake * 4.2) : 0;
    const breath = Math.sin(time * breathRate * TAU) * breathAmp;

    const squashValue = follow(squash, hopSquash, 520, 30, dt);
    const levelValue = Math.max(0, follow(level, input.level, 160, 20, dt));
    const mouthValue = Math.min(1, Math.max(0, follow(mouth, targetMouth, 300, 24, dt)));
    const sinkValue = follow(sink, targetSink, 40, 12, dt);
    const rollValue = follow(roll, targetRoll, 50, 9, dt);

    let sy = 1 + squashValue + breath - sinkValue;
    if (current === "speaking") sy += mouthValue * 0.03;
    if (current === "listening") sy += levelValue * 0.04;
    const sx = 1 - squashValue * 0.85 - breath * 0.6 + sinkValue * 0.6;

    if (override && time >= override.until) override = null;
    const expression = override?.expression ?? expressionFor(current, since);

    if (time >= nextBlink) {
      blinkStart = time;
      nextBlink = time + (random() < 0.2 ? 0.28 : between(2.2, 5.6));
    }

    const blinkProgress = (time - blinkStart) / 0.16;
    const blink =
      BLINKS.has(expression) && blinkProgress >= 0 && blinkProgress <= 1
        ? Math.sin(blinkProgress * Math.PI)
        : 0;

    wobble *= Math.exp(-dt * 3.6);
    wobblePhase += dt * 17;

    const velocity = dt > 0 ? (y - lastY) / dt : 0;
    lastY = y;

    return {
      x,
      y,
      sx,
      sy,
      roll: rollValue,
      yaw,
      gazeX: follow(gazeX, targetX, 140, 18, dt),
      gazeY: follow(gazeY, targetY, 140, 18, dt),
      blink,
      mouth: mouthValue,
      level: levelValue,
      wobble,
      wobblePhase,
      time,
      orbit,
      antennaX: follow(antennaX, -rollValue * 0.22 - x * 0.5, 90, 7, dt),
      antennaY: follow(antennaY, Math.min(4, Math.max(-4, velocity * 0.03)), 90, 7, dt),
      expression,
    };
  };

  const poke = () => {
    if (state === "sleeping") {
      override = { expression: "wide", until: time + 1.1 };
      startHop(3, 0.3, false, true);
      wobble = Math.max(wobble, 0.8);
      return;
    }

    startHop(10, 0.72, true, true);
    override = { expression: "happy", until: time + 0.95 };
    wobble = 1;
  };

  const hover = () => {
    wobble = Math.max(wobble, 0.55);
  };

  const kick = (amount: number) => {
    wobble = Math.max(wobble, amount);
  };

  return { step, poke, hover, kick };
};
