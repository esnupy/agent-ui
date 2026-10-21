import type { ComponentSchema, PropSchema } from "@componentes-ia/core";

/** Valores que salen de los controles del playground. */
export type PlaygroundValues = Record<string, string | number | boolean>;

/**
 * Describe el tipo de una prop como lo leería un coding agent.
 *
 * @param prop - Definición de la prop.
 * @returns El tipo en texto, con las opciones si es un enum.
 */
export const formatPropType = (prop: PropSchema): string => {
  if (prop.type === "enum" && prop.options) {
    return prop.options.map((option) => JSON.stringify(option)).join(" | ");
  }

  return prop.type;
};

/**
 * Valores iniciales de los controles, tomados del default del esquema.
 *
 * @param schema - Esquema exportado por el paquete.
 * @returns Un valor por cada prop.
 */
export const getPlaygroundDefaults = (schema: ComponentSchema): PlaygroundValues => {
  const values: PlaygroundValues = {};

  for (const [key, prop] of Object.entries(schema.props)) {
    if (prop.type === "function") {
      values[key] = false;
      continue;
    }

    if (prop.default !== undefined) {
      values[key] = prop.default;
      continue;
    }

    if (prop.type === "number") {
      values[key] = prop.min ?? 0;
      continue;
    }

    if (prop.type === "boolean") {
      values[key] = false;
      continue;
    }

    if (prop.type === "enum") {
      values[key] = prop.options?.[0] ?? "";
      continue;
    }

    values[key] = "";
  }

  return values;
};

/**
 * Props listas para renderizar. Un control de función activo se vuelve un callback.
 *
 * @param schema - Esquema del componente.
 * @param values - Valores actuales del playground.
 * @returns Props que el componente puede recibir.
 */
export const toPreviewProps = (
  schema: ComponentSchema,
  values: PlaygroundValues,
): Record<string, unknown> => {
  const props: Record<string, unknown> = {};

  for (const [key, prop] of Object.entries(schema.props)) {
    const value = values[key];

    if (prop.type === "function") {
      if (value) props[key] = () => undefined;
      continue;
    }

    props[key] = value;
  }

  return props;
};

/**
 * Arma el JSX con los valores actuales del playground.
 *
 * @param name - Nombre del componente.
 * @param schema - Esquema de props.
 * @param values - Valores actuales.
 * @returns Un elemento JSX, en una o varias líneas.
 */
export const buildComponentJsx = (
  name: string,
  schema: ComponentSchema,
  values: PlaygroundValues,
): string => {
  const attributes = Object.entries(schema.props).flatMap(([key, prop]) => {
    const value = values[key];

    if (prop.type === "function") {
      return value ? [`${key}={() => {}}`] : [];
    }

    if (typeof value === "string") {
      if (value === "") return [];
      return [`${key}=${JSON.stringify(value)}`];
    }

    if (typeof value === "number") return [`${key}={${value}}`];
    if (typeof value === "boolean") return [value ? key : `${key}={false}`];

    return [];
  });

  if (attributes.length === 0) return `<${name} />`;

  return `<${name}\n${attributes.map((attribute) => `  ${attribute}`).join("\n")}\n/>`;
};

/**
 * Snippet de instalación e import para pegar en un archivo.
 *
 * @param input - Nombre, paquete, esquema y valores.
 * @returns El ejemplo de uso.
 */
export const buildUsage = (input: {
  name: string;
  packageName: string;
  schema: ComponentSchema;
  values: PlaygroundValues;
}): string => {
  const jsx = buildComponentJsx(input.name, input.schema, input.values)
    .split("\n")
    .map((line) => `    ${line}`)
    .join("\n");

  return [
    `import { ${input.name} } from "${input.packageName}";`,
    'import "@componentes-ia/core/styles.css";',
    `import "${input.packageName}/styles.css";`,
    "",
    "export function Example() {",
    "  return (",
    jsx,
    "  );",
    "}",
  ].join("\n");
};

/**
 * Prompt con todas las props y los valores actuales, para un coding agent.
 *
 * @param input - Identidad del componente, esquema y valores del playground.
 * @returns El texto que copia el botón.
 */
export const buildPrompt = (input: {
  name: string;
  packageName: string;
  description: string;
  schema: ComponentSchema;
  values: PlaygroundValues;
}): string => {
  const propLines = Object.entries(input.schema.props).map(([key, prop]) => {
    const current = input.values[key];
    const details = [
      `${key} (${formatPropType(prop)})`,
      prop.default !== undefined ? `default ${JSON.stringify(prop.default)}` : null,
      prop.min !== undefined ? `min ${prop.min}` : null,
      prop.max !== undefined ? `max ${prop.max}` : null,
      prop.description,
      `current ${JSON.stringify(current ?? null)}`,
    ].filter((part): part is string => Boolean(part));

    return `- ${details.join(". ")}`;
  });

  return [
    `Use ${input.name} from ${input.packageName}.`,
    input.description,
    "Style it only with the package CSS. Do not add Tailwind classes inside the component.",
    "",
    "Imports:",
    `import { ${input.name} } from "${input.packageName}";`,
    'import "@componentes-ia/core/styles.css";',
    `import "${input.packageName}/styles.css";`,
    "",
    "Props:",
    ...propLines,
    "",
    "Current JSX:",
    buildComponentJsx(input.name, input.schema, input.values),
  ].join("\n");
};
