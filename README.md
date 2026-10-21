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
npm publish -w @componentes-ia/thinking-block --access public
npm publish -w @componentes-ia/approval-card --access public
npm publish -w @componentes-ia/bot-avatar --access public
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

## Estructura

```text
apps/web                 sitio Next.js
packages/core            tokens, cn, useReducedMotion, Shimmer
packages/agent-task      AgentTask y AgentStatusIndicator
packages/agent-composer  AgentComposer
packages/thinking-block  ThinkingBlock
packages/approval-card   ApprovalCard
packages/bot-avatar      BotAvatar, BotAvatarGroup y el elenco BOT_PRESETS
templates/component      plantilla del generador
scripts/new-component.mjs
scripts/build-index.mjs
```

## Licencia

MIT. Ver `LICENSE`.
