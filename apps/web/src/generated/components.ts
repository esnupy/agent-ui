/* Este archivo lo genera scripts/build-index.mjs. No lo edites a mano. */

import "@componentes-ia/core/styles.css";
import { AgentComposer, schema as schema0 } from "@componentes-ia/agent-composer";
import { Demo as Demo0 } from "@componentes-ia/agent-composer/demo";
import "@componentes-ia/agent-composer/styles.css";
import { AgentTask, schema as schema1 } from "@componentes-ia/agent-task";
import { Demo as Demo1 } from "@componentes-ia/agent-task/demo";
import "@componentes-ia/agent-task/styles.css";
import { ApprovalCard, schema as schema2 } from "@componentes-ia/approval-card";
import { Demo as Demo2 } from "@componentes-ia/approval-card/demo";
import "@componentes-ia/approval-card/styles.css";
import { BotAvatar, schema as schema3 } from "@componentes-ia/bot-avatar";
import { Demo as Demo3 } from "@componentes-ia/bot-avatar/demo";
import "@componentes-ia/bot-avatar/styles.css";
import { schema as schema4, ThinkingBlock } from "@componentes-ia/thinking-block";
import { Demo as Demo4 } from "@componentes-ia/thinking-block/demo";
import "@componentes-ia/thinking-block/styles.css";
import type { ComponentSchema } from "@componentes-ia/core";
import type { ReactNode } from "react";

export type ComponentEntry = {
  slug: string;
  name: string;
  title: string;
  description: string;
  packageName: string;
  Component: (props: Record<string, unknown>) => ReactNode;
  schema: ComponentSchema;
  Demo: () => ReactNode;
};

export const components: ComponentEntry[] = [
  {
    slug: "agent-composer",
    name: "AgentComposer",
    title: "Agent Composer",
    description: "Campo de mensaje con adjuntar, modelo, voz y enviar.",
    packageName: "@componentes-ia/agent-composer",
    Component: AgentComposer as unknown as ComponentEntry["Component"],
    schema: schema0,
    Demo: Demo0 as unknown as ComponentEntry["Demo"],
  },
  {
    slug: "agent-task",
    name: "AgentTask",
    title: "Agent Task",
    description:
      "Fila de una tarea de agente: indicador animado, título, rama y tiempo transcurrido.",
    packageName: "@componentes-ia/agent-task",
    Component: AgentTask as unknown as ComponentEntry["Component"],
    schema: schema1,
    Demo: Demo1 as unknown as ComponentEntry["Demo"],
  },
  {
    slug: "approval-card",
    name: "ApprovalCard",
    title: "Approval Card",
    description: "Tarjeta para que un agente pida permiso antes de actuar.",
    packageName: "@componentes-ia/approval-card",
    Component: ApprovalCard as unknown as ComponentEntry["Component"],
    schema: schema2,
    Demo: Demo2 as unknown as ComponentEntry["Demo"],
  },
  {
    slug: "bot-avatar",
    name: "BotAvatar",
    title: "Bot Avatar",
    description:
      "Mascota animada para agentes: 13 formas que se transforman, 8 estados, voz y mirada que sigue al puntero.",
    packageName: "@componentes-ia/bot-avatar",
    Component: BotAvatar as unknown as ComponentEntry["Component"],
    schema: schema3,
    Demo: Demo3 as unknown as ComponentEntry["Demo"],
  },
  {
    slug: "thinking-block",
    name: "ThinkingBlock",
    title: "Thinking Block",
    description: "Bloque plegable del razonamiento de un agente, con brillo mientras piensa.",
    packageName: "@componentes-ia/thinking-block",
    Component: ThinkingBlock as unknown as ComponentEntry["Component"],
    schema: schema4,
    Demo: Demo4 as unknown as ComponentEntry["Demo"],
  },
];
