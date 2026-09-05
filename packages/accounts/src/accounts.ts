import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { and, eq } from "drizzle-orm";
import {
  invitations,
  sessions,
  users,
  workspace,
  workspaceMembers,
  workspaceQuotas,
  workspaceSettings,
  type Db,
} from "@ai-series/db";

export type Role = "owner" | "editor" | "viewer";

export const ROLE_RANK: Record<Role, number> = { viewer: 1, editor: 2, owner: 3 };

export function canRole(actual: Role, required: Role): boolean {
  return ROLE_RANK[actual] >= ROLE_RANK[required];
}

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const candidate = scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, "hex");
  return candidate.length === expected.length && timingSafeEqual(candidate, expected);
}

function nextMonthReset(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + 1, 1);
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export type PublicUser = { id: string; email: string; name: string | null };

export async function registerUser(
  db: Db,
  input: { email: string; password: string; name?: string },
): Promise<PublicUser> {
  const email = normalizeEmail(input.email);
  const existing = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (existing.length > 0) throw new Error("Email already registered");
  const [user] = await db
    .insert(users)
    .values({ email, passwordHash: hashPassword(input.password), name: input.name ?? null })
    .returning();

  const [defaultWs] = await db
    .select()
    .from(workspace)
    .where(eq(workspace.slug, "default"))
    .limit(1);
  if (defaultWs) {
    const members = await db
      .select()
      .from(workspaceMembers)
      .where(eq(workspaceMembers.workspaceId, defaultWs.id));
    if (members.length === 0) {
      await db
        .insert(workspaceMembers)
        .values({ workspaceId: defaultWs.id, userId: user.id, role: "owner" });
    }
  }

  return { id: user.id, email: user.email, name: user.name };
}

export async function loginUser(
  db: Db,
  input: { email: string; password: string },
): Promise<{ token: string; user: PublicUser }> {
  const email = normalizeEmail(input.email);
  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (!user || !verifyPassword(input.password, user.passwordHash)) {
    throw new Error("Invalid email or password");
  }
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  await db.insert(sessions).values({ token, userId: user.id, expiresAt });
  return { token, user: { id: user.id, email: user.email, name: user.name } };
}

export async function logout(db: Db, token: string): Promise<void> {
  await db.delete(sessions).where(eq(sessions.token, token));
}

export async function getSessionUser(db: Db, token?: string | null): Promise<PublicUser | null> {
  if (!token) return null;
  const [session] = await db.select().from(sessions).where(eq(sessions.token, token)).limit(1);
  if (!session || new Date(session.expiresAt).getTime() < Date.now()) return null;
  const [user] = await db.select().from(users).where(eq(users.id, session.userId)).limit(1);
  return user ? { id: user.id, email: user.email, name: user.name } : null;
}

export async function createWorkspace(
  db: Db,
  input: { name: string; slug: string; userId: string },
): Promise<string> {
  return db.transaction(async (tx) => {
    const [ws] = await tx.insert(workspace).values({ name: input.name, slug: input.slug }).returning();
    await tx.insert(workspaceMembers).values({ workspaceId: ws.id, userId: input.userId, role: "owner" });
    await tx
      .insert(workspaceQuotas)
      .values({ workspaceId: ws.id, monthlyLimit: 1000, creditsUsed: 0, resetAt: nextMonthReset() });
    await tx.insert(workspaceSettings).values({ workspaceId: ws.id, settings: {} });
    return ws.id;
  });
}

export async function listWorkspacesForUser(db: Db, userId: string) {
  const memberships = await db
    .select()
    .from(workspaceMembers)
    .where(eq(workspaceMembers.userId, userId));
  const result = [];
  for (const membership of memberships) {
    const [ws] = await db
      .select()
      .from(workspace)
      .where(eq(workspace.id, membership.workspaceId))
      .limit(1);
    if (ws) result.push({ workspace: ws, role: membership.role as Role });
  }
  return result;
}

export async function listMembers(db: Db, workspaceId: string) {
  const memberships = await db
    .select()
    .from(workspaceMembers)
    .where(eq(workspaceMembers.workspaceId, workspaceId));
  const result = [];
  for (const membership of memberships) {
    const [user] = await db.select().from(users).where(eq(users.id, membership.userId)).limit(1);
    result.push({
      userId: membership.userId,
      email: user?.email ?? null,
      name: user?.name ?? null,
      role: membership.role as Role,
    });
  }
  return result;
}

export async function inviteMember(
  db: Db,
  input: { workspaceId: string; email: string; role: Role; invitedBy?: string },
): Promise<{ id: string; token: string }> {
  const token = randomBytes(24).toString("hex");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const [invitation] = await db
    .insert(invitations)
    .values({
      workspaceId: input.workspaceId,
      email: normalizeEmail(input.email),
      role: input.role,
      token,
      invitedBy: input.invitedBy ?? null,
      expiresAt,
      status: "pending",
    })
    .returning({ id: invitations.id, token: invitations.token });
  return invitation;
}

export async function acceptInvitation(
  db: Db,
  input: { token: string; userId: string },
): Promise<{ workspaceId: string; role: Role }> {
  const [invitation] = await db
    .select()
    .from(invitations)
    .where(eq(invitations.token, input.token))
    .limit(1);
  if (!invitation) throw new Error("Invitation not found");
  if (invitation.status !== "pending") throw new Error("Invitation is not pending");
  if (invitation.expiresAt && new Date(invitation.expiresAt).getTime() < Date.now()) {
    throw new Error("Invitation expired");
  }
  await db
    .insert(workspaceMembers)
    .values({ workspaceId: invitation.workspaceId, userId: input.userId, role: invitation.role })
    .onConflictDoNothing({ target: [workspaceMembers.workspaceId, workspaceMembers.userId] });
  await db
    .update(invitations)
    .set({ status: "accepted" })
    .where(eq(invitations.id, invitation.id));
  return { workspaceId: invitation.workspaceId, role: invitation.role as Role };
}

export async function getWorkspaceRole(
  db: Db,
  workspaceId: string,
  userId: string,
): Promise<Role | null> {
  const [membership] = await db
    .select()
    .from(workspaceMembers)
    .where(
      and(
        eq(workspaceMembers.workspaceId, workspaceId),
        eq(workspaceMembers.userId, userId),
      ),
    )
    .limit(1);
  return membership ? (membership.role as Role) : null;
}

export async function assertRole(
  db: Db,
  input: { workspaceId: string; userId: string; role: Role },
): Promise<Role> {
  const actual = await getWorkspaceRole(db, input.workspaceId, input.userId);
  if (!actual) throw new Error("No workspace access");
  if (!canRole(actual, input.role)) throw new Error(`Requires ${input.role} role`);
  return actual;
}

export async function getWorkspaceQuota(db: Db, workspaceId: string) {
  let [quota] = await db
    .select()
    .from(workspaceQuotas)
    .where(eq(workspaceQuotas.workspaceId, workspaceId))
    .limit(1);
  if (!quota) {
    [quota] = await db
      .insert(workspaceQuotas)
      .values({ workspaceId, monthlyLimit: 1000, creditsUsed: 0, resetAt: nextMonthReset() })
      .returning();
  }
  if (new Date(quota.resetAt).getTime() < Date.now()) {
    const resetAt = nextMonthReset();
    [quota] = await db
      .update(workspaceQuotas)
      .set({ creditsUsed: 0, resetAt, updatedAt: new Date() })
      .where(eq(workspaceQuotas.workspaceId, workspaceId))
      .returning();
  }
  return quota;
}

export async function setWorkspaceQuota(
  db: Db,
  workspaceId: string,
  monthlyLimit: number,
): Promise<void> {
  await getWorkspaceQuota(db, workspaceId);
  await db
    .update(workspaceQuotas)
    .set({ monthlyLimit, updatedAt: new Date() })
    .where(eq(workspaceQuotas.workspaceId, workspaceId));
}

export async function consumeCredits(
  db: Db,
  input: { workspaceId: string; amount: number },
): Promise<{ creditsUsed: number; monthlyLimit: number }> {
  const quota = await getWorkspaceQuota(db, input.workspaceId);
  const next = quota.creditsUsed + input.amount;
  if (next > quota.monthlyLimit) {
    throw new Error(`Quota exceeded: ${next}/${quota.monthlyLimit}`);
  }
  await db
    .update(workspaceQuotas)
    .set({ creditsUsed: next, updatedAt: new Date() })
    .where(eq(workspaceQuotas.workspaceId, input.workspaceId));
  return { creditsUsed: next, monthlyLimit: quota.monthlyLimit };
}

export async function getWorkspaceSettings(db: Db, workspaceId: string) {
  const [row] = await db
    .select()
    .from(workspaceSettings)
    .where(eq(workspaceSettings.workspaceId, workspaceId))
    .limit(1);
  return row?.settings ?? {};
}

export async function setWorkspaceSettings(
  db: Db,
  workspaceId: string,
  settings: Record<string, unknown>,
): Promise<void> {
  await db
    .insert(workspaceSettings)
    .values({ workspaceId, settings })
    .onConflictDoUpdate({
      target: workspaceSettings.workspaceId,
      set: { settings, updatedAt: new Date() },
    });
}
