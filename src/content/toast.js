/**
 * Isolated Shadow-DOM Status Toast (`src/content/toast.js`).
 *
 * Uses a closed ShadowRoot so NotebookLM's Angular Material styles cannot bleed
 * inward and our styles never touch the host document.
 */

import { DOM_SELECTORS } from "../config/selectors.js";

const TOAST_CSS = `
  :host {
    all: initial;
    position: fixed;
    right: 20px;
    bottom: 20px;
    z-index: 2147483646;
    pointer-events: none;
    font-family: "Plus Jakarta Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  }
  .toast {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    max-width: 380px;
    padding: 10px 14px;
    border-radius: 8px;
    background: #111315;
    color: #f6f7f8;
    border: 1px solid #272b33;
    font-size: 12px;
    line-height: 1.4;
    opacity: 0;
    transform: translateY(4px);
    transition: opacity 120ms ease, transform 120ms ease;
    pointer-events: auto;
  }
  .toast[data-visible="true"] {
    opacity: 1;
    transform: translateY(0);
  }
  @media (prefers-reduced-motion: reduce) {
    .toast {
      transition: none;
      transform: none;
    }
  }
  .dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    flex-shrink: 0;
    background: #9ca3af;
  }
  .toast[data-kind="working"] .dot {
    background: #3b82f6;
  }
  .toast[data-kind="success"] .dot {
    background: #22c55e;
  }
  .toast[data-kind="error"] .dot {
    background: #ef4444;
  }
  .body {
    display: flex;
    flex-direction: column;
    gap: 1px;
    min-width: 0;
  }
  .title {
    font-weight: 600;
    color: #fdfdfe;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .detail {
    font-size: 11.5px;
    color: #9ca3af;
    overflow: hidden;
    text-overflow: ellipsis;
  }
`;

export function createToastManager(doc = globalThis.document) {
  let host = null;
  let toastEl = null;
  let titleEl = null;
  let detailEl = null;
  let hideTimer = null;

  function ensureMounted() {
    if (!doc || !doc.body) return false;
    if (host && doc.body.contains(host)) return true;

    const existing = doc.getElementById(DOM_SELECTORS.TOAST_HOST_ID);
    if (existing) existing.remove();

    host = doc.createElement("div");
    host.id = DOM_SELECTORS.TOAST_HOST_ID;
    const shadow = host.attachShadow({ mode: "closed" });

    const style = doc.createElement("style");
    style.textContent = TOAST_CSS;

    toastEl = doc.createElement("div");
    toastEl.className = "toast";
    toastEl.setAttribute("role", "status");
    toastEl.setAttribute("aria-live", "polite");

    const dot = doc.createElement("span");
    dot.className = "dot";

    const body = doc.createElement("div");
    body.className = "body";

    titleEl = doc.createElement("div");
    titleEl.className = "title";

    detailEl = doc.createElement("div");
    detailEl.className = "detail";

    body.append(titleEl, detailEl);
    toastEl.append(dot, body);
    shadow.append(style, toastEl);
    doc.body.appendChild(host);
    return true;
  }

  function show({ title, detail = "", kind = "info", durationMs = 4200 } = {}) {
    if (!ensureMounted()) return;
    if (hideTimer) {
      clearTimeout(hideTimer);
      hideTimer = null;
    }

    toastEl.dataset.kind = kind;
    titleEl.textContent = String(title || "LM Subs");
    detailEl.textContent = String(detail || "");
    detailEl.style.display = detail ? "block" : "none";
    toastEl.dataset.visible = "true";

    if (durationMs > 0) {
      hideTimer = setTimeout(() => {
        if (toastEl) toastEl.dataset.visible = "false";
      }, durationMs);
    }
  }

  function hide() {
    if (hideTimer) {
      clearTimeout(hideTimer);
      hideTimer = null;
    }
    if (toastEl) {
      toastEl.dataset.visible = "false";
    }
  }

  return { show, hide };
}
