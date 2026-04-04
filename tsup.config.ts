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
  noExternal: ["@quartz-community/utils"],
  outDir: "dist",
  platform: "node",
  external: ["sharp"],
  banner: {
    js: 'import { createRequire } from "module"; const require = createRequire(import.meta.url);',
  },
  esbuildOptions(options: BuildOptions) {
    options.jsx = "automatic";
    options.jsxImportSource = "preact";
  },
});
