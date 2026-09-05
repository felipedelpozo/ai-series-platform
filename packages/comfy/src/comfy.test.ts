import { describe, expect, it } from "bun:test";
import { createComfyAdapter } from "./comfy";

describe("comfy adapter", () => {
  it("returns null when COMFY_URL is not configured", () => {
    const prev = process.env.COMFY_URL;
    delete process.env.COMFY_URL;
    expect(createComfyAdapter()).toBeNull();
    process.env.COMFY_URL = prev;
  });
});
