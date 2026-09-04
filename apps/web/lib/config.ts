import { loadEnv, type AppEnvConfig } from "@ai-series/config";

let cached: AppEnvConfig | undefined;

export function getAppConfig(): AppEnvConfig {
  if (!cached) {
    cached = loadEnv();
  }
  return cached;
}
