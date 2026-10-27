/**
 * v0.2.8 regressions: the two-by-two screenshot gallery, the rebuilt blog
 * (nine guides with on-page navigation), crawlable app shells, the generated
 * sitemap, and statistics labels that match across every surface.
 * (`tests/blog-gallery-shells-v028.test.js`)
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";

const REPO = path.resolve("docs");
const SRC = path.resolve("src");

function readDocs(rel) {
  return fs.readFileSync(path.join(REPO, rel), "utf8");
}

function readSrc(rel) {
  return fs.readFileSync(path.join(SRC, rel), "utf8");
}

const BLOG_SLUGS = [
  "does-notebooklm-have-captions",
  "notebooklm-video-overview-subtitles",
  "free-speech-to-text-api-keys",
  "export-notebooklm-transcript-srt-vtt",
  "notebooklm-audio-overview-podcast-captions",
  "notebooklm-transcript-srt-vs-vtt-vs-markdown",
  "run-whisper-locally-notebooklm-captions",
  "speech-to-text-cost-notebooklm-free-tiers",
  "notebooklm-captions-accessibility-wcag",
];

test("Home page renders a two-by-two screenshot gallery", () => {
  const app = readSrc("web/App.jsx");

  assert.match(app, /GALLERY_SHOTS\s*=/, "the gallery data lives in App.jsx");
  assert.match(app, /className="shot-grid"/, "the gallery uses the shot-grid class");
  assert.match(
    app,
    /GALLERY_SHOTS\.map\(\(shot\) => \(/,
    "the grid is generated from one data list"
  );

  const galleryBlock = app.slice(
    app.indexOf("const GALLERY_SHOTS"),
    app.indexOf("function ", app.indexOf("const GALLERY_SHOTS"))
  );
  const shots = [...galleryBlock.matchAll(/src: "\/assets\/screenshots\/([^"]+)"/g)].map(
    (m) => m[1]
  );
  assert.equal(shots.length, 4, `exactly four shots in the grid, found ${shots.length}`);
  for (const shot of shots) {
    assert.ok(
      fs.existsSync(path.join(REPO, "assets/screenshots", `${shot}.webp`)),
      `${shot}.webp exists`
    );
    assert.ok(
      fs.existsSync(path.join(REPO, "assets/screenshots", `${shot}.png`)),
      `${shot}.png exists`
    );
  }

  const css = readDocs("styles.css");
  assert.match(css, /\.shot-grid\s*\{[^}]*grid-template-columns:\s*repeat\(2,/);
  assert.match(css, /@media \(max-width: 760px\)\s*\{\s*\.shot-grid/, {
    message: "the grid collapses to one column on small screens",
  });
  assert.match(css, /\.shot-cell img\s*\{[^}]*aspect-ratio:/);
});

test("ProductShot serves WebP first and keeps a PNG fallback", () => {
  const component = readSrc("web/ProductShot.jsx");
  assert.match(component, /<picture>/);
  assert.match(component, /type="image\/webp"/);
  assert.match(component, /loading=\{eager \? "eager" : "lazy"\}/);
  assert.match(component, /decoding="async"/);
});

test("Blog ships nine crawlable guides with on-page navigation", () => {
  const dirs = fs
    .readdirSync(path.join(REPO, "blog"), { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name);
  assert.equal(dirs.length, BLOG_SLUGS.length, "nine published guides");
  for (const slug of BLOG_SLUGS) {
    assert.ok(dirs.includes(slug), `${slug} is published`);
  }

  for (const slug of BLOG_SLUGS) {
    const html = readDocs(`blog/${slug}/index.html`);
    const label = `blog/${slug}`;

    assert.match(html, /<link rel="canonical" href="https:\/\/lm-subs\.vercel\.app\/blog\//, label);
    assert.match(html, /<meta name="robots" content="index, follow/, label);

    // Next or previous navigation, or both for the middle of the series
    assert.ok(
      /<link rel="(prev|next)"/.test(html),
      `${label} links to the previous or next guide`
    );
    assert.match(html, /class="post-nav"/, `${label} has visible prev or next cards`);
    assert.match(html, /class="post-toc"/, `${label} has an on-page index`);
    assert.match(html, /class="author-box"/, `${label} credits the author`);
    assert.match(html, /class="post-kicker"/, `${label} shows its category and read time`);

    const jsonLd = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
      .map((m) => JSON.parse(m[1]));
    const article = jsonLd.find((d) => d["@type"] === "BlogPosting");
    assert.ok(article, `${label} carries BlogPosting JSON-LD`);
    assert.ok(article.wordCount > 200, `${label} reports a word count`);
    assert.match(article.timeRequired, /^PT\d+M$/, `${label} reports a read time`);
    assert.ok(
      jsonLd.some((d) => d["@type"] === "BreadcrumbList"),
      `${label} carries breadcrumbs`
    );

    // House style: no em dashes or en dashes anywhere in the rendered page
    const text = html.replace(/<script[\s\S]*?<\/script>/g, "");
    assert.ok(!/[—–]/.test(text), `${label} avoids em and en dashes`);
  }
});

test("Newest guides use the richer block types and link back to the product", () => {
  const whisper = readDocs("blog/run-whisper-locally-notebooklm-captions/index.html");
  assert.match(whisper, /class="post-code"/, "the local setup guide shows a real command");
  assert.match(whisper, /class="post-note"/, "notes call out the mixed content caveat");

  const formats = readDocs("blog/notebooklm-transcript-srt-vs-vtt-vs-markdown/index.html");
  assert.match(formats, /class="post-steps"/, "format picks render as numbered steps");
  assert.match(formats, /class="data-table"/, "the comparison table is a real table");

  const costs = readDocs("blog/speech-to-text-cost-notebooklm-free-tiers/index.html");
  assert.match(costs, /Check the provider/, "pricing pages tell readers to verify limits");

  for (const slug of BLOG_SLUGS) {
    const html = readDocs(`blog/${slug}/index.html`);
    assert.match(html, /href="\/(guide|welcome)"/, `${slug} links to the product`);
  }
});

test("Blog index leads with one feature and grids the rest", () => {
  const index = readDocs("blog/index.html");
  assert.match(index, /class="blog-lead"/);
  assert.match(index, /class="blog-grid"/);

  const cards = [...index.matchAll(/class="blog-card" href="\/blog\/([^"]+)"/g)].map(
    (m) => m[1]
  );
  assert.equal(cards.length, BLOG_SLUGS.length - 1, "every guide but the lead is in the grid");

  const lead = /class="blog-lead" href="\/blog\/([^"]+)"/.exec(index);
  assert.ok(lead, "the index features one guide");
  assert.ok(!cards.includes(lead[1]), "the featured guide is not repeated in the grid");
  assert.match(index, /ItemList/, "the index carries ItemList JSON-LD");
});

test("App shells are crawlable without JavaScript", () => {
  const shells = [
    ["guide.html", "/guide"],
    ["welcome.html", "/welcome"],
    ["setup.html", "/setup"],
    ["stats.html", "/stats"],
    ["library.html", "/library"],
    ["about.html", "/about"],
  ];

  for (const [file, route] of shells) {
    const html = readDocs(file);
    const label = `docs/${file}`;

    assert.match(html, /<meta name="description" content=".{40,}"/, `${label} has a description`);
    assert.match(
      html,
      new RegExp(`<link rel="canonical" href="https://lm-subs\\.vercel\\.app${route.replace("/", "\\/")}"`),
      `${label} declares its canonical URL`
    );
    assert.match(html, /<meta property="og:title"/, `${label} has Open Graph tags`);
    assert.match(html, /<meta property="og:image:alt"/, `${label} describes its preview`);
    assert.match(html, /<meta name="twitter:card" content="summary_large_image"/, label);
    assert.match(html, /<script type="application\/ld\+json">/, `${label} carries structured data`);

    // Server-rendered copy lives inside #root so React replaces it on mount
    const root = html.slice(html.indexOf('<div id="root">'));
    const words = root
      .replace(/<script[\s\S]*?<\/script>/g, "")
      .replace(/<[^>]+>/g, " ")
      .split(/\s+/)
      .filter(Boolean);
    assert.ok(words.length > 150, `${label} prerenders real copy (${words.length} words)`);
    assert.ok(!/[—–]/.test(root), `${label} avoids em and en dashes`);
  }

  const guide = readDocs("guide.html");
  assert.match(guide, /"@type":\s*"HowTo"/, "the setup guide carries HowTo markup");
  assert.match(guide, /HowToStep/, "the HowTo markup lists real steps");
  assert.match(
    guide,
    /\/assets\/screenshots\/\d\d-[a-z-]+\.webp/,
    "the guide loads WebP screenshots"
  );
  assert.match(
    guide,
    /\/assets\/screenshots\/\d\d-[a-z-]+\.png/,
    "the guide keeps a PNG fallback"
  );
});

test("Sitemap lists every page and every guide", () => {
  const sitemap = readDocs("sitemap.xml");
  const locs = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);

  for (const route of [
    "https://lm-subs.vercel.app/",
    "https://lm-subs.vercel.app/guide",
    "https://lm-subs.vercel.app/welcome",
    "https://lm-subs.vercel.app/setup",
    "https://lm-subs.vercel.app/library",
    "https://lm-subs.vercel.app/stats",
    "https://lm-subs.vercel.app/about",
    "https://lm-subs.vercel.app/blog",
  ]) {
    assert.ok(locs.includes(route), `sitemap missing ${route}`);
  }
  for (const slug of BLOG_SLUGS) {
    assert.ok(
      locs.includes(`https://lm-subs.vercel.app/blog/${slug}`),
      `sitemap missing blog/${slug}`
    );
  }
  assert.equal(new Set(locs).size, locs.length, "no duplicate URLs");
  assert.equal((sitemap.match(/<lastmod>/g) || []).length, locs.length);

  const robots = readDocs("robots.txt");
  assert.match(robots, /Sitemap: https:\/\/lm-subs\.vercel\.app\/sitemap\.xml/);
  assert.match(robots, /Disallow: \/api\//);
});

test("Statistics labels are identical on the website, settings page and popup", () => {
  const statsView = readSrc("web/StatsView.jsx");
  const optionsHtml = fs.readFileSync(path.resolve("extension/options.html"), "utf8");
  const popupHtml = fs.readFileSync(path.resolve("extension/popup.html"), "utf8");

  const optionLabels = [...optionsHtml.matchAll(/class="stats-lbl">([^<]+)</g)].map(
    (m) => m[1].trim()
  );

  for (const label of [
    "Videos captioned",
    "Caption cues",
    "Video upload avoided",
    "Median speed",
    "Notebooks used",
    "Studio artifacts",
    "Time watched and listened",
    "Citations sent to chat",
  ]) {
    assert.ok(
      optionLabels.includes(label),
      `the settings page labels the "${label}" metric`
    );
  }

  for (const label of [
    "Videos captioned",
    "Caption cues",
    "Video upload avoided",
    "Median speed",
    "Notebooks used",
    "Studio artifacts",
    "Time watched and listened",
    "Citations sent to chat",
  ]) {
    assert.ok(
      statsView.includes(label),
      `the website uses the "${label}" wording from the extension`
    );
  }

  // The popup reads the same unified report, so it reports the same metrics
  for (const id of [
    "popup-stat-videos",
    "popup-stat-cues",
    "popup-stat-saved",
    "popup-stat-latency",
    "popup-stat-notebooks",
    "popup-stat-sources",
    "popup-stat-citations",
  ]) {
    assert.ok(popupHtml.includes(id), `the popup renders ${id}`);
  }

  const statsModel = readSrc("lib/stats-model.js");
  assert.match(statsModel, /export function buildUnifiedStatsReport/);
  for (const file of ["web/StatsView.jsx", "options/options.js", "popup/popup.js"]) {
    assert.match(
      readSrc(file),
      /buildUnifiedStatsReport/,
      `${file} reads the shared stats report`
    );
  }
});

test("llms.txt cites every guide for AI answer engines", () => {
  const llms = readDocs("llms.txt");
  for (const slug of BLOG_SLUGS) {
    assert.ok(
      llms.includes(`https://lm-subs.vercel.app/blog/${slug}`),
      `llms.txt is missing ${slug}`
    );
  }
  assert.match(llms, /Sarang \(@sarang-cmd\)/);
});
