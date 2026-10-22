import { createRandom, pick, type Random, randomInt } from "./prng";
import type { ReplayEvent, ReplayEventType, ReplayPayloads } from "./types";

export type MockRunOptions = {
  /** Misma semilla, mismo run. */
  seed?: number;
  /** Duración total aproximada, en ms. */
  durationMs?: number;
};

const STREAM_BEFORE = [
  'import { type StreamEvent, toEvent } from "./event";',
  "",
  "export const parseStream = (chunks: string[]): StreamEvent[] => {",
  "  const events: StreamEvent[] = [];",
  '  let buffer = "";',
  "",
  "  for (const chunk of chunks) {",
  "    buffer = chunk;",
  '    const lines = buffer.split("\\n");',
  '    buffer = lines.pop() ?? "";',
  "    events.push(...lines.filter(Boolean).map(toEvent));",
  "  }",
  "",
  "  return events;",
  "};",
];

const TEST_BEFORE = [
  'import { describe, expect, it } from "vitest";',
  'import { toEvent } from "./event";',
  'import { parseStream } from "./stream";',
  "",
  'describe("parseStream", () => {',
  '  it("separa eventos por salto de línea", () => {',
  '    expect(parseStream(["a\\nb\\n"])).toHaveLength(2);',
  "  });",
  "});",
];

const PLAN = [
  { id: "reproducir", title: "Reproducir el bug" },
  { id: "ubicar", title: "Ubicar el buffer en el parser" },
  { id: "corregir", title: "Corregir la concatenación" },
  { id: "probar", title: "Agregar una prueba del caso partido" },
  { id: "suite", title: "Correr la suite" },
] as const;

const OPENERS = ["Listo.", "Quedó.", "Ya está."] as const;

/**
 * Arma eventos sobre un reloj base. Al final todo se escala a `durationMs`.
 */
const createBuilder = (random: Random) => {
  const events: ReplayEvent[] = [];
  let clock = 0;

  /** Avanza el reloj con un poco de variación. */
  const wait = (ms: number) => {
    clock += ms * (0.85 + random() * 0.3);
  };

  const emit = <K extends ReplayEventType>(type: K, payload: ReplayPayloads[K]) => {
    events.push({ id: `e${events.length}`, t: clock, type, payload } as ReplayEvent);
  };

  /** Escribe un mensaje en fragmentos de 2 a 5 palabras. */
  const write = (
    messageId: string,
    role: ReplayPayloads["message_delta"]["role"],
    text: string,
    msPerChar: number,
  ) => {
    const words = text.split(/(?<=\s)/);
    let position = 0;

    while (position < words.length) {
      const size = randomInt(random, 2, 5);
      const chunk = words.slice(position, position + size).join("");
      const durationMs = chunk.length * msPerChar * (0.8 + random() * 0.4);
      emit("message_delta", { messageId, role, text: chunk, durationMs });
      clock += durationMs;
      position += size;
    }
  };

  const plan = (stepId: string, status: ReplayPayloads["plan_update"]["status"]) => {
    const step = PLAN.find((item) => item.id === stepId);
    emit("plan_update", { stepId, title: step?.title, status });
  };

  return {
    events,
    wait,
    emit,
    write,
    plan,
    get clock() {
      return clock;
    },
  };
};

/**
 * Genera un run realista y determinista: un agente arregla un parser de stream
 * que pierde texto cuando un evento llega partido en dos chunks.
 *
 * Trae plan, búsquedas, lectura, edición de dos archivos, una prueba que falla,
 * una aprobación, la corrección final y la respuesta en streaming.
 *
 * @param options - Semilla y duración.
 * @returns Eventos ordenados por tiempo.
 */
export const createMockRun = ({ seed = 1, durationMs = 45_000 }: MockRunOptions = {}) => {
  const random = createRandom(seed);
  const b = createBuilder(random);
  const passed = randomInt(random, 9, 14);

  b.write(
    "m-user",
    "user",
    "El parser del stream pierde texto cuando un evento llega partido en dos chunks. ¿Lo puedes arreglar?",
    6,
  );
  b.wait(900);
  b.emit("thought", { text: "Suena a un buffer que se reinicia entre chunks." });
  b.wait(700);
  for (const step of PLAN) {
    b.plan(step.id, "pending");
    b.wait(140);
  }
  b.wait(500);

  b.plan("reproducir", "in_progress");
  b.wait(400);
  b.emit("tool_call", { callId: "c1", name: "grep", input: 'grep -rn "buffer" src/parser' });
  b.wait(1600);
  b.emit("tool_result", {
    callId: "c1",
    ok: true,
    output: [
      'src/parser/stream.ts:5:  let buffer = "";',
      "src/parser/stream.ts:8:    buffer = chunk;",
      'src/parser/stream.ts:10:    buffer = lines.pop() ?? "";',
    ].join("\n"),
  });
  b.wait(600);
  b.emit("tool_call", { callId: "c2", name: "read_file", input: "src/parser/stream.ts" });
  b.wait(1100);
  b.emit("tool_result", {
    callId: "c2",
    ok: true,
    output: `${STREAM_BEFORE.length} líneas`,
  });
  b.plan("reproducir", "done");
  b.wait(300);
  b.plan("ubicar", "in_progress");
  b.wait(900);
  b.emit("thought", {
    text: "`buffer = chunk` descarta lo que quedó del chunk anterior. Tiene que concatenar.",
  });
  b.wait(1200);
  b.plan("ubicar", "done");
  b.wait(300);

  b.plan("corregir", "in_progress");
  b.wait(700);
  b.emit("file_diff", {
    path: "src/parser/stream.ts",
    before: STREAM_BEFORE,
    hunks: [{ start: 7, remove: 1, add: ["    buffer += chunk;"] }],
  });
  b.wait(900);
  b.plan("corregir", "done");
  b.wait(300);

  b.plan("probar", "in_progress");
  b.wait(800);
  b.emit("file_diff", {
    path: "src/parser/stream.test.ts",
    before: TEST_BEFORE,
    hunks: [
      {
        start: 8,
        remove: 0,
        add: [
          "",
          '  it("une un evento partido en dos chunks", () => {',
          '    expect(parseStream(["dat", "a: hola\\n"])).toEqual([toEvent("data: hola")]);',
          "  });",
          "",
          '  it("cierra el buffer al final", () => {',
          '    expect(parseStream(["a\\nb"])).toHaveLength(2);',
          "  });",
        ],
      },
    ],
  });
  b.wait(1000);
  b.plan("probar", "done");
  b.wait(300);

  b.plan("suite", "in_progress");
  b.wait(500);
  b.emit("approval", { id: "a1", title: "Correr npm test -- src/parser", status: "requested" });
  b.wait(2600);
  b.emit("approval", { id: "a1", title: "Correr npm test -- src/parser", status: "approved" });
  b.wait(400);
  b.emit("tool_call", { callId: "c3", name: "run_tests", input: "npm test -- src/parser" });
  b.wait(2400);
  b.emit("tool_result", {
    callId: "c3",
    ok: false,
    output: `${passed} pasaron, 1 falló\n✕ cierra el buffer al final`,
  });
  b.emit("error", { message: "La prueba “cierra el buffer al final” falló.", callId: "c3" });
  b.plan("suite", "error");
  b.wait(900);
  b.emit("thought", { text: "Falta vaciar el buffer cuando se acaban los chunks." });
  b.wait(1000);
  b.emit("file_diff", {
    path: "src/parser/stream.ts",
    hunks: [{ start: 12, remove: 0, add: ["", "  if (buffer) events.push(toEvent(buffer));"] }],
  });
  b.wait(700);
  b.plan("suite", "in_progress");
  b.wait(300);
  b.emit("tool_call", { callId: "c4", name: "run_tests", input: "npm test -- src/parser" });
  b.wait(2200);
  b.emit("tool_result", {
    callId: "c4",
    ok: true,
    output: `${passed + 1} pasaron`,
  });
  b.plan("suite", "done");
  b.wait(800);

  b.write(
    "m-agent",
    "assistant",
    `${pick(random, OPENERS)} El parser reiniciaba el buffer en cada chunk con \`buffer = chunk\`, así que un evento partido en dos se perdía. Ahora concatena con \`buffer += chunk\` y, al terminar, vacía lo que quede. Agregué dos pruebas: el evento partido y el cierre sin salto de línea. La suite pasa completa.`,
    32,
  );

  const scale = durationMs / Math.max(1, b.clock);

  return b.events.map((event): ReplayEvent => {
    const t = Math.round(event.t * scale);
    if (event.type !== "message_delta") return { ...event, t };
    return {
      ...event,
      t,
      payload: {
        ...event.payload,
        durationMs: Math.round((event.payload.durationMs ?? 0) * scale),
      },
    };
  });
};
