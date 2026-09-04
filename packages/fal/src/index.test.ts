import { afterEach, describe, expect, it } from "bun:test";
import { FalError, FalImageResultSchema, submitImage } from "./index";

const originalKey = process.env.FAL_KEY;

afterEach(() => {
  process.env.FAL_KEY = originalKey;
});

describe("fal adapter", () => {
  it("fails fast with FalError when FAL_KEY is missing", async () => {
    process.env.FAL_KEY = "";
    await expect(submitImage("fal-ai/nano-banana-2", { prompt: "test" })).rejects.toThrow(
      FalError,
    );
  });

  it("does not expose the key in errors", async () => {
    process.env.FAL_KEY = "";
    let caught: unknown;
    try {
      await submitImage("fal-ai/nano-banana-2", { prompt: "test" });
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(FalError);
    expect((caught as Error).message).not.toContain(originalKey ?? "unset");
  });

  it("validates image results", () => {
    expect(() => FalImageResultSchema.parse({ images: [] })).toThrow();
    const parsed = FalImageResultSchema.parse({ images: [{ url: "https://x/y.png" }] });
    expect(parsed.images[0]!.url).toBe("https://x/y.png");
  });
});
