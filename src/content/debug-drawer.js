/**
 * Shadow-DOM In-Page Debug Drawer (`src/content/debug-drawer.js`).
 *
 * Mounted ONLY when `settings.debugMode === true`.
 * Gives instant live visibility on `notebook.google.com` into:
 * - SSR `AF_initDataCallback` & `batchexecute` RPC detections
 * - Light-DOM + Shadow-DOM `<video>` discovery & overlay mount state
 * - Candidate Google FIFE URLs & Service Worker download / audio extraction bytes
 * - STT provider HTTP status, cue count, or exact error reason
 * - 1-click "Copy Debug Report" (strictly redacted; zero API keys).
 */

import { DOM_SELECTORS } from "../config/selectors.js";

const DRAWER_CSS = /* css */ `
  :host {
    all: initial;
    position: fixed;
    left: 14px;
    bottom: 14px;
    z-index: 2147483646;
    font-family: ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace;
    color: #e6edf3;
    pointer-events: auto;
  }

  .pill {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 7px 11px;
    background: rgba(13, 17, 23, 0.94);
    border: 1px solid rgba(255, 255, 255, 0.16);
    border-radius: 7px;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.45);
    color: #e6edf3;
    font-size: 11.5px;
    font-weight: 600;
    cursor: pointer;
    user-select: none;
  }

  .pill:hover {
    border-color: rgba(255, 255, 255, 0.32);
  }

  .dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: #3fb950;
  }
  .dot.error {
    background: #f85149;
  }

  .panel {
    width: 440px;
    max-width: calc(100vw - 28px);
    background: rgba(13, 17, 23, 0.96);
    border: 1px solid rgba(255, 255, 255, 0.16);
    border-radius: 9px;
    box-shadow: 0 14px 38px rgba(0, 0, 0, 0.55);
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }

  .panel[hidden], .pill[hidden] {
    display: none !important;
  }

  .hdr {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 10px;
    background: #161b22;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    font-size: 11.5px;
    font-weight: 600;
  }

  .hdr-actions {
    display: flex;
    gap: 5px;
  }

  button.act {
    appearance: none;
    border: 1px solid rgba(255, 255, 255, 0.16);
    background: #21262d;
    color: #e6edf3;
    border-radius: 5px;
    padding: 3px 7px;
    font-family: inherit;
    font-size: 10.5px;
    cursor: pointer;
  }
  button.act:hover {
    background: #30363d;
  }
  button.act.primary {
    border-color: rgba(56, 139, 253, 0.5);
    background: rgba(56, 139, 253, 0.18);
    color: #79c0ff;
  }

  .summary {
    padding: 6px 10px;
    font-size: 10.5px;
    line-height: 1.45;
    color: #8b949e;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    background: #0d1117;
  }

  .summary strong {
    color: #c9d1d9;
  }

  .logs {
    max-height: 210px;
    overflow-y: auto;
    padding: 6px 10px;
    font-size: 10.5px;
    line-height: 1.45;
    display: flex;
    flex-direction: column;
    gap: 3px;
  }

  .row {
    word-break: break-word;
    color: #c9d1d9;
  }
  .row .ts {
    color: #6e7681;
    margin-right: 5px;
  }
  .row .tag {
    display: inline-block;
    padding: 0 4px;
    border-radius: 3px;
    margin-right: 5px;
    font-size: 9.5px;
    font-weight: 700;
    background: rgba(110, 118, 129, 0.25);
    color: #c9d1d9;
  }
  .row.error {
    color: #ffa198;
  }
  .row.error .tag {
    background: rgba(248, 81, 73, 0.25);
    color: #ff7b72;
  }
  .row.ok .tag {
    background: rgba(63, 185, 80, 0.22);
    color: #56d364;
  }
`;

export class DebugDrawer {
  constructor({
    doc = globalThis.document,
    onForceScan = null,
    onCopyReport = null,
    onClear = null,
  } = {}) {
    this.doc = doc;
    this.onForceScan = onForceScan;
    this.onCopyReport = onCopyReport;
    this.onClear = onClear;
    this.host = null;
    this.collapsed = false;
    this.entries = [];
    this.summaryState = {
      artifacts: 0,
      videos: 0,
      status: "idle",
      permissionsOk: true,
    };
  }

  mount() {
    if (this.host || !this.doc?.body) return;
    const existing = this.doc.getElementById?.(DOM_SELECTORS.DEBUG_DRAWER_HOST_ID);
    if (existing) existing.remove?.();

    const host = this.doc.createElement("div");
    host.id = DOM_SELECTORS.DEBUG_DRAWER_HOST_ID;
    const shadow = host.attachShadow({ mode: "open" });

    const style = this.doc.createElement("style");
    style.textContent = DRAWER_CSS;

    const pill = this.doc.createElement("div");
    pill.className = "pill";
    pill.hidden = true;

    const dot = this.doc.createElement("span");
    dot.className = "dot";
    const pillLabel = this.doc.createElement("span");
    pillLabel.textContent = "LM Subs · Debug (0)";
    pill.append(dot, pillLabel);
    pill.addEventListener("click", () => {
      this.collapsed = false;
      this._syncVisibility();
    });

    const panel = this.doc.createElement("div");
    panel.className = "panel";

    const hdr = this.doc.createElement("div");
    hdr.className = "hdr";
    const title = this.doc.createElement("span");
    title.textContent = "LM Subs · Pipeline Monitor";

    const actions = this.doc.createElement("div");
    actions.className = "hdr-actions";

    const mkBtn = (label, cls, fn) => {
      const b = this.doc.createElement("button");
      b.type = "button";
      b.className = cls ? `act ${cls}` : "act";
      b.textContent = label;
      b.addEventListener("click", (e) => {
        e.stopPropagation();
        fn(b);
      });
      return b;
    };

    const scanBtn = mkBtn("Scan / Retry", "primary", () => this.onForceScan?.());
    const copyBtn = mkBtn("Copy Report", "", async (btn) => {
      if (!this.onCopyReport) return;
      const ok = await this.onCopyReport();
      btn.textContent = ok ? "Copied!" : "Copy Failed";
      setTimeout(() => {
        btn.textContent = "Copy Report";
      }, 1600);
    });
    const clearBtn = mkBtn("Clear", "", () => {
      this.entries = [];
      this.renderLogs();
      this.onClear?.();
    });
    const minBtn = mkBtn("_", "", () => {
      this.collapsed = true;
      this._syncVisibility();
    });

    actions.append(scanBtn, copyBtn, clearBtn, minBtn);
    hdr.append(title, actions);

    const summary = this.doc.createElement("div");
    summary.className = "summary";

    const logs = this.doc.createElement("div");
    logs.className = "logs";

    panel.append(hdr, summary, logs);
    shadow.append(style, pill, panel);
    this.doc.body.appendChild(host);

    this.host = host;
    this.els = { pill, dot, pillLabel, panel, summary, logs };
    this.renderSummary();
    this.renderLogs();
    this._syncVisibility();
  }

  _syncVisibility() {
    if (!this.els) return;
    this.els.pill.hidden = !this.collapsed;
    this.els.panel.hidden = this.collapsed;
  }

  updateSummary(partial = {}) {
    this.summaryState = { ...this.summaryState, ...partial };
    this.renderSummary();
  }

  renderSummary() {
    if (!this.els) return;
    const s = this.summaryState;
    const permText = s.permissionsOk ? "OK" : "MISSING CDN PERM";
    this.els.summary.textContent =
      `Artifacts: ${s.artifacts}  |  <video> bound: ${s.videos}  |  State: ${s.status}  |  Perms: ${permText}`;
  }

  pushEntry(entry) {
    if (!entry) return;
    this.entries.push(entry);
    if (this.entries.length > 80) {
      this.entries.shift();
    }
    this.renderLogs();
  }

  setEntries(list = []) {
    this.entries = Array.isArray(list) ? list.slice(-80) : [];
    this.renderLogs();
  }

  renderLogs() {
    if (!this.els) return;
    const hasError = this.entries.some((e) => e.level === "error");
    this.els.dot.className = hasError ? "dot error" : "dot";
    this.els.pillLabel.textContent = `LM Subs · Debug (${this.entries.length})`;

    const container = this.els.logs;
    while (container.firstChild) {
      container.removeChild(container.firstChild);
    }

    if (this.entries.length === 0) {
      const empty = this.doc.createElement("div");
      empty.className = "row";
      empty.textContent = "Waiting for NotebookLM Video Overview activity...";
      container.appendChild(empty);
      return;
    }

    for (const item of this.entries.slice(-50)) {
      const row = this.doc.createElement("div");
      row.className =
        item.level === "error"
          ? "row error"
          : item.level === "ok"
            ? "row ok"
            : "row";

      const ts = this.doc.createElement("span");
      ts.className = "ts";
      ts.textContent = String(item.ts || "").slice(11, 19) || "--:--:--";

      const tag = this.doc.createElement("span");
      tag.className = "tag";
      tag.textContent = item.layer || "LOG";

      const msg = this.doc.createElement("span");
      msg.textContent = `${item.event ? item.event + ": " : ""}${item.detail || ""}`;

      row.append(ts, tag, msg);
      container.appendChild(row);
    }
    container.scrollTop = container.scrollHeight;
  }

  destroy() {
    if (this.host) {
      this.host.remove?.();
      this.host = null;
      this.els = null;
    }
  }
}
