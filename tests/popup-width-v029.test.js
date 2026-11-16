import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");

const css = fs.readFileSync(path.join(repoRoot, "extension/ui.css"), "utf8");
const html = fs.readFileSync(path.join(repoRoot, "extension/popup.html"), "utf8");

/** Chrome refuses to render a toolbar popup larger than 800 by 600 CSS pixels. */
const CHROME_MAX_POPUP_WIDTH = 800;

function popupBlock() {
  const block = css.match(/body\.popup-body\s*\{[^}]*\}/);
  assert.ok(block, "ui.css should style body.popup-body");
  return block[0];
}

function popupWidth() {
  const width = popupBlock().match(/width:\s*(\d+)px/);
  assert.ok(width, "body.popup-body needs an explicit pixel width");
  return Number(width[1]);
}

test("The popup is much wider than before but still inside Chrome's cap", () => {
  const width = popupWidth();
  assert.ok(width >= 640, `popup should be comfortably wide, got ${width}px`);
  assert.ok(
    width <= CHROME_MAX_POPUP_WIDTH - 40,
    `${width}px leaves too little room under Chrome's ${CHROME_MAX_POPUP_WIDTH}px cap`
  );
  // The cap has to be a plain pixel number. 100vw resolves against the popup's
  // own viewport, which is the width Chrome is in the middle of deciding, so it
  // feeds whatever provisional width it landed on straight back into the
  // result: the popup settled at 266px and stayed there. Chrome clamps the
  // popup to the screen itself, so the stylesheet does not have to.
  const cap = popupBlock().match(/max-width:\s*(\d+)px/);
  assert.ok(cap, "body.popup-body needs a pixel cap");
  assert.ok(
    Number(cap[1]) <= CHROME_MAX_POPUP_WIDTH,
    `the cap should not ask for more than Chrome's ${CHROME_MAX_POPUP_WIDTH}px`
  );
  assert.ok(
    !/max-width:\s*100vw/.test(css),
    "a viewport relative cap is circular for a popup sized from its content"
  );

  // Overflowing has to be impossible even where the screen really is narrower
  // than the design width, and a scrollbar is not an acceptable answer.
  // clip rather than hidden: hidden would make the body a scroll container and
  // hand the other axis an auto scrollbar, which is the thing being avoided.
  assert.match(css, /body\.popup-body\s*\{[^}]*overflow-x:\s*clip/);
});

test("The extra width buys a two column row instead of empty space", () => {
  const wrapper = html.match(/<div class="popup-columns">([\s\S]*?)\n    <\/div>/);
  assert.ok(wrapper, "popup.html should wrap the paired sections in .popup-columns");
  assert.ok(wrapper[1].includes("Active NotebookLM tab"), "left column captions the current tab");
  assert.ok(wrapper[1].includes("Account and sync"), "right column holds the account");
  assert.equal(
    (wrapper[1].match(/<section /g) || []).length,
    2,
    "exactly two sections share that row"
  );

  const rule = css.match(/\.popup-columns\s*\{[^}]*\}/);
  assert.ok(rule, "ui.css should define .popup-columns");
  assert.ok(rule[0].includes("grid-template-columns"), "the row is a two column grid");
});

test("Widening does not leave the popup at the mercy of options page media queries", () => {
  // The media queries in ui.css are viewport based and written for the options
  // page, but the popup viewport is only as wide as the popup, so a popup rule
  // has to pin anything those queries would otherwise resize. The numbers were
  // 22px under the 680px query and would have jumped on every width change.
  assert.ok(
    /body\.popup-body \.stats-num\s*\{[^}]*font-size:\s*\d+px/.test(css),
    "the popup should pin its own stat number size"
  );
  assert.ok(
    /body\.popup-body \.stats-strip\s*\{[^}]*repeat\(4/.test(css),
    "the popup should keep four stat columns regardless of viewport width"
  );
});

test("Hint copy stays inside a readable measure at the wider size", () => {
  assert.ok(
    /body\.popup-body \.hint\s*\{[^}]*max-width/.test(css),
    "full width hint copy needs a measure cap at 720px"
  );
});
