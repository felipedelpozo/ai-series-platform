import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { join } from "node:path";
import postgres from "postgres";
import { schema, workspace, workspaceQuotas, type Db } from "@ai-series/db";
import {
  canRole,
  consumeCredits,
  hashPassword,
  InvalidCreditAmountError,
  reserveCredits,
  verifyPassword,
  WorkspaceQuotaExceededError,
  ROLE_RANK,
} from "./accounts";

const TEST_DB = "ai_series_accounts_test";
const migrationsFolder = join(import.meta.dirname, "..", "..", "db", "migrations");

function databaseUrl(database: string) {
  const url = new URL(process.env.DATABASE_URL ?? "");
  url.pathname = `/${database}`;
  return url.toString();
}

describe("password hashing", () => {
  it("round-trips a correct password", () => {
    const hash = hashPassword("correct horse battery staple");
    expect(hash).toContain(":");
    expect(verifyPassword("correct horse battery staple", hash)).toBe(true);
  });

  it("rejects a wrong password", () => {
    const hash = hashPassword("right");
    expect(verifyPassword("wrong", hash)).toBe(false);
  });

  it("produces unique salts", () => {
    expect(hashPassword("same")).not.toBe(hashPassword("same"));
  });
});

describe("role ordering", () => {
  it("orders roles by authority", () => {
    expect(ROLE_RANK.owner).toBeGreaterThan(ROLE_RANK.editor);
    expect(ROLE_RANK.editor).toBeGreaterThan(ROLE_RANK.viewer);
  });

  it("allows equal or higher roles", () => {
    expect(canRole("owner", "editor")).toBe(true);
    expect(canRole("editor", "editor")).toBe(true);
    expect(canRole("viewer", "editor")).toBe(false);
    expect(canRole("viewer", "viewer")).toBe(true);
  });
});

const hasDb = Boolean(process.env.DATABASE_URL);

describe.skipIf(!hasDb)("workspace quota integration", () => {
  let db: Db;
  let sqlClient: ReturnType<typeof postgres>;

  beforeAll(async () => {
    const admin = postgres(databaseUrl("postgres"), { max: 1 });
    await admin.unsafe(`DROP DATABASE IF EXISTS ${TEST_DB} WITH (FORCE)`);
    await admin.unsafe(`CREATE DATABASE ${TEST_DB}`);
    await admin.end();

    sqlClient = postgres(databaseUrl(TEST_DB), { max: 12 });
    db = drizzle(sqlClient, { schema });
    await migrate(db, { migrationsFolder });
  });

  afterAll(async () => {
    await sqlClient?.end();
    const admin = postgres(databaseUrl("postgres"), { max: 1 });
    await admin.unsafe(`DROP DATABASE IF EXISTS ${TEST_DB} WITH (FORCE)`);
    await admin.end();
  });

  async function createQuota(limit: number): Promise<string> {
    const [workspaceRow] = await db
      .insert(workspace)
      .values({ slug: `quota-${crypto.randomUUID()}`, name: "Quota Test" })
      .returning({ id: workspace.id });
    await db.insert(workspaceQuotas).values({
      workspaceId: workspaceRow!.id,
      monthlyLimit: limit,
      creditsUsed: 0,
      resetAt: new Date(Date.now() + 86_400_000),
    });
    return workspaceRow!.id;
  }

  it("never exceeds the monthly limit under concurrent reservations", async () => {
    const workspaceId = await createQuota(5);

    const results = await Promise.allSettled(
      Array.from({ length: 10 }, () => consumeCredits(db, { workspaceId, amount: 1 })),
    );
    const fulfilled = results.filter((result) => result.status === "fulfilled");
    const rejected = results.filter((result) => result.status === "rejected");
    const [quota] = await db
      .select()
      .from(workspaceQuotas)
      .where(eq(workspaceQuotas.workspaceId, workspaceId));

    expect(fulfilled).toHaveLength(5);
    expect(rejected).toHaveLength(5);
    expect(
      rejected.every(
        (result) =>
          result.status === "rejected" && result.reason instanceof WorkspaceQuotaExceededError,
      ),
    ).toBe(true);
    expect(quota!.creditsUsed).toBe(5);
  });

  it("rolls a reservation back with the caller transaction", async () => {
    const workspaceId = await createQuota(3);

    await expect(
      db.transaction(async (tx) => {
        await reserveCredits(tx, { workspaceId, amount: 2 });
        throw new Error("abort operation");
      }),
    ).rejects.toThrow("abort operation");

    const [quota] = await db
      .select()
      .from(workspaceQuotas)
      .where(eq(workspaceQuotas.workspaceId, workspaceId));
    expect(quota!.creditsUsed).toBe(0);
  });

  it("rejects non-positive and non-integral credit amounts", async () => {
    const workspaceId = await createQuota(3);

    await expect(consumeCredits(db, { workspaceId, amount: 0 })).rejects.toBeInstanceOf(
      InvalidCreditAmountError,
    );
    await expect(consumeCredits(db, { workspaceId, amount: 1.5 })).rejects.toBeInstanceOf(
      InvalidCreditAmountError,
    );
  });
});
