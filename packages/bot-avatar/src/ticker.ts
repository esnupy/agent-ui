/** Un avatar suscrito al reloj compartido. */
export type TickSubscriber = {
  /** Primero se mide todo (layout)... */
  read: (now: number) => void;
  /** ...y después se escribe, para no forzar layout en cada avatar. */
  write: (now: number, dt: number) => void;
};

/** Última posición del puntero en la ventana. */
export const pointer = {
  x: 0,
  y: 0,
  active: false,
  movedAt: Number.NEGATIVE_INFINITY,
};

const subscribers = new Set<TickSubscriber>();
let frame = 0;
let last = 0;

const handleMove = (event: PointerEvent) => {
  pointer.x = event.clientX;
  pointer.y = event.clientY;
  pointer.active = true;
  pointer.movedAt = performance.now();
};

const handleOut = (event: PointerEvent) => {
  if (event.relatedTarget === null) pointer.active = false;
};

const tick = (now: number) => {
  const dt = last === 0 ? 1 / 60 : (now - last) / 1000;
  last = now;

  for (const subscriber of subscribers) subscriber.read(now);
  for (const subscriber of subscribers) subscriber.write(now, dt);

  frame = window.requestAnimationFrame(tick);
};

/**
 * Suscribe un avatar a un solo requestAnimationFrame para todos.
 *
 * El reloj y los listeners del puntero viven mientras haya al menos un suscriptor.
 *
 * @param subscriber - Lectura y escritura de cada cuadro.
 * @returns La función para desuscribirse.
 */
export const subscribe = (subscriber: TickSubscriber): (() => void) => {
  subscribers.add(subscriber);

  if (subscribers.size === 1) {
    last = 0;
    frame = window.requestAnimationFrame(tick);
    window.addEventListener("pointermove", handleMove, { passive: true });
    window.addEventListener("pointerdown", handleMove, { passive: true });
    window.addEventListener("pointerout", handleOut, { passive: true });
  }

  return () => {
    subscribers.delete(subscriber);
    if (subscribers.size > 0) return;

    window.cancelAnimationFrame(frame);
    window.removeEventListener("pointermove", handleMove);
    window.removeEventListener("pointerdown", handleMove);
    window.removeEventListener("pointerout", handleOut);
  };
};
