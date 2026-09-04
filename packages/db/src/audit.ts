import { auditLog } from "./schema";
import type { Db } from "./client";

export type AuditInput = {
  actor?: string | null;
  action: string;
  entityType: string;
  entityId: string;
  metadata?: Record<string, unknown>;
};

export async function insertAuditLog(db: Db, input: AuditInput): Promise<string> {
  const [row] = await db
    .insert(auditLog)
    .values({
      actor: input.actor ?? null,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      metadata: input.metadata,
    })
    .returning({ id: auditLog.id });
  return row!.id;
}
