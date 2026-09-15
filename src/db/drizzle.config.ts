import { defineConfig } from "drizzle-kit";
import * as dotenv from "dotenv";

dotenv.config();

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("FATAL: DATABASE_URL must be set in environment variables.");
}

export default defineConfig({
  schema: "./server/db/schema.ts",
  out: "./server/migrations",
  dialect: "postgresql",
  schemaFilter: ["public"],
  dbCredentials: {
    url: databaseUrl,
  },
  verbose: true,
});
