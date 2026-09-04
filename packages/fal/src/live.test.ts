import { describe, expect, it } from "bun:test";
import { DEFAULT_IMAGE_MODEL, imageResult, imageStatus, submitImage } from "./index";

const live = process.env.FAL_LIVE === "1" && Boolean(process.env.FAL_KEY);

describe.skipIf(!live)("fal live smoke (opt-in)", () => {
  it("generates a real image end-to-end", async () => {
    const { requestId } = await submitImage(DEFAULT_IMAGE_MODEL, {
      prompt: "a tiny red cube on a white background",
      image_size: "square",
    });
    expect(requestId).toBeTruthy();

    let status;
    for (let i = 0; i < 60; i++) {
      status = await imageStatus(DEFAULT_IMAGE_MODEL, requestId);
      if (status.status === "COMPLETED") break;
      await Bun.sleep(2000);
    }
    expect(status!.status).toBe("COMPLETED");

    const result = await imageResult(DEFAULT_IMAGE_MODEL, requestId);
    expect(result.images[0]!.url).toBeTruthy();
  }, 300000);
});
