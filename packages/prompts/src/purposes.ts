export const PURPOSES = [
  "test.image",
  "test.video",
  "series.bible",
  "character.reference",
  "location.reference",
  "prop.reference",
  "reference.sheet",
  "story.state",
  "episode.plan",
  "scene.plan",
  "shot.plan",
  "image.generate",
  "video.generate",
  "video.direct",
  "audience.classify",
  "audience.decide",
  "qa.narrative",
  "qa.visual",
  "qa.continuity",
  "repair.regenerate",
] as const;

export type Purpose = (typeof PURPOSES)[number];
