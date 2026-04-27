import { defineConfig } from "tsup";
import type { BuildOptions } from "esbuild";

const SINGLETON_EXTERNALS = [
  "preact",
  "preact/hooks",
  "preact/jsx-runtime",
  "preact/compat",
  "@jackyzha0/quartz",
  "@jackyzha0/quartz/*",
  "vfile",
  "vfile/*",
  "unified",
];

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
  noExternal: [/.*/],
  outDir: "dist",
  platform: "node",
  external: SINGLETON_EXTERNALS,
  banner: {
    js: 'import { createRequire } from "module"; const require = createRequire(import.meta.url);',
  },
  esbuildOptions(options: BuildOptions) {
    options.jsx = "automatic";
    options.jsxImportSource = "preact";
  },
});
