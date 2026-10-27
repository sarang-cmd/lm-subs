/**
 * LM Subs v0.2.6: native play-bar docking without flicker, dynamic caption
 * scaling, unified statistics across every surface, branded notification
 * sounds, per-provider API key walkthroughs, and AI answer engine SEO.
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import {
  buildUnifiedStatsReport,
  formatMegabytesValue,
  formatMinutesLabel,
} from "../src/lib/stats-model.js";
import {
  buildChimeWavBytes,
  getChimeWavDataUri,
  SOUND_PRESET_IDS,
  SOUND_PRESETS,
  playCompletionChimeSound,
} from "../src/lib/chime.js";
import { listProviderSpecs } from "../src/lib/providers/registry.js";
import {
  DEFAULT_SETTINGS,
  NOTIFICATION_SOUND_PRESETS,
  CAPTION_FONT_SIZES,
} from "../src/lib/storage.js";

/** Minimal DOM mock that is rich enough for the overlay controller. */
function makeNode(tag = "div") {
  const node = {
    tagName: String(tag).toUpperCase(),
    children: [],
    childNodes: [],
    style: {
      setProperty() {},
      removeProperty() {},
    },
    dataset: {},
    classList: { add() {}, remove() {}, toggle() {} },
    attributes: {},
    textContent: "",
    className: "",
    parentElement: null,
    append(...kids) {
      for (const k of kids) {
        if (!k) continue;
        k.parentElement = node;
        node.children.push(k);
        node.childNodes.push(k);
      }
    },
    appendChild(kid) {
      kid.parentElement = node;
      node.children.push(kid);
      node.childNodes.push(kid);
      return kid;
    },
    insertBefore(kid) {
      kid.parentElement = node;
      node.children.push(kid);
      return kid;
    },
    removeChild(kid) {
      node.children = node.children.filter((c) => c !== kid);
      return kid;
    },
    remove() {},
    addEventListener() {},
    removeEventListener() {},
    setAttribute(k, v) {
      node.attributes[k] = String(v);
    },
    getAttribute(k) {
      return Object.prototype.hasOwnProperty.call(node.attributes, k)
        ? node.attributes[k]
        : null;
    },
    hasAttribute(k) {
      return Object.prototype.hasOwnProperty.call(node.attributes, k);
    },
    querySelectorAll() {
      return [];
    },
    querySelector() {
      return null;
    },
    getBoundingClientRect() {
      return { x: 0, y: 0, top: 0, left: 0, right: 0, bottom: 0, width: 0, height: 0 };
    },
    get firstChild() {
      return node.children[0] || null;
    },
    attachShadow() {
      const shadow = makeNode("shadow-root");
      shadow.host = node;
      return shadow;
    },
    contains() {
      return false;
    },
    closest() {
      return null;
    },
  };
  return node;
}

const VIDEO_CUES = [
  { startSec: 0, endSec: 5, text: "Multi-head self-attention computes context in parallel." },
  { startSec: 5, endSec: 10, text: "Residual connections keep gradients stable as stacks grow." },
];

test("Caption controls dock inside NotebookLM's own play bar and never blink on cue changes", async () => {
  const { VideoSubtitleController, findNativeControlBar } = await import(
    "../src/content/player-overlay.js"
  );

  // 1. Control-bar detection prefers the compact bottom strip, not the whole player
  const video = makeNode("video");
  video.getBoundingClientRect = () => ({
    x: 0, y: 0, top: 0, left: 0, right: 800, bottom: 450, width: 800, height: 450,
  });

  const mkBtn = (label) => {
    const b = makeNode("button");
    b.setAttribute("aria-label", label);
    return b;
  };

  const wrapper = makeNode("div");
  wrapper.getBoundingClientRect = () => ({
    x: 0, y: 0, top: 0, left: 0, right: 800, bottom: 450, width: 800, height: 450,
  });
  const shell = makeNode("div");
  shell.getBoundingClientRect = () => ({
    x: 0, y: 0, top: 0, left: 0, right: 900, bottom: 600, width: 900, height: 600,
  });

  const controlBar = makeNode("div");
  controlBar.getBoundingClientRect = () => ({
    x: 0, y: 402, top: 402, left: 0, right: 800, bottom: 450, width: 800, height: 48,
  });
  controlBar.append(
    mkBtn("Play"),
    mkBtn("Mute"),
    mkBtn("Playback speed"),
    mkBtn("Fullscreen")
  );
  controlBar.querySelectorAll = () => controlBar.children;

  wrapper.append(video, controlBar);
  shell.append(wrapper);

  const detected = findNativeControlBar(video, {});
  assert.equal(
    detected,
    controlBar,
    "findNativeControlBar must pick the compact bottom control strip, not the video wrapper"
  );

  // 2. Docked controls are injected into that bar with accessible labels
  const doc = {
    createElement: (tag) => makeNode(tag),
    createElementNS: (_ns, tag) => makeNode(tag),
    createTextNode: (txt) => ({ nodeType: 3, textContent: txt }),
    getElementById: () => null,
    head: makeNode("head"),
    documentElement: makeNode("html"),
    body: makeNode("body"),
  };

  const controller = new VideoSubtitleController(video, {
    doc,
    initialPlayBarDockMode: "native",
    initialFineGrainedControls: false,
  });

  assert.equal(controller.host?.attributes?.["data-dock"], "native");
  assert.equal(controller.nativeControlBar, controlBar);
  assert.deepEqual(
    Object.keys(controller.dockButtons),
    ["cc", "options"],
    "Default (non-advanced) docking exposes exactly CC and Options in the play bar"
  );
  assert.equal(controller.dockButtons.cc.getAttribute("aria-label").includes("captions"), true);
  assert.equal(controller.dockButtons.cc.textContent, "CC");

  // 3. Visibility never depends on whether a caption is on screen
  video.currentTime = 0;
  controller.setCues(VIDEO_CUES, { title: "Transformer Overview" });
  assert.equal(controller.controlsVisible, true);

  controller.video.paused = true;
  video.currentTime = 3;
  controller._renderActiveCue();
  const visibleWithCue = controller.controlsVisible;
  video.currentTime = 999;
  controller._renderActiveCue();
  assert.equal(
    controller.controlsVisible,
    visibleWithCue,
    "Controls must not hide when no cue is active, which is what caused blinking"
  );
  assert.equal(controller.captionBox.dataset.visible, "false");

  // 4. Mirroring the native bar hides them together with NotebookLM's controls
  controller.video.paused = false;
  controller.pointerOverPlayer = false;
  controller.nativeControlsVisible = false;
  controller._updateControlsVisibility();
  assert.equal(controller.controlsVisible, false);

  controller.pointerOverPlayer = true;
  controller._updateControlsVisibility();
  assert.equal(controller.controlsVisible, true);

  // 5. Advanced mode adds the fine-grained playback buttons to the dock.
  //    Speed is deliberately absent: NotebookLM's own play bar already ships a
  //    playback speed control.
  controller.setSettings({ fineGrainedControls: true });
  assert.deepEqual(Object.keys(controller.dockButtons), [
    "cc",
    "options",
    "loop",
    "pip",
    "snapshot",
    "boost",
    "silence",
  ]);
  assert.ok(
    !Object.keys(controller.dockButtons).includes("speed"),
    "no duplicate speed control, NotebookLM already has one"
  );

  controller.destroy();
});

test("Captions scale dynamically with player height instead of using one fixed size", async () => {
  const { VideoSubtitleController } = await import("../src/content/player-overlay.js");

  const mkVideo = (height) => {
    const video = makeNode("video");
    video.paused = true;
    video.currentTime = 1;
    video.getBoundingClientRect = () => ({
      x: 0, y: 0, top: 0, left: 0, right: height * 1.777, bottom: height,
      width: height * 1.777, height,
    });
    return video;
  };

  const doc = {
    createElement: (tag) => makeNode(tag),
    createElementNS: (_ns, tag) => makeNode(tag),
    createTextNode: (txt) => ({ nodeType: 3, textContent: txt }),
    getElementById: () => null,
    head: makeNode("head"),
    documentElement: makeNode("html"),
    body: makeNode("body"),
  };

  const small = new VideoSubtitleController(mkVideo(360), {
    doc,
    initialPlayBarDockMode: "hover",
    initialFontSize: "medium",
  });
  const fullscreen = new VideoSubtitleController(mkVideo(1040), {
    doc,
    initialPlayBarDockMode: "hover",
    initialFontSize: "medium",
  });

  const smallPx = small._resolveCaptionFontSizePx();
  const bigPx = fullscreen._resolveCaptionFontSizePx();

  assert.ok(
    bigPx > smallPx,
    `Fullscreen captions (${bigPx}px) must be larger than compact player captions (${smallPx}px)`
  );
  assert.ok(smallPx >= small.captionMinFontPx);
  assert.ok(bigPx <= fullscreen.captionMaxFontPx);

  // Clamping and manual scaling stay inside the configured bounds
  small.setSettings({ captionScaleFactor: 200 });
  assert.ok(small._resolveCaptionFontSizePx() <= small.captionMaxFontPx);
  small.setSettings({ dynamicCaptionScaling: false, captionScaleFactor: 100 });
  assert.ok(small._resolveCaptionFontSizePx() >= small.captionMinFontPx);

  for (const size of CAPTION_FONT_SIZES) {
    small.setSettings({ fontSize: size, dynamicCaptionScaling: true });
    const px = small._resolveCaptionFontSizePx();
    assert.ok(px >= small.captionMinFontPx && px <= small.captionMaxFontPx, `${size} out of range`);
  }

  small.destroy();
  fullscreen.destroy();
});

test("Unified statistics report is identical for the website, settings page, and popup", () => {
  const cacheList = [
    {
      cacheKey: "vid-1",
      title: "Attention Is All You Need, explained",
      language: "en",
      provider: "groq",
      durationSeconds: 402,
      originalBytes: 54_525_952,
      extractedBytes: 3_565_568,
      latencyMs: 4180,
      failoverUsed: false,
      cues: VIDEO_CUES,
      updatedAt: new Date().toISOString().slice(0, 10),
    },
  ];

  const notebookLmStats = {
    notebooks: {
      nb_1: {
        notebookId: "nb_1",
        title: "Transformer seminar",
        sourceCount: 12,
        videoCount: 4,
        audioCount: 2,
        reportCount: 3,
        studioArtifactCount: 9,
        watchSeconds: 5820,
        listenSeconds: 1440,
        lastSeenAt: new Date().toISOString(),
      },
    },
    totals: {
      watchSeconds: 5820,
      listenSeconds: 1440,
      speedSavedSeconds: 600,
      bookmarksCount: 8,
      citationsCount: 14,
      loopsCount: 3,
      pipSessionsCount: 2,
      snapshotsCount: 1,
      exportsCount: 11,
    },
    dailyStudy: {},
  };

  const report = buildUnifiedStatsReport({ cacheList, notebookLmStats });

  assert.equal(report.totals.videosCaptioned, 1);
  assert.equal(report.totals.totalCues, 2);
  assert.ok(report.totals.bandwidthSavedBytes > 0);
  assert.equal(report.totals.medianLatencyMs, 4180);

  assert.equal(report.notebookLm.notebooksCount, 1);
  assert.equal(report.notebookLm.sourcesIndexed, 12);
  assert.equal(report.notebookLm.videoOverviewsCount, 4);
  assert.equal(report.notebookLm.audioOverviewsCount, 2);
  assert.equal(report.notebookLm.activeStudyMinutes, 121);
  assert.equal(report.notebookLm.citationsCount, 14);
  assert.equal(report.notebookLm.bookmarksCount, 8);

  assert.equal(report.dailySeries.length, 14);
  assert.equal(report.byProvider[0].provider, "groq");
  assert.equal(report.recentVideos[0].title, "Attention Is All You Need, explained");

  // Same inputs always produce the same numbers on every surface
  const repeat = buildUnifiedStatsReport({ cacheList, notebookLmStats });
  assert.deepEqual(report.totals, repeat.totals);
  assert.deepEqual(report.notebookLm.totals === undefined, true);

  // Formatting helpers shared by all three surfaces
  assert.equal(formatMegabytesValue(1048576), "1.0 MB");
  assert.equal(formatMegabytesValue(2 * 1073741824), "2.00 GB");
  assert.equal(formatMinutesLabel(60), "1 min");
  assert.equal(formatMinutesLabel(7260), "2h 1m");

  // Empty inputs degrade gracefully
  const empty = buildUnifiedStatsReport({});
  assert.equal(empty.totals.videosCaptioned, 0);
  assert.equal(empty.notebookLm.notebooksCount, 0);
  assert.equal(empty.dailySeries.length, 14);
});

test("Notifications play a branded chime preset instead of only the OS beep", async () => {
  assert.equal(SOUND_PRESETS.length, 6);
  assert.deepEqual([...SOUND_PRESET_IDS], [
    "chime",
    "marimba",
    "bell",
    "pulse",
    "soft-pop",
    "none",
  ]);
  for (const id of NOTIFICATION_SOUND_PRESETS) {
    assert.ok(SOUND_PRESET_IDS.includes(id));
  }
  assert.ok(DEFAULT_SETTINGS.soundAlerts === true, "Sound alerts default to on");
  assert.equal(DEFAULT_SETTINGS.notificationSoundPreset, "chime");

  for (const id of SOUND_PRESET_IDS.filter((p) => p !== "none")) {
    const wav = buildChimeWavBytes(44100, id);
    assert.equal(Buffer.from(wav.slice(0, 4)).toString("ascii"), "RIFF");
    assert.equal(Buffer.from(wav.slice(8, 12)).toString("ascii"), "WAVE");
    assert.ok(wav.byteLength > 20000, `${id} WAV must contain real PCM samples`);
    const uri = getChimeWavDataUri(id);
    assert.ok(uri.startsWith("data:audio/wav;base64,"));
  }

  // Silent preset never plays anything
  let plays = 0;
  const mockWin = {
    Audio: class {
      play() {
        plays += 1;
        return Promise.resolve();
      }
    },
  };
  await playCompletionChimeSound({ win: mockWin, preset: "none", force: true });
  assert.equal(plays, 0);

  await playCompletionChimeSound({ win: mockWin, preset: "bell", force: true });
  assert.equal(plays, 1);
});

test("Every provider ships a step by step account and API key walkthrough", () => {
  const specs = listProviderSpecs();
  assert.equal(specs.length, 12);
  for (const spec of specs) {
    assert.ok(
      Array.isArray(spec.setupSteps) && spec.setupSteps.length >= 5,
      `${spec.id} must include at least 5 numbered setup steps`
    );
    assert.ok(
      typeof spec.accountRequirements === "string" &&
        spec.accountRequirements.length > 20,
      `${spec.id} must state its account requirements`
    );
    assert.ok(
      typeof spec.keyFormatHint === "string" && spec.keyFormatHint.length > 5,
      `${spec.id} must describe the expected key format`
    );
    for (const step of spec.setupSteps) {
      assert.ok(
        !step.includes("—") && !step.includes("–"),
        `${spec.id} setup steps must not contain em or en dashes`
      );
    }
    assert.ok(spec.keyUrl.startsWith("https://") || spec.keyUrl.startsWith("http://"));
  }
});

test("SEO: robots.txt invites AI crawlers, sitemap and llms.txt cite LM Subs and its author", () => {
  const robots = fs.readFileSync(path.resolve("docs/robots.txt"), "utf8");
  for (const bot of [
    "Google-Extended",
    "GPTBot",
    "PerplexityBot",
    "ClaudeBot",
    "Applebot-Extended",
  ]) {
    const block = robots.split("User-agent:").find((b) => b.trim().startsWith(bot));
    assert.ok(block, `robots.txt must address ${bot}`);
    assert.match(block, /Allow: \//, `${bot} must be allowed to crawl`);
  }
  assert.match(robots, /Sitemap: https:\/\/lm-subs\.vercel\.app\/sitemap\.xml/);
  assert.match(robots, /Sarang/);

  const sitemap = fs.readFileSync(path.resolve("docs/sitemap.xml"), "utf8");
  for (const pathname of [
    "https://lm-subs.vercel.app/",
    "https://lm-subs.vercel.app/blog",
    "https://lm-subs.vercel.app/blog/does-notebooklm-have-captions",
    "https://lm-subs.vercel.app/blog/notebooklm-video-overview-subtitles",
    "https://lm-subs.vercel.app/blog/free-speech-to-text-api-keys",
    "https://lm-subs.vercel.app/blog/export-notebooklm-transcript-srt-vtt",
    "https://lm-subs.vercel.app/blog/notebooklm-audio-overview-podcast-captions",
  ]) {
    assert.ok(sitemap.includes(`<loc>${pathname}</loc>`), `sitemap missing ${pathname}`);
  }

  const llms = fs.readFileSync(path.resolve("docs/llms.txt"), "utf8");
  assert.match(llms, /# LM Subs/);
  assert.match(llms, /Sarang \(@sarang-cmd\)/);
  assert.match(llms, /https:\/\/github\.com\/sarang-cmd\/lm-subs/);
  assert.match(llms, /NotebookLM/);
});

test("SEO: static blog pages are crawlable, dash-free, and carry Article + FAQ JSON-LD", () => {
  const blogDir = path.resolve("docs/blog");
  assert.ok(fs.existsSync(path.join(blogDir, "index.html")), "blog index missing");

  const slugs = fs
    .readdirSync(blogDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);
  assert.ok(slugs.length >= 4, "at least four blog posts are required");

  for (const slug of slugs) {
    const file = path.join(blogDir, slug, "index.html");
    assert.ok(fs.existsSync(file), `${slug} index.html missing`);
    const html = fs.readFileSync(file, "utf8");
    assert.ok(
      !html.includes("—") && !html.includes("–"),
      `${slug} must not contain em or en dashes`
    );
    assert.ok(html.includes('<script type="application/ld+json">'), `${slug} missing JSON-LD`);
    assert.ok(html.includes('"@type":"BlogPosting"'), `${slug} missing Article schema`);
    assert.ok(html.includes('"@type":"FAQPage"'), `${slug} missing FAQ schema`);
    assert.ok(html.includes('"@type":"BreadcrumbList"'), `${slug} missing breadcrumbs`);
    assert.match(html, /<link rel="canonical" href="https:\/\/lm-subs\.vercel\.app\/blog\//);
    assert.match(html, /Sarang \(@sarang-cmd\)/);
    assert.ok(html.includes("<h1"), `${slug} missing an H1`);
    assert.ok(
      !/lucide/i.test(html) && !/\bInter\b|\bGeist\b/.test(html),
      `${slug} must not use banned fonts or icon sets`
    );
  }
});

test("Website home page ships SoftwareApplication + FAQPage structured data", () => {
  const html = fs.readFileSync(path.resolve("docs/index.html"), "utf8");
  assert.ok(html.includes('"@type": "SoftwareApplication"'));
  assert.ok(html.includes('"@type": "FAQPage"'));
  assert.ok(html.includes('"name": "Sarang"'));
  assert.ok(html.includes('"license": "https://opensource.org/licenses/MIT"'));
  assert.ok(html.includes('<link rel="canonical" href="https://lm-subs.vercel.app/" />'));
  assert.ok(html.includes('rel="alternate" type="text/plain" href="/llms.txt"'));
});

test("Screenshots are real Chromium captures and referenced with a fresh cache key", () => {
  const shotDir = path.resolve("docs/assets/screenshots");
  const files = fs.readdirSync(shotDir).filter((f) => f.endsWith(".png"));
  assert.ok(files.length >= 7, "at least seven real screenshots are required");

  for (const file of files) {
    const buf = fs.readFileSync(path.join(shotDir, file));
    assert.equal(
      Buffer.from(buf.slice(1, 4)).toString("ascii"),
      "PNG",
      `${file} must be a real PNG`
    );
    // IHDR width and height. Captures are downscaled for weight, so the rule
    // is "at least 600px on the short edge and 1200px on the long edge".
    const width = buf.readUInt32BE(16);
    const height = buf.readUInt32BE(20);
    assert.ok(width >= 600 && height >= 600, `${file} must be a full-size capture`);
    assert.ok(
      Math.max(width, height) >= 1200,
      `${file} must keep a high resolution long edge`
    );
    assert.ok(buf.byteLength > 40_000, `${file} looks like a placeholder render`);
  }

  // Every capture ships a WebP that is markedly lighter than the PNG fallback
  for (const file of files) {
    const webp = path.join(shotDir, file.replace(/\.png$/, ".webp"));
    assert.ok(
      fs.existsSync(webp),
      `${file} needs a WebP counterpart so pages stay light`
    );
    const pngBytes = fs.statSync(path.join(shotDir, file)).size;
    const webpBytes = fs.statSync(webp).size;
    assert.ok(
      webpBytes < pngBytes,
      `${file}: WebP (${webpBytes} B) must be smaller than PNG (${pngBytes} B)`
    );
  }

  const appJsx = fs.readFileSync(path.resolve("src/web/App.jsx"), "utf8");
  assert.ok(
    appJsx.includes("/assets/screenshots/01-player-subtitles"),
    "the home page shows the player capture"
  );
  assert.ok(appJsx.includes("ProductShot"), "screenshots render through ProductShot");
  const guideJsx = fs.readFileSync(path.resolve("src/web/GuideView.jsx"), "utf8");
  assert.ok(guideJsx.includes("/assets/screenshots/03-toolbar-popup"));
  assert.ok(guideJsx.includes("/assets/screenshots/06-api-key-guide"));
  assert.ok(
    guideJsx.includes("/assets/screenshots/09-welcome-install-page"),
    "the setup guide shows the page Chrome opens on install"
  );
  const shotComponent = fs.readFileSync(
    path.resolve("src/web/ProductShot.jsx"),
    "utf8"
  );
  assert.match(shotComponent, /\.webp\?v=\$\{SHOT_VERSION\}/);
  assert.match(shotComponent, /\.png\?v=\$\{SHOT_VERSION\}/);
});
