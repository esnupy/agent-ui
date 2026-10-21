import { spawnSync } from "node:child_process";
import { access, cp, readdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const templateDir = join(root, "templates/component");
const npm = process.platform === "win32" ? "npm.cmd" : "npm";

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

/**
 * @param {string} kebab
 */
const toPascal = (kebab) => {
  return kebab
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
};

/**
 * @param {string} kebab
 */
const toTitle = (kebab) => {
  return kebab
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
};

/**
 * @param {string} directory
 * @param {string} kebab
 * @param {string} pascal
 * @param {string} title
 */
const replaceTokens = async (directory, kebab, pascal, title) => {
  const entries = await readdir(directory, { withFileTypes: true });

  for (const entry of entries) {
    const path = join(directory, entry.name);

    if (entry.isDirectory()) {
      await replaceTokens(path, kebab, pascal, title);
      continue;
    }

    const source = await readFile(path, "utf8");
    const next = source
      .replaceAll("__KEBAB__", kebab)
      .replaceAll("__PASCAL__", pascal)
      .replaceAll("__TITLE__", title);

    if (next !== source) {
      await writeFile(path, next);
    }
  }
};

/**
 * @param {string} kebab
 */
const addWebDependency = async (kebab) => {
  const manifestPath = join(root, "apps/web/package.json");
  const source = await readFile(manifestPath, "utf8");
  const name = `@ai-components/${kebab}`;

  if (source.includes(`"${name}"`)) return;

  const needle = '"dependencies": {\n';
  if (!source.includes(needle)) {
    console.error("No encontré dependencies en apps/web/package.json.");
    process.exit(1);
  }

  const next = source.replace(needle, `${needle}    "${name}": "*",\n`);
  await writeFile(manifestPath, next);
};

const kebab = process.argv[2];

if (!kebab) {
  console.error("Uso: npm run new-component -- <nombre>");
  process.exit(1);
}

if (!/^[a-z][a-z0-9]*(-[a-z0-9]+)*$/.test(kebab)) {
  console.error("El nombre va en kebab-case. Ejemplo: agent-task");
  process.exit(1);
}

if (kebab === "core") {
  console.error("core está reservado para los tokens compartidos.");
  process.exit(1);
}

const target = join(root, "packages", kebab);

try {
  await access(target);
  console.error(`Ya existe packages/${kebab}.`);
  process.exit(1);
} catch {
  // El directorio no existe: se puede crear.
}

const pascal = toPascal(kebab);
const title = toTitle(kebab);

await cp(templateDir, target, { recursive: true });
await replaceTokens(target, kebab, pascal, title);

const biome = join(root, "node_modules", ".bin", "biome");
run(biome, ["check", "--write", target]);

await addWebDependency(kebab);

run(npm, ["install"]);
run(npm, ["run", "build", "--workspace", `@ai-components/${kebab}`]);
run(process.execPath, ["scripts/build-index.mjs"]);

console.log(`Listo: packages/${kebab} y /components/${kebab}`);
