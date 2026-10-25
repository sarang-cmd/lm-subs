import assert from "node:assert/strict";
import test from "node:test";
import {
  cuesFromSegments,
  cuesFromWords,
  findActiveCue,
  formatJsonSubtitles,
  formatSrt,
  formatTxt,
  formatVtt,
  parseSrt,
  parseSubtitleText,
  parseVtt,
  serializeSubtitles,
  wrapSubtitleLines,
} from "../src/lib/subtitles.js";

test("parseSrt and parseVtt strip LLM <think> and markdown fences and round-trip cleanly", () => {
  const llmOutput = `<think>Generating accurate timestamps...</think>
\`\`\`srt
1
00:00:01,200 --> 00:00:04,500
Welcome to our NotebookLM Video Overview on quantum error correction.

2
00:00:04,600 --> 00:00:08,000
Let's examine how surface codes protect logical qubits.
\`\`\``;

  const cues = parseSrt(llmOutput);
  assert.equal(cues.length, 2);
  assert.equal(cues[0].startSec, 1.2);
  assert.equal(cues[0].endSec, 4.5);
  assert.ok(cues[0].text.includes("\n")); // Wrapped cleanly into 2 balanced lines

  const srt = formatSrt(cues);
  const vtt = formatVtt(cues);
  assert.ok(srt.includes("00:00:01,200 --> 00:00:04,500"));
  assert.ok(vtt.startsWith("WEBVTT\n\n"));
  assert.ok(vtt.includes("00:00:01.200 --> 00:00:04.500"));

  const reparsed = parseVtt(vtt);
  assert.equal(reparsed.length, 2);
});

test("cuesFromWords groups word timestamps on sentence boundaries and pauses", () => {
  const words = [
    { word: "NotebookLM", start: 0.2, end: 0.8 },
    { word: "synthesizes", start: 0.85, end: 1.4 },
    { word: "your", start: 1.45, end: 1.6 },
    { word: "research", start: 1.65, end: 2.1 },
    { word: "sources.", start: 2.15, end: 2.6 },
    // Natural pause of 0.55s after sentence end
    { word: "Now", start: 3.15, end: 3.4 },
    { word: "every", start: 3.45, end: 3.7 },
    { word: "video", start: 3.75, end: 4.1 },
    { word: "has", start: 4.15, end: 4.35 },
    { word: "subtitles.", start: 4.4, end: 5.0 },
  ];

  const cues = cuesFromWords(words);
  assert.equal(cues.length, 2);
  assert.equal(cues[0].text, "NotebookLM synthesizes\nyour research sources.");
  assert.equal(cues[1].text, "Now every video has subtitles.");
});

test("cuesFromSegments filters Whisper trailing silence hallucinations and splits long segments", () => {
  const segments = [
    {
      start: 0,
      end: 12,
      text: "This is a deliberately long Voxtral segment explaining how client-side ISO-BMFF remuxing strips the video stream before calling the speech-to-text endpoint.",
      no_speech_prob: 0.02,
    },
    {
      start: 12.5,
      end: 15.0,
      text: "Thank you for watching!",
      no_speech_prob: 0.94, // Classic Whisper silence hallucination
    },
  ];

  const cues = cuesFromSegments(segments);
  assert.ok(cues.length >= 2, "Expected overlong segment to be split into >=2 readable cues");
  assert.ok(
    !cues.some((c) => /thank you for watching/i.test(c.text)),
    "Expected Whisper high no_speech_prob hallucination to be filtered"
  );
});

test("findActiveCue performs accurate binary search and wrapSubtitleLines balances 2 lines", () => {
  const wrapped = wrapSubtitleLines(
    "Client-side audio extraction reduces upload bandwidth by ninety percent."
  );
  const lines = wrapped.split("\n");
  assert.equal(lines.length, 2);
  assert.ok(Math.abs(lines[0].length - lines[1].length) < 20);

  const cues = [
    { index: 1, startSec: 1.0, endSec: 3.0, text: "First" },
    { index: 2, startSec: 3.5, endSec: 6.0, text: "Second" },
    { index: 3, startSec: 6.0, endSec: 9.0, text: "Third" },
  ];
  assert.equal(findActiveCue(cues, 0.5), null);
  assert.equal(findActiveCue(cues, 2.2)?.text, "First");
  assert.equal(findActiveCue(cues, 3.2), null);
  assert.equal(findActiveCue(cues, 5.0)?.text, "Second");
  assert.equal(findActiveCue(cues, 7.5)?.text, "Third");
});

test("serializeSubtitles exports .srt, .vtt, .txt, and .json cleanly and parseSubtitleText imports .json", () => {
  const sample = [
    { startSec: 1.5, endSec: 4.2, text: "Leader election uses randomized\ntimeouts to prevent split votes." },
    { startSec: 65.0, endSec: 69.4, text: "Majority quorums guarantee safety.", speaker: "Host" },
  ];

  const srtOut = serializeSubtitles(sample, "srt", { title: "Raft Consensus 101" });
  assert.equal(srtOut.filename, "raft-consensus-101.srt");
  assert.ok(srtOut.content.includes("00:00:01,500 --> 00:00:04,200"));
  assert.ok(srtOut.content.includes("[Host] Majority quorums"));

  const vttOut = serializeSubtitles(sample, "vtt", { title: "Raft Consensus 101" });
  assert.equal(vttOut.filename, "raft-consensus-101.vtt");
  assert.ok(vttOut.content.startsWith("WEBVTT\n\n"));

  const txtOut = serializeSubtitles(sample, "txt", { title: "Raft Consensus 101" });
  assert.equal(txtOut.filename, "raft-consensus-101.txt");
  assert.ok(txtOut.content.startsWith("# Raft Consensus 101\n\n"));
  assert.ok(txtOut.content.includes("[00:02] Leader election uses randomized timeouts to prevent split votes."));
  assert.ok(txtOut.content.includes("[01:05] Host: Majority quorums guarantee safety."));

  const plainNoTs = formatTxt(sample, { includeTimestamps: false });
  assert.ok(!plainNoTs.includes("[00:02]"));

  const jsonOut = serializeSubtitles(sample, "json", {
    title: "Raft Consensus 101",
    provider: "groq",
  });
  assert.equal(jsonOut.filename, "raft-consensus-101.json");
  const parsedJsonCues = parseSubtitleText(jsonOut.content);
  assert.equal(parsedJsonCues.length, 2);
  assert.equal(parsedJsonCues[1].speaker, "Host");
  assert.ok(formatJsonSubtitles(sample, { title: "Check" }).includes('"schema": "lm-subs/v1"'));
});
