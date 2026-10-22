import type { ReactNode } from "react";
import type { ReplayEventType } from "../core/types";

type IconProps = { children: ReactNode; size?: number };

/**
 * Lienzo común de 16×16, trazo fino.
 *
 * @returns El SVG.
 */
const Icon = ({ children, size = 16 }: IconProps) => {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      height={size}
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.4"
      viewBox="0 0 16 16"
      width={size}
    >
      {children}
    </svg>
  );
};

const EVENT_PATHS: Record<ReplayEventType, ReactNode> = {
  thought: (
    <>
      <circle cx="4" cy="8" r="1" />
      <circle cx="8" cy="8" r="1" />
      <circle cx="12" cy="8" r="1" />
    </>
  ),
  message_delta: <path d="M3 3.5h10v7H7.5L4.5 13v-2.5H3z" />,
  plan_update: <path d="M3 4.5l1.2 1.2L6.5 3.4M8.5 4.5H13M3 10.5l1.2 1.2 2.3-2.3M8.5 10.5H13" />,
  tool_call: <path d="M3 4.5l3 3.5-3 3.5M8 11.5h5" />,
  tool_result: <path d="M12.5 3.5v4.5a2 2 0 0 1-2 2H4M6.5 7.5 4 10l2.5 2.5" />,
  file_diff: <path d="M5 2.5v6M2 5.5h6M8 12.5h6" />,
  approval: (
    <>
      <path d="M8 2.2 13 4v3.8c0 2.8-2.1 5-5 6-2.9-1-5-3.2-5-6V4z" />
      <path d="m5.8 8 1.5 1.5 2.9-3" />
    </>
  ),
  error: (
    <>
      <path d="M8 2.5 14 13H2z" />
      <path d="M8 6.5v3M8 11.2v.1" />
    </>
  ),
};

/**
 * Icono de un tipo de evento. Monocromático: el tipo se distingue por forma.
 *
 * @param props - Tipo y tamaño.
 * @returns El SVG.
 */
export const EventIcon = ({ type, size = 12 }: { type: ReplayEventType; size?: number }) => {
  return <Icon size={size}>{EVENT_PATHS[type]}</Icon>;
};

export const PlayIcon = () => (
  <svg aria-hidden="true" height="16" viewBox="0 0 16 16" width="16">
    <path
      d="M5 3.2v9.6c0 .5.5.8.9.5l7.2-4.8a.6.6 0 0 0 0-1L5.9 2.7c-.4-.3-.9 0-.9.5z"
      fill="currentColor"
    />
  </svg>
);

export const PauseIcon = () => (
  <svg aria-hidden="true" height="16" viewBox="0 0 16 16" width="16">
    <rect fill="currentColor" height="10" rx="1" width="3" x="4" y="3" />
    <rect fill="currentColor" height="10" rx="1" width="3" x="9" y="3" />
  </svg>
);

export const PrevIcon = () => (
  <Icon>
    <path d="M4 3.5v9M12 3.5 6.5 8l5.5 4.5z" />
  </Icon>
);

export const NextIcon = () => (
  <Icon>
    <path d="M12 3.5v9M4 3.5 9.5 8 4 12.5z" />
  </Icon>
);

export const CloseIcon = () => (
  <Icon size={12}>
    <path d="m4 4 8 8M12 4l-8 8" />
  </Icon>
);

export const ZoomInIcon = () => (
  <Icon size={14}>
    <circle cx="7" cy="7" r="4.2" />
    <path d="M7 5v4M5 7h4M10.2 10.2 13.5 13.5" />
  </Icon>
);

export const ZoomOutIcon = () => (
  <Icon size={14}>
    <circle cx="7" cy="7" r="4.2" />
    <path d="M5 7h4M10.2 10.2 13.5 13.5" />
  </Icon>
);

export const LoopIcon = () => (
  <Icon size={14}>
    <path d="M3 7V6a2 2 0 0 1 2-2h7.5M10.5 2 12.5 4l-2 2M13 9v1a2 2 0 0 1-2 2H3.5M5.5 14l-2-2 2-2" />
  </Icon>
);
