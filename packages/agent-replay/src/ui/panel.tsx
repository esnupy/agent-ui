import type { ReactNode } from "react";

type PanelProps = {
  id: string;
  title: string;
  meta?: ReactNode;
  children: ReactNode;
};

/**
 * Marco de un panel del escenario: encabezado fijo y cuerpo con scroll propio.
 *
 * @param props - Título, dato a la derecha y contenido.
 * @returns La sección.
 */
export const Panel = ({ id, title, meta, children }: PanelProps) => {
  return (
    <section aria-label={title} className="agent-replay__panel" data-flip={id} data-panel={id}>
      <header className="agent-replay__panel-header">
        <h3 className="agent-replay__panel-title">{title}</h3>
        {meta ? <span className="agent-replay__panel-meta">{meta}</span> : null}
      </header>
      {children}
    </section>
  );
};
