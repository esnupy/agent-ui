import { createRandom, hashString } from "./random";
import {
  BOT_ACCESSORIES,
  BOT_SHAPES,
  type BotAccessory,
  type BotFace,
  type BotFinish,
  type BotShape,
} from "./schema";

/** Colores que puede tocar una semilla. Vivos, pero todos con buena lectura de los ojos. */
export const BOT_PALETTE = [
  "#7c8cff",
  "#ff7a93",
  "#ffb347",
  "#4cc3f5",
  "#3ccf91",
  "#ff8552",
  "#ffd23f",
  "#f47fc0",
  "#9fd4ff",
  "#a68bff",
  "#53dcc8",
  "#c5e86c",
  "#ff6f61",
  "#b6a4ff",
] as const;

/** Lo que una semilla decide. */
export type BotTraits = {
  shape: BotShape;
  color: string;
  accessory: BotAccessory;
};

const pick = <T>(values: readonly T[], random: () => number): T => {
  const value = values[Math.floor(random() * values.length)];
  if (value === undefined) throw new Error("No hay valores para elegir.");
  return value;
};

/**
 * Rasgos estables a partir de un texto: el mismo id, el mismo bot.
 *
 * @param seed - Id, nombre o cualquier texto.
 * @returns Forma, color y accesorio.
 */
export const getBotTraits = (seed: string): BotTraits => {
  const random = createRandom(hashString(seed));
  const shape = pick(BOT_SHAPES, random);
  const color = pick(BOT_PALETTE, random);
  const wearables = BOT_ACCESSORIES.filter((accessory) => accessory !== "none");
  const accessory = random() < 0.45 ? "none" : pick(wearables, random);

  return { shape, color, accessory };
};

/** Combinación lista de forma, color, cara, material y accesorio. */
export type BotPreset = {
  shape: BotShape;
  color?: string;
  face: BotFace;
  finish: BotFinish;
  accessory: BotAccessory;
};

/**
 * Elenco de personajes listos. Se esparcen como props:
 * `<BotAvatar {...BOT_PRESETS.tito} state="working" />`.
 */
export const BOT_PRESETS = {
  mochi: { shape: "blob", color: "#ff8fab", face: "mouth", finish: "clay", accessory: "none" },
  boo: { shape: "ghost", face: "mouth", finish: "clay", accessory: "none" },
  tito: { shape: "droid", face: "visor", finish: "glossy", accessory: "antenna" },
  miau: { shape: "cat", face: "eyes", finish: "fuzzy", accessory: "headphones" },
  chispa: { shape: "star", face: "mouth", finish: "glossy", accessory: "none" },
  brote: { shape: "pill", color: "#7ee0a1", face: "eyes", finish: "clay", accessory: "sprout" },
  nube: { shape: "cloud", face: "eyes", finish: "fuzzy", accessory: "halo" },
  rey: { shape: "squircle", face: "mouth", finish: "clay", accessory: "crown" },
  fiesta: { shape: "tri", face: "mouth", finish: "clay", accessory: "party" },
  gema: { shape: "gem", face: "eyes", finish: "glossy", accessory: "glasses" },
  gota: { shape: "drop", face: "mouth", finish: "glossy", accessory: "none" },
  flor: { shape: "flower", face: "mouth", finish: "fuzzy", accessory: "none" },
} as const satisfies Record<string, BotPreset>;

/** Nombre de un personaje del elenco. */
export type BotPresetName = keyof typeof BOT_PRESETS;
