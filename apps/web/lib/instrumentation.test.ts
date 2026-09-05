import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const webRoot = resolve(import.meta.dir, "..");
const instrumentationSource = readFileSync(resolve(webRoot, "instrumentation.ts"), "utf8");
const nodeInstrumentationSource = readFileSync(resolve(webRoot, "instrumentation.node.ts"), "utf8");

describe("Next.js instrumentation runtime boundary", () => {
  test("keeps the shared instrumentation entrypoint Edge-compatible", () => {
    expect(instrumentationSource).toContain('process.env.NEXT_RUNTIME === "nodejs"');
    expect(instrumentationSource).toContain('import("./instrumentation.node")');
    expect(instrumentationSource).not.toContain('from "node:');
    expect(instrumentationSource).not.toContain("process.cwd()");
    expect(instrumentationSource).not.toContain('from "dotenv"');
  });

  test("keeps startup validation and prompt seeding in the Node-only module", () => {
    expect(nodeInstrumentationSource).toContain('import("@ai-series/config")');
    expect(nodeInstrumentationSource).toContain("loadEnv()");
    expect(nodeInstrumentationSource).toContain("ensureDefaultWorkspace");
    expect(nodeInstrumentationSource).toContain("seedPrompts");
  });
});
