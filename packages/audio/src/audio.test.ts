import { afterEach, describe, expect, it } from "bun:test";
import { synthesizeSpeech } from "./audio";

const originalKey = process.env.OPENAI_API_KEY;

afterEach(() => {
  process.env.OPENAI_API_KEY = originalKey;
});

describe("audio tts adapter", () => {
  it("fails fast when OPENAI_API_KEY is missing", async () => {
    process.env.OPENAI_API_KEY = "";
    await expect(synthesizeSpeech({ text: "hello" })).rejects.toThrow("OPENAI_API_KEY is not set");
  });
});
