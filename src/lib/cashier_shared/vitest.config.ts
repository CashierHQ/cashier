import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["tests/**/*.test.ts", "logic/**/*.test.ts"],
    coverage: {
      reporter: ["text", "json", "html"],
      include: ["generated/ts/**/*.ts"],
    },
  },
});
