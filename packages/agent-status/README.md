# @componentes-ia/agent-status

Indicador de que el agente está trabajando: tres puntos animados y una palabra que rota con un barrido de luz. Sirve para el momento en que el copiloto ya recibió el mensaje y todavía no llega el primer token.

React 19 es la única peer dependency. El estilo vive en CSS, con las variables de `@componentes-ia/core`.

## Uso

```tsx
import { AgentStatus } from "@componentes-ia/agent-status";
import "@componentes-ia/core/styles.css";
import "@componentes-ia/agent-status/styles.css";

<AgentStatus />
```

Con un texto fijo, los puntos siguen y la palabra ya no rota:

```tsx
<AgentStatus status="Pensándolo bien" />
```

## Props

| Prop | Tipo | Default |
| --- | --- | --- |
| `words` | `string[]` o texto separado por comas | Pensando, Buscando, Leyendo, Analizando, Escribiendo |
| `status` | `string` | vacío: las palabras rotan |
| `interval` | `number` | `2200` |
| `variant` | `"dots"` \| `"shimmer"` \| `"both"` | `"both"` |
| `size` | `"sm"` \| `"md"` | `"md"` |
| `className` | `string` | — |

También acepta las props nativas de un `div`.

`words` en el playground del sitio es una lista separada por comas. En tu código puedes pasar el arreglo:

```tsx
<AgentStatus words={["Pensando", "Revisando", "Escribiendo"]} interval={1800} />
```

## En el copiloto

Muestra el indicador mientras el agente prepara la respuesta. En cuanto llega el primer token, quítalo y pinta el texto.

```tsx
{waiting ? <AgentStatus /> : <p>{reply}</p>}
```

Con `prefers-reduced-motion` no hay brillo, ni puntos en movimiento, ni rotación: se queda la primera palabra, o `status` si lo pasaste.

## Variantes

- `both`: puntos y texto con brillo.
- `dots`: solo los puntos. La palabra sigue en el anuncio para el lector de pantalla.
- `shimmer`: solo el texto.
- `sm`: la misma pieza, más chica.
