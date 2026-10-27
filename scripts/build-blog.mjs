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
      const id = slugifyHeading(block.text);
      out.push(
        `        <h2 class="section-heading post-h2" id="${id}" style="font-size: 1.35rem; margin-top: 30px">${block.text}</h2>`
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
    } else if (block.t === "note") {
      out.push(
        `        <aside class="post-note"><p class="post-note-body">${block.html}</p></aside>`
      );
    } else if (block.t === "quote") {
      out.push(
        `        <blockquote class="post-quote">${block.html}</blockquote>`
      );
    } else if (block.t === "figure") {
      out.push(
        `        <figure class="product-figure"><picture><source srcset="${block.src}.webp?v=10" type="image/webp" /><img src="${block.src}.png?v=10" alt="${escapeHtml(
          block.alt
        )}" width="${block.width || 1280}" height="${block.height || 800}" loading="lazy" decoding="async" /></picture><figcaption>${block.caption}</figcaption></figure>`
      );
    } else if (block.t === "code") {
      out.push(
        `        <pre class="post-code"><code>${escapeHtml(block.text)}</code></pre>`
      );
    } else if (block.t === "steps") {
      out.push('        <ol class="post-steps">');
      for (const step of block.items) {
        out.push(
          `          <li><span class="post-step-lead">${step.lead}</span><span class="post-step-body">${step.body}</span></li>`
        );
      }
      out.push("        </ol>");
    } else if (block.t === "cta") {
      out.push(
        `        <div class="row" style="margin-top: 22px; flex-wrap: wrap; gap: 10px"><a class="btn btn-ink" href="${block.href}">${block.label}</a><a class="btn" href="/guide">Read the setup guide</a></div>`
      );
    }
  }
  return out.join("\n");
}

/**
 * Slugifies a heading so the table of contents can link to it. Matches the
 * `id` written onto every `h2` by `renderBlocks`.
 */
function slugifyHeading(text) {
  return String(text)
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Collects the `h2` headings of a post for the sidebar table of contents. */
function collectHeadings(post) {
  return post.blocks
    .filter((b) => b.t === "h2")
    .map((b) => ({ id: slugifyHeading(b.text), text: b.text }));
}

/** Rough reading time at 220 words per minute, rounded up to one minute. */
function readingTime(post) {
  let words = 0;
  const count = (value) => {
    words += String(value || "")
      .replace(/<[^>]+>/g, " ")
      .split(/\s+/)
      .filter(Boolean).length;
  };
  for (const block of post.blocks) {
    if (block.html) count(block.html);
    if (block.text) count(block.text);
    if (block.lede) count(block.lede);
    for (const item of block.items || []) {
      if (typeof item === "string") count(item);
      else {
        count(item.lead);
        count(item.body);
      }
    }
    for (const row of block.rows || []) {
      for (const cell of row) count(cell);
    }
  }
  count(post.lede);
  for (const faq of post.faqs || []) {
    count(faq.q);
    count(faq.a);
  }
  return {
    words,
    minutes: Math.max(1, Math.round(words / 220)),
  };
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
  const index = allPosts.findIndex((p) => p.slug === post.slug);
  const newer = index > 0 ? allPosts[index - 1] : null;
  const older = index >= 0 && index < allPosts.length - 1 ? allPosts[index + 1] : null;
  const related = allPosts
    .filter((p) => p.slug !== post.slug)
    .sort((a, b) => {
      const shared = (p) =>
        p.keywords.filter((k) => post.keywords.includes(k)).length;
      return shared(b) - shared(a);
    })
    .slice(0, 3);
  const headings = collectHeadings(post);
  const read = readingTime(post);

  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.description,
    url: canonical,
    mainEntityOfPage: { "@type": "WebPage", "@id": canonical },
    datePublished: post.date,
    dateModified: post.dateModified || post.date,
    image: `${SITE}/assets/banner-social-1280x640.png?v=9`,
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
    wordCount: read.words,
    timeRequired: `PT${read.minutes}M`,
    isAccessibleForFree: true,
    articleBody: [
      post.lede,
      ...post.blocks
        .map((b) =>
          b.html
            ? b.html
            : b.text
              ? b.text
              : (b.items || []).map((i) => (typeof i === "string" ? i : `${i.lead} ${i.body}`)).join(" ")
        )
        .filter(Boolean),
    ]
      .join(" ")
      .replace(/<[^>]+>/g, ""),
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
    <meta property="og:image" content="${SITE}/assets/banner-social-1280x640.png?v=9" />
    <meta property="og:image:width" content="1280" />
    <meta property="og:image:height" content="640" />
    <meta property="og:image:alt" content="LM Subs: Captions for Google NotebookLM Video Overviews and Audio Overviews" />
    <meta property="article:author" content="${AUTHOR_URL}" />
    <meta property="article:published_time" content="${post.date}" />
    <meta property="article:modified_time" content="${post.dateModified || post.date}" />
${older ? `    <link rel="prev" href="${SITE}/blog/${older.slug}" />` : ""}
${newer ? `    <link rel="next" href="${SITE}/blog/${newer.slug}" />` : ""}
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeHtml(post.title)}" />
    <meta name="twitter:description" content="${escapeHtml(post.description)}" />
    <meta name="twitter:image" content="${SITE}/assets/banner-social-1280x640.png?v=9" />
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
      <article class="section-block post-article">
        <nav class="hint" aria-label="Breadcrumb" style="margin-bottom: 16px">
          <a class="link" href="/">LM Subs</a> / <a class="link" href="/blog">Blog</a> / ${escapeHtml(post.shortTitle || post.title)}
        </nav>

        <p class="post-kicker">${escapeHtml(post.category || "NotebookLM captions")}<span class="post-kicker-dot" aria-hidden="true">.</span>${read.minutes} min read</p>
        <h1 class="section-heading post-title">${escapeHtml(post.title)}</h1>
        <p class="post-lede">${post.lede}</p>

        <div class="post-byline">
          <span class="post-avatar" aria-hidden="true">SA</span>
          <span class="post-byline-text">
            <a class="link" href="${AUTHOR_URL}" target="_blank" rel="noopener noreferrer">${AUTHOR_NAME} (${AUTHOR_HANDLE})</a>, creator of LM Subs.
            <span class="post-byline-meta">Published ${post.date}. ${read.words} words.</span>
          </span>
        </div>

        <div class="post-shell">
          <div class="post-main">
${renderBlocks(post.blocks)}
${renderFaq(post.faqs)}
          </div>

          <aside class="post-side">
            <nav class="post-toc" aria-label="On this page">
              <p class="post-toc-title">On this page</p>
              <ol class="post-toc-list">
${headings
  .map(
    (h) =>
      `                <li><a class="post-toc-link" href="#${h.id}">${escapeHtml(h.text)}</a></li>`
  )
  .join("\n")}
              </ol>
            </nav>
            <div class="post-side-card">
              <p class="post-side-title">Try it while you read</p>
              <p class="post-side-body">LM Subs captions Video Overviews and Audio Overviews in the browser, then exports SRT, VTT, TXT, MD, CSV or JSON.</p>
              <a class="btn btn-ink btn-sm" href="/welcome">Set up in two minutes</a>
            </div>
          </aside>
        </div>

        <nav class="post-nav" aria-label="More posts">
${older
  ? `          <a class="post-nav-link" href="/blog/${older.slug}" rel="prev">
            <span class="post-nav-dir">Previous</span>
            <span class="post-nav-title">${escapeHtml(older.shortTitle || older.title)}</span>
          </a>`
  : `          <span class="post-nav-link is-empty"><span class="post-nav-dir">Previous</span><span class="post-nav-title">You are at the oldest post</span></span>`}
${newer
  ? `          <a class="post-nav-link is-next" href="/blog/${newer.slug}" rel="next">
            <span class="post-nav-dir">Next</span>
            <span class="post-nav-title">${escapeHtml(newer.shortTitle || newer.title)}</span>
          </a>`
  : `          <span class="post-nav-link is-next is-empty"><span class="post-nav-dir">Next</span><span class="post-nav-title">You are at the newest post</span></span>`}
        </nav>

        <h2 class="section-heading" style="font-size: 1.35rem; margin-top: 40px">Related reading</h2>
        <div class="related-grid">
${related
  .map(
    (r) =>
      `          <a class="related-card" href="/blog/${r.slug}">
            <span class="related-kicker">${escapeHtml(r.category || "NotebookLM captions")}</span>
            <span class="related-title">${escapeHtml(r.shortTitle || r.title)}</span>
            <span class="related-desc">${escapeHtml(r.description).slice(0, 132)}...</span>
          </a>`
  )
  .join("\n")}
        </div>

        <div class="author-box">
          <span class="post-avatar" aria-hidden="true">SA</span>
          <div>
            <p class="author-name">${AUTHOR_NAME} (${AUTHOR_HANDLE})</p>
            <p class="author-bio">Computer science student and agentic engineer in Germany. Builds LM Subs, an open source captioning extension for Google NotebookLM, and writes these guides from the same code base the extension ships from.</p>
            <p class="author-links"><a class="link" href="${AUTHOR_URL}" target="_blank" rel="noopener noreferrer">GitHub</a> <a class="link" href="/about">More about the project</a></p>
          </div>
        </div>
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
  const lead = posts[0];
  const rest = posts.slice(1);
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
    <meta property="og:image" content="${SITE}/assets/banner-social-1280x640.png?v=9" />
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
        <p class="hint" style="margin-top: 10px">${posts.length} guides, updated for LM Subs v0.2.8.</p>

        <a class="blog-lead" href="/blog/${lead.slug}">
          <span class="blog-lead-kicker">${escapeHtml(lead.category || "NotebookLM captions")}<span class="post-kicker-dot" aria-hidden="true">.</span>${readingTime(lead).minutes} min read</span>
          <span class="blog-lead-title">${escapeHtml(lead.title)}</span>
          <span class="blog-lead-desc">${escapeHtml(lead.description)}</span>
          <span class="blog-lead-more">Read the guide</span>
        </a>

        <div class="blog-grid">
${rest
  .map(
    (p) => `          <a class="blog-card" href="/blog/${p.slug}">
            <span class="blog-card-top">
              <span class="blog-card-kicker">${escapeHtml(p.category || "NotebookLM captions")}</span>
              <time class="blog-card-date" datetime="${p.date}">${p.date}</time>
            </span>
            <span class="blog-card-title">${escapeHtml(p.shortTitle || p.title)}</span>
            <span class="blog-card-desc">${escapeHtml(p.description)}</span>
            <span class="blog-card-meta">${readingTime(p).minutes} min read</span>
          </a>`
  )
  .join("\n")}
        </div>
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
    category: "Captions basics",
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
    category: "Setup",
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
    category: "API keys",
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
    category: "Transcript export",
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
    category: "Audio Overviews",
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
  {
    slug: "notebooklm-transcript-srt-vs-vtt-vs-markdown",
    title: "SRT, VTT, or Markdown: which caption format should you export from NotebookLM?",
    shortTitle: "SRT, VTT, or Markdown?",
    category: "Transcript export",
    description:
      "Every export format LM Subs writes, what it is actually for, and which one to pick for video editors, slide decks, study notes, or spreadsheets.",
    date: "2026-10-26",
    keywords: [
      "NotebookLM SRT export",
      "WebVTT vs SRT",
      "NotebookLM transcript markdown",
      "caption file formats",
    ],
    lede:
      "NotebookLM will not hand you a caption file, so the moment you generate captions you have to choose a format. The choice matters less than people think, but picking the wrong one costs you an afternoon of re-exporting. Here is what each format is good at.",
    blocks: [
      {
        t: "h2",
        text: "The one line answer",
      },
      {
        t: "table",
        columns: [
          { label: "Format" },
          { label: "Keeps timing" },
          { label: "Best for" },
        ],
        rows: [
          ["SRT", "Yes", "Video editors, subtitling tools, anything offline"],
          ["WebVTT (VTT)", "Yes", "Publishing captions on the web"],
          ["Plain text", "No", "Pasting into chat, email, or a document"],
          ["Markdown", "No", "Study notes, README files, wikis"],
          ["CSV", "Yes, as rows", "Spreadsheets and data work"],
          ["JSON", "Yes, fully", "Scripts and anything you build on top"],
        ],
      },
      {
        t: "h2",
        text: "SRT is the format everything reads",
      },
      {
        t: "p",
        html:
          "SubRip files are the oldest and most widely accepted caption format in existence. A cue is a number, a line with a start and end timestamp written with a comma before the milliseconds, then the text. Every non linear editor, every hardware player, and every subtitling service accepts it. If you do not know what you need, export SRT.",
      },
      {
        t: "p",
        html:
          "The trade-off is that SRT carries no styling. No bold, no italics, no positioning. For NotebookLM narration that is usually fine, because you want the words and the timing, not decoration.",
      },
      {
        t: "h2",
        text: "WebVTT is the format the web reads",
      },
      {
        t: "p",
        html:
          "WebVTT is the standard behind the HTML5 track element. It looks almost identical to SRT, with a WEBVTT header line and a dot instead of a comma before the milliseconds, but it adds cue settings for position, alignment, and line count. If you are publishing the overview on a page you control, VTT is the right choice and SRT is the compatibility fallback.",
      },
      {
        t: "h2",
        text: "Plain text and Markdown are for reading, not playing",
      },
      {
        t: "p",
        html:
          "Both strip the timestamps and give you continuous prose. Markdown keeps heading structure and is the fastest way to turn a twenty minute Video Overview into notes you can search, fold into a README, or paste into a wiki. Plain text is what you want when the destination cannot render anything.",
      },
      {
        t: "note",
        html:
          "Export the timing formats first. You can always flatten a timed transcript into prose later, but you cannot recover timing from a Markdown file.",
      },
      {
        t: "h2",
        text: "CSV and JSON are for building on top",
      },
      {
        t: "p",
        html:
          "CSV gives you one row per cue, which is the easiest way to pull a transcript into a spreadsheet, count how often a term appears, or build a vocabulary list. JSON keeps the full structure, including start and end times in seconds, and is the format to use if you plan to feed the transcript into another tool.",
      },
      {
        t: "h2",
        text: "Which one should you pick",
      },
      {
        t: "steps",
        items: [
          {
            lead: "Editing the video yourself",
            body: "Export SRT and drop it on the timeline in your editor.",
          },
          {
            lead: "Publishing on a website",
            body: "Export WebVTT and attach it to the video element with a track tag.",
          },
          {
            lead: "Studying from the overview",
            body: "Export Markdown, then search it next to your source documents.",
          },
          {
            lead: "Analysing the content",
            body: "Export CSV for spreadsheets or JSON for scripts.",
          },
          {
            lead: "Unsure",
            body: "Export SRT. Everything can read it, and re-exporting takes one click.",
          },
        ],
      },
      {
        t: "cta",
        href: "/guide",
        label: "Set up captions and exports",
      },
    ],
    faqs: [
      {
        q: "Can I convert an SRT file into WebVTT later?",
        a: "Yes. The two formats are close enough that most tools convert them without loss, and you can also re-export from LM Subs in one click because the transcript is stored locally.",
      },
      {
        q: "Do captions keep speaker labels when exported?",
        a: "For Audio Overviews, yes. Speaker labels are written into the cue text so a two host podcast stays readable in any player that supports the format.",
      },
      {
        q: "Which format does YouTube accept?",
        a: "YouTube accepts both SRT and WebVTT uploads, along with several others, and treats SRT as the safest common option.",
      },
    ],
  },
  {
    slug: "run-whisper-locally-notebooklm-captions",
    title: "Run Whisper locally for NotebookLM captions (no API key, no upload)",
    shortTitle: "Run Whisper locally",
    category: "Local setup",
    description:
      "Point LM Subs at a local Whisper server and caption NotebookLM Video Overviews and Audio Overviews entirely on your own machine, with no account and no audio leaving the computer.",
    date: "2026-10-26",
    keywords: [
      "local Whisper NotebookLM",
      "offline captions NotebookLM",
      "whisper.cpp",
      "self hosted speech to text",
    ],
    lede:
      "Bring your own key is the default in LM Subs, but the key does not have to be somebody else's API. Any server that speaks the OpenAI audio transcription protocol can sit behind a localhost URL, and LM Subs will use it exactly like a hosted provider, with zero audio leaving your machine.",
    blocks: [
      {
        t: "h2",
        text: "Why run it locally",
      },
      {
        t: "ul",
        items: [
          "Nothing is uploaded. The extracted audio never leaves the computer, which matters for unpublished research and internal material.",
          "There is no rate limit and no daily quota, so a long Audio Overview costs the same as a short one.",
          "It works offline, on a plane or behind a firewall.",
        ],
      },
      {
        t: "h2",
        text: "What you need",
      },
      {
        t: "ul",
        items: [
          "A machine with Docker installed, or Python if you prefer installing the server directly.",
          "A few gigabytes of free disk space for the model weights, more if you want the large models.",
          "Patience on the first run, because the model downloads before the first transcription.",
        ],
      },
      {
        t: "p",
        html:
          "A dedicated GPU makes large models feel instant. On a laptop CPU you will want a small or medium model, and you should expect a ten minute overview to take a couple of minutes rather than a few seconds. Exact times depend heavily on your hardware.",
      },
      {
        t: "h2",
        text: "Start a local transcription server",
      },
      {
        t: "p",
        html:
          "Any OpenAI compatible server works. Speaches is the shortest path, because it ships as a single container and exposes the same endpoint shape the hosted providers use.",
      },
      {
        t: "code",
        text:
          "docker run -p 8000:8000 ghcr.io/speaches-ai/speaches:latest-cpu\n\n# then check it answers:\ncurl http://localhost:8000/v1/models",
      },
      {
        t: "p",
        html:
          "Faster Whisper server, whisper.cpp with its HTTP layer, and LocalAI are all valid alternatives if you already run one of them for other work.",
      },
      {
        t: "h2",
        text: "Point LM Subs at it",
      },
      {
        t: "steps",
        items: [
          {
            lead: "Open the settings page",
            body: "Right click the LM Subs icon in the toolbar and choose Options.",
          },
          {
            lead: "Enable the local provider",
            body: "Find Local / Custom Whisper URL in the provider list and turn it on.",
          },
          {
            lead: "Set the base URL",
            body: "Enter http://localhost:8000/v1, exactly the address your server listens on.",
          },
          {
            lead: "Leave the key blank",
            body: "A local server normally needs no API key. Leave the field empty unless yours requires a token.",
          },
          {
            lead: "Drag it to the top",
            body: "Put the local provider first in the queue so every request stays on your machine.",
          },
        ],
      },
      {
        t: "note",
        html:
          "Chrome blocks requests from an https page to http://localhost by default. Loading the local server over https, or allowing insecure localhost content for the NotebookLM origin, resolves it if you see a mixed content error.",
      },
      {
        t: "h2",
        text: "When the cloud is still the better answer",
      },
      {
        t: "p",
        html:
          "If you want captions in a few seconds rather than a couple of minutes, hosted providers win, and the free tiers cover far more than most people use. A sensible setup keeps Groq first for speed, Mistral second as a fallback, and the local server last so a long batch finishes overnight with no cost.",
      },
      {
        t: "cta",
        href: "/guide",
        label: "Finish the setup",
      },
    ],
    faqs: [
      {
        q: "Does local transcription cost anything?",
        a: "No money, only electricity and disk space. There is no quota and no account, and the audio stays on your machine.",
      },
      {
        q: "Which model should I download?",
        a: "Start with a small model, which fits comfortably in a few gigabytes of memory and is fast enough for regular use. Move to a larger model only if you need better accuracy on technical vocabulary or accented speech.",
      },
      {
        q: "Will captions still highlight the current word?",
        a: "Yes, as long as the server returns timing information. Word level highlighting depends on the timestamps coming back with the transcript, so pick a server and model that return them.",
      },
    ],
  },
  {
    slug: "speech-to-text-cost-notebooklm-free-tiers",
    title: "What speech to text really costs for NotebookLM captions",
    shortTitle: "What captions actually cost",
    category: "Costs",
    description:
      "A clear breakdown of what LM Subs sends to a speech to text provider, which free tiers cover it, and the point at which paying makes sense.",
    date: "2026-10-26",
    keywords: [
      "NotebookLM caption cost",
      "Groq free tier limits",
      "Mistral free API",
      "speech to text pricing",
    ],
    lede:
      "Captioning a NotebookLM overview is cheaper than most people assume, because the thing you send is not the video. This page explains what actually crosses the network, what the free tiers allow, and when a paid key becomes worth it.",
    blocks: [
      {
        t: "h2",
        text: "You send audio, not video",
      },
      {
        t: "p",
        html:
          "A ten minute Video Overview is roughly 50 MB as an MP4. LM Subs reads the audio track out of the stream in your browser and sends that instead, which for the same overview is around 3 MB. Smaller uploads mean faster responses, fewer rejected requests, and a much lower chance of hitting a provider's payload cap.",
      },
      {
        t: "h2",
        text: "Free tiers that cover normal use",
      },
      {
        t: "table",
        columns: [
          { label: "Provider" },
          { label: "Free plan" },
          { label: "Good to know" },
        ],
        rows: [
          [
            "Groq",
            "Permanent free plan, no card",
            "Generous daily audio allowance, so most people never pay",
          ],
          [
            "Mistral",
            "Free Experiment plan",
            "No card, needs a phone verification step",
          ],
          [
            "Local Whisper",
            "Unlimited",
            "Runs on your machine, no provider involved at all",
          ],
        ],
      },
      {
        t: "note",
        html:
          "Free tier limits change without notice. Check the provider's own pricing page before you plan around a number, and treat the queue in LM Subs as your safety net rather than any single free plan.",
      },
      {
        t: "h2",
        text: "When paying starts to make sense",
      },
      {
        t: "ul",
        items: [
          "You caption more than a handful of long Audio Overviews every day.",
          "You need word level timestamps for a language the free models handle poorly.",
          "You are captioning for a team and do not want to share one free key.",
          "You want a larger model than the free tier exposes.",
        ],
      },
      {
        t: "p",
        html:
          "Paid speech to text is billed per minute of audio, and the per minute prices are low enough that a long overview costs a fraction of a cent on most providers. The real cost driver is volume, not the individual video.",
      },
      {
        t: "h2",
        text: "How to keep the bill at zero",
      },
      {
        t: "steps",
        items: [
          {
            lead: "Order the queue by cost",
            body: "Put Groq first, Mistral second, and a local server last. Failover moves down the list only when a provider refuses the request.",
          },
          {
            lead: "Store one key per provider",
            body: "Two configured providers beat one, because a rate limit on the first no longer stops your work.",
          },
          {
            lead: "Reuse the transcript",
            body: "LM Subs caches generated captions per media item, so replaying an overview does not pay for it twice.",
          },
          {
            lead: "Caption what you need",
            body: "Auto generation is a switch. Turn it off if you only need captions occasionally.",
          },
        ],
      },
      {
        t: "cta",
        href: "/guide",
        label: "Set up a free key",
      },
    ],
    faqs: [
      {
        q: "Is LM Subs itself free?",
        a: "Yes. The extension is free and MIT licensed. You pay only if you choose a provider that charges, and the recommended starting providers both have permanent free tiers.",
      },
      {
        q: "What happens when a free key runs out of quota?",
        a: "The provider returns a rate limit response, LM Subs marks that provider as unavailable for the request, and the next provider in your queue takes over automatically.",
      },
      {
        q: "Does an Audio Overview cost more than a Video Overview?",
        a: "Billing is per minute of audio, so a twenty minute podcast costs more than a three minute video simply because it is longer. There is no separate charge for the Audio Overview format.",
      },
    ],
  },
  {
    slug: "notebooklm-captions-accessibility-wcag",
    title: "NotebookLM captions and accessibility: what WCAG asks for",
    shortTitle: "Captions and WCAG",
    category: "Accessibility",
    description:
      "What WCAG 2.2 requires for captions and transcripts, where NotebookLM falls short, and how to close the gap for deaf, hard of hearing, and neurodivergent users.",
    date: "2026-10-26",
    keywords: [
      "NotebookLM accessibility",
      "WCAG captions requirements",
      "NotebookLM transcript",
      "Video Overview captions",
    ],
    lede:
      "If you publish or share a NotebookLM Video Overview, captions are not a nice extra. They are a Level A requirement under WCAG 2.2, and NotebookLM does not provide them. This page covers what the standard asks for, what you can automate, and what still needs a human.",
    blocks: [
      {
        t: "h2",
        text: "The gap",
      },
      {
        t: "p",
        html:
          "NotebookLM renders a Video Overview with play, speed, and fullscreen controls, and it renders an Audio Overview with the same set. Neither ships a caption toggle and neither exposes a timed text track, so the narration is unavailable to anyone who cannot hear it.",
      },
      {
        t: "h2",
        text: "What WCAG 2.2 asks for",
      },
      {
        t: "ul",
        items: [
          "SC 1.2.2 Captions (Prerecorded), Level A: synchronised captions for all prerecorded audio in video.",
          "SC 1.2.1 Audio only and video only, Level A: a transcript for audio only content such as an Audio Overview.",
          "SC 1.2.3 Audio Description or Media Alternative, Level A: a text alternative that conveys what the visuals show.",
          "SC 1.2.5 Audio Description, Level AA: actual audio description for prerecorded video.",
          "SC 1.4.3 Contrast (Minimum), Level AA: caption text needs at least 4.5 to 1 against its background.",
          "SC 1.4.4 Resize Text, Level AA: text scales to 200 percent without loss of content.",
        ],
      },
      {
        t: "p",
        html:
          "Captions and transcripts cover the first two. Audio description is a different job, because it describes visual information that is not spoken, and no automatic tool does it well yet.",
      },
      {
        t: "h2",
        text: "Where automation helps and where it does not",
      },
      {
        t: "p",
        html:
          "Generating captions from the narration closes the Level A caption and transcript gaps in minutes. The captions are machine generated, which means they inherit whatever the model misheard. For personal use that is usually good enough, and the inline editor lets you correct a cue in place. For anything published, assessment, or legally required, a human pass over the transcript is still the standard.",
      },
      {
        t: "note",
        html:
          "Automatic captions are a starting point, not a finished deliverable. Budget one read through before you publish, and pay attention to names, numbers, and technical terms.",
      },
      {
        t: "h2",
        text: "Practical checklist for an accessible overview",
      },
      {
        t: "steps",
        items: [
          {
            lead: "Generate captions before you share",
            body: "Captions for Video Overviews, and a caption dock plus transcript for Audio Overviews.",
          },
          {
            lead: "Read the transcript once",
            body: "Fix the words the model got wrong, especially proper nouns.",
          },
          {
            lead: "Check contrast and size",
            body: "Caption styling in LM Subs lets you raise size and background opacity until the text is legible on bright slides.",
          },
          {
            lead: "Export a transcript alongside the video",
            body: "A Markdown or TXT export satisfies the media alternative requirement and helps anyone who would rather read.",
          },
          {
            lead: "Describe the visuals separately",
            body: "If slides carry meaning the narration never states, write that description by hand.",
          },
        ],
      },
      {
        t: "h2",
        text: "Beyond captions",
      },
      {
        t: "p",
        html:
          "Captions help far more than the deaf and hard of hearing audience they were written for. Non native speakers, people working in a quiet office, and anyone who reads faster than speech all benefit from a transcript attached to the timeline.",
      },
      {
        t: "cta",
        href: "/welcome",
        label: "Turn on captions",
      },
    ],
    faqs: [
      {
        q: "Are automatically generated captions WCAG compliant?",
        a: "They satisfy the requirement that captions exist and are synchronised, which is SC 1.2.2. Accuracy is a separate quality question, so review them before publishing anything formal.",
      },
      {
        q: "Does an Audio Overview need captions or a transcript?",
        a: "A transcript satisfies SC 1.2.1 for audio only content. Captions are still useful in practice, and LM Subs provides both.",
      },
      {
        q: "Can I make captions easier to read?",
        a: "Yes. Caption styling controls cover size, background opacity, and position, so you can reach a comfortable contrast ratio on any slide deck.",
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
