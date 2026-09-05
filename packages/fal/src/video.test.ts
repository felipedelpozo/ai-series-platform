import { describe, expect, it } from "bun:test";
import { FalVideoResultSchema } from "./index";

describe("fal video result", () => {
  it("validates a video result", () => {
    const parsed = FalVideoResultSchema.parse({
      video: { url: "https://x/video.mp4", content_type: "video/mp4" },
    });
    expect(parsed.video.url).toBe("https://x/video.mp4");
  });

  it("rejects a result without a video", () => {
    expect(() => FalVideoResultSchema.parse({})).toThrow();
  });
});
