"use client";

import { cn, useReducedMotion } from "@componentes-ia/core";
import {
  type CSSProperties,
  createContext,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
} from "react";
import {
  type BotEngine,
  CENTER_X,
  CENTER_Y,
  type EngineProps,
  eyeTransform,
  faceTransform,
  figureTransform,
  frameOf,
  HAT_INSET,
  shadowOpacity,
  shadowTransform,
  startEngine,
  visorTransform,
} from "./engine";
import { mouthFor, restPose } from "./motion";
import { Effects, Eye, Glasses, Hat, Mouth, Orbit } from "./parts";
import { hashString } from "./random";
import {
  type BotAccessory,
  type BotFace,
  type BotFinish,
  type BotShape,
  type BotState,
  STATE_LABEL,
} from "./schema";
import { getGeometry, restPath, SHAPE_COLORS } from "./shapes";
import { getBotTraits } from "./traits";

/** Tamaño que reparte BotAvatarGroup a sus hijos. */
export const BotSizeContext = createContext<number | null>(null);

export type BotAvatarProps = {
  /** Id o nombre. Decide lo que esté en `auto` y el ritmo de los gestos. */
  seed?: string;
  /** Lo que está haciendo el agente. */
  state?: BotState;
  /** Silueta. `auto` la elige con `seed`. */
  shape?: BotShape | "auto";
  face?: BotFace;
  finish?: BotFinish;
  /** Lo que lleva puesto. `auto` lo elige con `seed`. */
  accessory?: BotAccessory | "auto";
  /** Color del cuerpo. Vacío usa el de la forma, o el de `seed` con `shape="auto"`. */
  color?: string;
  /** Color del accesorio. */
  accent?: string;
  /** Color de ojos y boca. */
  ink?: string;
  /** Lado en pixeles. */
  size?: number;
  /** Volumen de 0 a 1 para hablar y escuchar. */
  level?: number;
  /** Multiplicador del tiempo. */
  speed?: number;
  /** Mirada al puntero y salto al tocar. */
  interactive?: boolean;
  blush?: boolean;
  shadow?: boolean;
  /** Pose quieta del estado. */
  paused?: boolean;
  /** Nombre accesible. Se le suma el estado. */
  label?: string;
  className?: string;
  style?: CSSProperties;
};

const DEFAULT_SIZE = 96;

/**
 * Mascota animada para un agente.
 *
 * Trece formas que se transforman entre sí, ocho estados con su propia cara y
 * cuerpo, boca que sigue el volumen y ojos que siguen al puntero. Todo en SVG,
 * sin dependencias, con un solo requestAnimationFrame para todos los avatares.
 *
 * @param props - Identidad, estado, apariencia y movimiento.
 * @returns El avatar.
 */
export const BotAvatar = ({
  seed = "Nova",
  state = "idle",
  shape = "auto",
  face = "eyes",
  finish = "clay",
  accessory = "none",
  color = "",
  accent = "",
  ink = "",
  size,
  level = 0,
  speed = 1,
  interactive = true,
  blush = true,
  shadow = true,
  paused = false,
  label = "",
  className,
  style,
}: BotAvatarProps) => {
  const groupSize = useContext(BotSizeContext);
  const reduced = useReducedMotion();
  const rootRef = useRef<HTMLSpanElement>(null);
  const engineRef = useRef<BotEngine | null>(null);
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const traits = useMemo(() => getBotTraits(seed), [seed]);

  const resolvedShape = shape === "auto" ? traits.shape : shape;
  const resolvedAccessory = accessory === "auto" ? traits.accessory : accessory;
  const bodyColor = color || (shape === "auto" ? traits.color : SHAPE_COLORS[resolvedShape]);
  const animated = !reduced && !paused;
  const finalSize = size ?? groupSize ?? DEFAULT_SIZE;

  const geometry = getGeometry(resolvedShape, seed);
  const bodyPath = useMemo(() => restPath(geometry), [geometry]);
  const pose = restPose(state);
  const frame = frameOf(geometry);
  const mouth = mouthFor(state, pose.expression, face);

  const engineProps: EngineProps = {
    state,
    shape: resolvedShape,
    seed,
    face,
    level: Math.min(1, Math.max(0, level)),
    speed: Math.min(3, Math.max(0.25, speed)),
    interactive,
  };
  const propsRef = useRef(engineProps);

  useLayoutEffect(() => {
    propsRef.current = engineProps;
    engineRef.current?.refresh();
  });

  useEffect(() => {
    const root = rootRef.current;
    if (!animated || !root || typeof window.requestAnimationFrame !== "function") return undefined;

    const engine = startEngine(root, () => propsRef.current);
    engineRef.current = engine;

    return () => {
      engine.stop();
      engineRef.current = null;
    };
  }, [animated]);

  const id = (name: string) => `bot${uid}-${name}`;
  const url = (name: string) => `url(#${id(name)})`;

  const handlePointerDown = () => {
    if (interactive) engineRef.current?.poke();
  };

  const handlePointerEnter = () => {
    if (interactive) engineRef.current?.hover();
  };

  const vars = {
    "--bot-size": `${finalSize}px`,
    "--bot-color": bodyColor,
    ...(accent ? { "--bot-accent": accent } : null),
    ...(ink ? { "--bot-ink": ink } : null),
    ...style,
  } as CSSProperties;

  return (
    <span
      aria-label={`${label || "Bot"}, ${STATE_LABEL[state]}`}
      className={cn("bot-avatar", className)}
      data-accessory={resolvedAccessory}
      data-face={face}
      data-finish={finish}
      data-interactive={interactive ? "true" : "false"}
      data-motion={animated ? "on" : reduced ? "reduced" : "paused"}
      data-shape={resolvedShape}
      data-state={state}
      onPointerDown={handlePointerDown}
      onPointerEnter={handlePointerEnter}
      ref={rootRef}
      role="img"
      style={vars}
    >
      <svg
        aria-hidden="true"
        className="bot-avatar__svg"
        data-expression={pose.expression}
        data-mouth={mouth}
        focusable="false"
        key={animated ? "live" : "still"}
        viewBox="0 0 100 100"
      >
        <defs>
          <path d={bodyPath} data-part="body" id={id("body")} />
          <radialGradient cx="38%" cy="30%" fx="32%" fy="22%" id={id("skin")} r="78%">
            <stop className="bot-avatar__stop-hi" offset="0" />
            <stop className="bot-avatar__stop-mid" offset="0.55" />
            <stop className="bot-avatar__stop-lo" offset="1" />
          </radialGradient>
          <clipPath id={id("clip")}>
            <use href={`#${id("body")}`} />
          </clipPath>
          <filter height="200%" id={id("soft")} width="200%" x="-50%" y="-50%">
            <feGaussianBlur stdDeviation="4" />
          </filter>
          <filter height="300%" id={id("glow")} width="300%" x="-100%" y="-100%">
            <feGaussianBlur stdDeviation="1.6" />
          </filter>
          {finish === "fuzzy" ? (
            <filter
              colorInterpolationFilters="sRGB"
              height="140%"
              id={id("fur")}
              width="140%"
              x="-20%"
              y="-20%"
            >
              <feTurbulence
                baseFrequency="1.1"
                numOctaves="2"
                result="noise"
                seed={hashString(seed) % 1000}
                type="fractalNoise"
              />
              <feDisplacementMap
                in="SourceGraphic"
                in2="noise"
                result="fuzz"
                scale="3.2"
                xChannelSelector="R"
                yChannelSelector="G"
              />
              <feColorMatrix
                in="noise"
                result="specks"
                type="matrix"
                values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0.42 0 -0.24"
              />
              <feComposite in="specks" in2="fuzz" operator="in" result="grain" />
              <feMerge>
                <feMergeNode in="fuzz" />
                <feMergeNode in="grain" />
              </feMerge>
            </filter>
          ) : null}
        </defs>

        {state === "listening" ? (
          <Effects center={{ x: CENTER_X, y: CENTER_Y }} state={state} />
        ) : null}

        {shadow ? (
          <ellipse
            className="bot-avatar__shadow"
            data-part="shadow"
            filter={url("glow")}
            opacity={shadowOpacity(pose)}
            rx={Math.round(geometry.halfWidth * 74) / 100}
            ry="3.4"
            transform={shadowTransform(pose, frame.bottom)}
          />
        ) : null}

        <g data-part="figure" transform={figureTransform(pose, frame.bottom)}>
          {state === "thinking" ? <Orbit angle={pose.orbit} layer="back" /> : null}

          <g className="bot-avatar__skin" filter={finish === "fuzzy" ? url("fur") : undefined}>
            <use className="bot-avatar__fill" fill={url("skin")} href={`#${id("body")}`} />
            <g clipPath={url("clip")}>
              <ellipse
                className="bot-avatar__shade"
                cx="4"
                cy="30"
                filter={url("soft")}
                rx="36"
                ry="17"
              />
              <ellipse
                className="bot-avatar__light"
                cx="-11"
                cy="-15"
                filter={url("soft")}
                rx="15"
                ry="10"
              />
              <ellipse
                className="bot-avatar__spec"
                cx="-10"
                cy="-17"
                rx="6.5"
                ry="3.6"
                transform="rotate(-28 -10 -17)"
              />
            </g>
          </g>
          <use className="bot-avatar__edge" href={`#${id("body")}`} />

          {face === "visor" ? (
            <g data-part="visor" transform={visorTransform(pose, frame)}>
              <rect className="bot-avatar__visor" height="22" rx="11" width="40" x="-20" y="-11" />
              <path className="bot-avatar__glare" d="M-14 -6.5Q-6 -9.4 4 -8.6" />
            </g>
          ) : null}

          <g className="bot-avatar__face" data-part="face" transform={faceTransform(pose, frame)}>
            {blush && face !== "visor" ? (
              <>
                <ellipse className="bot-avatar__cheek" cx="-14.5" cy="5" rx="3.6" ry="2.1" />
                <ellipse className="bot-avatar__cheek" cx="14.5" cy="5" rx="3.6" ry="2.1" />
              </>
            ) : null}
            <g transform="translate(-9.5 0)">
              <g data-part="eye" transform={eyeTransform(pose)}>
                <Eye side={-1} />
              </g>
            </g>
            <g transform="translate(9.5 0)">
              <g data-part="eye" transform={eyeTransform(pose)}>
                <Eye side={1} />
              </g>
            </g>
            <path
              className="bot-avatar__line bot-avatar__brows bot-avatar__brows--sad"
              d="M-13 -7.6L-6.6 -9.6M13 -7.6L6.6 -9.6"
            />
            <path
              className="bot-avatar__line bot-avatar__brows bot-avatar__brows--think"
              d="M-13 -10.4Q-9.6 -13 -6 -10.8M6.2 -8.8L13 -8.4"
            />
            <Mouth clipId={id("mouth")} open={pose.mouth} talkId={id("talk")} />
            {resolvedAccessory === "glasses" ? <Glasses /> : null}
          </g>

          {resolvedAccessory !== "none" && resolvedAccessory !== "glasses" ? (
            <g
              data-part="hat"
              transform={`translate(0 ${Math.round((frame.top + HAT_INSET) * 100) / 100})`}
            >
              <Hat accessory={resolvedAccessory} geometry={geometry} pose={pose} />
            </g>
          ) : null}

          {state === "thinking" ? <Orbit angle={pose.orbit} layer="front" /> : null}
        </g>

        {state !== "listening" ? (
          <Effects center={{ x: CENTER_X, y: CENTER_Y }} state={state} />
        ) : null}
      </svg>
    </span>
  );
};
