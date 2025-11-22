import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/index.ts",
  out: "./migrations",
  dialect: "postgresql",
  schemaFilter: [process.env.DATABASE_SCHEMA!],
  dbCredentials: {
    url: process.env.DATABASE_MIGRATION_URL!,
  },
  migrations: {
    table: 'migrations',
    prefix: "timestamp",
    schema: process.env.DATABASE_SCHEMA!,
  },
  verbose: true,
});
