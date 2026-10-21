import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

const root = dirname(fileURLToPath(import.meta.url));
const packagesDir = join(root, "../../packages");

const transpilePackages = readdirSync(packagesDir).flatMap((entry) => {
  try {
    const source = readFileSync(join(packagesDir, entry, "package.json"), "utf8");
    const manifest = JSON.parse(source) as { name?: string };
    return manifest.name ? [manifest.name] : [];
  } catch {
    return [];
  }
});

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages,
  outputFileTracingRoot: join(root, "../.."),
  agentRules: false,
};

export default nextConfig;
