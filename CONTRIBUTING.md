# Contribuir

El código tiene que ser original. No copies implementaciones de otras bibliotecas de componentes.

## Antes de un pull request

```bash
npm install
npm run lint
npm run typecheck
npm run test
npm run build
```

## Un componente nuevo

Usa el generador en lugar de copiar un paquete a mano:

```bash
npm run new-component -- mi-componente
```

Después reemplaza la plantilla con el componente real. Mantén:

- TypeScript estricto y ESM.
- CSS propio, con las variables de `@componentes-ia/core`. Sin Tailwind dentro de `packages/`.
- React como única peer dependency. Nada de runtime extra.
- `schema` con tipo, opciones, default, mínimo, máximo y descripción. El sitio arma la tabla, el playground y el prompt desde ahí.
- `Demo` en `src/demo.tsx`.
- `component.json` alineado con el nombre del export.
- Pruebas de estados, accesibilidad y `prefers-reduced-motion` cuando haya animación.
- Estilos que funcionen en claro y en oscuro, en blanco, negro y grises, salvo que el componente necesite otro matiz y eso quede justificado en el PR.

`apps/web/src/generated/components.ts` se regenera. No lo edites a mano.

## Estilo

Biome formatea y lintea. Los textos de la interfaz y de la documentación van en español de México (tú, sin voseo). Los nombres de componentes y de props se quedan en inglés.

Los controladores del sitio se quedan delgados: la lógica del playground vive en `usePlayground` y en `src/lib/prompt.ts`.
