/**
 * Premade account avatars and address masking (`src/lib/avatars.js`).
 *
 * The web app used to print the signed-in address straight into the top bar,
 * which put a personal identifier on every page for anyone walking past the
 * screen. Two pieces replace it:
 *
 * 1. `maskEmail`, which keeps the first character and the domain so an account
 *    holder still recognises their own address, and hides the rest.
 * 2. A fixed set of illustrated faces. There is no upload anywhere: the choice
 *    is which drawing to use, so nothing a user picks has to be stored as a
 *    file, scanned, or hosted.
 *
 * The catalog is plain data and the resolution helpers are pure, so both can be
 * unit tested without a browser, and the same set renders in the 26px header
 * chip and the 34px picker grid from one description.
 */

export const DEFAULT_AVATAR_ID = "neutral";

/**
 * Every entry describes one face. `hairStyle` and `accessory` select which
 * paths `AvatarFace` draws, the colours are flat fills with no gradients, and
 * `disc` is the tint behind the head so each option stays distinct at 26px.
 */
export const AVATARS = Object.freeze([
  Object.freeze({
    id: "neutral",
    label: "Plain",
    hairStyle: "short",
    accessory: "none",
    skin: "#d8dde3",
    hair: "#8a919b",
    accent: "#8a919b",
    disc: "#edeff3",
  }),
  Object.freeze({
    id: "short",
    label: "Short hair",
    hairStyle: "short",
    accessory: "glasses",
    skin: "#f2d3b3",
    hair: "#2b2a28",
    accent: "#0055d4",
    disc: "#e8f0fe",
  }),
  Object.freeze({
    id: "curls",
    label: "Curls",
    hairStyle: "curls",
    accessory: "none",
    skin: "#c68a5e",
    hair: "#1f2933",
    accent: "#0e7490",
    disc: "#e3f2f0",
  }),
  Object.freeze({
    id: "knot",
    label: "Top knot",
    hairStyle: "knot",
    accessory: "none",
    skin: "#e0b188",
    hair: "#4a342a",
    accent: "#b45309",
    disc: "#fbf1e3",
  }),
  Object.freeze({
    id: "long",
    label: "Long hair",
    hairStyle: "long",
    accessory: "none",
    skin: "#a2673f",
    hair: "#1b1a19",
    accent: "#a16207",
    disc: "#f7ecdf",
  }),
  Object.freeze({
    id: "braids",
    label: "Braids",
    hairStyle: "braids",
    accessory: "none",
    skin: "#7a4a2b",
    hair: "#241c17",
    accent: "#15803d",
    disc: "#e9f3ea",
  }),
  Object.freeze({
    id: "cap",
    label: "Cap",
    hairStyle: "cap",
    accessory: "none",
    skin: "#f2d3b3",
    hair: "#6b4a2f",
    accent: "#0e7490",
    disc: "#e9eefb",
  }),
  Object.freeze({
    id: "beanie",
    label: "Beanie",
    hairStyle: "beanie",
    accessory: "none",
    skin: "#e0b188",
    hair: "#2b2a28",
    accent: "#b45309",
    disc: "#f6eee6",
  }),
  Object.freeze({
    id: "phones",
    label: "Headphones",
    hairStyle: "afro",
    accessory: "phones",
    skin: "#c68a5e",
    hair: "#241c17",
    accent: "#0055d4",
    disc: "#eef1f6",
  }),
]);

const AVATAR_BY_ID = new Map(AVATARS.map((avatar) => [avatar.id, avatar]));

export function getAvatar(id) {
  return AVATAR_BY_ID.get(String(id || "")) || AVATAR_BY_ID.get(DEFAULT_AVATAR_ID);
}

export function isKnownAvatar(id) {
  return AVATAR_BY_ID.has(String(id || ""));
}

/**
 * `a.person@example.com` becomes `a••••••@example.com`. The first character and
 * the domain survive so the account holder recognises the address, while the
 * bulk of the local part does not. Bullets are clamped between three and eight
 * so a short address is still meaningfully hidden and a long one cannot stretch
 * the header. Anything that is not a plain address returns an empty string, so
 * callers fall back to neutral copy instead of echoing unexpected input.
 */
export function maskEmail(email) {
  const value = String(email || "").trim();
  const at = value.lastIndexOf("@");
  if (at <= 0 || at === value.length - 1) return "";
  const local = value.slice(0, at);
  const domain = value.slice(at + 1);
  if (!domain.includes(".")) return "";
  const bulletCount = Math.min(Math.max(local.length - 1, 3), 8);
  return `${local[0]}${"•".repeat(bulletCount)}@${domain}`;
}

/**
 * An avatar choice is a pair of an id and the moment it was picked. The local
 * copy paints immediately and works offline; the cloud copy travels with the
 * account when preference sync is on. Newest wins, so a choice made offline
 * still survives the next pull, and anything unknown falls back to the plain
 * face rather than rendering an empty chip.
 */
function normalizeChoice(choice) {
  if (!choice || typeof choice !== "object") return null;
  if (!isKnownAvatar(choice.id)) return null;
  const at = Number.isFinite(Number(choice.at)) ? Number(choice.at) : 0;
  return { id: choice.id, at };
}

export function resolveAvatarChoice({ cloud, local } = {}) {
  const cloudChoice = normalizeChoice(cloud);
  const localChoice = normalizeChoice(local);
  if (cloudChoice && localChoice) {
    return cloudChoice.at >= localChoice.at ? cloudChoice : localChoice;
  }
  return (
    cloudChoice ||
    localChoice || { id: DEFAULT_AVATAR_ID, at: 0 }
  );
}

const AVATAR_STORAGE_KEY = "lmsubs_avatar_choice";

export function readLocalAvatarChoice() {
  if (typeof window === "undefined" || !window.localStorage) return null;
  try {
    const raw = window.localStorage.getItem(AVATAR_STORAGE_KEY);
    if (!raw) return null;
    return normalizeChoice(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function writeLocalAvatarChoice(choice) {
  const clean = normalizeChoice(choice);
  if (!clean) return null;
  if (typeof window === "undefined" || !window.localStorage) return clean;
  try {
    window.localStorage.setItem(AVATAR_STORAGE_KEY, JSON.stringify(clean));
  } catch {
    // Private browsing or a full quota: the in-memory choice still applies.
  }
  return clean;
}

export function clearLocalAvatarChoice() {
  if (typeof window === "undefined" || !window.localStorage) return;
  try {
    window.localStorage.removeItem(AVATAR_STORAGE_KEY);
  } catch {
    // Ignore
  }
}

/** `google` becomes `Google account`, `email` becomes `Email account`. */
export function accountProviderLabel(provider) {
  const value = String(provider || "email").toLowerCase();
  if (value === "google") return "Google account";
  if (value === "github") return "GitHub account";
  if (value === "neon-managed" || value === "neon") return "Managed account";
  return "Email account";
}
