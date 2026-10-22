import type { ReplayStore } from "../replay-store";

export type ShortcutAction =
  | "toggle"
  | "prev"
  | "next"
  | "rewind"
  | "pause"
  | "forward"
  | "start"
  | "end"
  | "slower"
  | "faster"
  | "back"
  | "ahead";

type KeyLike = {
  key: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  altKey?: boolean;
};

const KEYS: Record<string, ShortcutAction> = {
  " ": "toggle",
  Spacebar: "toggle",
  ArrowLeft: "prev",
  ArrowRight: "next",
  j: "rewind",
  J: "rewind",
  k: "pause",
  K: "pause",
  l: "forward",
  L: "forward",
  Home: "start",
  End: "end",
  "[": "slower",
  "]": "faster",
  PageDown: "back",
  PageUp: "ahead",
};

/** Salto de RePág y AvPág, en ms. */
export const PAGE_STEP = 5000;

/**
 * Qué hace una tecla. Las combinaciones con Ctrl, Cmd o Alt se dejan pasar.
 *
 * @param event - La tecla.
 * @returns La acción o `null`.
 */
export const resolveShortcut = (event: KeyLike): ShortcutAction | null => {
  if (event.ctrlKey || event.metaKey || event.altKey) return null;
  return KEYS[event.key] ?? null;
};

/**
 * Ejecuta la acción sobre el store.
 *
 * @param store - Store del reproductor.
 * @param action - Acción resuelta.
 */
export const runShortcut = (store: ReplayStore, action: ShortcutAction) => {
  const t = store.getTime();
  const { duration } = store.getStatus();

  switch (action) {
    case "toggle":
      store.toggle();
      break;
    case "prev":
      store.stepEvent(-1);
      break;
    case "next":
      store.stepEvent(1);
      break;
    case "rewind":
      store.shuttle(-1);
      break;
    case "pause":
      store.shuttle(0);
      break;
    case "forward":
      store.shuttle(1);
      break;
    case "start":
      store.seek(0);
      break;
    case "end":
      store.seek(duration);
      break;
    case "slower":
      store.slower();
      break;
    case "faster":
      store.faster();
      break;
    case "back":
      store.seek(t - PAGE_STEP);
      break;
    case "ahead":
      store.seek(t + PAGE_STEP);
      break;
  }
};
