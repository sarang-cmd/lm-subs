/**
 * Isolated Shadow-DOM Status and Action Toast (`src/content/toast.js`).
 *
 * Uses a closed ShadowRoot so NotebookLM's Angular Material styles cannot bleed
 * inward and our styles never touch the host document. Renders the genuine
 * LM Subs squircle brand mark via Trusted-Types-safe SVG DOM APIs.
 */

import { DOM_SELECTORS } from "../config/selectors.js";
import { createBrandLogoElement } from "../lib/brand-logo.js";

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
    max-width: 430px;
    padding: 9px 11px 9px 11px;
    border-radius: 9px;
    background: #111315;
    color: #f6f7f8;
    border: 1px solid #272b33;
    font-size: 12px;
    line-height: 1.4;
    opacity: 0;
    transform: translateY(4px);
    transition: opacity 120ms ease, transform 120ms ease;
    pointer-events: none;
  }
  .toast[data-visible="true"] {
    opacity: 1;
    transform: translateY(0);
    pointer-events: auto;
  }
  @media (prefers-reduced-motion: reduce) {
    .toast {
      transition: none;
      transform: none;
    }
  }
  .logo-wrap {
    position: relative;
    width: 26px;
    height: 26px;
    flex-shrink: 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }
  .brand-logo {
    width: 26px;
    height: 26px;
    display: block;
    border-radius: 6px;
  }
  .dot {
    position: absolute;
    right: -2px;
    bottom: -2px;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    border: 1.5px solid #111315;
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
    flex: 1;
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
  .action-btn {
    all: unset;
    cursor: pointer;
    padding: 4px 8px;
    border-radius: 5px;
    background: #0055d4;
    color: #fdfdfe;
    font-size: 11px;
    font-weight: 600;
    white-space: nowrap;
    flex-shrink: 0;
  }
  .action-btn:hover {
    background: #0044aa;
  }
  .action-btn:focus-visible,
  .close-btn:focus-visible {
    outline: 2px solid #3b82f6;
    outline-offset: 1px;
  }
  .close-btn {
    all: unset;
    cursor: pointer;
    padding: 2px 5px;
    border-radius: 4px;
    color: #9ca3af;
    font-size: 14px;
    line-height: 1;
    flex-shrink: 0;
  }
  .close-btn:hover {
    color: #fdfdfe;
    background: rgba(255, 255, 255, 0.1);
  }
`;

export function createToastManager(doc = globalThis.document) {
  let host = null;
  let toastEl = null;
  let titleEl = null;
  let detailEl = null;
  let actionBtn = null;
  let closeBtn = null;
  let currentAction = null;
  let hideTimer = null;

  function hide() {
    if (hideTimer) {
      clearTimeout(hideTimer);
      hideTimer = null;
    }
    currentAction = null;
    if (toastEl) {
      toastEl.dataset.visible = "false";
    }
  }

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
    toastEl.setAttribute?.("role", "status");
    toastEl.setAttribute?.("aria-live", "polite");

    const logoWrap = doc.createElement("span");
    logoWrap.className = "logo-wrap";
    const logoMark = createBrandLogoElement(doc, {
      size: 26,
      className: "brand-logo",
    });
    const dot = doc.createElement("span");
    dot.className = "dot";
    logoWrap.append(logoMark, dot);

    const body = doc.createElement("div");
    body.className = "body";

    titleEl = doc.createElement("div");
    titleEl.className = "title";

    detailEl = doc.createElement("div");
    detailEl.className = "detail";

    actionBtn = doc.createElement("button");
    actionBtn.type = "button";
    actionBtn.className = "action-btn";
    actionBtn.style.display = "none";
    actionBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      const fn = currentAction;
      hide();
      if (typeof fn === "function") fn();
    });

    closeBtn = doc.createElement("button");
    closeBtn.type = "button";
    closeBtn.className = "close-btn";
    closeBtn.setAttribute?.("aria-label", "Dismiss notification");
    closeBtn.textContent = "×";
    closeBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      hide();
    });

    body.append(titleEl, detailEl);
    toastEl.append(logoWrap, body, actionBtn, closeBtn);
    shadow.append(style, toastEl);
    doc.body.appendChild(host);
    return true;
  }

  function show({
    title,
    detail = "",
    kind = "info",
    durationMs = 4200,
    actionLabel = "",
    onAction = null,
  } = {}) {
    if (!ensureMounted()) return;
    if (hideTimer) {
      clearTimeout(hideTimer);
      hideTimer = null;
    }

    toastEl.dataset.kind = kind;
    titleEl.textContent = String(title || "LM Subs");
    detailEl.textContent = String(detail || "");
    detailEl.style.display = detail ? "block" : "none";

    if (actionLabel && typeof onAction === "function") {
      currentAction = onAction;
      actionBtn.textContent = String(actionLabel);
      actionBtn.style.display = "inline-flex";
    } else {
      currentAction = null;
      actionBtn.style.display = "none";
    }

    toastEl.dataset.visible = "true";

    if (durationMs > 0) {
      hideTimer = setTimeout(() => {
        if (toastEl) toastEl.dataset.visible = "false";
      }, durationMs);
    }
  }

  return { show, hide };
}
