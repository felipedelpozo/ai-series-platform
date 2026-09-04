import postgres from "postgres";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "./schema";

export type Db = PostgresJsDatabase<typeof schema>;

export class DatabaseConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DatabaseConfigError";
  }
}

let cachedSql: ReturnType<typeof postgres> | undefined;
let cachedDb: Db | undefined;

function databaseUrlFromEnv(): string {
  const value = process.env.DATABASE_URL;
  if (!value || value.trim() === "") {
    throw new DatabaseConfigError("DATABASE_URL is not set");
  }
  try {
    const url = new URL(value);
    if (url.protocol !== "postgres:" && url.protocol !== "postgresql:") {
      throw new Error("unsupported protocol");
    }
  } catch {
    throw new DatabaseConfigError("DATABASE_URL must be a valid postgres:// URL");
  }
  return value;
}

export function getDb(): Db {
  if (!cachedDb) {
    cachedSql = postgres(databaseUrlFromEnv());
    cachedDb = drizzle(cachedSql, { schema });
  }
  return cachedDb;
}

export type DbHealth = { ok: boolean; error?: string };

export async function checkDb(databaseUrl?: string): Promise<DbHealth> {
  let url = databaseUrl;
  if (!url) {
    try {
      url = databaseUrlFromEnv();
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : "database not configured",
      };
    }
  }

  let sql: ReturnType<typeof postgres>;
  try {
    sql = postgres(url, { max: 1, connect_timeout: 5 });
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "database connection failed",
    };
  }

  try {
    await sql`SELECT 1`;
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "database unreachable",
    };
  } finally {
    await sql.end();
  }
}

export async function ensureDefaultWorkspace(db: Db = getDb()): Promise<void> {
  await db
    .insert(schema.workspace)
    .values({ name: "Default Workspace", slug: "default" })
    .onConflictDoNothing({ target: schema.workspace.slug });
}
