/* Este archivo lo genera scripts/build-index.mjs. No lo edites a mano. */

import "@ai-components/core/styles.css";
import { AgentComposer, schema as schema0 } from "@ai-components/agent-composer";
import { Demo as Demo0 } from "@ai-components/agent-composer/demo";
import "@ai-components/agent-composer/styles.css";
import { AgentTask, schema as schema1 } from "@ai-components/agent-task";
import { Demo as Demo1 } from "@ai-components/agent-task/demo";
import "@ai-components/agent-task/styles.css";
import { ApprovalCard, schema as schema2 } from "@ai-components/approval-card";
import { Demo as Demo2 } from "@ai-components/approval-card/demo";
import "@ai-components/approval-card/styles.css";
import { schema as schema3, ThinkingBlock } from "@ai-components/thinking-block";
import { Demo as Demo3 } from "@ai-components/thinking-block/demo";
import "@ai-components/thinking-block/styles.css";
import type { ComponentSchema } from "@ai-components/core";
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
    packageName: "@ai-components/agent-composer",
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
    packageName: "@ai-components/agent-task",
    Component: AgentTask as unknown as ComponentEntry["Component"],
    schema: schema1,
    Demo: Demo1 as unknown as ComponentEntry["Demo"],
  },
  {
    slug: "approval-card",
    name: "ApprovalCard",
    title: "Approval Card",
    description: "Tarjeta para que un agente pida permiso antes de actuar.",
    packageName: "@ai-components/approval-card",
    Component: ApprovalCard as unknown as ComponentEntry["Component"],
    schema: schema2,
    Demo: Demo2 as unknown as ComponentEntry["Demo"],
  },
  {
    slug: "thinking-block",
    name: "ThinkingBlock",
    title: "Thinking Block",
    description: "Bloque plegable del razonamiento de un agente, con brillo mientras piensa.",
    packageName: "@ai-components/thinking-block",
    Component: ThinkingBlock as unknown as ComponentEntry["Component"],
    schema: schema3,
    Demo: Demo3 as unknown as ComponentEntry["Demo"],
  },
];
