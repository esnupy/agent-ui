import { copyFile, mkdir } from "node:fs/promises";
import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    demo: "src/demo.tsx",
  },
  format: ["esm"],
  dts: true,
  clean: true,
  target: "es2022",
  banner: { js: '"use client";' },
  external: ["react", "react-dom", "react/jsx-runtime", "@componentes-ia/core"],
  async onSuccess() {
    await mkdir("dist", { recursive: true });
    await copyFile("src/styles.css", "dist/styles.css");
  },
});
