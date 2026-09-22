import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    setupFiles: ["./vitest.setup.ts"],
    // Database tests are slow and need DATABASE_URL; they run in-band.
    fileParallelism: false,
  },
});
