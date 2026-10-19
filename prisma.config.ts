import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // Migrations need the direct (non-pooled) Neon host; runtime uses DATABASE_URL via the adapter.
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? "",
  },
});
