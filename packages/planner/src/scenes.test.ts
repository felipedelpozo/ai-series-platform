import { describe, expect, it } from "bun:test";
import { ShotSchema } from "./scenes";

describe("shot schema", () => {
  it("validates a complete shot", () => {
    const shot = ShotSchema.parse({
      type: "close-up",
      subject: "Rin",
      action: "turns",
      composition: "centered",
      camera: "static",
      lens: "50mm",
      lighting: "low key",
      emotion: "tense",
      requiredReferences: ["c1"],
      imagePrompt: "a close-up of Rin",
      videoPrompt: "Rin turns slowly",
      continuityConstraints: ["red coat"],
    });
    expect(shot.type).toBe("close-up");
  });

  it("rejects a shot missing required fields", () => {
    expect(() => ShotSchema.parse({ type: "x" })).toThrow();
  });
});
