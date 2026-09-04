export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { loadEnv } = await import("@ai-series/config");
    loadEnv();
  }
}
