/**
 * LM Subs: the top bar keeps a single line at every width.
 *
 * The tab strip used to drop onto a second row below 640px, which cost the
 * header its height and its hairline. The strip now shrinks and scrolls
 * sideways instead, and the crawlable shells no longer show a second header
 * once the app mounts.
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const readRepoFile = (rel) => fs.readFileSync(path.resolve(rel), "utf8");

/** Yields every rule block in the stylesheet that targets `selector`. */
function blocksFor(css, selector) {
  const out = [];
  const re = new RegExp(`${selector.replace(".", "\\.")}\\s*\\{[^}]*\\}`, "g");
  let match;
  while ((match = re.exec(css)) !== null) out.push(match[0]);
  return out;
}

test("Site header: the tab strip never wraps onto a second row", () => {
  const css = readRepoFile("docs/styles.css");

  for (const selector of [".nav-links", ".site-header-inner"]) {
    for (const block of blocksFor(css, selector)) {
      assert.doesNotMatch(
        block,
        /flex-wrap:\s*wrap/,
        `${selector} must not wrap: ${block.slice(0, 60)}`
      );
    }
  }
});

test("Site header: narrow widths scroll the strip instead of stacking it", () => {
  const css = readRepoFile("docs/styles.css");
  const narrow = css.slice(css.indexOf("@media (max-width: 640px)"));
  assert.ok(narrow.length > 0, "the 640px breakpoint must exist");

  // The header keeps its fixed height, so the bar stays one line tall
  assert.doesNotMatch(
    narrow,
    /\.site-header\s*\{\s*height:\s*auto/,
    "the header must not auto-size to two rows"
  );
  assert.match(narrow, /\.site-header\s*\{[^}]*height:\s*var\(--nav-h\)/);

  // The strip takes the leftover room and scrolls
  const navBlocks = blocksFor(narrow, ".nav-links");
  assert.ok(navBlocks.length > 0, "nav-links must be restyled at 640px");
  const nav = navBlocks.join("\n");
  assert.match(nav, /flex:\s*1 1 auto/, "the strip fills the remaining space");
  assert.match(nav, /min-width:\s*0/, "the strip must be allowed to shrink");
  assert.match(nav, /overflow-x:\s*auto/, "the strip scrolls sideways");

  // Tabs keep their own width so they scroll rather than compress
  assert.match(narrow, /\.nav-tab\s*\{[^}]*white-space:\s*nowrap/);
  assert.match(narrow, /\.nav-tab\s*\{[^}]*flex:\s*0 0 auto/);

  // Brand and actions hold their size while the strip gives way
  assert.match(narrow, /\.brand-link,\s*\.nav-actions\s*\{[^}]*flex:\s*0 0 auto/);
});

test("Site header: the tab strip also shrinks between 640px and 1024px", () => {
  const css = readRepoFile("docs/styles.css");
  const start = css.indexOf("@media (max-width: 1024px)");
  assert.ok(start > -1, "the 1024px breakpoint must exist");
  const block = css.slice(start, css.indexOf("@media (max-width: 900px)"));
  assert.match(block, /\.nav-links\s*\{[^}]*min-width:\s*0/);
  assert.match(block, /\.nav-links\s*\{[^}]*overflow-x:\s*auto/);
  assert.match(block, /\.nav-tab\s*\{[^}]*white-space:\s*nowrap/);
});

test("Site header: the mounted app hides the crawlable shell's duplicate bar", () => {
  const css = readRepoFile("docs/styles.css");
  assert.match(
    css,
    /body\.app-mounted \.site-header-shell \{\s*display: none;\s*\}/,
    "the static shell header steps aside once the app renders its own"
  );

  const shells = readRepoFile("scripts/build-shells.mjs");
  assert.match(
    shells,
    /class="site-header site-header-shell"/,
    "shell pages must tag their static header so the app can hide it"
  );

  const entry = readRepoFile("src/web/main.jsx");
  assert.match(
    entry,
    /classList\.add\("app-mounted"\)/,
    "the app must mark the body as mounted"
  );
});

test("Site header: the active tab is scrolled into view when the strip overflows", () => {
  const app = readRepoFile("src/web/App.jsx");
  assert.match(app, /navRef/, "the tab strip needs a ref");
  assert.match(
    app,
    /scrollIntoView\(\{\s*inline: "center",\s*block: "nearest"\s*\}\)/,
    "scrolling must stay horizontal so the page does not jump"
  );
});
