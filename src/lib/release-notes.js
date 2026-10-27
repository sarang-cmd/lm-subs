/**
 * Per-version release notes shared by the website, the toolbar popup, the
 * options page and the desktop update notification
 * (`src/lib/release-notes.js`).
 *
 * The hosted `docs/releases/latest.json` ships the same `notes` block for the
 * newest release, and this module is the offline fallback so an update alert
 * can still explain itself when the release server is unreachable.
 */

export const RELEASE_NOTES = Object.freeze({
  "0.2.8": Object.freeze({
    headline: "A lighter site, a deeper blog, and pages Google can read",
    highlights: Object.freeze([
      "Product screenshots load as WebP with a PNG fallback, cutting image weight by roughly two thirds",
      "The home page shows a two by two gallery of the player, the docked controls, statistics, and the install page",
      "Four new guides join the blog, and every article carries an on page index, a reading time, and next and previous links",
      "The setup guide, statistics, library, about, and welcome pages now ship real HTML, so search engines read them without running JavaScript",
      "Statistics labels match the extension exactly, including caption cues and median speed",
      "Caption buttons dock as one group in front of NotebookLM’s right-hand cluster, and a narrow play bar trims the extras instead of crowding the native controls",
    ]),
  }),
  "0.2.7": Object.freeze({
    headline: "Long Audio Overviews finish, and updates explain themselves",
    highlights: Object.freeze([
      "Audio Overviews download across six parallel streams, so a 20 minute podcast no longer outlives the background worker",
      "The update alert now lists what the new version changes instead of only naming the version",
      "Every page got roomier padding and wider content gutters, including the welcome page that opens on install",
      "New social preview cards for the site, blog and install page",
    ]),
  }),
  "0.2.6": Object.freeze({
    headline: "Controls live in the play bar, and captions scale with the player",
    highlights: Object.freeze([
      "CC and caption controls dock inside NotebookLM's own bottom play bar and fade with it, so nothing blinks between cues",
      "Captions resize with the player and sidebar, from the compact Studio view to fullscreen",
      "Picture in Picture keeps live subtitles",
      "Statistics match across the website, settings page and popup",
      "Six notification chime presets replace the system beep",
    ]),
  }),
});

export const LATEST_NOTES_VERSION = "0.2.8";

/** Returns `{ version, headline, highlights }` for a version, or null. */
export function getReleaseNotes(version) {
  const key = String(version || "").trim();
  const entry = RELEASE_NOTES[key];
  if (!entry) return null;
  return {
    version: key,
    headline: String(entry.headline || ""),
    highlights: Array.isArray(entry.highlights) ? [...entry.highlights] : [],
  };
}

/** Merges remote notes (from `latest.json`) with the local fallback. */
export function resolveReleaseNotes(version, remoteNotes = null) {
  const local = getReleaseNotes(version);
  const remoteHeadline = String(remoteNotes?.headline || "");
  const remoteHighlights = Array.isArray(remoteNotes?.highlights)
    ? remoteNotes.highlights.filter((line) => typeof line === "string" && line.trim())
    : [];

  if (local && remoteHighlights.length === 0 && !remoteHeadline) return local;
  if (remoteHighlights.length === 0 && !remoteHeadline && !local) return null;

  return {
    version: String(version || local?.version || ""),
    headline: remoteHeadline || local?.headline || "",
    highlights: remoteHighlights.length ? remoteHighlights : local?.highlights || [],
  };
}

/** One line per highlight, used by the notification center and popups. */
export function formatReleaseNotes(version, { maxItems = 4 } = {}) {
  const notes = resolveReleaseNotes(version);
  if (!notes || notes.highlights.length === 0) return "";
  return notes.highlights.slice(0, Math.max(1, maxItems)).join("\n");
}

/**
 * Renders a "What's new in vX" block into a container using DOM nodes only
 * (`innerHTML` is banned by the extension CSP). Returns true when something was
 * rendered so callers can toggle the container's visibility.
 */
export function renderReleaseNotes(container, notes, { version = "" } = {}) {
  if (!container || typeof document === "undefined") return false;

  while (container.firstChild) container.removeChild(container.firstChild);

  const resolved = resolveReleaseNotes(version, notes);
  if (!resolved || resolved.highlights.length === 0) {
    container.style.display = "none";
    return false;
  }

  container.style.display = "block";

  const heading = document.createElement("div");
  heading.className = "update-notes-heading";
  heading.appendChild(
    document.createTextNode(`What's new in v${resolved.version || version}`)
  );
  container.appendChild(heading);

  if (resolved.headline) {
    const lede = document.createElement("div");
    lede.className = "update-notes-lede";
    lede.appendChild(document.createTextNode(resolved.headline));
    container.appendChild(lede);
  }

  const list = document.createElement("ul");
  list.className = "update-notes-list";
  for (const line of resolved.highlights) {
    const item = document.createElement("li");
    item.appendChild(document.createTextNode(line));
    list.appendChild(item);
  }
  container.appendChild(list);
  return true;
}

/**
 * Builds the title, short body and list items for the "update available"
 * desktop alert. Chrome renders `items` as a multi line list where supported
 * and silently ignores them elsewhere, so the body always stands alone.
 */
export function buildUpdateNotification({ latestVersion = "", notes = null } = {}) {
  const resolved = resolveReleaseNotes(latestVersion, notes);
  const title = `Update available: LM Subs v${latestVersion}`;

  if (!resolved || resolved.highlights.length === 0) {
    return {
      title,
      body: "Open LM Subs in your toolbar to apply the update and reload.",
      items: [],
    };
  }

  const [first, ...rest] = resolved.highlights;
  const more = rest.length > 0 ? ` +${rest.length} more` : "";
  return {
    title,
    body: `${first}${more}`,
    items: resolved.highlights.slice(0, 5).map((line) => ({
      title: line,
      message: "",
    })),
  };
}
