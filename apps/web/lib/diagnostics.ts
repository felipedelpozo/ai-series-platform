export function isDiagnosticsEnabled(nodeEnv: string | undefined): boolean {
  return nodeEnv === "development";
}
