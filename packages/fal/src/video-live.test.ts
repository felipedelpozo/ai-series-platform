import { describe, expect, it } from "bun:test";
import { DEFAULT_VIDEO_MODEL_T2V, submitVideo, videoResult, videoStatus } from "./index";

const live = process.env.FAL_LIVE === "1" && Boolean(process.env.FAL_KEY);

describe.skipIf(!live)("fal video live smoke (opt-in)", () => {
  it("generates a real video end-to-end", async () => {
    const { requestId } = await submitVideo(DEFAULT_VIDEO_MODEL_T2V, {
      prompt: "a slow pan over a calm ocean at sunset",
    });
    expect(requestId).toBeTruthy();

    let status;
    for (let i = 0; i < 120; i++) {
      status = await videoStatus(DEFAULT_VIDEO_MODEL_T2V, requestId);
      if (status.status === "COMPLETED") break;
      await Bun.sleep(5000);
    }
    expect(status!.status).toBe("COMPLETED");

    const result = await videoResult(DEFAULT_VIDEO_MODEL_T2V, requestId);
    expect(result.video.url).toBeTruthy();
  }, 900000);
});
