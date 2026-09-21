import { config } from "dotenv";
import { defineConfig, env } from "prisma/config";

config({ path: ".env.local" });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  // Migrations need a direct (unpooled) connection; the app uses the pooled one.
  datasource: {
    url: env("DATABASE_URL_UNPOOLED"),
  },
});
