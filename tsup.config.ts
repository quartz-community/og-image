import { defineConfig } from "tsup";
import type { BuildOptions } from "esbuild";

export default defineConfig({
  entry: {
    index: "src/index.ts",
  },
  format: ["esm"],
  dts: true,
  sourcemap: true,
  clean: true,
  treeshake: true,
  target: "es2022",
  splitting: false,
  noExternal: ["@quartz-community/types", "@quartz-community/utils"],
  outDir: "dist",
  platform: "node",
  esbuildOptions(options: BuildOptions) {
    options.jsx = "automatic";
    options.jsxImportSource = "preact";
  },
});
