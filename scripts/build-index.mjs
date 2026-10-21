import { spawnSync } from "node:child_process";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const packagesDir = join(root, "packages");
const outFile = join(root, "apps/web/src/generated/components.ts");

/**
 * @param {string} command
 * @param {string[]} args
 */
const run = (command, args) => {
  const result = spawnSync(command, args, { cwd: root, stdio: "inherit" });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
};

const readComponents = async () => {
  const entries = await readdir(packagesDir, { withFileTypes: true });
  const components = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    const directory = join(packagesDir, entry.name);
    let metaSource;

    try {
      metaSource = await readFile(join(directory, "component.json"), "utf8");
    } catch {
      continue;
    }

    const pkg = JSON.parse(await readFile(join(directory, "package.json"), "utf8"));
    const meta = JSON.parse(metaSource);

    components.push({
      slug: meta.slug,
      name: meta.name,
      title: meta.title,
      description: meta.description,
      packageName: pkg.name,
    });
  }

  components.sort((a, b) => a.slug.localeCompare(b.slug));
  return components;
};

const renderRegistry = (components) => {
  const imports = ['import "@componentes-ia/core/styles.css";'];

  components.forEach((component, index) => {
    imports.push(
      `import { ${component.name}, schema as schema${index} } from "${component.packageName}";`,
      `import { Demo as Demo${index} } from "${component.packageName}/demo";`,
      `import "${component.packageName}/styles.css";`,
    );
  });

  const entries = components
    .map(
      (component, index) => `  {
    slug: ${JSON.stringify(component.slug)},
    name: ${JSON.stringify(component.name)},
    title: ${JSON.stringify(component.title)},
    description: ${JSON.stringify(component.description)},
    packageName: ${JSON.stringify(component.packageName)},
    Component: ${component.name} as unknown as ComponentEntry["Component"],
    schema: schema${index},
    Demo: Demo${index} as unknown as ComponentEntry["Demo"],
  }`,
    )
    .join(",\n");

  return `/* Este archivo lo genera scripts/build-index.mjs. No lo edites a mano. */

${imports.join("\n")}
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
${entries}
];
`;
};

const buildIndex = async () => {
  const components = await readComponents();
  await mkdir(dirname(outFile), { recursive: true });
  await writeFile(outFile, renderRegistry(components));

  const biome = join(root, "node_modules", ".bin", "biome");
  run(biome, ["check", "--write", outFile]);
};

await buildIndex();
