import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  // Mirror the Next.js "@/*" path alias from tsconfig.json so test files and
  // the modules under test can use the same absolute imports that production
  // code uses. Without this, anything in src/ that imports "@/lib/..." fails
  // under Vitest even if the test file itself uses a relative path.
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  test: {
    include: ["tests/**/*.test.ts"],
    environment: "node",
  },
});
