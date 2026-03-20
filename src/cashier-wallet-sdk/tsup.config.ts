import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm", "cjs"],
  dts: true,
  clean: true,
  sourcemap: true,
  target: "es2020",
  // All ICP / PNP / signer-js packages are peer deps — do not bundle them
  external: [
    "@dfinity/agent",
    "@dfinity/candid",
    "@dfinity/identity",
    "@dfinity/principal",
    "@windoge98/plug-n-play",
    "@slide-computer/signer",
    "@slide-computer/signer-agent",
    "@slide-computer/signer-web",
  ],
});
