import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    testTimeout: 30000, // 30 s for DB/AI operations
    pool: "forks",      // Required for better-sqlite3 (native module)
  },
});
