import { defineConfig } from "drizzle-kit";
import { config } from "dotenv";
import { join } from "node:path";

config({ path: join(process.cwd(), "..", "..", ".env") });

export default defineConfig({
  schema: "./src/schema.ts",
  out: "./migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "",
  },
});
