# @componentes-ia/agent-replay

Reproductor tipo video de la ejecución de un agente. Arrastras el playhead y la interfaz reconstruye el estado exacto en ese instante: el texto se escribe y se borra, el plan avanza y retrocede, las herramientas se abren y se cierran, y el diff gana o pierde líneas.

React 19 es la única peer dependency. No hay librerías de animación: la física del scrubber, el FLIP y los cuadros están hechos a mano con `requestAnimationFrame` y la Web Animations API.

## Uso

```tsx
import { AgentReplay } from "@componentes-ia/agent-replay";
import "@componentes-ia/core/styles.css";
import "@componentes-ia/agent-replay/styles.css";

<AgentReplay events={events} />
```

Sin `events`, reproduce `createMockRun({ seed })`, un run de ejemplo.

## Props

| Prop | Tipo | Default |
| --- | --- | --- |
| `events` | `ReplayEvent[]` | run de ejemplo |
| `seed` | `number` | `7` |
| `live` | `boolean` | `false` |
| `autoPlay` | `boolean` | `false` |
| `loop` | `boolean` | `false` |
| `defaultSpeed` | `0.5 \| 1 \| 2 \| 4` | `1` |
| `panels` | `("chat" \| "plan" \| "tools" \| "diff")[]` o texto separado por comas | los cuatro |
| `onSeek` | `(t: number) => void` | — |
| `renderEvent` | `(event: ReplayEvent) => ReactNode \| undefined` | — |
| `className` | `string` | — |

También acepta las props nativas de un `section`.

`onSeek` solo se llama cuando el usuario mueve el playhead, no durante la reproducción. `renderEvent` cambia la vista previa del tooltip. Si regresa `undefined`, se usa la de serie.

## Eventos

```ts
type ReplayEvent = {
  id: string;
  t: number; // ms desde el inicio del run
  type:
    | "thought"
    | "message_delta"
    | "plan_update"
    | "tool_call"
    | "tool_result"
    | "file_diff"
    | "approval"
    | "error";
  payload: /* depende de type */;
};
```

| `type` | `payload` |
| --- | --- |
| `thought` | `{ text }` |
| `message_delta` | `{ messageId, role, text, durationMs? }` |
| `plan_update` | `{ stepId, title?, status }` |
| `tool_call` | `{ callId, name, input }` |
| `tool_result` | `{ callId, output, ok }` |
| `file_diff` | `{ path, before?, hunks: { start, remove, add }[] }` |
| `approval` | `{ id, title, status: "requested" \| "approved" \| "rejected" }` |
| `error` | `{ message, callId? }` |

Un `message_delta` se escribe a lo largo de `durationMs`. El texto parcial depende de `t`, así que al hacer scrub hacia atrás se borra. Si un fragmento empieza antes de que termine el anterior, el anterior se da por completo.

En `file_diff`, `start` cuenta solo las líneas vivas, después de aplicar los tramos anteriores del mismo evento. Una línea original que se quita queda tachada. Una línea agregada que se quita después desaparece.

Los eventos pueden llegar en cualquier orden. Se ordenan por `t` y, si empatan, se respeta el orden de llegada.

## Controles y atajos

Con el foco dentro del reproductor:

| Tecla | Acción |
| --- | --- |
| Espacio | Reproducir o pausar |
| ← → | Evento anterior o siguiente |
| J K L | Reversa, pausa, adelante. Repetir J o L acelera |
| Inicio, Fin | Al principio o al final |
| `[` `]` | Bajar o subir la velocidad |
| RePág, AvPág | Cinco segundos adelante o atrás |

- **Scrub**: arrastra la regla o la píldora del playhead. Al soltar hay inercia y, al frenar, un snap magnético al evento más cercano.
- **Loop A–B**: arrastra sobre la pista de marcas. Un clic sin arrastre salta a ese punto o a la marca bajo el cursor.
- **Zoom**: Ctrl + rueda, el pinch del trackpad o dos dedos en pantalla táctil. La rueda horizontal desplaza. El minimapa muestra la densidad de todo el run y la ventana visible, que puedes arrastrar.
- **Agrupación**: las marcas que quedarían encimadas se juntan en un grupo con su conteo. El tooltip muestra los primeros eventos.

El scrubber es un `role="slider"` con `aria-valuetext` como `00:12.340, Herramienta: grep · grep -rn "buffer"`. Mientras reproduce, solo se anuncia al cruzar un evento.

Con `prefers-reduced-motion` no hay inercia ni resorte (el snap es inmediato), ni FLIP, ni caret parpadeante, ni animaciones de diff o plan.

## En vivo

Con `live`, el reproductor arranca al final y sigue los eventos nuevos mientras el playhead esté ahí. Pasa el arreglo completo cada vez que llegue algo. Si el arreglo nuevo empieza con el anterior, el timeline se extiende sin reconstruirse.

```tsx
const [events, setEvents] = useState<ReplayEvent[]>([]);

useEffect(() => stream.on("event", (event) => setEvents((list) => [...list, event])), []);

<AgentReplay events={events} live />
```

Si el usuario regresa, aparece **Volver a en vivo**.

## Headless

`useReplay` da el motor sin UI. Vuelve a renderizar en cada cuadro mientras reproduce.

```tsx
import { useReplay } from "@componentes-ia/agent-replay";

const MiniReplay = ({ events }) => {
  const { t, state, duration, playing, toggle, seek } = useReplay(events, { autoPlay: true });
  const step = state.plan.find((item) => item.status === "in_progress");

  return (
    <div>
      <button onClick={toggle} type="button">{playing ? "Pausar" : "Reproducir"}</button>
      <input max={duration} onChange={(e) => seek(Number(e.target.value))} type="range" value={t} />
      <p>{step?.title}</p>
    </div>
  );
};
```

Para suscripciones finas usa `store` con `useStoreSelector`. Así el componente solo se vuelve a renderizar cuando cambia lo que seleccionas:

```tsx
const plan = useStoreSelector(store.subscribeState, store.getState, selectPlan);
```

El estado es inmutable y comparte estructura: si un evento no toca el plan, `state.plan` conserva la misma referencia.

## Núcleo sin React

```ts
import { createMockRun, createTimeline, reduceState } from "@componentes-ia/agent-replay";

const events = createMockRun({ seed: 3, durationMs: 45_000 });

reduceState(events, 12_000); // referencia: reproduce desde 0, O(n)

const timeline = createTimeline(events, { snapshotEvery: 128 });
timeline.stateAt(12_000); // O(log n + k), con k ≤ 128
```

`createTimeline` guarda un snapshot cada `snapshotEvery` eventos. Como el estado comparte estructura, un snapshot es solo una referencia. `stateAt(t)` busca el índice con búsqueda binaria, toma el snapshot del bloque y aplica como máximo `snapshotEvery` eventos. Si la consulta anterior quedó más atrás en el mismo bloque, sigue desde ahí, así que reproducir hacia adelante cuesta solo los eventos nuevos de cada cuadro.

Las pruebas comparan `timeline.stateAt(t)` con `reduceState(events, t)`. Cubren 50 semillas de runs aleatorios con saltos en cualquier orden, la reproducción cuadro por cuadro y el `append` incremental contra la reconstrucción completa.

`createMockRun({ seed, durationMs })` genera un agente que arregla un parser de stream: plan de cinco pasos, búsqueda, lectura, edición de dos archivos, una prueba que falla, aprobación, corrección y respuesta final. La misma semilla da el mismo run.

## Benchmark

10,000 eventos aleatorios de todos los tipos en 10 minutos de run, con snapshots cada 128. Apple M4, Node 25, `vitest bench`:

| Operación | Media |
| --- | --- |
| Construir el timeline | 9.8 ms |
| 1000 seeks al azar | 49.8 ms (≈ 0.05 ms por seek) |
| 600 cuadros a 60 fps (10 s de reproducción) | 0.23 ms en total |
| Referencia: 1 seek reproduciendo desde 0 | ≈ 3.5 ms |

Un seek al azar es unas 70 veces más rápido que reproducir desde cero. La reproducción continua cuesta menos de un microsegundo por cuadro.

```bash
npx vitest bench --run packages/agent-replay
```
