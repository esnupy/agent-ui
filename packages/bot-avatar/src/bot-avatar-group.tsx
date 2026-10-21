"use client";

import { cn } from "@componentes-ia/core";
import { Children, type CSSProperties, type ReactNode } from "react";
import { BotSizeContext } from "./bot-avatar";

export type BotAvatarGroupProps = {
  /** Varios `BotAvatar`. Los que no traen `size` toman el del grupo. */
  children: ReactNode;
  /** Cuántos se ven antes del contador `+N`. */
  max?: number;
  /** Lado de cada avatar, en pixeles. */
  size?: number;
  /** Etiqueta del grupo para lectores de pantalla. */
  label?: string;
  className?: string;
};

/**
 * Bots apiñados, como un equipo. El primero queda al frente y el que tiene el
 * puntero encima se asoma.
 *
 * @param props - Avatares, tope visible, tamaño y etiqueta.
 * @returns El grupo.
 */
export const BotAvatarGroup = ({
  children,
  max = 5,
  size = 48,
  label,
  className,
}: BotAvatarGroupProps) => {
  const items = Children.toArray(children);
  const limit = Math.max(1, Math.floor(max));
  const visible = items.slice(0, limit);
  const hidden = items.length - visible.length;

  return (
    <BotSizeContext.Provider value={size}>
      <ul
        aria-label={label ?? `${items.length} ${items.length === 1 ? "agente" : "agentes"}`}
        className={cn("bot-avatar-group", className)}
        style={{ "--bot-group-size": `${size}px` } as CSSProperties}
      >
        {visible.map((child, index) => (
          <li
            className="bot-avatar-group__item"
            // biome-ignore lint/suspicious/noArrayIndexKey: el orden visual es la identidad.
            key={index}
            style={{ "--bot-z": visible.length - index } as CSSProperties}
          >
            {child}
          </li>
        ))}
        {hidden > 0 ? (
          <li className="bot-avatar-group__more">
            <span aria-hidden="true">+{hidden}</span>
            <span className="ac-sr-only">y {hidden} más</span>
          </li>
        ) : null}
      </ul>
    </BotSizeContext.Provider>
  );
};
