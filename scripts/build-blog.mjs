/**
 * Static Blog Builder (`scripts/build-blog.mjs`).
 *
 * Emits fully server-rendered, crawlable HTML blog pages under `docs/blog/`
 * (including `docs/blog/index.html`) with Article / FAQPage JSON-LD, so search
 * engines and AI answer engines can read and cite LM Subs content directly.
 *
 * All copy follows the house style rules: sentence-case headings, active voice,
 * zero em dashes or en dashes, and zero invented metrics.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");
const BLOG_DIR = path.join(REPO_ROOT, "docs", "blog");

const SITE = "https://lm-subs.vercel.app";
const AUTHOR_NAME = "Sarang";
const AUTHOR_HANDLE = "@sarang-cmd";
const AUTHOR_URL = "https://github.com/sarang-cmd";

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderBlocks(blocks) {
  const out = [];
  for (const block of blocks) {
    if (block.t === "p") {
      out.push(`        <p class="section-prose">${block.html}</p>`);
    } else if (block.t === "h2") {
      out.push(
        `        <h2 class="section-heading" style="font-size: 1.35rem; margin-top: 30px">${block.text}</h2>`
      );
    } else if (block.t === "h3") {
      out.push(
        `        <h3 class="section-heading" style="font-size: 1.08rem; margin-top: 22px">${block.text}</h3>`
      );
    } else if (block.t === "ul") {
      out.push('        <ul class="prose-list">');
      for (const item of block.items) {
        out.push(`          <li>${item}</li>`);
      }
      out.push("        </ul>");
    } else if (block.t === "ol") {
      out.push('        <ol class="prose-list">');
      for (const item of block.items) {
        out.push(`          <li>${item}</li>`);
      }
      out.push("        </ol>");
    } else if (block.t === "table") {
      out.push('        <div class="data-table-wrap">');
      out.push('          <table class="data-table">');
      out.push("            <thead><tr>");
      for (const col of block.columns) {
        const num = col.num ? ' data-num="true"' : "";
        out.push(`              <th${num}>${col.label}</th>`);
      }
      out.push("            </tr></thead>");
      out.push("            <tbody>");
      for (const row of block.rows) {
        out.push("              <tr>");
        row.forEach((cell, idx) => {
          const num = block.columns[idx]?.num ? ' data-num="true"' : "";
          out.push(`                <td${num}>${cell}</td>`);
        });
        out.push("              </tr>");
      }
      out.push("            </tbody>");
      out.push("          </table>");
      out.push("        </div>");
    } else if (block.t === "cta") {
      out.push(
        `        <div class="row" style="margin-top: 22px; flex-wrap: wrap; gap: 10px"><a class="btn btn-ink" href="${block.href}">${block.label}</a><a class="btn" href="/guide">Read the setup guide</a></div>`
      );
    }
  }
  return out.join("\n");
}

function renderFaq(faqs) {
  if (!faqs || faqs.length === 0) return "";
  const items = faqs
    .map(
      (f) => `
        <div class="faq-item">
          <h3 class="faq-q">${f.q}</h3>
          <p class="section-prose">${f.a}</p>
        </div>`
    )
    .join("\n");
  return `
        <h2 class="section-heading" style="font-size: 1.35rem; margin-top: 34px">Frequently asked questions</h2>
${items}`;
}

function renderPostPage(post, allPosts) {
  const canonical = `${SITE}/blog/${post.slug}`;
  const related = allPosts.filter((p) => p.slug !== post.slug).slice(0, 3);

  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.description,
    url: canonical,
    mainEntityOfPage: { "@type": "WebPage", "@id": canonical },
    datePublished: post.date,
    dateModified: post.dateModified || post.date,
    image: `${SITE}/assets/banner-social-1280x640.png?v=7`,
    author: {
      "@type": "Person",
      name: `${AUTHOR_NAME} (${AUTHOR_HANDLE})`,
      url: AUTHOR_URL,
    },
    publisher: {
      "@type": "Organization",
      name: "LM Subs",
      url: SITE,
      logo: {
        "@type": "ImageObject",
        url: `${SITE}/assets/icon-512.png`,
      },
    },
    articleSection: "Google NotebookLM captions",
    inLanguage: "en",
    keywords: post.keywords.join(", "),
    isAccessibleForFree: true,
  };

  const faqJsonLd = post.faqs?.length
    ? {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: post.faqs.map((f) => ({
          "@type": "Question",
          name: f.q.replace(/<[^>]+>/g, ""),
          acceptedAnswer: {
            "@type": "Answer",
            text: f.a.replace(/<[^>]+>/g, ""),
          },
        })),
      }
    : null;

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "LM Subs", item: `${SITE}/` },
      { "@type": "ListItem", position: 2, name: "Blog", item: `${SITE}/blog` },
      { "@type": "ListItem", position: 3, name: post.title, item: canonical },
    ],
  };

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="theme-color" content="#f6f7f8" />
    <title>${escapeHtml(post.title)} | LM Subs</title>
    <meta name="description" content="${escapeHtml(post.description)}" />
    <meta name="author" content="${AUTHOR_NAME} (${AUTHOR_HANDLE})" />
    <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1" />
    <link rel="canonical" href="${canonical}" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg?v=5" />
    <link rel="icon" type="image/png" sizes="32x32" href="/favicon.png?v=5" />
    <link rel="shortcut icon" href="/favicon.ico?v=5" />
    <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png?v=5" />
    <meta property="og:type" content="article" />
    <meta property="og:title" content="${escapeHtml(post.title)}" />
    <meta property="og:description" content="${escapeHtml(post.description)}" />
    <meta property="og:url" content="${canonical}" />
    <meta property="og:image" content="${SITE}/assets/banner-social-1280x640.png?v=7" />
    <meta property="og:image:width" content="1280" />
    <meta property="og:image:height" content="640" />
    <meta property="og:image:alt" content="LM Subs: Captions for Google NotebookLM Video Overviews and Audio Overviews" />
    <meta property="article:author" content="${AUTHOR_URL}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeHtml(post.title)}" />
    <meta name="twitter:description" content="${escapeHtml(post.description)}" />
    <meta name="twitter:image" content="${SITE}/assets/banner-social-1280x640.png?v=7" />
    <meta name="twitter:image:alt" content="LM Subs: Captions for Google NotebookLM Video Overviews and Audio Overviews" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap"
      rel="stylesheet"
    />
    <link rel="stylesheet" href="/styles.css?v=6" />
    <script type="application/ld+json">${JSON.stringify(articleJsonLd)}</script>
    ${faqJsonLd ? `<script type="application/ld+json">${JSON.stringify(faqJsonLd)}</script>` : ""}
    <script type="application/ld+json">${JSON.stringify(breadcrumbJsonLd)}</script>
  </head>
  <body>
    <a class="skip-link" href="#main-content">Skip to main content</a>

    <header class="site-header">
      <div class="site-header-inner">
        <a href="/" class="brand-link">
          <span class="brand-mark-text">LM Subs</span>
        </a>
        <nav class="nav-links" aria-label="Primary">
          <a class="nav-tab" href="/">Overview</a>
          <a class="nav-tab" href="/guide">Setup guide</a>
          <a class="nav-tab" href="/blog" aria-current="page">Blog</a>
          <a class="nav-tab" href="/library">Library</a>
          <a class="nav-tab" href="/stats">Statistics</a>
          <a class="nav-tab" href="/about">About</a>
        </nav>
      </div>
    </header>

    <main id="main-content" class="page-wrap">
      <article class="section-block">
        <nav class="hint" aria-label="Breadcrumb" style="margin-bottom: 14px">
          <a class="link" href="/">LM Subs</a> / <a class="link" href="/blog">Blog</a> / ${escapeHtml(post.shortTitle || post.title)}
        </nav>

        <h1 class="section-heading">${escapeHtml(post.title)}</h1>
        <p class="hint" style="margin-top: 8px">
          By <a class="link" href="${AUTHOR_URL}" target="_blank" rel="noopener noreferrer">${AUTHOR_NAME} (${AUTHOR_HANDLE})</a>, creator of LM Subs. Published ${post.date}.
        </p>
        <p class="section-prose" style="font-size: 17px">${post.lede}</p>

${renderBlocks(post.blocks)}
${renderFaq(post.faqs)}

        <h2 class="section-heading" style="font-size: 1.35rem; margin-top: 34px">Related reading</h2>
        <ul class="prose-list">
${related
  .map(
    (r) =>
      `          <li><a class="link" href="/blog/${r.slug}">${escapeHtml(r.title)}</a></li>`
  )
  .join("\n")}
        </ul>
      </article>
    </main>

    <footer class="site-footer">
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
    </footer>
  </body>
</html>
`;
}

function renderIndex(posts) {
  const canonical = `${SITE}/blog`;
  const itemListJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: posts.map((p, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: `${SITE}/blog/${p.slug}`,
      name: p.title,
    })),
  };

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="theme-color" content="#f6f7f8" />
    <title>LM Subs blog | Google NotebookLM captions, subtitles, and transcript export</title>
    <meta
      name="description"
      content="Practical guides about captions, subtitles, and transcript export for Google NotebookLM Video Overviews and Audio Overview podcasts, written by the creator of LM Subs."
    />
    <meta name="author" content="${AUTHOR_NAME} (${AUTHOR_HANDLE})" />
    <link rel="canonical" href="${canonical}" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg?v=5" />
    <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png?v=5" />
    <meta property="og:type" content="website" />
    <meta property="og:title" content="LM Subs blog | Google NotebookLM captions and transcripts" />
    <meta property="og:url" content="${canonical}" />
    <meta property="og:image" content="${SITE}/assets/banner-social-1280x640.png?v=7" />
    <meta property="og:image:width" content="1280" />
    <meta property="og:image:height" content="640" />
    <meta property="og:image:alt" content="LM Subs: Captions for Google NotebookLM Video Overviews and Audio Overviews" />
    <meta name="twitter:card" content="summary_large_image" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap"
      rel="stylesheet"
    />
    <link rel="stylesheet" href="/styles.css?v=6" />
    <script type="application/ld+json">${JSON.stringify(itemListJsonLd)}</script>
  </head>
  <body>
    <a class="skip-link" href="#main-content">Skip to main content</a>

    <header class="site-header">
      <div class="site-header-inner">
        <a href="/" class="brand-link">
          <span class="brand-mark-text">LM Subs</span>
        </a>
        <nav class="nav-links" aria-label="Primary">
          <a class="nav-tab" href="/">Overview</a>
          <a class="nav-tab" href="/guide">Setup guide</a>
          <a class="nav-tab" href="/blog" aria-current="page">Blog</a>
          <a class="nav-tab" href="/library">Library</a>
          <a class="nav-tab" href="/stats">Statistics</a>
          <a class="nav-tab" href="/about">About</a>
        </nav>
      </div>
    </header>

    <main id="main-content" class="page-wrap">
      <section class="section-block">
        <h1 class="section-heading">LM Subs blog</h1>
        <p class="section-prose" style="font-size: 17px; max-width: 720px">
          Practical, tested guides about captions, subtitles, and transcript export for Google NotebookLM Video Overviews and Audio Overview podcasts. Written and maintained by ${AUTHOR_NAME} (${AUTHOR_HANDLE}), the creator of LM Subs.
        </p>

${posts
  .map(
    (p) => `        <div class="blog-card">
          <h2 class="section-heading" style="font-size: 1.25rem; margin-bottom: 6px">
            <a class="link" href="/blog/${p.slug}">${escapeHtml(p.title)}</a>
          </h2>
          <p class="hint" style="margin: 0 0 8px">Published ${p.date}</p>
          <p class="section-prose" style="margin-bottom: 0">${escapeHtml(p.description)}</p>
        </div>`
  )
  .join("\n\n")}
      </section>
    </main>

    <footer class="site-footer">
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
        </div>
      </div>
    </footer>
  </body>
</html>
`;
}

const POSTS = [
  {
    slug: "does-notebooklm-have-captions",
    title: "Does Google NotebookLM have captions or subtitles?",
    shortTitle: "Does NotebookLM have captions?",
    description:
      "Straight answer: NotebookLM Video Overviews and Audio Overviews ship without closed captions. Here is what the built-in player does and does not offer, and how to add real timed subtitles.",
    date: "2026-10-26",
    keywords: [
      "NotebookLM captions",
      "NotebookLM subtitles",
      "does NotebookLM have closed captions",
      "NotebookLM accessibility",
    ],
    lede:
      "Google NotebookLM can turn a stack of papers into a narrated Video Overview in a couple of minutes. The one thing it does not generate is captions. There is no CC button, no transcript panel tied to the timeline, and no subtitle file to download. This page explains exactly what you get, what you do not, and the three realistic ways to add captions.",
    blocks: [
      {
        t: "h2",
        text: "The short answer",
      },
      {
        t: "p",
        html:
          "No. As of October 2026, Google NotebookLM does not render closed captions or subtitles for Video Overviews, and it does not render them for Audio Overview podcasts either. You can read a written transcript of a source document in the Sources panel, but that transcript is not the narration script, is not time-aligned to the media, and cannot be exported as an .SRT or .VTT file.",
      },
      {
        t: "h2",
        text: "What NotebookLM actually gives you",
      },
      {
        t: "ul",
        items: [
          "A Video Overview player with play, pause, scrub, speed, fullscreen, and volume controls.",
          "An Audio Overview player for the two-host podcast format.",
          "Source transcripts and chat answers in the side panel, which are text views of your uploaded documents.",
          "No caption toggle, no caption styling, and no timed text track attached to the media element.",
        ],
      },
      {
        t: "h2",
        text: "Three ways to get captions on a Video Overview",
      },
      {
        t: "h3",
        text: "1. Operating system live captions",
      },
      {
        t: "p",
        html:
          "Windows 11, macOS, and ChromeOS all ship system-wide live captions that listen to whatever audio your machine plays. They work with zero setup and cost nothing. The trade-offs are real: accuracy drops sharply on technical vocabulary, there is no transcript you can search or export, the overlay sits outside the video frame, and captions cannot follow you to another device.",
      },
      {
        t: "h3",
        text: "2. Download the file and transcribe it by hand",
      },
      {
        t: "p",
        html:
          "You can save the Video Overview, run it through a transcription tool, and load the resulting subtitle file back into a local player. This produces accurate, exportable subtitles, but it costs several minutes per video, breaks the in-browser workflow, and means uploading a 50 MB MP4 when only a few megabytes of audio matter.",
      },
      {
        t: "h3",
        text: "3. A browser extension that captions the player in place",
      },
      {
        t: "p",
        html:
          "LM Subs takes this route. It finds the media stream behind the open Video Overview, extracts the audio-only track inside your browser, and sends about 3.4 MB of audio to a speech-to-text provider you control. Captions then render inside the video frame with a CC toggle docked in NotebookLM's own play bar, and you can export .SRT, .VTT, .TXT, .MD, .CSV, or .JSON at any point.",
      },
      {
        t: "cta",
        href: "/welcome",
        label: "Set up captions in two minutes",
      },
    ],
    faqs: [
      {
        q: "Does NotebookLM have closed captions built in?",
        a: "No. NotebookLM shows no CC button and attaches no timed text track to Video Overview or Audio Overview media. Source transcripts in the side panel are text views of your uploaded documents, not captions for the narration.",
      },
      {
        q: "Can I download a transcript from NotebookLM?",
        a: "You can copy text out of the sources and chat panels, but NotebookLM does not export a timed transcript for a Video Overview. Exporting synchronized captions requires generating them from the audio track.",
      },
      {
        q: "Are captions available in languages other than English?",
        a: "NotebookLM narrates in a limited set of languages, and caption availability depends on the speech-to-text provider you use. Most providers LM Subs supports, including Groq, Mistral, and Deepgram, cover 50 or more languages with automatic detection.",
      },
    ],
  },
  {
    slug: "notebooklm-video-overview-subtitles",
    title: "How to add subtitles to NotebookLM Video Overviews (step by step)",
    shortTitle: "Add subtitles to Video Overviews",
    description:
      "A complete walkthrough: install the extension, add one free speech-to-text key, play a Video Overview, and export timed captions as .SRT, .VTT, or Markdown notes.",
    date: "2026-10-26",
    keywords: [
      "NotebookLM Video Overview subtitles",
      "add captions to NotebookLM video",
      "NotebookLM SRT export",
      "caption NotebookLM",
    ],
    lede:
      "This is the full procedure for getting synchronized, exportable subtitles onto a Google NotebookLM Video Overview, including the exact clicks needed for a free API key and the settings that matter most once captions are live.",
    blocks: [
      {
        t: "h2",
        text: "What you need before you start",
      },
      {
        t: "ul",
        items: [
          "Google Chrome, Edge, Brave, or any Chromium browser that supports Manifest V3 extensions.",
          "A free Groq or Mistral API key. Both have permanent free tiers and neither asks for a credit card.",
          "About two minutes.",
        ],
      },
      {
        t: "h2",
        text: "Step 1: Install LM Subs",
      },
      {
        t: "p",
        html:
          "Download the release zip from the <a class=\"link\" href=\"/welcome\">interactive setup page</a>, unzip it into a permanent folder such as Documents, open <code>chrome://extensions</code>, turn on Developer mode, and click Load unpacked. Pin LM Subs from the Access requested section at the top of Chrome's puzzle menu so the toolbar icon stays visible.",
      },
      {
        t: "h2",
        text: "Step 2: Create a free Groq API key",
      },
      {
        t: "ol",
        items: [
          "Open <a class=\"link\" href=\"https://console.groq.com/keys\" target=\"_blank\" rel=\"noopener noreferrer\">console.groq.com/keys</a>.",
          "Log in with a Google account, GitHub account, or email address. No credit card is required.",
          "Click API Keys in the left navigation, then click Create API Key.",
          "Name the key LM Subs, click Submit, and copy the <code>gsk_...</code> value immediately. Groq shows it only once.",
        ],
      },
      {
        t: "h2",
        text: "Step 3: Paste the key into LM Subs",
      },
      {
        t: "p",
        html:
          "Click the LM Subs toolbar icon, open Providers and API keys, confirm Groq is the primary provider, paste the key, and click Save key. Then click Test. A successful test reports the provider name, model, and response latency.",
      },
      {
        t: "h2",
        text: "Step 4: Play a Video Overview",
      },
      {
        t: "p",
        html:
          "Open any notebook with a finished Video Overview and press play. LM Subs pulls the audio-only stream, transcribes it, and renders captions inside the video frame. The CC button appears inside NotebookLM's own bottom play bar and fades in and out together with the native controls, so it never blinks between sentences.",
      },
      {
        t: "h2",
        text: "Step 5: Export the transcript",
      },
      {
        t: "p",
        html:
          "Open the caption options from the play bar or the toolbar popup and export in whichever format you need. Every export uses the current timing offset and includes speaker labels when the provider detects them.",
      },
      {
        t: "table",
        columns: [
          { label: "Format" },
          { label: "Best for" },
          { label: "Keeps timestamps", num: false },
        ],
        rows: [
          [".SRT", "Video editors, YouTube, VLC", "Yes"],
          [".VTT", "Web players, HTML5 caption tracks", "Yes"],
          [".TXT", "Reading, printing, pasting into notes", "Optional"],
          [".MD", "Study notes and Obsidian vaults", "Yes"],
          [".CSV", "Spreadsheets and Anki decks", "Yes"],
          [".JSON", "Scripts and downstream tooling", "Yes"],
        ],
      },
      {
        t: "h2",
        text: "Settings worth changing on day one",
      },
      {
        t: "ul",
        items: [
          "Word highlight delay: if the highlight runs ahead of the narration, raise it toward +300 ms. If it lags, drag it negative.",
          "Timing offset: press the left and right bracket keys to shift every cue by 0.25 seconds if the whole track feels early or late.",
          "Caption size: captions scale automatically with player size, so set the base size once and let fullscreen handle itself.",
          "Fine-grained controls: turn this on in the settings page only if you want pixel-level typography and playback controls in the player.",
        ],
      },
      {
        t: "cta",
        href: "/welcome",
        label: "Start the interactive setup",
      },
    ],
    faqs: [
      {
        q: "How long does caption generation take?",
        a: "LM Subs uses a sub-five-second fast path on most Video Overviews by extracting NotebookLM's audio-only stream instead of the full MP4. Very long overviews are chunked and transcribed in parallel.",
      },
      {
        q: "Do I have to pay for a speech-to-text provider?",
        a: "No. Groq offers roughly eight hours of transcription per day on its permanent free tier and Mistral offers a free Studio tier. Neither requires a credit card. You can also point LM Subs at a local Whisper server and pay nothing at all.",
      },
      {
        q: "Does LM Subs upload my NotebookLM video anywhere?",
        a: "No video is uploaded. Audio extraction happens in your browser and only the compact audio track is sent to the provider whose key you entered. Captions stay in local browser storage unless you sign in and enable sync.",
      },
    ],
  },
  {
    slug: "free-speech-to-text-api-keys",
    title: "Free speech-to-text API keys that actually work for captioning in 2026",
    shortTitle: "Free speech-to-text API keys",
    description:
      "Twelve bring-your-own-key speech-to-text providers compared by free tier, timestamp quality, and setup friction, with the exact page to visit for each key.",
    date: "2026-10-26",
    keywords: [
      "free speech to text API",
      "free transcription API key",
      "Whisper API free tier",
      "Groq Whisper free",
    ],
    lede:
      "Captions are only as good as the transcription behind them. Here is the honest comparison of the twelve speech-to-text providers LM Subs supports, ordered by how far the free tier actually goes.",
    blocks: [
      {
        t: "h2",
        text: "Why bring your own key",
      },
      {
        t: "p",
        html:
          "A hosted captioning service has to charge for compute. If you supply your own key, you get the wholesale rate, which for most providers is free at student volumes. LM Subs never sees your key in plaintext outside your browser, and the key is encrypted with AES-256-GCM before it ever reaches a database.",
      },
      {
        t: "h2",
        text: "The providers, ranked by free tier",
      },
      {
        t: "table",
        columns: [
          { label: "Provider" },
          { label: "Free tier" },
          { label: "Card required" },
          { label: "Key page" },
        ],
        rows: [
          [
            "Groq",
            "About 8 hours per day",
            "No",
            '<a class="link" href="https://console.groq.com/keys" target="_blank" rel="noopener noreferrer">console.groq.com/keys</a>',
          ],
          [
            "Mistral (Voxtral)",
            "Free Studio tier",
            "No",
            '<a class="link" href="https://console.mistral.ai/api-keys" target="_blank" rel="noopener noreferrer">console.mistral.ai/api-keys</a>',
          ],
          [
            "Google Gemini",
            "Free daily tier",
            "No",
            '<a class="link" href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer">aistudio.google.com/apikey</a>',
          ],
          [
            "Deepgram",
            "$200 credit",
            "No",
            '<a class="link" href="https://console.deepgram.com/" target="_blank" rel="noopener noreferrer">console.deepgram.com</a>',
          ],
          [
            "AssemblyAI",
            "$50 credit",
            "No",
            '<a class="link" href="https://www.assemblyai.com/app/account" target="_blank" rel="noopener noreferrer">assemblyai.com/app/account</a>',
          ],
          [
            "Cloudflare Workers AI",
            "10k Neurons daily",
            "No",
            '<a class="link" href="https://dash.cloudflare.com/" target="_blank" rel="noopener noreferrer">dash.cloudflare.com</a>',
          ],
          [
            "Hugging Face",
            "Monthly inference credits",
            "No",
            '<a class="link" href="https://huggingface.co/settings/tokens" target="_blank" rel="noopener noreferrer">huggingface.co/settings/tokens</a>',
          ],
          [
            "ElevenLabs",
            "10k credits monthly",
            "No",
            '<a class="link" href="https://elevenlabs.io/app/settings/api-keys" target="_blank" rel="noopener noreferrer">elevenlabs.io/app/settings/api-keys</a>',
          ],
          [
            "Local Whisper server",
            "Unlimited",
            "No",
            '<a class="link" href="https://github.com/speaches-ai/speaches" target="_blank" rel="noopener noreferrer">speaches-ai/speaches</a>',
          ],
        ],
      },
      {
        t: "h2",
        text: "Which one should you pick",
      },
      {
        t: "ul",
        items: [
          "Start with Groq. The free tier is the most generous, the endpoint is fast, and word-level timestamps are reliable for karaoke-style highlighting.",
          "Add Mistral as the second entry in your queue. If Groq returns HTTP 429 during a busy hour, LM Subs fails over automatically and you never notice.",
          "Use Google Gemini if you want subtitles translated in a single pass instead of transcribing first and translating later.",
          "Run a local Whisper server if you handle confidential research material and want zero audio leaving your machine.",
        ],
      },
      {
        t: "h2",
        text: "Common key mistakes",
      },
      {
        t: "ul",
        items: [
          "Copying the key name instead of the key value. The value starts with a provider prefix such as gsk_ or sk-.",
          "Using a ChatGPT Plus subscription as if it were API credit. OpenAI API keys are billed separately from ChatGPT plans.",
          "Forgetting the colon in Cloudflare credentials. Cloudflare needs account_id:api_token, not just the token.",
          "Leaving a trailing space when pasting. LM Subs trims whitespace, but a pasted newline inside the key will still fail the test.",
        ],
      },
    ],
    faqs: [
      {
        q: "Is a free API key really enough for a semester of lectures?",
        a: "For most students, yes. Groq's free tier allows roughly eight hours of audio per day, which covers several Video Overviews daily. If you exceed it, LM Subs fails over to the next configured provider.",
      },
      {
        q: "What happens when a provider rate limits me?",
        a: "LM Subs catches the HTTP 429, moves to the next provider in your queue, and keeps the transcript. Failovers are counted in your statistics page so you can see how often it happens.",
      },
      {
        q: "Can I run everything offline?",
        a: "Yes. Point LM Subs at a local OpenAI-compatible server such as speaches or faster-whisper-server at http://localhost:8000/v1, leave the API key field empty, and nothing leaves your computer.",
      },
    ],
  },
  {
    slug: "export-notebooklm-transcript-srt-vtt",
    title: "Export a NotebookLM transcript as SRT, VTT, Markdown, or CSV",
    shortTitle: "Export NotebookLM transcripts",
    description:
      "Which subtitle format to use for video editors, web players, study notes, spreadsheets, and Anki decks, plus how timing offsets and speaker labels are preserved on export.",
    date: "2026-10-26",
    keywords: [
      "NotebookLM transcript export",
      "NotebookLM to SRT",
      "NotebookLM VTT",
      "NotebookLM transcript to Markdown",
    ],
    lede:
      "NotebookLM gives you a video and a chat panel. It does not give you a transcript file. Once captions exist, choosing the right export format turns a ten minute overview into study material you can search, edit, and reuse.",
    blocks: [
      {
        t: "h2",
        text: "Pick the format by what you will do next",
      },
      {
        t: "table",
        columns: [
          { label: "If you want to" },
          { label: "Export" },
          { label: "Why" },
        ],
        rows: [
          [
            "Edit the video in Premiere, DaVinci, or CapCut",
            ".SRT",
            "The universal subtitle interchange format with numeric cue indices.",
          ],
          [
            "Publish captions on the web",
            ".VTT",
            "WebVTT supports cue positioning and styling in HTML5 players.",
          ],
          [
            "Read or print the transcript",
            ".TXT",
            "Plain paragraphs with optional timestamps, readable anywhere.",
          ],
          [
            "Build study notes or an Obsidian vault",
            ".MD",
            "Markdown headings, timestamps, and bookmarked moments preserved.",
          ],
          [
            "Build an Anki deck or spreadsheet",
            ".CSV",
            "One row per cue with start, end, speaker, and text columns.",
          ],
          [
            "Feed a script or downstream tool",
            ".JSON",
            "Structured cues with provider, model, and language metadata.",
          ],
        ],
      },
      {
        t: "h2",
        text: "How timing offsets are applied",
      },
      {
        t: "p",
        html:
          "If captions feel consistently early or late, shift them with the bracket keys before exporting. The offset you set is baked into every cue in the exported file, so the .SRT you hand to an editor matches what you saw on screen. Reset with the backslash key.",
      },
      {
        t: "h2",
        text: "Speaker labels and bookmarks",
      },
      {
        t: "p",
        html:
          "Audio Overview podcasts have two hosts, and LM Subs keeps those labels when the provider reports them. Bookmark any line while watching and the Markdown export collects your bookmarked moments into a review section at the bottom of the file.",
      },
      {
        t: "h2",
        text: "Copy a single spoken line",
      },
      {
        t: "p",
        html:
          "Clicking the caption copies the active line with its timestamp, which is the fastest way to quote a specific moment. From the transcript drawer you can also insert a formatted quote straight into the NotebookLM chat panel to ask a follow-up question about it.",
      },
      {
        t: "cta",
        href: "/library",
        label: "Open the transcript library",
      },
    ],
    faqs: [
      {
        q: "Can I export captions without installing anything?",
        a: "No. NotebookLM does not expose a transcript download for Video Overviews, so captions have to be generated from the audio track first. LM Subs generates them in the browser and then exports in six formats.",
      },
      {
        q: "Do exported files include the speaker names?",
        a: "Yes, when the speech-to-text provider returns speaker or segment labels and speaker labels are enabled in settings. You can toggle them off for a clean caption track.",
      },
      {
        q: "Can I re-import an edited subtitle file?",
        a: "Yes. Use the Import control in the caption options to load an edited .SRT, .VTT, or .JSON file back into the player, and it is saved to your transcript library.",
      },
    ],
  },
  {
    slug: "notebooklm-audio-overview-podcast-captions",
    title: "Captioning NotebookLM Audio Overviews (the two-host podcast format)",
    shortTitle: "Audio Overview podcast captions",
    description:
      "Audio Overviews hide their audio element inside a detached player. Here is how captions attach to the podcast format, including speaker labels and the caption dock.",
    date: "2026-10-26",
    keywords: [
      "NotebookLM Audio Overview captions",
      "NotebookLM podcast subtitles",
      "NotebookLM deep dive transcript",
    ],
    lede:
      "NotebookLM's Audio Overview produces a two-host podcast discussion of your sources. It is the most useful format for commuting and the hardest one to read along with, because the audio element is not where you expect it to be.",
    blocks: [
      {
        t: "h2",
        text: "Why the podcast format is different",
      },
      {
        t: "p",
        html:
          "Video Overviews render a normal <code>&lt;video&gt;</code> element inside the Studio panel. Audio Overviews often attach to a detached <code>new Audio()</code> object created by NotebookLM's player code, so an extension that only scans the DOM for media elements finds nothing. LM Subs watches for both, including elements buried inside open shadow roots, and bridges the detached audio through a proxy so captions stay synchronized.",
      },
      {
        t: "h2",
        text: "What captions look like for a podcast",
      },
      {
        t: "p",
        html:
          "Because there is no video frame, captions render in a caption dock near the bottom of the window with the two host labels intact. Word-by-word highlighting, chapter navigation, search, bookmarking, and the full six-format export all work exactly as they do for Video Overviews.",
      },
      {
        t: "h2",
        text: "Turning captions on for Audio Overviews",
      },
      {
        t: "ol",
        items: [
          "Open the LM Subs settings page and confirm the Caption Audio Overviews automatically switch is on. It is on by default.",
          "Open a notebook and play an Audio Overview.",
          "Captions generate automatically and the dock appears at the bottom of the window.",
          "Press T to open the transcript drawer if you want to search or jump between hosts.",
        ],
      },
      {
        t: "h2",
        text: "Studying from a podcast transcript",
      },
      {
        t: "ul",
        items: [
          "Filter the transcript for a term to find every moment both hosts mention it.",
          "Bookmark the moments that matter and export the Markdown notes for review later.",
          "Send a timestamped quote into the NotebookLM chat panel to ask for clarification without retyping it.",
          "Loop a single sentence with the L key when a definition is worth hearing twice.",
        ],
      },
      {
        t: "cta",
        href: "/welcome",
        label: "Try captions on an Audio Overview",
      },
    ],
    faqs: [
      {
        q: "Does LM Subs work on the two-host Deep Dive podcast?",
        a: "Yes. Deep Dive sessions are NotebookLM Audio Overviews, and LM Subs captions them with the same pipeline it uses for Video Overviews, including speaker labels.",
      },
      {
        q: "Where do captions appear if there is no video?",
        a: "Captions render in a caption dock at the bottom of the window, styled with the same typography settings you use for Video Overviews.",
      },
      {
        q: "Can I turn Audio Overview captions off but keep Video Overview captions on?",
        a: "Yes. The Caption Audio Overviews automatically switch in the settings page controls podcasts independently of Video Overviews.",
      },
    ],
  },
];

fs.rmSync(BLOG_DIR, { recursive: true, force: true });
fs.mkdirSync(BLOG_DIR, { recursive: true });

for (const post of POSTS) {
  const dir = path.join(BLOG_DIR, post.slug);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "index.html"), renderPostPage(post, POSTS));
}

fs.writeFileSync(path.join(BLOG_DIR, "index.html"), renderIndex(POSTS));

console.log(`Built ${POSTS.length} blog posts + index -> docs/blog/`);
