/**
 * LM Subs v0.2.7: the update alert explains what the new version does, and the
 * padding scale is tokenised so every page shares one rhythm.
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";

import { createRuntimeDispatcher } from "../src/background/service-worker.js";
import { RUNTIME_MESSAGE } from "../src/config/selectors.js";
import {
  RELEASE_NOTES,
  buildUpdateNotification,
  formatReleaseNotes,
  getReleaseNotes,
  renderReleaseNotes,
  resolveReleaseNotes,
} from "../src/lib/release-notes.js";

const REPO_ROOT = path.resolve(import.meta.dirname, "..");
const BANNED_FONTS = /\b(Inter|Geist|Space Grotesk|Lucide)\b/;

function createMemoryStorage() {
  const db = {};
  return {
    async get(keys) {
      if (typeof keys === "string") return { [keys]: db[keys] };
      if (Array.isArray(keys)) {
        const out = {};
        for (const k of keys) out[k] = db[k];
        return out;
      }
      return { ...db };
    },
    async set(items) {
      Object.assign(db, items);
    },
  };
}

function readRepoFile(relPath) {
  return fs.readFileSync(path.join(REPO_ROOT, relPath), "utf8");
}

test("Release notes: each shipped version has a headline and highlights", () => {
  assert.ok(Object.keys(RELEASE_NOTES).length >= 2);
  for (const [version, entry] of Object.entries(RELEASE_NOTES)) {
    assert.match(version, /^\d+\.\d+\.\d+$/, `${version} is a semver key`);
    assert.ok(
      entry.headline && entry.headline.length > 10,
      `${version} has a headline`
    );
    assert.ok(
      Array.isArray(entry.highlights) && entry.highlights.length >= 3,
      `${version} lists at least three changes`
    );
    for (const line of entry.highlights) {
      assert.ok(line.length > 20, `highlight is descriptive: ${line}`);
      assert.ok(
        !/[—–]/.test(line),
        `highlight avoids em/en dashes: ${line}`
      );
    }
  }
});

test("Release notes: local fallback resolves, remote notes win, unknown versions degrade", () => {
  const local = getReleaseNotes("0.2.7");
  assert.equal(local.version, "0.2.7");
  assert.equal(getReleaseNotes("9.9.9"), null);

  const remote = resolveReleaseNotes("0.2.7", {
    headline: "Remote headline",
    highlights: ["Remote change one", "Remote change two"],
  });
  assert.equal(remote.headline, "Remote headline");
  assert.deepEqual(remote.highlights, ["Remote change one", "Remote change two"]);

  const emptyRemote = resolveReleaseNotes("0.2.7", { highlights: [] });
  assert.equal(emptyRemote.headline, local.headline, "falls back to local copy");

  const unknown = resolveReleaseNotes("9.9.9", null);
  assert.equal(unknown, null);
});

test("Release notes: formatted output is one change per line", () => {
  const formatted = formatReleaseNotes("0.2.7");
  const lines = formatted.split("\n").filter(Boolean);
  assert.ok(lines.length >= 3);
  assert.equal(lines.length, RELEASE_NOTES["0.2.7"].highlights.length);

  assert.equal(formatReleaseNotes("9.9.9"), "");
  assert.equal(
    formatReleaseNotes("0.2.7", { maxItems: 1 }).split("\n").length,
    1
  );
});

test("Update notification: body names a change and items list them all", () => {
  const alert = buildUpdateNotification({ latestVersion: "0.2.7" });
  assert.equal(alert.title, "Update available: LM Subs v0.2.7");
  assert.ok(alert.body.length > 20, "body carries the first change");
  assert.match(alert.body, /more$/, "body hints at the remaining items");
  assert.ok(alert.items.length >= 3, "list items cover the changelog");
  for (const item of alert.items) {
    assert.equal(typeof item.title, "string");
    assert.ok(item.title.length > 20);
  }

  const bare = buildUpdateNotification({ latestVersion: "9.9.9" });
  assert.equal(bare.items.length, 0);
  assert.match(bare.body, /toolbar/i);
});

test("Release notes render into a DOM container without innerHTML", () => {
  const created = [];
  const container = {
    style: {},
    firstChild: null,
    removeChild() {},
    appendChild(node) {
      created.push(node);
    },
  };
  const doc = {
    createElement(tag) {
      return { tag, className: "", children: [], appendChild(node) { this.children.push(node); } };
    },
    createTextNode(text) {
      return { text };
    },
  };
  globalThis.document = doc;

  try {
    const rendered = renderReleaseNotes(container, null, { version: "0.2.7" });
    assert.equal(rendered, true);
    assert.equal(container.style.display, "block");
    assert.ok(created.some((node) => node.className === "update-notes-heading"));

    container.style.display = "";
    const skipped = renderReleaseNotes(container, null, { version: "9.9.9" });
    assert.equal(skipped, false);
    assert.equal(container.style.display, "none");
  } finally {
    delete globalThis.document;
  }
});

test("Update check: the alert and stored status carry the changelog", async () => {
  const storage = createMemoryStorage();
  const created = [];

  const latestJson = {
    version: "0.2.7",
    buildId: "abc123def456",
    zipUrl: "/releases/lm-subs-latest.zip",
    zipSha256: "deadbeef",
    fileCount: 14,
    notes: {
      version: "0.2.7",
      headline: "Podcasts finish, and updates explain themselves",
      highlights: [
        "Audio Overviews download across six parallel streams",
        "The update alert lists what changes",
        "Every page got roomier padding",
      ],
    },
  };

  const fetchImpl = async (url) => {
    const u = String(url);
    if (u.includes("/releases/latest.json")) {
      return new Response(JSON.stringify(latestJson), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }
    return new Response("{}", { status: 404 });
  };

  const runtimeDispatcher = createRuntimeDispatcher({
    storageArea: storage,
    fetchImpl,
    runtimeApi: {
      id: "abcdefghijklmnopabcdefghijklmnop",
      getManifest: () => ({ version: "0.2.6" }),
      lastError: null,
    },
    notificationsApi: {
      create(id, options, callback) {
        created.push({ id, options });
        if (callback) callback(id);
      },
    },
    permissionsApi: {
      contains(_perms, callback) {
        callback(true);
      },
    },
    dirHandleLoader: async () => null,
    heartbeatImpl: () => {},
  });

  const res = await new Promise((resolve) => {
    runtimeDispatcher(
      { type: RUNTIME_MESSAGE.CHECK_FOR_UPDATES },
      { tab: { id: 3 } },
      resolve
    );
  });

  assert.equal(res.ok, true);
  assert.equal(res.updateAvailable, true);
  assert.equal(res.status.latestVersion, "0.2.7");
  assert.deepEqual(res.status.latestNotes.highlights, latestJson.notes.highlights);

  assert.ok(created.length >= 1, "a desktop alert fired");
  const alert = created[0].options;
  assert.equal(alert.title, "Update available: LM Subs v0.2.7");
  assert.match(alert.message, /Audio Overviews download across six/);

  const listed = created.find((entry) => entry.options.type === "list");
  if (listed) {
    assert.equal(listed.options.items.length, 3);
    assert.equal(
      listed.options.items[0].title,
      "Audio Overviews download across six parallel streams"
    );
  } else {
    // Chrome ignores list alerts on some platforms, so the basic fallback must
    // still spell out every change.
    const basic = created.find((entry) => entry.options.type === "basic");
    assert.ok(basic, "a fallback basic alert fired");
    assert.match(basic.options.message, /roomier padding/);
  }
});

test("Padding scale: one token drives the website page gutters", () => {
  const css = readRepoFile("docs/styles.css");
  assert.match(css, /--pad-gutter:\s*24px;/, "gutter token defined");
  assert.match(css, /--pad-sheet:\s*26px;/, "sheet inset token defined");
  assert.match(
    css,
    /\.page-wrap\s*\{[^}]*padding:\s*0 var\(--pad-gutter\)/,
    "page wrapper uses the token"
  );
  assert.match(
    css,
    /\.site-header-inner\s*\{[^}]*padding:\s*0 var\(--pad-gutter\)/,
    "header uses the token"
  );
  assert.match(
    css,
    /\.site-footer-inner\s*\{[^}]*padding:\s*0 var\(--pad-gutter\)/,
    "footer uses the token"
  );
  assert.ok(
    !/\.page-wrap\s*\{[^}]*padding:\s*0 (24|16)px;/.test(css),
    "no hard-coded page gutters remain"
  );
  assert.match(css, /@media \(max-width: 760px\)[\s\S]*--pad-gutter:\s*18px;/);
  assert.match(css, /@media \(min-width: 1280px\)[\s\S]*--pad-gutter:\s*32px;/);
  assert.match(css, /@media \(max-width: 420px\)[\s\S]*--pad-gutter:\s*14px;/);
});

test("Padding scale: the extension popup and options page share the same tokens", () => {
  const css = readRepoFile("extension/ui.css");
  assert.match(css, /--pad-gutter:\s*24px;/);
  assert.match(css, /--pad-pop-y:\s*14px;/);
  assert.match(
    css,
    /\.container\s*\{[^}]*padding:\s*0 var\(--pad-gutter\)/,
    "options container uses the token"
  );
  assert.match(
    css,
    /\.ext-topbar-inner\s*\{[^}]*padding:\s*0 var\(--pad-gutter\)/,
    "options top bar uses the token"
  );
  assert.match(
    css,
    /\.popup-section\s*\{[^}]*padding:\s*var\(--pad-pop-y\) var\(--pad-pop-x\)/,
    "popup sections use the token"
  );
  assert.match(css, /@media \(max-width: 720px\)[\s\S]*--pad-gutter:\s*16px;/);
});

test("Padding scale: every shipped page renders inside a padded wrapper", () => {
  const pages = [
    // The React single page app mounts into #root and every view renders
    // inside `.page-wrap`, so assert both halves.
    { file: "docs/index.html", marker: 'id="root"' },
    { file: "src/web/App.jsx", marker: "page-wrap" },
    { file: "src/web/GuideView.jsx", marker: "page-wrap" },
    { file: "src/web/StatsView.jsx", marker: "page-wrap" },
    { file: "src/web/WelcomeView.jsx", marker: "page-wrap" },
    { file: "docs/blog/index.html", marker: "page-wrap" },
    {
      file: "docs/blog/does-notebooklm-have-captions/index.html",
      marker: "page-wrap",
    },
    { file: "extension/options.html", marker: "container" },
    { file: "extension/popup.html", marker: "popup-section" },
  ];

  for (const page of pages) {
    const html = readRepoFile(page.file);
    assert.ok(
      html.includes(page.marker),
      `${page.file} renders inside the padded ${page.marker} wrapper`
    );
    assert.ok(
      !/padding:\s*0(px)?;/.test(html),
      `${page.file} does not zero out its own padding inline`
    );
  }
});

function readPngSize(relPath) {
  const buf = fs.readFileSync(path.join(REPO_ROOT, relPath));
  assert.equal(
    buf.subarray(1, 4).toString("ascii"),
    "PNG",
    `${relPath} is a real PNG`
  );
  return {
    width: buf.readUInt32BE(16),
    height: buf.readUInt32BE(20),
    bytes: buf.byteLength,
  };
}

test("Social previews: real rendered cards at 1280x640 with alt text", () => {
  const cards = [
    "docs/assets/banner-social-1280x640.png",
    "docs/assets/banner-social-welcome-1280x640.png",
  ];
  for (const card of cards) {
    const size = readPngSize(card);
    // Published at the exact size declared in the og:image width and height
    // tags, so scrapers download what the markup promises.
    assert.equal(size.width, 1280, `${card} is 1280px wide`);
    assert.equal(size.height, 640, `${card} is 640px tall`);
    assert.ok(size.bytes > 60000, `${card} carries real image data`);
  }

  const index = readRepoFile("docs/index.html");
  assert.match(index, /og:image[^>]*banner-social-1280x640\.png\?v=8/);
  assert.match(index, /twitter:image[^>]*banner-social-1280x640\.png\?v=8/);
  assert.match(index, /og:image:alt/);
  assert.match(index, /twitter:image:alt/);

  const blogIndex = readRepoFile("docs/blog/index.html");
  assert.match(blogIndex, /og:image[^>]*banner-social-1280x640\.png\?v=8/);
  assert.match(blogIndex, /og:image:alt/);
});

test("Screenshots: every captured page render exists as a real PNG", () => {
  const shots = [
    "01-player-subtitles.png",
    "02-statistics-dashboard.png",
    "03-toolbar-popup.png",
    "04-settings-statistics.png",
    "05-fine-grained-controls.png",
    "06-api-key-guide.png",
    "07-blog-article.png",
    "08-docked-fine-controls.png",
    "09-welcome-install-page.png",
  ];
  for (const shot of shots) {
    const size = readPngSize(`docs/assets/screenshots/${shot}`);
    assert.ok(size.width >= 600, `${shot} is wide enough`);
    assert.ok(size.height >= 600, `${shot} is tall enough`);
    assert.ok(
      Math.max(size.width, size.height) >= 1200,
      `${shot} keeps a high resolution long edge`
    );
    assert.ok(size.bytes > 40000, `${shot} carries real pixels`);
    const webp = `docs/assets/screenshots/${shot.replace(/\.png$/, ".webp")}`;
    assert.ok(fs.existsSync(webp), `${shot} needs a WebP counterpart`);
  }
});

test("Padding scale: stylesheets stay inside the brand rules", () => {
  for (const file of ["docs/styles.css", "extension/ui.css"]) {
    const css = readRepoFile(file);
    const stripped = css.replace(/\/\*[\s\S]*?\*\//g, "");
    assert.ok(
      !BANNED_FONTS.test(stripped),
      `${file} avoids the banned font stacks`
    );
    // The ban is on a pure white canvas, not on white ink over the dark
    // theater player or white switch thumbs.
    for (const token of ["--bg-canvas", "--bg-sheet"]) {
      const match = new RegExp(`${token}:\\s*(#[0-9a-fA-F]{3,8})`).exec(stripped);
      assert.ok(match, `${file} defines ${token}`);
      assert.ok(
        !/^#(f{3}|f{6}|f{8})$/i.test(match[1]),
        `${file} ${token} is not pure white`
      );
    }
  }
});
