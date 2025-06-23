import { defineConfig } from "drizzle-kit";

// Use SQLite for development if DATABASE_URL is not set
const databaseUrl = process.env.DATABASE_URL || "./database.sqlite";
const isPostgres = databaseUrl.startsWith("postgres");

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: isPostgres ? "postgresql" : "sqlite",
  dbCredentials: isPostgres 
    ? { url: databaseUrl }
    : { url: databaseUrl },
});
