import assert from "node:assert/strict";
import test from "node:test";
import {
  deriveGoogleMediaVariants,
  extractMediaToken,
  isBatchExecuteUrl,
  isNotebookLmHost,
  isTrustedGoogleMediaUrl,
  parseBatchExecuteRequest,
  parseBatchExecuteResponse,
} from "../src/lib/batchexecute.js";

const SAMPLE_TOKEN = "ANd9GcR7xNotebookLmVideoToken1234567890";
const SAMPLE_PROG_URL = `https://lh3.googleusercontent.com/notebooklm/${SAMPLE_TOKEN}=m22`;
const SAMPLE_DL_URL = `https://lh3.googleusercontent.com/notebooklm/${SAMPLE_TOKEN}=m22-dv`;

function wrapBatchResponse(rpcId, innerPayload) {
  const frame = [["wrb.fr", rpcId, JSON.stringify(innerPayload), null, null, null, "generic"]];
  const serialized = JSON.stringify(frame);
  return `)]}'\n\n${serialized.length}\n${serialized}\n`;
}

test("isNotebookLmHost recognizes personal and Workspace NotebookLM domains", () => {
  assert.equal(isNotebookLmHost("notebooklm.google.com"), true);
  assert.equal(isNotebookLmHost("notebook.google.com"), true);
  assert.equal(isNotebookLmHost("notebook.cloud.google.com"), true);
  assert.equal(isNotebookLmHost("evil-notebooklm.com"), false);
});

test("isBatchExecuteUrl matches LabsTailwindUi and CloudNotebookLmUi RPC paths", () => {
  assert.equal(
    isBatchExecuteUrl("https://notebooklm.google.com/_/LabsTailwindUi/data/batchexecute?rpcids=gArtLc"),
    true
  );
  assert.equal(
    isBatchExecuteUrl("https://notebook.google.com/_/CloudNotebookLmUi/data/batchexecute?rpcids=R7cb6c"),
    true
  );
  assert.equal(isBatchExecuteUrl("https://notebooklm.google.com/notebook/abc"), false);
});

test("isTrustedGoogleMediaUrl enforces strict HTTPS Google CDN allowlist (SSRF guard)", () => {
  assert.equal(isTrustedGoogleMediaUrl(SAMPLE_DL_URL), true);
  assert.equal(
    isTrustedGoogleMediaUrl("https://rr2---sn-4g5ednsd.googlevideo.com/videoplayback?id=123"),
    true
  );
  assert.equal(
    isTrustedGoogleMediaUrl("http://lh3.googleusercontent.com/notebooklm/abc=m22"),
    false
  );
  assert.equal(
    isTrustedGoogleMediaUrl("https://lh3.googleusercontent.com.attacker.tld/video.mp4"),
    false
  );
  assert.equal(
    isTrustedGoogleMediaUrl("https://attacker.tld/lh3.googleusercontent.com/video.mp4"),
    false
  );
});

test("extractMediaToken and deriveGoogleMediaVariants unify progressive and download URLs", () => {
  assert.equal(extractMediaToken(SAMPLE_PROG_URL), SAMPLE_TOKEN);
  assert.equal(extractMediaToken(SAMPLE_DL_URL), SAMPLE_TOKEN);

  const variants = deriveGoogleMediaVariants(SAMPLE_DL_URL);
  assert.deepEqual(variants, [
    `https://lh3.googleusercontent.com/notebooklm/${SAMPLE_TOKEN}=m140-dv`,
    `https://lh3.googleusercontent.com/notebooklm/${SAMPLE_TOKEN}=m18`,
    `https://lh3.googleusercontent.com/notebooklm/${SAMPLE_TOKEN}=m22-dv`,
  ]);
});

test("parseBatchExecuteRequest detects Video Overview CREATE_STUDIO (R7cb6c) and ignores Audio Overview", () => {
  const videoCreateParams = [
    [2],
    "nb-uuid-9876",
    [
      null,
      null,
      3, // VIDEO_OVERVIEW
      [[["src-1"]]],
      null,
      null,
      null,
      null,
      [null, null, [[["src-1"]], "en", "Focus on architecture"]],
    ],
  ];
  const body = new URLSearchParams({
    "f.req": JSON.stringify([[["R7cb6c", JSON.stringify(videoCreateParams), null, "generic"]]]),
  }).toString();

  const parsed = parseBatchExecuteRequest(body);
  assert.ok(parsed);
  assert.equal(parsed.isVideoCreate, true);
  assert.equal(parsed.notebookId, "nb-uuid-9876");
  assert.equal(parsed.language, "en");
  assert.equal(parsed.focusPrompt, "Focus on architecture");

  // Audio Overview (`typeCode === 1`) should NOT trigger video subtitle pipeline
  const audioCreateParams = [[2], "nb-uuid-9876", [null, null, 1, [[["src-1"]]]]];
  const audioBody = new URLSearchParams({
    "f.req": JSON.stringify([[["R7cb6c", JSON.stringify(audioCreateParams), null, "generic"]]]),
  }).toString();
  assert.equal(parseBatchExecuteRequest(audioBody), null);
});

test("parseBatchExecuteResponse extracts ready Video Overviews from gArtLc and supports rotated RPC IDs", () => {
  const readyVideoRow = [
    "33333333-aaaa-4bbb-8ccc-444444444444",
    "Distributed Consensus Explained",
    3, // VIDEO_OVERVIEW
    [[["src-1"]]],
    3, // READY
    null,
    null,
    null,
    [
      null,
      SAMPLE_PROG_URL,
      [[["src-1"]], "en", "Explain Raft"],
      SAMPLE_DL_URL,
      [
        [SAMPLE_PROG_URL, 1, "video/mp4"],
        [`https://lh3.googleusercontent.com/notebooklm/${SAMPLE_TOKEN}=mm,hls`, 2, "application/x-mpegURL"],
        [SAMPLE_DL_URL, 4, "video/mp4"],
      ],
      [184, 500000000],
    ],
  ];

  const audioRow = [
    "11111111-aaaa-4bbb-8ccc-222222222222",
    "Audio Deep Dive",
    1, // AUDIO_OVERVIEW
    [[["src-1"]]],
    3,
  ];

  const raw = wrapBatchResponse("gArtLc", [[audioRow, readyVideoRow]]);
  const artifacts = parseBatchExecuteResponse(raw);
  assert.equal(artifacts.length, 1);
  assert.equal(artifacts[0].artifactId, "33333333-aaaa-4bbb-8ccc-444444444444");
  assert.equal(artifacts[0].title, "Distributed Consensus Explained");
  assert.equal(artifacts[0].status, "ready");
  assert.equal(artifacts[0].language, "en");
  assert.equal(artifacts[0].mediaUrl, SAMPLE_DL_URL);
  assert.equal(artifacts[0].durationSeconds, 184.5);
  assert.equal(artifacts[0].origin, "poll");

  // Even if Google rotates `gArtLc` to an unknown 6-char RPC ID, structural parser still finds it
  const rotatedRaw = wrapBatchResponse("z9Qp1w", [[readyVideoRow]]);
  const rotatedArtifacts = parseBatchExecuteResponse(rotatedRaw);
  assert.equal(rotatedArtifacts.length, 1);
  assert.equal(rotatedArtifacts[0].origin, "structural");
});
