/** Tipos de evento que entiende el reproductor. */
export const REPLAY_EVENT_TYPES = [
  "thought",
  "message_delta",
  "plan_update",
  "tool_call",
  "tool_result",
  "file_diff",
  "approval",
  "error",
] as const;

export type ReplayEventType = (typeof REPLAY_EVENT_TYPES)[number];

export type MessageRole = "user" | "assistant";

export type PlanStatus = "pending" | "in_progress" | "done" | "error" | "skipped";

export type ApprovalStatus = "requested" | "approved" | "rejected";

/** Un tramo de diff. `start` cuenta solo las líneas vivas, después de los tramos anteriores. */
export type DiffHunk = {
  start: number;
  remove: number;
  add: readonly string[];
};

export type ReplayPayloads = {
  thought: { text: string };
  message_delta: {
    messageId: string;
    role: MessageRole;
    text: string;
    /** Lo que tarda en escribirse el fragmento. Sin valor, aparece de golpe. */
    durationMs?: number;
  };
  plan_update: { stepId: string; title?: string; status: PlanStatus };
  tool_call: { callId: string; name: string; input: string };
  tool_result: { callId: string; output: string; ok: boolean };
  file_diff: {
    path: string;
    /** Contenido original. Solo cuenta la primera vez que aparece el archivo. */
    before?: readonly string[];
    hunks: readonly DiffHunk[];
  };
  approval: { id: string; title: string; status: ApprovalStatus };
  error: { message: string; callId?: string };
};

type EventOf<K extends ReplayEventType> = {
  id: string;
  /** Milisegundos desde el inicio del run. */
  t: number;
  type: K;
  payload: ReplayPayloads[K];
};

/** Un evento del run. La unión se discrimina por `type`. */
export type ReplayEvent = { [K in ReplayEventType]: EventOf<K> }[ReplayEventType];

export type ReplayEventOf<K extends ReplayEventType> = EventOf<K>;

export type ReplayMessage = {
  id: string;
  role: MessageRole;
  /** Texto visible en el instante pedido. */
  text: string;
  /** `true` mientras el último fragmento se está escribiendo. */
  streaming: boolean;
  /** Texto de todos los fragmentos aplicados. */
  full: string;
  /** Largo de `full` antes del último fragmento. */
  from: number;
  /** Inicio y fin del último fragmento, en ms. */
  start: number;
  end: number;
  /** Primer fragmento. Ordena el chat. */
  t: number;
};

export type ReplayThought = { id: string; text: string; t: number };

export type ReplayPlanStep = { id: string; title: string; status: PlanStatus; t: number };

export type ReplayToolCall = {
  callId: string;
  name: string;
  input: string;
  status: "running" | "ok" | "error";
  output?: string;
  t: number;
  endT?: number;
};

export type FileLineKind = "context" | "add" | "del";

export type ReplayFileLine = {
  id: string;
  text: string;
  kind: FileLineKind;
  /** Momento en que la línea tomó su `kind` actual. */
  t: number;
};

export type ReplayFile = { path: string; lines: readonly ReplayFileLine[]; t: number };

export type ReplayApproval = { id: string; title: string; status: ApprovalStatus; t: number };

export type ReplayError = { id: string; message: string; callId?: string; t: number };

/** Estado del agente en un instante. Las colecciones sin cambios conservan su referencia. */
export type ReplayState = {
  /** Cuántos eventos se aplicaron. */
  index: number;
  messages: readonly ReplayMessage[];
  thoughts: readonly ReplayThought[];
  plan: readonly ReplayPlanStep[];
  tools: readonly ReplayToolCall[];
  files: readonly ReplayFile[];
  approvals: readonly ReplayApproval[];
  errors: readonly ReplayError[];
};
