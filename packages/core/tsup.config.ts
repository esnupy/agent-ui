import { copyFile, mkdir } from "node:fs/promises";
import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  dts: true,
  clean: true,
  target: "es2022",
  banner: { js: '"use client";' },
  external: ["react", "react-dom", "react/jsx-runtime"],
  async onSuccess() {
    await mkdir("dist", { recursive: true });
    await copyFile("src/styles.css", "dist/styles.css");
  },
});
