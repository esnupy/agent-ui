# AI Components

Biblioteca de código abierto con componentes React para interfaces de agentes de IA y de código. MIT. El código de este repositorio es original.

React 19 es la única peer dependency de cada componente. El estilo vive en CSS, con variables para claro, oscuro y `prefers-color-scheme`.

## Requisitos

- Node 20 o superior
- npm 10 o superior

## Correr

```bash
npm install
npm run dev
```

El sitio queda en `http://localhost:3000`. La ficha de Agent Task está en `/components/agent-task`.

Otros comandos:

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

## Agregar un componente

```bash
npm run new-component -- mi-componente
```

Eso copia `templates/component` a `packages/mi-componente`, lo enlaza en el sitio y regenera `apps/web/src/generated/components.ts`. La página `/components/mi-componente` aparece sola: el sitio solo lee ese archivo.

Cada paquete necesita:

- el componente y su `schema` (`props` con `type`, `options`, `default`, `min`, `max` y `description`)
- un `Demo` exportado desde `src/demo.tsx`
- `src/styles.css`, publicado como `@componentes-ia/<nombre>/styles.css`
- `component.json` con `name`, `title`, `slug` y `description`

El nombre va en kebab-case. `core` está reservado para tokens, `cn` y `useReducedMotion`.

Si cambias metadatos a mano:

```bash
npm run build-index
```

## Publicar

Los paquetes son públicos bajo el scope `@componentes-ia`.

```bash
npm run build
npm publish -w @componentes-ia/core --access public
npm publish -w @componentes-ia/agent-task --access public
npm publish -w @componentes-ia/agent-composer --access public
npm publish -w @componentes-ia/agent-status --access public
npm publish -w @componentes-ia/agent-plan --access public
npm publish -w @componentes-ia/thinking-block --access public
npm publish -w @componentes-ia/approval-card --access public
npm publish -w @componentes-ia/bot-avatar --access public
npm publish -w @componentes-ia/agent-replay --access public
```

Publica `core` primero. Cada paquete corre `prepublishOnly`, así que `dist/` queda al día. Quien lo instale importa el componente y los dos CSS:

```tsx
import { AgentTask } from "@componentes-ia/agent-task";
import "@componentes-ia/core/styles.css";
import "@componentes-ia/agent-task/styles.css";
```

## Bot Avatar

Mascota animada para cada agente. Pásale el id y obtienes siempre el mismo bot:

```tsx
import { BOT_PRESETS, BotAvatar, BotAvatarGroup } from "@componentes-ia/bot-avatar";
import "@componentes-ia/core/styles.css";
import "@componentes-ia/bot-avatar/styles.css";

<BotAvatar seed={agent.id} state={busy ? "working" : "idle"} />
<BotAvatar {...BOT_PRESETS.tito} state="speaking" level={volume} />
<BotAvatarGroup max={4} size={40}>
  {agents.map((agent) => <BotAvatar key={agent.id} seed={agent.id} />)}
</BotAvatarGroup>
```

- 13 formas (`orb`, `blob`, `squircle`, `drop`, `ghost`, `gem`, `tri`, `star`, `flower`, `cloud`, `cat`, `droid`, `pill`). Al cambiar de forma, el cuerpo se transforma.
- 8 estados: `idle`, `thinking`, `working`, `speaking`, `listening`, `sleeping`, `success`, `error`.
- `level` (0–1) mueve la boca y las ondas con el volumen real de un agente de voz.
- Acabados `clay`, `glossy`, `fuzzy`, `flat` y `outline`; caras `eyes`, `mouth` y `visor`; siete accesorios.
- Un solo `requestAnimationFrame` para todos los avatares. Fuera de pantalla no calcula; con `prefers-reduced-motion` o `paused` queda en la pose del estado.

## Agent Status

Indicador de “el agente está trabajando”: tres puntos y una palabra que rota con un barrido de luz. Úsalo mientras el copiloto prepara la respuesta, antes del primer token.

```tsx
import { AgentStatus } from "@componentes-ia/agent-status";
import "@componentes-ia/core/styles.css";
import "@componentes-ia/agent-status/styles.css";

{waiting ? <AgentStatus /> : <p>{reply}</p>}
```

`status` deja el texto fijo. `variant` elige puntos, brillo o los dos. Con `prefers-reduced-motion` se queda quieto.

## Agent Plan

Plan en vivo, al estilo de una lista de pendientes: los pasos pasan de pendientes a en curso y luego a listos mientras el agente trabaja.

```tsx
import { AgentPlan, usePlanSimulation } from "@componentes-ia/agent-plan";
import "@componentes-ia/core/styles.css";
import "@componentes-ia/agent-plan/styles.css";

const steps = usePlanSimulation(plan, { interval: 900 });

<AgentPlan steps={steps} />
```

El encabezado muestra `3 de 7` y una barra. Al contraerlo queda solo el paso actual. El paso en curso lleva el mismo barrido de luz que Agent Status.

## Agent Replay

Reproductor tipo video de la ejecución de un agente. Arrastras el playhead y el escenario reconstruye el estado exacto en ese instante: el texto se escribe y se borra, el plan avanza y retrocede, las herramientas se abren y se cierran, y el diff gana o pierde líneas.

```tsx
import { AgentReplay, createMockRun } from "@componentes-ia/agent-replay";
import "@componentes-ia/core/styles.css";
import "@componentes-ia/agent-replay/styles.css";

<AgentReplay events={events} live />
```

`useReplay(events)` da el mismo motor sin UI. `createMockRun({ seed })` arma un run de ejemplo determinista.

## Estructura

```text
apps/web                 sitio Next.js
packages/core            tokens, cn, useReducedMotion, Shimmer
packages/agent-task      AgentTask y AgentStatusIndicator
packages/agent-composer  AgentComposer
packages/agent-status    AgentStatus
packages/agent-plan      AgentPlan y usePlanSimulation
packages/thinking-block  ThinkingBlock
packages/approval-card   ApprovalCard
packages/bot-avatar      BotAvatar, BotAvatarGroup y el elenco BOT_PRESETS
packages/agent-replay    AgentReplay, useReplay y createMockRun
templates/component      plantilla del generador
scripts/new-component.mjs
scripts/build-index.mjs
```

## Licencia

MIT. Ver `LICENSE`.
