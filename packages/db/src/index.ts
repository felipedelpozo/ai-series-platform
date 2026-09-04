export { workspace, auditLog } from "./schema";
export {
  getDb,
  checkDb,
  ensureDefaultWorkspace,
  DatabaseConfigError,
} from "./client";
export type { Db, DbHealth } from "./client";
export { insertAuditLog } from "./audit";
export type { AuditInput } from "./audit";
