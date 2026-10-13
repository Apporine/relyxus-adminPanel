import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "server-only": fileURLToPath(new URL("./tests/stubs/server-only.ts", import.meta.url)),
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
    css: false,
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov", "json-summary"],
      include: ["src/domain/**", "src/lib/**", "src/server/**", "src/components/**"],
      exclude: ["src/server/fixtures/**", "**/*.test.*"],
      // Logic layers are gated on unit coverage. Shell components are exercised by
      // Playwright, so they are reported here without a threshold.
      thresholds: {
        "src/{domain,lib,server}/**": { lines: 80, functions: 80, statements: 80, branches: 75 },
        "src/components/ui/**": { lines: 70, functions: 60, statements: 70, branches: 60 },
      },
    },
  },
});
