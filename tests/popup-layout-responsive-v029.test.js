import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");

const css = fs.readFileSync(path.join(repoRoot, "extension/ui.css"), "utf8");
const html = fs.readFileSync(path.join(repoRoot, "extension/popup.html"), "utf8");
const popupJs = fs.readFileSync(path.join(repoRoot, "src/popup/popup.js"), "utf8");

function rule(selector) {
  const match = css.match(new RegExp(`\\${selector}\\s*\\{([^}]*)\\}`));
  assert.ok(match, `ui.css should define ${selector}`);
  return match[1];
}

test("The paired columns stack before they get too narrow to hold a row", () => {
  // Chrome clamps popup width on small screens and at high zoom, so the two
  // column layout has to be the wide case, never the default.
  assert.match(rule(".popup-columns"), /grid-template-columns:\s*minmax\(0,\s*1fr\)/);

  const wide = css.match(/@media \(min-width: (\d+)px\) \{[\s\S]*?\.popup-columns \{[\s\S]*?\}/);
  assert.ok(wide, "two columns should be behind a min-width query");
  assert.ok(Number(wide[1]) >= 600, "columns need real room before they split");
  assert.match(wide[0], /minmax\(0, 0\.92fr\) minmax\(0, 1\.08fr\)/);
});

test("The account column gets the larger share of the row", () => {
  const wide = css.match(/@media \(min-width: \d+px\) \{[\s\S]*?\.popup-columns \{([\s\S]*?)\}/);
  const [, first, second] = wide[1].match(/minmax\(0, ([\d.]+)fr\) minmax\(0, ([\d.]+)fr\)/);
  assert.ok(
    Number(second) > Number(first),
    "the account column carries an address and buttons, so it needs more room"
  );
});

test("Headings keep one line and truncate instead of breaking", () => {
  const title = rule(".section-title");
  assert.match(title, /white-space:\s*nowrap/, "a heading must not wrap to three lines");
  assert.match(title, /text-overflow:\s*ellipsis/);
  assert.match(title, /min-width:\s*0/, "min-width 0 is what lets it shrink before wrapping");

  assert.match(rule(".section-head"), /flex-wrap:\s*wrap/, "actions drop below instead of squeezing");
  assert.match(css, /\.section-head \.badge \{\s*flex: none;/, "a badge never shrinks");
  assert.match(css, /\.section-head > \.row:last-child \{\s*flex: 0 0 auto;/);
});

test("Nothing in the popup still carries a hard coded pixel width", () => {
  // The filename, transcript title and notification summary were capped at
  // fixed pixel widths, which is what clipped them regardless of the popup.
  assert.ok(!/max-width:\s*\d+px/.test(html), "popup.html should not pin widths inline");
  assert.match(rule(".export-source"), /flex: 1 1 auto/);
  assert.match(rule(".export-source"), /text-overflow:\s*ellipsis/);
  assert.match(rule(".last-status-title"), /flex: 1 1 auto/);
  assert.match(rule(".disclosure-summary"), /text-overflow:\s*ellipsis/);
});

test("Truncated labels keep their full value in a tooltip", () => {
  assert.match(popupJs, /popupExportSource\.title = sourceLabel;/);
  assert.match(popupJs, /emailLine\.title = email;/);
  assert.match(popupJs, /lastStatusTitle\.title = statusTitle;/);
});

test("The sync summary splits the address from the counts", () => {
  // One run-on string broke at whatever column the column ended at.
  assert.match(popupJs, /sync-email/);
  assert.match(popupJs, /sync-meta/);
  assert.match(rule(".sync-email"), /white-space:\s*nowrap/);
  assert.ok(
    !popupJs.includes("transcript(s))"),
    "the counts should read as words rather than abbreviations"
  );
});

test("Export buttons keep three equal columns with Copy on its own row", () => {
  assert.match(rule(".export-strip"), /display:\s*grid/);
  assert.match(rule(".export-strip"), /repeat\(3, minmax\(0, 1fr\)\)/);
  assert.match(rule(".export-strip .btn-sm"), /min-width:\s*0/);
  assert.match(rule(".export-strip .btn-ink"), /grid-column:\s*1 \/ -1/);
});

test("Disclosure rows can shrink so a long summary cannot push the chevron out", () => {
  // The row is the flex item of the summary, so its own min-width is what
  // decides whether a long unread count can drag the chevron past the edge.
  assert.match(css, /details\.compact-disclosure > summary > \.row[\s\S]*?min-width:\s*0/);
});

test("Narrow popups tighten padding instead of overflowing", () => {
  assert.match(css, /@media \(max-width: 700px\) \{\s*:root \{\s*--pad-pop-x: 14px;/);
  assert.match(rule(".popup-columns > .popup-section"), /min-width:\s*0/);
  assert.match(rule(".local-code-box .mono-input"), /min-width:\s*0/);
});
