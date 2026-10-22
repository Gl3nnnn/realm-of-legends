import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@realm/core": fileURLToPath(new URL("./core/src/index.ts", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["core/test/**/*.test.ts"],
    reporters: ["default"],
  },
});
