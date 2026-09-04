import { eq } from "drizzle-orm";
import { promptTemplates, type Db } from "@ai-series/db";
import { createPromptTemplate } from "./registry";

const SEEDS = [
  {
    purpose: "test.image",
    name: "Test Image",
    template: "Generate a test image of {{subject}} in {{style}} style.",
    variables: [
      { name: "subject", required: true },
      { name: "style", required: false, default: "photorealistic" },
    ],
  },
  {
    purpose: "test.video",
    name: "Test Video",
    template: "Generate a short test video of {{subject}}.",
    variables: [{ name: "subject", required: true }],
  },
  {
    purpose: "series.bible",
    name: "Series Bible",
    template:
      'You are an experienced showrunner. Create a structured series bible for the series named "{{series_name}}". Return JSON with: title, premise, genre, tone, audience, format, language, episodeDuration, narrativeRules (array of strings), visualStyle, canon (array of non-contradictory facts), prohibitions (array of creative limits), description.',
    variables: [{ name: "series_name", required: true }],
  },
];

export async function seedPrompts(db: Db): Promise<void> {
  for (const seed of SEEDS) {
    const existing = await db
      .select({ id: promptTemplates.id })
      .from(promptTemplates)
      .where(eq(promptTemplates.purpose, seed.purpose))
      .limit(1);
    if (existing.length === 0) {
      await createPromptTemplate(db, seed);
    }
  }
}
