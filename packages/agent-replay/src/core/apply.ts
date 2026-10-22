import type {
  DiffHunk,
  ReplayEvent,
  ReplayEventOf,
  ReplayFile,
  ReplayFileLine,
  ReplayMessage,
  ReplayState,
} from "./types";

/** Estado antes del primer evento. */
export const EMPTY_STATE: ReplayState = Object.freeze({
  index: 0,
  messages: [],
  thoughts: [],
  plan: [],
  tools: [],
  files: [],
  approvals: [],
  errors: [],
});

/**
 * Cambia un elemento por id, o lo agrega al final.
 *
 * @returns Un arreglo nuevo. El original no se toca.
 */
const upsert = <T>(
  list: readonly T[],
  match: (item: T) => boolean,
  next: (current: T | undefined) => T,
): readonly T[] => {
  const position = list.findIndex(match);

  if (position === -1) return [...list, next(undefined)];

  const copy = list.slice();
  copy[position] = next(list[position]);
  return copy;
};

const applyMessage = (
  state: ReplayState,
  event: ReplayEventOf<"message_delta">,
): Partial<ReplayState> => {
  const { messageId, role, text, durationMs = 0 } = event.payload;
  const end = event.t + Math.max(0, durationMs);

  return {
    messages: upsert(
      state.messages,
      (message) => message.id === messageId,
      (current) => {
        const before = current?.full ?? "";
        const full = before + text;
        return {
          id: messageId,
          role: current?.role ?? role,
          text: full,
          streaming: false,
          full,
          from: before.length,
          start: event.t,
          end,
          t: current?.t ?? event.t,
        };
      },
    ),
  };
};

/**
 * Aplica los tramos sobre las líneas vivas.
 *
 * Una línea original que se quita queda como `del`. Una línea agregada que se
 * quita después desaparece: nunca existió en el archivo de partida.
 */
export const applyHunks = (
  lines: readonly ReplayFileLine[],
  hunks: readonly DiffHunk[],
  eventId: string,
  t: number,
): ReplayFileLine[] => {
  let current = lines.slice();

  hunks.forEach((hunk, hunkIndex) => {
    const next: ReplayFileLine[] = [];
    let live = 0;
    let position = 0;

    // Copia lo que está antes del inicio del tramo.
    while (position < current.length) {
      const line = current[position] as ReplayFileLine;
      if (line.kind !== "del") {
        if (live === Math.max(0, hunk.start)) break;
        live += 1;
      }
      next.push(line);
      position += 1;
    }

    let removed = 0;
    while (position < current.length && removed < Math.max(0, hunk.remove)) {
      const line = current[position] as ReplayFileLine;
      position += 1;

      if (line.kind === "del") {
        next.push(line);
        continue;
      }

      removed += 1;
      if (line.kind === "context") {
        next.push({ ...line, kind: "del", t });
      }
    }

    hunk.add.forEach((text, lineIndex) => {
      next.push({ id: `${eventId}:${hunkIndex}:${lineIndex}`, text, kind: "add", t });
    });

    while (position < current.length) {
      next.push(current[position] as ReplayFileLine);
      position += 1;
    }

    current = next;
  });

  return current;
};

const applyDiff = (state: ReplayState, event: ReplayEventOf<"file_diff">): Partial<ReplayState> => {
  const { path, before = [], hunks } = event.payload;

  return {
    files: upsert(
      state.files,
      (file) => file.path === path,
      (current): ReplayFile => {
        const base =
          current?.lines ??
          before.map((text, index) => ({
            id: `${path}:${index}`,
            text,
            kind: "context" as const,
            t: event.t,
          }));

        return {
          path,
          lines: applyHunks(base, hunks, event.id, event.t),
          t: current?.t ?? event.t,
        };
      },
    ),
  };
};

const applyChange = (state: ReplayState, event: ReplayEvent): Partial<ReplayState> => {
  switch (event.type) {
    case "thought":
      return {
        thoughts: [...state.thoughts, { id: event.id, text: event.payload.text, t: event.t }],
      };
    case "message_delta":
      return applyMessage(state, event);
    case "plan_update": {
      const { stepId, title, status } = event.payload;
      return {
        plan: upsert(
          state.plan,
          (step) => step.id === stepId,
          (current) => ({
            id: stepId,
            title: title ?? current?.title ?? stepId,
            status,
            t: event.t,
          }),
        ),
      };
    }
    case "tool_call": {
      const { callId, name, input } = event.payload;
      return {
        tools: upsert(
          state.tools,
          (tool) => tool.callId === callId,
          () => ({ callId, name, input, status: "running", t: event.t }),
        ),
      };
    }
    case "tool_result": {
      const { callId, output, ok } = event.payload;
      // Un resultado sin llamada previa no tiene card donde cerrarse.
      if (!state.tools.some((tool) => tool.callId === callId)) return {};
      return {
        tools: upsert(
          state.tools,
          (tool) => tool.callId === callId,
          (current) => ({
            ...(current as NonNullable<typeof current>),
            status: ok ? "ok" : "error",
            output,
            endT: event.t,
          }),
        ),
      };
    }
    case "file_diff":
      return applyDiff(state, event);
    case "approval": {
      const { id, title, status } = event.payload;
      return {
        approvals: upsert(
          state.approvals,
          (approval) => approval.id === id,
          (current) => ({ id, title, status, t: current?.t ?? event.t }),
        ),
      };
    }
    case "error":
      return {
        errors: [
          ...state.errors,
          {
            id: event.id,
            message: event.payload.message,
            callId: event.payload.callId,
            t: event.t,
          },
        ],
      };
  }
};

/**
 * Aplica un evento sin mutar el estado. Solo se copia la colección que cambia.
 *
 * @param state - Estado previo.
 * @param event - Evento a aplicar.
 * @returns El estado nuevo.
 */
export const applyEvent = (state: ReplayState, event: ReplayEvent): ReplayState => {
  return { ...state, ...applyChange(state, event), index: state.index + 1 };
};

/**
 * Resuelve el texto parcial de los mensajes que se están escribiendo en `t`.
 *
 * Si ningún mensaje está a medias, regresa el mismo objeto.
 *
 * @param state - Estado con los eventos hasta `t` ya aplicados.
 * @param t - Instante, en ms.
 * @returns El estado listo para pintar.
 */
export const materialize = (state: ReplayState, t: number): ReplayState => {
  let messages: ReplayMessage[] | undefined;

  state.messages.forEach((message, position) => {
    if (t >= message.end || message.end <= message.start) return;

    const progress = Math.min(1, Math.max(0, (t - message.start) / (message.end - message.start)));
    const length = message.from + Math.round(progress * (message.full.length - message.from));

    messages ??= state.messages.slice();
    messages[position] = {
      ...message,
      text: message.full.slice(0, length),
      streaming: true,
    };
  });

  return messages ? { ...state, messages } : state;
};
