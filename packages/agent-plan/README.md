# @componentes-ia/agent-plan

Plan en vivo del agente: una lista de pasos que se van completando mientras trabaja. El encabezado muestra el avance, y el paso en curso lleva un barrido de luz.

React 19 es la única peer dependency. El estilo vive en CSS, con las variables de `@componentes-ia/core`.

## Uso

```tsx
import { AgentPlan } from "@componentes-ia/agent-plan";
import "@componentes-ia/core/styles.css";
import "@componentes-ia/agent-plan/styles.css";

<AgentPlan
  steps={[
    { id: "leer", title: "Leer el diff", status: "done" },
    { id: "ajustar", title: "Ajustar el offset", status: "in_progress" },
    { id: "probar", title: "Escribir la prueba", status: "pending" },
  ]}
/>
```

Un paso puede llevar `detail` y `substeps`. El detalle y los hijos se abren al activar la fila.

## Props

| Prop | Tipo | Default |
| --- | --- | --- |
| `steps` | `PlanStep[]` o texto `título\|estado` separado por comas | plan de ejemplo |
| `title` | `string` | `"Plan"` |
| `collapsible` | `boolean` | `true` |
| `defaultOpen` | `boolean` | `true` |
| `onStepClick` | `(id: string) => void` | — |
| `className` | `string` | — |

También acepta las props nativas de un `div`.

Los estados son `pending`, `in_progress`, `done`, `error` y `skipped`. El avance del encabezado cuenta todo el árbol: `2 de 5` son los pasos en `done` contra el total, incluidos los subpasos.

`steps` en el playground del sitio es una lista `título|estado` separada por comas. En tu código pasa el arreglo.

Si `collapsible` está activo, contraer el encabezado deja solo el paso actual: el que está en curso, o si no hay, el de error, el pendiente o el último.

Con `prefers-reduced-motion` no hay brillo, giro, trazo del palomazo ni entrada de pasos nuevos. El texto se queda tachado si ya está listo.

## Simulación

`usePlanSimulation` avanza el plan en el cliente, sin backend. Cada intervalo el paso en curso pasa a listo y el siguiente pendiente entra en curso. Un padre no se cierra mientras le quede un hijo pendiente.

```tsx
const steps = usePlanSimulation(plan, { interval: 900 });

<AgentPlan steps={steps} />
```

## En el copiloto

Publica el plan antes de la respuesta. Cuando ya no queda nada en curso, escribe.

```tsx
const steps = usePlanSimulation(plan, { interval: 900 });
const working = steps.some(
  (step) => step.status === "pending" || step.status === "in_progress",
);

<>
  <AgentPlan steps={steps} />
  {working ? null : <p>{reply}</p>}
</>
```
