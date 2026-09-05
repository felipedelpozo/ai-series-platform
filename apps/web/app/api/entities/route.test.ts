import { describe, expect, it } from "bun:test";
import { POST } from "./route";

describe("POST /api/entities", () => {
  it("rejects non-canonical entity types before persistence", async () => {
    const response = await POST(
      new Request("http://localhost/api/entities", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          seriesId: "series-1",
          type: "vehicle",
          name: "Van",
          data: {},
        }),
      }),
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toHaveProperty("error");
  });
});
