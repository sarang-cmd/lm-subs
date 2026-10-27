/**
 * Static shell builder (`scripts/build-shells.mjs`).
 *
 * The app pages under `docs/` are React islands: without JavaScript a crawler
 * only ever saw `<div id="root"></div>`, which is why the shell pages were
 * thin to search engines. This script writes each shell with a full head
 * (description, canonical, Open Graph, robots) and a server-rendered copy of
 * the page's real content inside `#root`. React replaces that markup when it
 * mounts, so visitors see the app and crawlers read plain HTML.
 *
 * Copy follows the house rules: sentence case, active voice, no em dashes.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");
const DOCS_DIR = path.join(REPO_ROOT, "docs");

const SITE = "https://lm-subs.vercel.app";
const AUTHOR_NAME = "Sarang";
const AUTHOR_HANDLE = "@sarang-cmd";
const AUTHOR_URL = "https://github.com/sarang-cmd";
const VERSION = "0.2.8";
const BANNER = `${SITE}/assets/banner-social-1280x640.png?v=8`;

function nav(current) {
  const links = [
    ["/", "Overview"],
    ["/guide", "Setup guide"],
    ["/blog", "Blog"],
    ["/library", "Library"],
    ["/stats", "Statistics"],
    ["/about", "About"],
  ];
  return `      <nav class="nav-links" aria-label="Primary">
${links
  .map(
    ([href, label]) =>
      `        <a class="nav-tab"${
        href === current ? ' aria-current="page"' : ""
      } href="${href}">${label}</a>`
  )
  .join("\n")}
      </nav>`;
}

function header(current) {
  return `    <header class="site-header">
      <div class="site-header-inner">
        <a href="/" class="brand-link"><span class="brand-mark-text">LM Subs</span></a>
${nav(current)}
      </div>
    </header>`;
}

const FOOTER = `    <footer class="site-footer">
      <div class="site-footer-inner">
        <div>
          <strong>LM Subs</strong> (MIT License) by
          <a class="link" href="${AUTHOR_URL}" target="_blank" rel="noopener noreferrer">${AUTHOR_NAME} (${AUTHOR_HANDLE})</a>.
          Independent open-source tool, unaffiliated with Google LLC.
        </div>
        <div class="footer-links">
          <a href="/welcome">Interactive setup</a>
          <a href="/guide">Setup guide</a>
          <a href="/blog">Blog</a>
          <a href="/library">Cloud library</a>
          <a href="/stats">Statistics</a>
          <a href="/about">About</a>
          <a href="/privacy.html">Privacy policy</a>
          <a href="/terms.html">Terms of service</a>
          <a href="https://github.com/sarang-cmd/lm-subs" target="_blank" rel="noopener noreferrer">GitHub source</a>
        </div>
      </div>
    </footer>`;

function page({
  file,
  route,
  title,
  description,
  heading,
  kicker,
  body,
  jsonLdTypes = ["WebPage"],
  current,
}) {
  const canonical = `${SITE}${route}`;
  const graph = [
    {
      "@type": "WebPage",
      "@id": canonical,
      url: canonical,
      name: title,
      description,
      isPartOf: { "@type": "WebSite", "@id": `${SITE}/`, url: `${SITE}/`, name: "LM Subs" },
      inLanguage: "en",
      about: { "@type": "SoftwareApplication", name: "LM Subs", url: `${SITE}/` },
      author: {
        "@type": "Person",
        name: `${AUTHOR_NAME} (${AUTHOR_HANDLE})`,
        url: AUTHOR_URL,
      },
    },
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "LM Subs", item: `${SITE}/` },
        { "@type": "ListItem", position: 2, name: heading, item: canonical },
      ],
    },
  ];
  if (jsonLdTypes.includes("HowTo")) {
    graph.push({
      "@context": "https://schema.org",
      "@type": "HowTo",
      name: "Install LM Subs and caption a NotebookLM Video Overview",
      description,
      totalTime: "PT3M",
      step: [
        {
          "@type": "HowToStep",
          position: 1,
          name: "Download and unzip the extension",
          text: "Save lm-subs-latest.zip from lm-subs.vercel.app and extract it into a folder in your Documents.",
        },
        {
          "@type": "HowToStep",
          position: 2,
          name: "Load it unpacked in Chrome",
          text: "Open chrome://extensions, enable Developer mode, click Load unpacked, and select the extracted folder.",
        },
        {
          "@type": "HowToStep",
          position: 3,
          name: "Save a free speech-to-text key",
          text: "Create a free Groq key at console.groq.com/keys and paste it into the LM Subs popup or setup page.",
        },
        {
          "@type": "HowToStep",
          position: 4,
          name: "Play a NotebookLM overview",
          text: "Open a Video Overview or Audio Overview and press play. Captions generate automatically, and CC sits in the play bar.",
        },
      ],
    });
  }

  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="google-site-verification" content="7qXtBUikHAi5IxiEi94jbzxAAUfIvy1K3-osMQS-E_M" />
    <meta name="theme-color" content="#f6f7f8" />
    <title>${title}</title>
    <meta name="description" content="${description}" />
    <meta name="author" content="${AUTHOR_NAME} (${AUTHOR_HANDLE})" />
    <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1" />
    <link rel="canonical" href="${canonical}" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg?v=5" />
    <link rel="icon" type="image/png" sizes="32x32" href="/favicon.png?v=5" />
    <link rel="shortcut icon" href="/favicon.ico?v=5" />
    <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png?v=5" />
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="LM Subs" />
    <meta property="og:title" content="${title}" />
    <meta property="og:description" content="${description}" />
    <meta property="og:url" content="${canonical}" />
    <meta property="og:image" content="${BANNER}" />
    <meta property="og:image:width" content="1280" />
    <meta property="og:image:height" content="640" />
    <meta property="og:image:alt" content="LM Subs: Captions for Google NotebookLM Video Overviews and Audio Overviews" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${title}" />
    <meta name="twitter:description" content="${description}" />
    <meta name="twitter:image" content="${BANNER}" />
    <meta name="twitter:image:alt" content="LM Subs: Captions for Google NotebookLM Video Overviews and Audio Overviews" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap"
      rel="stylesheet"
    />
    <link rel="sitemap" type="application/xml" href="/sitemap.xml" />
    <link rel="stylesheet" href="/styles.css?v=6" />
    <script type="application/ld+json">${JSON.stringify({
      "@context": "https://schema.org",
      "@graph": graph,
    })}</script>
  </head>
  <body>
    <a class="skip-link" href="#main-content">Skip to main content</a>

${header(current)}

    <div id="root">
      <main id="main-content" class="page-wrap">
        <section class="section-block">
${kicker ? `          <p class="post-kicker">${kicker}</p>\n` : ""}          <h1 class="section-heading">${heading}</h1>
${body}
        </section>
      </main>

${FOOTER}
    </div>

    <script type="module" src="/app.js?v=5"></script>
  </body>
</html>
`;

  fs.writeFileSync(path.join(DOCS_DIR, file), html, "utf8");
  return { file, bytes: Buffer.byteLength(html) };
}

/* -------------------------------------------------------------------------- */
/* Page content                                                               */
/* -------------------------------------------------------------------------- */

function shot(src, alt, width = 1280, height = 800) {
  return `          <figure class="product-figure"><picture><source srcset="${src}.webp?v=10" type="image/webp" /><img src="${src}.png?v=10" alt="${alt}" width="${width}" height="${height}" loading="lazy" decoding="async" /></picture></figure>`;
}

const results = [];

results.push(
  page({
    file: "guide.html",
    route: "/guide",
    current: "/guide",
    title: "Setup guide: install LM Subs and add captions to NotebookLM | LM Subs",
    description:
      "Install the LM Subs Chrome extension in about two minutes, save one free speech-to-text key, and get captions inside NotebookLM Video Overviews and Audio Overviews. No Chrome Web Store listing yet.",
    heading: "Install LM Subs in about two minutes",
    kicker: "Setup guide",
    jsonLdTypes: ["WebPage", "HowTo"],
    body: `          <p class="section-prose" style="font-size: 17px">
            LM Subs is not on the Chrome Web Store yet, so installation means loading it unpacked once. The steps below take about two minutes and you only do them a single time. Chrome keeps the extension loaded across restarts.
          </p>

          <h2 class="section-heading" style="font-size: 1.35rem; margin-top: 30px">1. Download and unzip</h2>
          <p class="section-prose">
            Download <code>lm-subs-v${VERSION}.zip</code> from the <a class="link" href="/">LM Subs home page</a>, then extract it into a folder you keep, for example Documents. Chrome reads the extension from that folder, so do not delete it afterwards.
          </p>

          <h2 class="section-heading" style="font-size: 1.35rem; margin-top: 30px">2. Load it in Chrome and pin it</h2>
          <ol class="prose-list">
            <li>Open <code>chrome://extensions</code> and turn on Developer mode in the top right.</li>
            <li>Click Load unpacked and choose the extracted folder.</li>
            <li>Open Chrome's puzzle menu and pin LM Subs so the icon stays in the toolbar.</li>
          </ol>
${shot(
  "/assets/screenshots/09-welcome-install-page",
  "The LM Subs page that opens automatically after install, showing the four step setup wizard",
  1280,
  900
)}
          <h2 class="section-heading" style="font-size: 1.35rem; margin-top: 30px">3. Save one free speech-to-text key</h2>
          <p class="section-prose">
            Create a free key at <a class="link" href="https://console.groq.com/keys" target="_blank" rel="noopener noreferrer">console.groq.com/keys</a>. No credit card is needed, and the free tier covers roughly eight hours of audio per day. Paste the <code>gsk_...</code> key into the LM Subs popup and click Save.
          </p>
${shot(
  "/assets/screenshots/03-toolbar-popup",
  "LM Subs Chrome toolbar popup showing where to paste and save a free Groq API key",
  625,
  1280
)}
          <h2 class="section-heading" style="font-size: 1.35rem; margin-top: 30px">4. Play anything in NotebookLM</h2>
          <p class="section-prose">
            Open a notebook and play a Video Overview or an Audio Overview. Captions generate in a few seconds, the CC toggle appears in NotebookLM's own bottom play bar, and you can export SRT, VTT, TXT, MD, CSV or JSON from the caption menu.
          </p>

          <div class="row" style="margin-top: 22px; flex-wrap: wrap; gap: 10px">
            <a class="btn btn-ink" href="/welcome">Run the interactive setup</a>
            <a class="btn" href="/blog/free-speech-to-text-api-keys">Compare the free API tiers</a>
          </div>`,
  })
);

results.push(
  page({
    file: "welcome.html",
    route: "/welcome",
    current: "/welcome",
    title: "LM Subs installed: finish the two minute setup | LM Subs",
    description:
      "The page Chrome opens after LM Subs installs. Pin the extension, save one free speech-to-text key, and turn on captions for NotebookLM Video Overviews and Audio Overviews.",
    heading: "LM Subs is installed. Two minutes left.",
    kicker: "Setup",
    body: `          <p class="section-prose" style="font-size: 17px">
            Chrome opens this page automatically when the extension installs. It checks that LM Subs is running, walks you through pinning the icon, and saves your first speech-to-text key without leaving the tab.
          </p>

          <h2 class="section-heading" style="font-size: 1.35rem; margin-top: 30px">What the setup checks</h2>
          <ul class="prose-list">
            <li>The extension is loaded and answering.</li>
            <li>LM Subs is pinned to the Chrome toolbar, so the popup is one click away.</li>
            <li>A provider key is saved and tested against a real transcription request.</li>
            <li>Captions are enabled for Video Overviews and for Audio Overview podcasts.</li>
          </ul>

          <h2 class="section-heading" style="font-size: 1.35rem; margin-top: 30px">Which key should you start with</h2>
          <p class="section-prose">
            Groq first. Its free plan needs no card and allows about eight hours of audio a day. Mistral is a good second key, and a local Whisper server on your own machine costs nothing at all. LM Subs walks the queue in order and falls over automatically when one provider rate limits you.
          </p>

          <div class="row" style="margin-top: 22px; flex-wrap: wrap; gap: 10px">
            <a class="btn btn-ink" href="/guide">Read the full setup guide</a>
            <a class="btn" href="/blog/run-whisper-locally-notebooklm-captions">Run it fully offline instead</a>
          </div>`,
  })
);

results.push(
  page({
    file: "setup.html",
    route: "/setup",
    current: "/setup",
    title: "Interactive setup wizard for LM Subs | LM Subs",
    description:
      "Two-way setup wizard that detects the LM Subs extension, verifies toolbar pinning, saves a free speech-to-text key, and turns on captions for Google NotebookLM.",
    heading: "Interactive setup wizard",
    kicker: "Setup",
    body: `          <p class="section-prose" style="font-size: 17px">
            The wizard talks to the extension directly. It confirms LM Subs is installed, detects whether the icon is pinned, and tests your key with a short request so you know captions will work before you open NotebookLM.
          </p>

          <h2 class="section-heading" style="font-size: 1.35rem; margin-top: 30px">Three checks, in order</h2>
          <ol class="prose-list">
            <li>Extension detected: the page pings the extension and reports the installed version.</li>
            <li>Toolbar pinned: if the icon is hidden in Chrome's puzzle menu, the page shows exactly where to find it.</li>
            <li>Key saved and tested: paste a Groq, Mistral, or local Whisper URL and run a real test transcription.</li>
          </ol>

          <h2 class="section-heading" style="font-size: 1.35rem; margin-top: 30px">If the extension is not detected</h2>
          <p class="section-prose">
            Most detection failures come from loading the wrong folder. Chrome wants the folder that holds manifest.json directly, not a parent folder that contains it. Reload the extension from <code>chrome://extensions</code> after unzipping, then refresh this page.
          </p>

          <h2 class="section-heading" style="font-size: 1.35rem; margin-top: 30px">After setup</h2>
          <p class="section-prose">
            Open Google NotebookLM, play a Video Overview, and press CC in the play bar. Captions generate in a few seconds, the transcript drawer opens with T, and you can export SRT, VTT, TXT, MD, CSV or JSON from the caption menu. Audio Overview podcasts caption the same way and keep both host labels.
          </p>

          <p class="section-prose">
            If you would rather read than click, the <a class="link" href="/guide">setup guide</a> covers the same steps with screenshots, and the <a class="link" href="/blog/notebooklm-video-overview-subtitles">Video Overview walkthrough</a> goes deeper on the caption controls.
          </p>`,
  })
);

results.push(
  page({
    file: "stats.html",
    route: "/stats",
    current: "/stats",
    title: "Statistics and metrics for NotebookLM captions | LM Subs",
    description:
      "Caption volume, spoken audio indexed, upload bytes avoided, median caption speed, provider share, and NotebookLM workspace metrics, reported identically on the website, settings page, and toolbar popup.",
    heading: "Statistics and metrics",
    kicker: "Telemetry",
    body: `          <p class="section-prose" style="font-size: 17px">
            LM Subs reports the same numbers on the website, in the extension settings page, and in the toolbar popup, because all three read one shared report. Nothing is sent anywhere unless you sign in and turn sync on.
          </p>

          <h2 class="section-heading" style="font-size: 1.35rem; margin-top: 30px">Captioning metrics</h2>
          <ul class="prose-list">
            <li><strong>Videos captioned</strong>, with the minutes of spoken audio indexed.</li>
            <li><strong>Caption cues</strong> generated, plus cross-device cache hits.</li>
            <li><strong>Video upload avoided</strong>, measured by comparing the extracted audio stream against the original video size.</li>
            <li><strong>Median speed</strong> per caption request, with rate-limit failovers and export counts.</li>
          </ul>

          <h2 class="section-heading" style="font-size: 1.35rem; margin-top: 30px">NotebookLM workspace metrics</h2>
          <ul class="prose-list">
            <li>Notebooks used and sources indexed.</li>
            <li>Time watched and listened, including time saved by playback speed.</li>
            <li>Studio artifacts, split into Video Overviews and Audio Overviews.</li>
            <li>Citations sent to chat and bookmarked moments.</li>
          </ul>

          <h2 class="section-heading" style="font-size: 1.35rem; margin-top: 30px">Sample data is labeled</h2>
          <p class="section-prose">
            The statistics page can show an illustrative sample dataset so you can inspect the layout before you have generated anything. The toggle is off by default and the page says clearly when the numbers are sample data.
          </p>

          <div class="row" style="margin-top: 22px; flex-wrap: wrap; gap: 10px">
            <a class="btn btn-ink" href="/library">Open the cloud library</a>
            <a class="btn" href="/blog/does-notebooklm-have-captions">Why these numbers exist</a>
          </div>`,
  })
);

results.push(
  page({
    file: "library.html",
    route: "/library",
    current: "/library",
    title: "Cloud library and sync for LM Subs transcripts | LM Subs",
    description:
      "Sign in with Google, GitHub, or email and choose exactly what syncs: encrypted API keys, transcripts, captions, and preferences, hosted by the project author on Neon Postgres.",
    heading: "Cloud library and sync",
    kicker: "Optional account",
    body: `          <p class="section-prose" style="font-size: 17px">
            LM Subs works fully offline in local mode. Signing in is optional and gives you a transcript library that follows you between machines. There is no database for you to deploy: the creator hosts the central Postgres database.
          </p>

          <h2 class="section-heading" style="font-size: 1.35rem; margin-top: 30px">Sign in with what you already have</h2>
          <ul class="prose-list">
            <li>Google sign-in</li>
            <li>GitHub sign-in</li>
            <li>A six digit email verification code</li>
          </ul>

          <h2 class="section-heading" style="font-size: 1.35rem; margin-top: 30px">You choose what syncs</h2>
          <ul class="prose-list">
            <li><strong>API keys</strong>, encrypted with AES-256-GCM per user before they reach the database.</li>
            <li><strong>Transcriptions and captions</strong>, so a caption you generated on a laptop is available on a desktop.</li>
            <li><strong>Preferences and statistics</strong>, including caption styling and provider order.</li>
          </ul>
          <p class="section-prose">
            Each category is a separate switch. Turning one off purges the cloud copy while local browser data stays untouched. Sync runs quietly in the background and never raises desktop notifications.
          </p>

          <div class="row" style="margin-top: 22px; flex-wrap: wrap; gap: 10px">
            <a class="btn btn-ink" href="/privacy.html">Read the privacy policy</a>
            <a class="btn" href="/stats">See the metrics</a>
          </div>`,
  })
);

results.push(
  page({
    file: "about.html",
    route: "/about",
    current: "/about",
    title: "About LM Subs and its creator | LM Subs",
    description:
      "LM Subs is a free, MIT licensed captioning extension for Google NotebookLM, built by Sarang (@sarang-cmd), a computer science student and agentic engineer based in Germany.",
    heading: "About LM Subs",
    kicker: "The project",
    body: `          <p class="section-prose" style="font-size: 17px">
            Google NotebookLM turns dense papers, lecture slides, and technical documentation into spoken Video Overviews, but the built-in player ships without closed captions, chapter navigation, or downloadable subtitle files. For anyone reviewing a lecture in a library, searching for one specific formula, or following technical vocabulary in a second language, missing captions turn a strong study tool into a black box.
          </p>

          <h2 class="section-heading" style="font-size: 1.35rem; margin-top: 30px">Who builds it</h2>
          <p class="section-prose">
            LM Subs is built by <strong>${AUTHOR_NAME}</strong> (<a class="link" href="${AUTHOR_URL}" target="_blank" rel="noopener noreferrer">${AUTHOR_HANDLE}</a>), a computer science student and agentic engineer based in Germany. The project is open source under the MIT license and is not affiliated with Google LLC.
          </p>

          <h2 class="section-heading" style="font-size: 1.35rem; margin-top: 30px">Design decisions worth knowing</h2>
          <ul class="prose-list">
            <li>Audio is extracted in the browser, so roughly 3 MB of audio is sent instead of a 50 MB video.</li>
            <li>You bring your own key, and the recommended providers have permanent free tiers.</li>
            <li>Caption controls dock inside NotebookLM's own play bar instead of floating above it.</li>
            <li>Cloud sync is opt-in per category, and every page says when numbers are sample data.</li>
          </ul>

          <div class="row" style="margin-top: 22px; flex-wrap: wrap; gap: 10px">
            <a class="btn btn-ink" href="https://github.com/sarang-cmd/lm-subs" target="_blank" rel="noopener noreferrer">Read the source on GitHub</a>
            <a class="btn" href="/blog">Read the guides</a>
          </div>`,
  })
);

for (const r of results) {
  console.log(`built docs/${r.file} (${(r.bytes / 1024).toFixed(1)} KB)`);
}

/**
 * Regenerates `docs/sitemap.xml` from the shells above plus every published
 * blog post, so the sitemap can never drift from the pages that exist.
 */
function writeSitemap() {
  const today = new Date().toISOString().slice(0, 10);
  const blogDir = path.join(DOCS_DIR, "blog");
  const posts = fs
    .readdirSync(blogDir, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => `/blog/${e.name}`)
    .sort();

  const entries = [
    { path: "/", changefreq: "weekly", priority: "1.0" },
    { path: "/welcome", changefreq: "monthly", priority: "0.9" },
    { path: "/guide", changefreq: "monthly", priority: "0.9" },
    { path: "/setup", changefreq: "monthly", priority: "0.8" },
    { path: "/blog", changefreq: "weekly", priority: "0.8" },
    { path: "/library", changefreq: "monthly", priority: "0.7" },
    { path: "/stats", changefreq: "monthly", priority: "0.7" },
    { path: "/about", changefreq: "monthly", priority: "0.6" },
    { path: "/privacy.html", changefreq: "yearly", priority: "0.3" },
    { path: "/terms.html", changefreq: "yearly", priority: "0.3" },
    ...posts.map((p) => ({
      path: p,
      changefreq: "monthly",
      priority: "0.8",
    })),
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries
  .map(
    (e) => `  <url>
    <loc>${SITE}${e.path}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${e.changefreq}</changefreq>
    <priority>${e.priority}</priority>
  </url>`
  )
  .join("\n")}
</urlset>
`;
  fs.writeFileSync(path.join(DOCS_DIR, "sitemap.xml"), xml, "utf8");
  console.log(
    `built docs/sitemap.xml (${entries.length} urls, ${(Buffer.byteLength(xml) / 1024).toFixed(1)} KB)`
  );
}

writeSitemap();
