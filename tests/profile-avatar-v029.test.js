import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  AVATARS,
  DEFAULT_AVATAR_ID,
  accountProviderLabel,
  getAvatar,
  isKnownAvatar,
  maskEmail,
  resolveAvatarChoice,
} from "../src/lib/avatars.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");

function readSource(relPath) {
  return fs.readFileSync(path.join(repoRoot, relPath), "utf8");
}

test("Masked addresses keep the first character and the domain", () => {
  // Only the first character survives; the local part length sets the bullets.
  assert.equal(maskEmail("ada@example.com"), "a•••@example.com");
  assert.equal(maskEmail("s.brawl@gmail.com"), "s••••••@gmail.com");
  // Surrounding whitespace is trimmed before masking.
  assert.equal(maskEmail("  ada@example.com  "), "a•••@example.com");
});

test("Masking hides short local parts and caps long ones", () => {
  // A one character local part still gets three bullets, so it stays hidden.
  assert.equal(maskEmail("a@example.com"), "a•••@example.com");
  // Bullets stop at eight, so a long address cannot stretch the top bar.
  const long = maskEmail("abcdefghijklmnopqrst@example.com");
  assert.equal(long, "a••••••••@example.com");
});

test("Masking refuses to echo anything that is not an address", () => {
  assert.equal(maskEmail(""), "");
  assert.equal(maskEmail(null), "");
  assert.equal(maskEmail(undefined), "");
  assert.equal(maskEmail("not-an-email"), "");
  assert.equal(maskEmail("@example.com"), "");
  assert.equal(maskEmail("ada@"), "");
  assert.equal(maskEmail("ada@localhost"), "");
});

test("The avatar catalog is a closed set with a plain default face", () => {
  assert.equal(AVATARS.length, 9);
  const ids = AVATARS.map((a) => a.id);
  assert.equal(new Set(ids).size, ids.length, "avatar ids must be unique");
  assert.ok(ids.includes(DEFAULT_AVATAR_ID));
  assert.equal(getAvatar("does-not-exist").id, DEFAULT_AVATAR_ID);
  assert.equal(isKnownAvatar("does-not-exist"), false);
  assert.equal(isKnownAvatar(DEFAULT_AVATAR_ID), true);

  for (const avatar of AVATARS) {
    for (const key of ["id", "label", "hairStyle", "accessory", "skin", "hair", "accent", "disc"]) {
      assert.ok(avatar[key], `${avatar.id} is missing ${key}`);
    }
    // Sentence case labels, never an all-caps eyebrow.
    assert.equal(avatar.label, avatar.label.toLowerCase() === avatar.label
      ? avatar.label
      : avatar.label);
    assert.notEqual(avatar.label, avatar.label.toUpperCase());
    assert.ok(!/\p{Extended_Pictographic}/u.test(avatar.label), "no emoji in labels");
  }
});

test("Newest avatar choice wins, unknown ids fall back to the plain face", () => {
  const fallback = resolveAvatarChoice({});
  assert.equal(fallback.id, DEFAULT_AVATAR_ID);

  assert.equal(
    resolveAvatarChoice({
      cloud: { id: "curls", at: 100 },
      local: { id: "cap", at: 200 },
    }).id,
    "cap"
  );

  assert.equal(
    resolveAvatarChoice({
      cloud: { id: "curls", at: 300 },
      local: { id: "cap", at: 200 },
    }).id,
    "curls"
  );

  // A stale cloud value must not override a pick made offline a moment ago.
  assert.equal(
    resolveAvatarChoice({
      cloud: { id: "curls", at: 100 },
      local: { id: "nonsense", at: 900 },
    }).id,
    "curls"
  );

  assert.equal(resolveAvatarChoice({ cloud: { id: "nonsense", at: 100 } }).id, DEFAULT_AVATAR_ID);
});

test("Provider labels read as sentences for every sign-in method", () => {
  assert.equal(accountProviderLabel("google"), "Google account");
  assert.equal(accountProviderLabel("github"), "GitHub account");
  assert.equal(accountProviderLabel("email"), "Email account");
  assert.equal(accountProviderLabel(undefined), "Email account");
});

test("The top bar shows the account chip instead of the address", () => {
  const app = readSource("src/web/App.jsx");
  assert.ok(app.includes("<ProfileMenu"), "header must render the profile menu");
  // The chip used to print the address in full, visible to anyone nearby.
  assert.ok(!app.includes("{user.email}"), "header must not print the raw address");
  assert.ok(!app.includes("{user?.email}"), "header must not print the raw address");
  assert.ok(app.includes("avatarId={avatarId}"), "chip renders the chosen face");
});

test("Every address the site shows is routed through maskEmail", () => {
  for (const file of [
    "App.jsx",
    "LibraryView.jsx",
    "StatsView.jsx",
    "WelcomeView.jsx",
    "AdminView.jsx",
  ]) {
    const source = readSource(path.join("src/web", file));
    const offenders = source
      .split("\n")
      .map((line, index) => ({ line, index: index + 1 }))
      .filter(
        ({ line }) =>
          /\{user\.email\}|\{user\?\.email\}|\$\{user\.email\}|\$\{user\?\.email\}|\$\{meJson\.user\.email\}|\$\{extRes\.cloudEmail|\$\{extState\?\.cloudEmail/.test(
            line
          ) && !line.includes("maskEmail")
      );
    assert.deepEqual(
      offenders.map((o) => `${file}:${o.index}`),
      [],
      `${file} prints an unmasked address`
    );
  }
});

test("Avatars are chosen from premade art, never uploaded", () => {
  const webDir = path.join(repoRoot, "src/web");
  for (const file of fs.readdirSync(webDir)) {
    if (!file.endsWith(".jsx")) continue;
    const source = fs.readFileSync(path.join(webDir, file), "utf8");
    assert.ok(!/type="file"/i.test(source), `${file} must not offer a file picker`);
    assert.ok(!/accept="image/i.test(source), `${file} must not accept image uploads`);
  }
  const menu = readSource("src/web/ProfileMenu.jsx");
  assert.ok(menu.includes("AVATARS.map"), "picker iterates the premade set");
  assert.ok(menu.includes("aria-pressed"), "options expose their selected state");
});

test("The account chip and picker are styled and keyboard reachable", () => {
  const css = readSource("docs/styles.css");
  for (const selector of [
    ".account-btn",
    ".account-popover",
    ".avatar-grid",
    ".avatar-option",
    ".account-actions",
  ]) {
    assert.ok(css.includes(selector), `styles.css is missing ${selector}`);
  }
  assert.ok(css.includes(".account-btn:focus-visible"), "chip needs a focus ring");
  assert.ok(css.includes(".avatar-option:focus-visible"), "options need a focus ring");

  const menu = readSource("src/web/ProfileMenu.jsx");
  assert.ok(menu.includes('aria-label="Account menu"'), "chip needs an accessible name");
  assert.ok(menu.includes('aria-haspopup="dialog"'), "chip announces its panel");
  assert.ok(menu.includes('id="avatar-grid-label"'), "picker group is labelled");
});
