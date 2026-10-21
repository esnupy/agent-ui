import type { ComponentSchema } from "@ai-components/core";

export const APPROVAL_KINDS = ["command", "edit", "network", "tool"] as const;

/** Qué quiere hacer el agente. */
export type ApprovalKind = (typeof APPROVAL_KINDS)[number];

export const APPROVAL_RISKS = ["low", "medium", "high"] as const;

/** Peso de la acción. High pide sostener Allow. */
export type ApprovalRisk = (typeof APPROVAL_RISKS)[number];

export const APPROVAL_DECISIONS = ["pending", "allowed", "denied"] as const;

/** Estado de la tarjeta. */
export type ApprovalDecision = (typeof APPROVAL_DECISIONS)[number];

export const APPROVAL_TIMEOUTS = ["deny", "allow"] as const;

/** Qué pasa cuando se acaba el tiempo. */
export type ApprovalTimeout = (typeof APPROVAL_TIMEOUTS)[number];

const SAMPLE_DIFF = [
  '- const out = "dist";',
  '+ const out = "build";',
  "+ await rm(out, { recursive: true });",
].join("\n");

export const schema = {
  name: "ApprovalCard",
  description: "Tarjeta para que un agente pida permiso antes de actuar.",
  props: {
    agentName: {
      type: "string",
      default: "Codey",
      description: "Nombre del agente que pide permiso.",
    },
    verb: {
      type: "string",
      default: "run a command",
      description: "Qué quiere hacer, en la frase «wants to».",
    },
    kind: {
      type: "enum",
      options: APPROVAL_KINDS,
      default: "command",
      description: "Forma de la acción: comando, diff, red o herramienta.",
    },
    risk: {
      type: "enum",
      options: APPROVAL_RISKS,
      default: "high",
      description: "High obliga a sostener Allow. Low y medium aceptan un clic.",
    },
    reason: {
      type: "string",
      default: "The build output is stale and the next step writes into it.",
      description: "Por qué el agente lo pide. Vacío lo oculta.",
    },
    warning: {
      type: "string",
      default: "Deletes 214 files permanently",
      description: "Línea de aviso. Solo se muestra si risk es high.",
    },
    command: {
      type: "string",
      default: "rm -rf dist",
      description: "Comando, cuando kind es command.",
    },
    cwd: {
      type: "string",
      default: "~/project",
      description: "Directorio del comando, en gris.",
    },
    filePath: {
      type: "string",
      default: "src/parser.ts",
      description: "Archivo del diff, cuando kind es edit.",
    },
    additions: {
      type: "number",
      default: 12,
      min: 0,
      max: 9999,
      description: "Líneas agregadas en el resumen del diff.",
    },
    deletions: {
      type: "number",
      default: 4,
      min: 0,
      max: 9999,
      description: "Líneas borradas en el resumen del diff.",
    },
    diff: {
      type: "string",
      default: SAMPLE_DIFF,
      description: "Diff corto. Se abre desde el resumen.",
    },
    method: {
      type: "string",
      default: "GET",
      description: "Método HTTP, cuando kind es network.",
    },
    url: {
      type: "string",
      default: "https://api.example.com/v1/files",
      description: "URL. El dominio se marca aparte.",
    },
    toolName: {
      type: "string",
      default: "delete_file",
      description: "Nombre de la herramienta, cuando kind es tool.",
    },
    toolArguments: {
      type: "string",
      default: '{"path":"dist"}',
      description: "Argumentos JSON. Si el texto es JSON, se indenta.",
    },
    timeoutMs: {
      type: "number",
      default: 0,
      min: 0,
      max: 60000,
      description: "Milisegundos de la línea inferior. 0 la apaga.",
    },
    onTimeout: {
      type: "enum",
      options: APPROVAL_TIMEOUTS,
      default: "deny",
      description: "Al acabarse el tiempo: deny o allow.",
    },
    stackIndex: {
      type: "number",
      default: 0,
      min: 0,
      max: 8,
      description: "Lugar en la pila. 0 es la tarjeta de enfrente.",
    },
    stackTotal: {
      type: "number",
      default: 1,
      min: 1,
      max: 9,
      description: "Cuántas tarjetas hay en la pila. Muestra «1 of 3».",
    },
    status: {
      type: "enum",
      options: APPROVAL_DECISIONS,
      default: "pending",
      description: "pending espera. allowed y denied muestran el recibo.",
    },
    autoFocus: {
      type: "boolean",
      default: false,
      description: "Enfoca la tarjeta al llegar, salvo que haya un campo activo.",
    },
    className: {
      type: "string",
      default: "",
      description: "Clases adicionales en la raíz.",
    },
    onAllow: {
      type: "function",
      description: "Se llama al permitir una sola vez.",
    },
    onDeny: {
      type: "function",
      description: "Se llama al rechazar.",
    },
    onAlwaysAllow: {
      type: "function",
      description: "Se llama con Always allow, o con Cmd/Ctrl+Enter.",
    },
    onAllowSession: {
      type: "function",
      description: "Se llama con Allow for this session.",
    },
    onEdit: {
      type: "function",
      description: "Se llama cuando cambia el comando editado.",
    },
    onResolved: {
      type: "function",
      description: "Se llama cuando el recibo ya se plegó.",
    },
  },
} as const satisfies ComponentSchema;
