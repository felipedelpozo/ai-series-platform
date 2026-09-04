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
  {
    purpose: "character.reference",
    name: "Character Reference",
    template:
      'Create a structured character reference for "{{entity_name}}" in the series "{{series_name}}". Return JSON with: role, apparentAge, appearance, distinctiveTraits (array), wardrobe, personality, voice, state, visualRules (array).',
    variables: [
      { name: "entity_name", required: true },
      { name: "series_name", required: true },
    ],
  },
  {
    purpose: "location.reference",
    name: "Location Reference",
    template:
      'Create a structured location reference for "{{entity_name}}" in the series "{{series_name}}". Return JSON with: description, zones (array), lighting, era, restrictions (array), visualRules (array).',
    variables: [
      { name: "entity_name", required: true },
      { name: "series_name", required: true },
    ],
  },
  {
    purpose: "prop.reference",
    name: "Prop Reference",
    template:
      'Create a structured prop reference for "{{entity_name}}" in the series "{{series_name}}". Return JSON with: description, material, scale, state, owner, narrativeRelevance.',
    variables: [
      { name: "entity_name", required: true },
      { name: "series_name", required: true },
    ],
  },
  {
    purpose: "reference.sheet",
    name: "Reference Sheet",
    template:
      'Create a consistent visual reference sheet for the {{entity_type}} named "{{entity_name}}" in the series "{{series_name}}". Entity details: {{entity_data}}. Visual style: {{visual_style}}. Include these panels/views: {{panels}}.',
    variables: [
      { name: "entity_type", required: true },
      { name: "entity_name", required: true },
      { name: "entity_data", required: true },
      { name: "series_name", required: true },
      { name: "visual_style", required: false, default: "consistent with the series bible" },
      { name: "panels", required: false, default: "front, side, three-quarter" },
    ],
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
