import type { ReactNode } from "react";

type DemoFrameProps = {
  label: string;
  children: ReactNode;
};

/**
 * Marco neutro para que el componente se lea solo, sin chrome de más.
 *
 * @param props - Etiqueta del paquete y el contenido.
 * @returns La figura con su leyenda.
 */
export const DemoFrame = ({ label, children }: DemoFrameProps) => {
  return (
    <figure className="overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
      <figcaption className="flex items-center justify-between border-b border-zinc-200 px-4 py-2 font-mono text-[11px] uppercase tracking-[0.16em] text-zinc-500 dark:border-zinc-800">
        <span className="truncate">{label}</span>
        <span>En vivo</span>
      </figcaption>
      <div className="p-2">{children}</div>
    </figure>
  );
};
