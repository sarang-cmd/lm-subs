/**
 * Extension download tracking (`src/lib/downloads.js`).
 *
 * Fires one anonymous beacon when a visitor takes the extension zip, so the
 * admin dashboard can show how a release spreads. It reports the version, the
 * channel and the page that offered the file, and nothing else: no IP address,
 * no account identifier, no full user agent string. The server stores only that
 * plus the browser family and the country Vercel already resolves at the edge.
 *
 * Every failure is swallowed. A blocked beacon must never interrupt the
 * download the visitor just asked for.
 */

import { LATEST_NOTES_VERSION } from "./release-notes.js";

export const DOWNLOAD_VERSION = LATEST_NOTES_VERSION;

export function trackDownload({
  version = DOWNLOAD_VERSION,
  channel = "site",
  source = "",
} = {}) {
  try {
    const payload = JSON.stringify({
      version: String(version || "").slice(0, 24),
      channel: String(channel || "site").slice(0, 16),
      source: String(source || "").slice(0, 40),
    });

    if (
      typeof navigator !== "undefined" &&
      typeof navigator.sendBeacon === "function"
    ) {
      const queued = navigator.sendBeacon(
        "/api/downloads",
        new Blob([payload], { type: "application/json" })
      );
      if (queued) return true;
    }

    if (typeof fetch === "function") {
      fetch("/api/downloads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payload,
        keepalive: true,
      }).catch(() => {});
      return true;
    }
  } catch {
    // Tracking is best effort by design.
  }
  return false;
}
