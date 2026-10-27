/**
 * v0.2.8 regressions for the caption dock inside Google NotebookLM's own play
 * bar (`tests/player-dock-placement-v028.test.js`).
 *
 * The buttons must land as one group in front of the native right-hand
 * cluster, never scatter between native controls, never push them off the row,
 * and never overflow a narrow bar. The helpers are pure DOM logic, so they are
 * exercised against a small fake DOM.
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";

import {
  DOCK_CSS,
  findRightClusterAnchor,
  insertDockGroupBeforeRightCluster,
} from "../src/content/player-overlay.js";

/* -------------------------------------------------------------------------- */
/* Minimal fake DOM                                                           */
/* -------------------------------------------------------------------------- */

function el(tag, { label = "", left = 0, width = 30, children = [], attrs = {}, className = "" } = {}) {
  const node = {
    tagName: String(tag).toUpperCase(),
    dataset: {},
    attrs: label ? { "aria-label": label, ...attrs } : { ...attrs },
    className,
    children: [],
    parentElement: null,
    style: {},
  };

  node.getAttribute = (name) => (name in node.attrs ? node.attrs[name] : null);
  node.setAttribute = (name, value) => {
    node.attrs[name] = value;
  };
  node.getBoundingClientRect = () => {
    const w =
      node.children.length > 0
        ? node.children.reduce((sum, c) => sum + c.getBoundingClientRect().width, 0)
        : width;
    return { left, width: w, height: 30, top: 0, bottom: 30, right: left + w };
  };
  node.querySelectorAll = () => {
    const out = [];
    const walk = (n) => {
      for (const child of n.children) {
        if (
          child.tagName === "BUTTON" ||
          child.attrs.role === "button" ||
          "aria-label" in child.attrs
        ) {
          out.push(child);
        }
        walk(child);
      }
    };
    walk(node);
    return out;
  };
  node.closest = (selector) => {
    const needle = String(selector).replace(/^[.#]/, "");
    let cur = node;
    while (cur) {
      if (String(cur.className || "").includes(needle)) return cur;
      cur = cur.parentElement;
    }
    return null;
  };
  node.insertBefore = (child, ref) => {
    const index = node.children.indexOf(ref);
    node.children.splice(index < 0 ? node.children.length : index, 0, child);
    child.parentElement = node;
    return child;
  };
  node.appendChild = (child) => {
    node.children.push(child);
    child.parentElement = node;
    return child;
  };
  node.remove = () => {
    const parent = node.parentElement;
    if (parent) {
      const index = parent.children.indexOf(node);
      if (index >= 0) parent.children.splice(index, 1);
    }
    node.parentElement = null;
    return node;
  };
  node.removeChild = (child) => child.remove();

  for (const child of children) node.appendChild(child);
  return node;
}

/** Builds a NotebookLM style bar: left cluster, spacer, right cluster. */
function buildBar({ nested = false, rightLabels = ["Playback speed", "Picture in picture", "Fullscreen"] } = {}) {
  const play = el("button", { label: "Play", left: 12 });
  const mute = el("button", { label: "Mute", left: 54 });
  const leftCluster = el("div", { left: 8, children: [play, mute], className: "left-cluster" });

  const spacer = el("div", { left: 120, width: 220, className: "spacer" });

  const rightButtons = rightLabels.map((label, i) =>
    el("button", { label, left: 700 + i * 40 })
  );
  // Either the buttons sit directly in the bar's child, or one level deeper
  const rightCluster = nested
    ? el("div", {
        left: 690,
        className: "right-cluster",
        children: [el("div", { children: rightButtons, className: "inner" })],
      })
    : el("div", { left: 690, className: "right-cluster", children: rightButtons });

  return {
    bar: el("div", { children: [leftCluster, spacer, rightCluster], className: "control-bar" }),
    leftCluster,
    spacer,
    rightCluster,
    rightButtons,
  };
}

function buildGroup(buttons = []) {
  const group = el("div", { className: "lms-dock-group", children: buttons });
  return group;
}

/* -------------------------------------------------------------------------- */
/* Tests                                                                      */
/* -------------------------------------------------------------------------- */

test("Dock group anchors to the native right-hand cluster", () => {
  const { bar, rightCluster, spacer } = buildBar();
  const anchor = findRightClusterAnchor(bar);
  assert.equal(anchor, rightCluster, "the anchor is the right cluster element");
  assert.notEqual(anchor, spacer, "the group never lands after a flex spacer");

  const group = buildGroup([el("button", { label: "Toggle LM Subs captions (C)" })]);
  assert.equal(insertDockGroupBeforeRightCluster(bar, group), true);
  assert.equal(bar.children.indexOf(group), 2, "group sits before the right cluster");
  assert.equal(bar.children[3], rightCluster);
});

test("Anchor resolution survives nested button wrappers", () => {
  const { bar, rightCluster } = buildBar({ nested: true });
  const anchor = findRightClusterAnchor(bar);
  assert.equal(anchor, rightCluster, "walks up from the deep button to the bar child");
});

test("Anchor prefers the leftmost right-cluster control", () => {
  const { bar, rightButtons } = buildBar({
    rightLabels: ["Playback speed", "Picture in picture", "Fullscreen"],
  });
  const anchor = findRightClusterAnchor(bar);
  assert.ok(anchor, "an anchor is found");
  // The leftmost match is the playback speed button, so the group goes before
  // the whole cluster rather than in front of fullscreen only
  const leftmost = Math.min(...rightButtons.map((b) => b.getBoundingClientRect().left));
  assert.ok(
    anchor.getBoundingClientRect().left <= leftmost,
    "the group is placed in front of the entire right cluster"
  );
  for (const button of rightButtons) {
    assert.ok(
      anchor.querySelectorAll().includes(button),
      "the anchor wraps every right-cluster control"
    );
  }
});

test("Captions labels are only used as a fallback anchor", () => {
  const noCluster = el("div", {
    children: [
      el("button", { label: "Play", left: 10 }),
      el("button", { label: "Captions", left: 400 }),
    ],
  });
  assert.equal(
    findRightClusterAnchor(noCluster),
    noCluster.children[1],
    "falls back to a native captions button when no fullscreen cluster exists"
  );

  const bare = el("div", { children: [el("button", { label: "Play", left: 10 })] });
  assert.equal(findRightClusterAnchor(bare), null, "no anchor means append at the end");
  const group = buildGroup();
  assert.equal(insertDockGroupBeforeRightCluster(bare, group), false);
});

test("LM Subs buttons are never treated as their own anchor", () => {
  const { bar, rightCluster } = buildBar();
  const group = buildGroup([
    el("button", { label: "Toggle LM Subs captions (C)", left: 600, className: "lms-dock-cc" }),
  ]);
  bar.insertBefore(group, rightCluster);
  // A second mount must still resolve to the native cluster
  assert.equal(findRightClusterAnchor(bar), rightCluster);
});

test("Dock CSS keeps the group from crowding the native controls", () => {
  assert.match(DOCK_CSS, /\.lms-dock-group \{/);
  const block = DOCK_CSS.slice(DOCK_CSS.indexOf(".lms-dock-group {"));
  const groupBlock = block.slice(0, block.indexOf("}"));
  assert.match(groupBlock, /display: inline-flex/);
  assert.match(groupBlock, /flex: 0 0 auto/, "the group never soaks up free space");
  assert.match(groupBlock, /max-width: 60%/, "the group is capped against the bar width");
  assert.match(DOCK_CSS, /\.lms-dock-group\[data-compact="true"\]/);
  assert.match(DOCK_CSS, /\.lms-dock-btn \{[\s\S]*?flex: 0 0 auto/);
});

test("The dock mounts as one group and trims itself on a narrow bar", () => {
  const source = fs.readFileSync(
    path.resolve("src/content/player-overlay.js"),
    "utf8"
  );
  const mount = source.slice(
    source.indexOf("_mountNativeDock()"),
    source.indexOf("_renderDockButtons()")
  );

  assert.match(mount, /createElement\("div"\)/);
  assert.match(mount, /className = "lms-dock-group"/, "buttons mount inside one wrapper");
  assert.match(mount, /aria-label", "LM Subs caption controls"/);
  assert.match(mount, /insertDockGroupBeforeRightCluster\(bar, group\)/);
  assert.match(mount, /this\._fitDockGroupToBar\(bar, group, built\)/);

  const fitterStart = source.indexOf("_fitDockGroupToBar(bar, group, built) {");
  const fitter = source.slice(
    fitterStart,
    source.indexOf("_renderDockButtons()", fitterStart)
  );
  assert.match(fitter, /essential = new Set\(\["cc", "options"\]\)/);
  assert.match(fitter, /groupWidth <= barWidth \* 0\.45/);
  assert.match(fitter, /bar\.scrollWidth > bar\.clientWidth/, "an overflowing bar trims too");
  assert.match(fitter, /group\.dataset\.compact/);

  const teardownStart = source.indexOf("_teardownNativeDock() {");
  const teardown = source.slice(
    teardownStart,
    source.indexOf("_mountNativeDock() {", teardownStart)
  );
  assert.match(teardown, /this\.dockGroupEl\.remove\(\)/, "teardown removes the wrapper");
});
