import { z } from "zod";

export type AppEnv = "development" | "test" | "production";

export type SubsystemStatus = {
  id: string;
  label: string;
  configured: boolean;
  status: "configured" | "not-configured";
};

export type AppEnvConfig = {
  appEnv: AppEnv;
  nodeEnv: AppEnv;
  webPort: number | undefined;
  workerPort: number;
  subsystems: SubsystemStatus[];
};

export type EnvInput = Record<string, string | undefined>;

const portSchema = z.coerce.number().int().min(1).max(65535);

const postgresUrlSchema = z
  .string()
  .min(1)
  .refine((value) => {
    try {
      const url = new URL(value);
      return url.protocol === "postgres:" || url.protocol === "postgresql:";
    } catch {
      return false;
    }
  }, "must be a valid postgres:// URL");

export const envSchema = z.object({
  APP_ENV: z.enum(["development", "test", "production"]).default("development"),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  WEB_PORT: portSchema.optional(),
  WORKER_PORT: portSchema.default(8787),
  DATABASE_URL: postgresUrlSchema.optional(),
  FAL_KEY: z.string().min(1).optional(),
});

export class EnvValidationError extends Error {
  readonly issues: string[];

  constructor(issues: string[]) {
    super(`Invalid environment configuration: ${issues.join("; ")}`);
    this.name = "EnvValidationError";
    this.issues = issues;
  }
}

function has(source: EnvInput, key: string): boolean {
  const value = source[key];
  return Boolean(value && value.trim() !== "");
}

function buildSubsystems(source: EnvInput): SubsystemStatus[] {
  const databaseConfigured = has(source, "DATABASE_URL");
  const generationConfigured = has(source, "FAL_KEY");
  return [
    { id: "web", label: "Web", configured: true, status: "configured" },
    { id: "worker", label: "Worker", configured: true, status: "configured" },
    {
      id: "database",
      label: "Database",
      configured: databaseConfigured,
      status: databaseConfigured ? "configured" : "not-configured",
    },
    {
      id: "generation",
      label: "Generation provider",
      configured: generationConfigured,
      status: generationConfigured ? "configured" : "not-configured",
    },
  ];
}

export function loadEnv(source: EnvInput = process.env): AppEnvConfig {
  const parsed = envSchema.safeParse(source);
  if (!parsed.success) {
    const issues = parsed.error.issues.map(
      (issue) => `${issue.path.join(".") || "config"}: ${issue.message}`,
    );
    throw new EnvValidationError(issues);
  }
  const env = parsed.data;
  return {
    appEnv: env.APP_ENV,
    nodeEnv: env.NODE_ENV,
    webPort: env.WEB_PORT,
    workerPort: env.WORKER_PORT,
    subsystems: buildSubsystems(source),
  };
}
