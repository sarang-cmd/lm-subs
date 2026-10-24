import assert from "node:assert/strict";
import test from "node:test";
import { shouldGenerateSubtitles } from "../src/lib/decide.js";

const BASE_ARGS = {
  settings: {
    enabled: true,
    autoOnGenerate: true,
    autoOnExistingVideos: true,
    excludePatterns: ["^draft\\b"],
  },
  trigger: "generate",
  typeCode: 3,
  status: "ready",
  title: " transformer architecture overview ",
  artifactId: "art-123",
  mediaUrl: "https://lh3.googleusercontent.com/notebooklm/tok1234567890123456=m22-dv",
};

test("shouldGenerateSubtitles allows eligible ready Video Overview", () => {
  const res = shouldGenerateSubtitles(BASE_ARGS);
  assert.equal(res.allow, true);
  assert.equal(res.cacheKey, "artifact:art-123");
});

test("shouldGenerateSubtitles blocks disabled extension, non-videos, and processing artifacts", () => {
  assert.equal(
    shouldGenerateSubtitles({
      ...BASE_ARGS,
      settings: { ...BASE_ARGS.settings, enabled: false },
    }).reason,
    "extension_disabled"
  );

  assert.equal(
    shouldGenerateSubtitles({ ...BASE_ARGS, typeCode: 1 }).reason,
    "not_video_overview"
  );

  assert.equal(
    shouldGenerateSubtitles({ ...BASE_ARGS, status: "processing" }).reason,
    "artifact_processing"
  );
});

test("shouldGenerateSubtitles deduplicates in-flight, cached, exhausted, and excluded titles", () => {
  assert.equal(
    shouldGenerateSubtitles({
      ...BASE_ARGS,
      inFlightKeys: new Set(["artifact:art-123"]),
    }).reason,
    "already_in_flight"
  );

  assert.equal(
    shouldGenerateSubtitles({
      ...BASE_ARGS,
      cachedKeys: new Set(["artifact:art-123"]),
    }).reason,
    "already_cached"
  );

  assert.equal(
    shouldGenerateSubtitles({
      ...BASE_ARGS,
      exhaustedKeys: new Set(["artifact:art-123"]),
    }).reason,
    "retries_exhausted"
  );

  assert.equal(
    shouldGenerateSubtitles({
      ...BASE_ARGS,
      title: "Draft Video Test",
    }).reason,
    "excluded_by_pattern"
  );

  // Manual force overrides cached, exhausted, and excludePatterns
  const manualForced = shouldGenerateSubtitles({
    ...BASE_ARGS,
    trigger: "manual",
    force: true,
    title: "Draft Video Test",
    cachedKeys: new Set(["artifact:art-123"]),
    exhaustedKeys: new Set(["artifact:art-123"]),
  });
  assert.equal(manualForced.allow, true);
});
