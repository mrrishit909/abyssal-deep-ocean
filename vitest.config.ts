import { defineConfig } from "vitest/config";
export default defineConfig({ test: { include: ["packages/*/test/**/*.test.ts", "apps/api/test/**/*.test.ts"], testTimeout: 30_000, coverage: { provider: "v8", include: ["packages/domain/src/**"], thresholds: { lines: 85, functions: 85 } } } });
