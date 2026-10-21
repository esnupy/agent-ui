import type { ComponentSchema } from "@componentes-ia/core";

export const BOT_STATES = [
  "idle",
  "thinking",
  "working",
  "speaking",
  "listening",
  "sleeping",
  "success",
  "error",
] as const;

/** Lo que está haciendo el agente. Cambia la cara, el cuerpo y los efectos. */
export type BotState = (typeof BOT_STATES)[number];

export const BOT_SHAPES = [
  "orb",
  "blob",
  "squircle",
  "drop",
  "ghost",
  "gem",
  "tri",
  "star",
  "flower",
  "cloud",
  "cat",
  "droid",
  "pill",
] as const;

/** Silueta del cuerpo. Todas comparten muestreo, así que se pueden transformar entre sí. */
export type BotShape = (typeof BOT_SHAPES)[number];

export const BOT_FACES = ["eyes", "mouth", "visor"] as const;

/** `eyes` solo ojos, `mouth` con boca, `visor` pantalla de robot con ojos LED. */
export type BotFace = (typeof BOT_FACES)[number];

export const BOT_FINISHES = ["clay", "glossy", "fuzzy", "flat", "outline"] as const;

/** Material del cuerpo. */
export type BotFinish = (typeof BOT_FINISHES)[number];

export const BOT_ACCESSORIES = [
  "none",
  "antenna",
  "sprout",
  "halo",
  "crown",
  "party",
  "headphones",
  "glasses",
] as const;

/** Lo que lleva puesto. */
export type BotAccessory = (typeof BOT_ACCESSORIES)[number];

/** Gesto de los ojos. Lo decide el estado y, por momentos, la interacción. */
export type BotExpression =
  | "open"
  | "wide"
  | "focus"
  | "think"
  | "closed"
  | "happy"
  | "squeeze"
  | "sad";

/** Forma de la boca. */
export type BotMouth = "none" | "smile" | "talk" | "grin" | "o" | "wavy" | "flat";

/** Texto que se suma a la etiqueta accesible en cada estado. */
export const STATE_LABEL: Record<BotState, string> = {
  idle: "en espera",
  thinking: "pensando",
  working: "trabajando",
  speaking: "hablando",
  listening: "escuchando",
  sleeping: "dormido",
  success: "terminó",
  error: "con error",
};

export const schema = {
  name: "BotAvatar",
  description:
    "Mascota animada para agentes: 13 formas que se transforman, 8 estados, voz y mirada que sigue al puntero.",
  props: {
    seed: {
      type: "string",
      default: "Nova",
      description:
        "Decide forma, color y accesorio cuando están en auto, y el ritmo de los gestos. Pásale el id del agente.",
    },
    state: {
      type: "enum",
      options: BOT_STATES,
      default: "idle",
      description: "Lo que hace el agente. Cambia ojos, boca, cuerpo y efectos.",
    },
    shape: {
      type: "enum",
      options: ["auto", ...BOT_SHAPES],
      default: "auto",
      description: "Silueta. auto la elige con seed. Al cambiarla, el cuerpo se transforma.",
    },
    face: {
      type: "enum",
      options: BOT_FACES,
      default: "eyes",
      description: "Solo ojos, ojos con boca, o visor de robot con ojos LED.",
    },
    finish: {
      type: "enum",
      options: BOT_FINISHES,
      default: "clay",
      description: "Material: plastilina, brillante, peludo, plano o línea en blanco y negro.",
    },
    accessory: {
      type: "enum",
      options: ["auto", ...BOT_ACCESSORIES],
      default: "none",
      description: "Lo que lleva puesto. auto lo elige con seed.",
    },
    color: {
      type: "string",
      default: "",
      description:
        "Color del cuerpo en cualquier formato CSS. Vacío usa el de la forma, o el de seed si shape es auto.",
    },
    accent: {
      type: "string",
      default: "",
      description: "Color principal del accesorio.",
    },
    ink: {
      type: "string",
      default: "",
      description: "Color de ojos y boca. Vacío es casi negro.",
    },
    size: {
      type: "number",
      default: 96,
      min: 24,
      max: 240,
      description: "Lado en pixeles. Dentro de BotAvatarGroup se toma el del grupo.",
    },
    level: {
      type: "number",
      default: 0,
      min: 0,
      max: 1,
      description:
        "Volumen de 0 a 1. Abre la boca en speaking y agranda las ondas en listening. En 0 habla solo.",
    },
    speed: {
      type: "number",
      default: 1,
      min: 0.25,
      max: 3,
      description: "Multiplicador del tiempo de todos los gestos.",
    },
    interactive: {
      type: "boolean",
      default: true,
      description: "Sigue al puntero con la mirada y salta al tocarlo.",
    },
    blush: {
      type: "boolean",
      default: true,
      description: "Chapitas en las mejillas.",
    },
    shadow: {
      type: "boolean",
      default: true,
      description: "Sombra en el piso, que se encoge cuando salta.",
    },
    paused: {
      type: "boolean",
      default: false,
      description: "Deja la pose quieta del estado. Igual que con prefers-reduced-motion.",
    },
    label: {
      type: "string",
      default: "",
      description: "Nombre accesible. Se le suma el estado, por ejemplo «Nova, pensando».",
    },
    className: {
      type: "string",
      default: "",
      description: "Clases adicionales en la raíz.",
    },
  },
} as const satisfies ComponentSchema;
