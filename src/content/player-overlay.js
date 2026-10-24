/**
 * Synchronized Video Player Subtitle Overlay & Native PiP Track Bridge
 * (`src/content/player-overlay.js`).
 *
 * Attaches a closed ShadowRoot to the `<video>` container so captions and
 * controls render cleanly inside both inline Studio playback and Fullscreen,
 * while simultaneously populating a programmatic `TextTrack` (`VTTCue`) for
 * OS-level Picture-in-Picture windows.
 */

import { DOM_SELECTORS } from "../config/selectors.js";
import {
  findActiveCue,
  formatSrt,
  formatVtt,
  parseSubtitleText,
} from "../lib/subtitles.js";

const FONT_SIZES = ["small", "medium", "large", "xlarge"];
const FONT_SCALE_MAP = {
  small: "clamp(13px, 1.85cqh, 16px)",
  medium: "clamp(15px, 2.35cqh, 21px)",
  large: "clamp(18px, 2.95cqh, 26px)",
  xlarge: "clamp(21px, 3.55cqh, 32px)",
};

const OVERLAY_CSS = `
  :host {
    all: initial;
    position: absolute;
    inset: 0;
    pointer-events: none;
    z-index: 2147483640;
    container-type: size;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Inter, Roboto, sans-serif;
  }
  .toolbar {
    position: absolute;
    top: 52px;
    right: 14px;
    display: inline-flex;
    align-items: center;
    gap: 3px;
    padding: 4px 5px;
    border-radius: 4px;
    background: rgba(20, 20, 19, 0.92);
    border: 1px solid rgba(255, 255, 255, 0.16);
    pointer-events: auto;
    opacity: 0.95;
    font-variant-numeric: tabular-nums;
    transition: opacity 100ms linear;
  }
  .toolbar[data-idle="true"] {
    opacity: 0.24;
  }
  .toolbar:hover,
  .toolbar:focus-within {
    opacity: 1 !important;
  }
  button {
    all: unset;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
    padding: 4px 7px;
    border-radius: 3px;
    font-size: 11px;
    font-weight: 600;
    line-height: 1;
    color: #e6e4de;
    background: transparent;
    transition: background-color 90ms linear, color 90ms linear;
    user-select: none;
    white-space: nowrap;
  }
  button:hover {
    background: rgba(255, 255, 255, 0.12);
    color: #ffffff;
  }
  button:focus-visible {
    outline: 1.5px solid #e96a26;
    outline-offset: 1px;
  }
  button[data-active="true"] {
    background: #e96a26;
    color: #ffffff;
  }
  button[data-primary="true"] {
    background: #e96a26;
    color: #ffffff;
  }
  button[data-primary="true"]:hover {
    background: #d9531e;
  }
  button:disabled {
    opacity: 0.55;
    cursor: default;
  }
  .sep {
    width: 1px;
    height: 13px;
    background: rgba(255, 255, 255, 0.16);
    margin: 0 2px;
  }
  .status-pill {
    font-size: 11px;
    font-weight: 500;
    color: #d6d3cb;
    padding: 2px 6px;
    white-space: nowrap;
  }
  .status-pill[data-state="working"] {
    color: #e96a26;
  }
  .status-pill[data-state="error"] {
    color: #f87171;
  }
  .caption-stage {
    position: absolute;
    left: 6%;
    right: 6%;
    bottom: 54px;
    display: flex;
    justify-content: center;
    align-items: flex-end;
    pointer-events: none;
  }
  .caption-box {
    display: none;
    max-width: min(92%, 780px);
    padding: 6px 14px 7px;
    border-radius: 4px;
    background: rgba(16, 16, 15, 0.86);
    color: #f7f6f2;
    text-align: center;
    font-weight: 500;
    line-height: 1.38;
    letter-spacing: 0.005em;
    white-space: pre-line;
    border: 1px solid rgba(255, 255, 255, 0.1);
  }
  .caption-box[data-visible="true"] {
    display: inline-block;
  }
  input[type="file"] {
    display: none;
  }
`;

function slugifyFilename(title) {
  const slug = String(title || "notebooklm-video-overview")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
  return slug || "notebooklm-video-overview";
}

function triggerTextDownload(doc, content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = doc.createElement("a");
  a.href = url;
  a.download = filename;
  doc.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2500);
}

export class VideoSubtitleController {
  constructor(
    video,
    {
      doc = globalThis.document,
      initialFontSize = "medium",
      initialOffsetSec = 0,
      onRequestGenerate = () => {},
      onOffsetChange = () => {},
      onFontSizeChange = () => {},
      onImportSubtitles = () => {},
    } = {}
  ) {
    this.video = video;
    this.doc = doc;
    this.cues = [];
    this.title = "NotebookLM Video Overview";
    this.ccEnabled = true;
    this.fontSize = FONT_SIZES.includes(initialFontSize)
      ? initialFontSize
      : "medium";
    this.offsetSec = Number.isFinite(initialOffsetSec) ? initialOffsetSec : 0;
    this.statusState = "idle"; // "idle" | "working" | "ready" | "error"
    this.statusLabel = "";
    this.nativeTrack = null;
    this.inPiP = false;
    this.idleTimer = null;
    this.syncTimer = null;

    this.onRequestGenerate = onRequestGenerate;
    this.onOffsetChange = onOffsetChange;
    this.onFontSizeChange = onFontSizeChange;
    this.onImportSubtitles = onImportSubtitles;

    this._mount();
    this._bindEvents();
  }

  _resolveMountParent() {
    if (this.video?.parentElement) {
      return this.video.parentElement;
    }
    const root = this.video?.getRootNode?.();
    if (root && root !== this.doc && typeof root.appendChild === "function") {
      return root;
    }
    return null;
  }

  _ensureMounted() {
    const parent = this._resolveMountParent();
    if (!parent) return false;
    if (!this.host) {
      this._mount();
      return Boolean(this.host);
    }
    if (this.host.parentElement !== parent && parent !== this.host.getRootNode?.()) {
      try {
        if (parent.style) {
          const computedPos = globalThis.getComputedStyle?.(parent)?.position;
          if (!computedPos || computedPos === "static") {
            parent.style.position = "relative";
          }
        }
        parent.appendChild(this.host);
      } catch {
        // Ignore reparent race
      }
    }
    return true;
  }

  _mount() {
    const parent = this._resolveMountParent();
    if (!parent) return;

    if (parent.style) {
      const computedPos = globalThis.getComputedStyle?.(parent)?.position;
      if (!computedPos || computedPos === "static") {
        parent.style.position = "relative";
      }
    }

    const old = parent.querySelector?.(`.${DOM_SELECTORS.OVERLAY_HOST_CLASS}`);
    if (old) old.remove();

    this.host = this.doc.createElement("div");
    this.host.className = DOM_SELECTORS.OVERLAY_HOST_CLASS;
    const shadow = this.host.attachShadow({ mode: "closed" });

    const style = this.doc.createElement("style");
    style.textContent = OVERLAY_CSS;

    this.toolbar = this.doc.createElement("div");
    this.toolbar.className = "toolbar";

    this.ccBtn = this.doc.createElement("button");
    this.ccBtn.type = "button";
    this.ccBtn.title = "Toggle subtitles (C)";
    this.ccBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      if (this.cues.length === 0 && this.statusState !== "working") {
        this.onRequestGenerate({ force: true });
        return;
      }
      this.ccEnabled = !this.ccEnabled;
      this._syncTrackVisibility();
      this._renderToolbar();
      this._renderActiveCue();
    });

    this.statusEl = this.doc.createElement("span");
    this.statusEl.className = "status-pill";

    this.controlsGroup = this.doc.createElement("span");
    this.controlsGroup.style.display = "inline-flex";
    this.controlsGroup.style.alignItems = "center";
    this.controlsGroup.style.gap = "3px";

    const sep1 = this.doc.createElement("span");
    sep1.className = "sep";

    this.sizeDownBtn = this._makeBtn("A-", "Smaller captions", () =>
      this._stepFontSize(-1)
    );
    this.sizeUpBtn = this._makeBtn("A+", "Larger captions", () =>
      this._stepFontSize(1)
    );

    const sep2 = this.doc.createElement("span");
    sep2.className = "sep";

    this.offsetMinusBtn = this._makeBtn("-0.25s", "Shift subtitles earlier", () =>
      this._adjustOffset(-0.25)
    );
    this.offsetLabelBtn = this._makeBtn("0.0s", "Reset timing offset", () =>
      this._resetOffset()
    );
    this.offsetPlusBtn = this._makeBtn("+0.25s", "Shift subtitles later", () =>
      this._adjustOffset(0.25)
    );

    const sep3 = this.doc.createElement("span");
    sep3.className = "sep";

    this.srtBtn = this._makeBtn(".SRT", "Download SubRip (.srt)", () => {
      if (this.cues.length === 0) return;
      triggerTextDownload(
        this.doc,
        formatSrt(this._shiftedCues()),
        `${slugifyFilename(this.title)}.srt`,
        "application/x-subrip;charset=utf-8"
      );
    });

    this.vttBtn = this._makeBtn(".VTT", "Download WebVTT (.vtt)", () => {
      if (this.cues.length === 0) return;
      triggerTextDownload(
        this.doc,
        formatVtt(this._shiftedCues()),
        `${slugifyFilename(this.title)}.vtt`,
        "text/vtt;charset=utf-8"
      );
    });

    this.fileInput = this.doc.createElement("input");
    this.fileInput.type = "file";
    this.fileInput.accept = ".srt,.vtt,text/vtt,text/plain";
    this.fileInput.addEventListener("change", async () => {
      const file = this.fileInput.files?.[0];
      if (!file) return;
      const raw = await file.text();
      const parsed = parseSubtitleText(raw);
      if (parsed.length > 0) {
        this.setCues(parsed, { title: this.title || file.name });
        this.onImportSubtitles(parsed, file.name);
      }
      this.fileInput.value = "";
    });

    this.importBtn = this._makeBtn("Import", "Load external .srt or .vtt file", () => {
      this.fileInput.click();
    });

    this.regenBtn = this._makeBtn("Retry", "Regenerate subtitles with AI", () => {
      this.onRequestGenerate({ force: true });
    });

    this.controlsGroup.append(
      sep1,
      this.sizeDownBtn,
      this.sizeUpBtn,
      sep2,
      this.offsetMinusBtn,
      this.offsetLabelBtn,
      this.offsetPlusBtn,
      sep3,
      this.srtBtn,
      this.vttBtn
    );

    this.toolbar.append(
      this.ccBtn,
      this.statusEl,
      this.controlsGroup,
      this.importBtn,
      this.regenBtn,
      this.fileInput
    );

    const stage = this.doc.createElement("div");
    stage.className = "caption-stage";
    this.captionBox = this.doc.createElement("div");
    this.captionBox.className = "caption-box";
    stage.appendChild(this.captionBox);

    shadow.append(style, stage, this.toolbar);
    parent.appendChild(this.host);

    this._applyFontSize();
    this._renderToolbar();
  }

  _makeBtn(label, title, onClick) {
    const btn = this.doc.createElement("button");
    btn.type = "button";
    btn.textContent = label;
    btn.title = title;
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      onClick();
    });
    return btn;
  }

  _bindEvents() {
    this._onTimeChange = () => {
      this._ensureMounted();
      this._renderActiveCue();
    };
    this._onPlay = () => {
      this._ensureMounted();
      this._startHighFreqSync();
      this._scheduleIdleFade();
    };
    this._onPause = () => {
      this._stopHighFreqSync();
      if (this.toolbar) this.toolbar.dataset.idle = "false";
      this._renderActiveCue();
    };
    this._onEnterPiP = () => {
      this.inPiP = true;
      this._syncTrackVisibility();
      this._renderActiveCue();
    };
    this._onLeavePiP = () => {
      this.inPiP = false;
      this._syncTrackVisibility();
      this._renderActiveCue();
    };
    this._onPointerMove = () => this._scheduleIdleFade();

    this.video.addEventListener("timeupdate", this._onTimeChange);
    this.video.addEventListener("seeking", this._onTimeChange);
    this.video.addEventListener("seeked", this._onTimeChange);
    this.video.addEventListener("play", this._onPlay);
    this.video.addEventListener("pause", this._onPause);
    this.video.addEventListener("enterpictureinpicture", this._onEnterPiP);
    this.video.addEventListener("leavepictureinpicture", this._onLeavePiP);
    this.video.parentElement?.addEventListener("mousemove", this._onPointerMove, {
      passive: true,
    });
  }

  _startHighFreqSync() {
    if (this.syncTimer) return;
    this.syncTimer = setInterval(() => this._renderActiveCue(), 100);
  }

  _stopHighFreqSync() {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }
  }

  _scheduleIdleFade() {
    if (!this.toolbar) return;
    this.toolbar.dataset.idle = "false";
    if (this.idleTimer) clearTimeout(this.idleTimer);
    if (!this.video.paused && this.statusState !== "working") {
      this.idleTimer = setTimeout(() => {
        if (this.toolbar && !this.video.paused) {
          this.toolbar.dataset.idle = "true";
        }
      }, 2800);
    }
  }

  _stepFontSize(delta) {
    const idx = FONT_SIZES.indexOf(this.fontSize);
    const nextIdx = Math.max(0, Math.min(FONT_SIZES.length - 1, idx + delta));
    this.fontSize = FONT_SIZES[nextIdx];
    this._applyFontSize();
    this.onFontSizeChange(this.fontSize);
  }

  _applyFontSize() {
    if (this.captionBox) {
      this.captionBox.style.fontSize =
        FONT_SCALE_MAP[this.fontSize] || FONT_SCALE_MAP.medium;
    }
  }

  _adjustOffset(delta) {
    this.offsetSec = Math.round((this.offsetSec + delta) * 100) / 100;
    this._syncNativeTextTrack();
    this._renderToolbar();
    this._renderActiveCue();
    this.onOffsetChange(this.offsetSec);
  }

  _resetOffset() {
    this.offsetSec = 0;
    this._syncNativeTextTrack();
    this._renderToolbar();
    this._renderActiveCue();
    this.onOffsetChange(0);
  }

  _shiftedCues() {
    if (!this.offsetSec) return this.cues;
    return this.cues.map((c) => ({
      ...c,
      startSec: Math.max(0, Math.round((c.startSec + this.offsetSec) * 1000) / 1000),
      endSec: Math.max(0.25, Math.round((c.endSec + this.offsetSec) * 1000) / 1000),
    }));
  }

  setSettings({ fontSize, subtitleOffsetSec } = {}) {
    if (fontSize && FONT_SIZES.includes(fontSize)) {
      this.fontSize = fontSize;
      this._applyFontSize();
    }
    if (Number.isFinite(subtitleOffsetSec)) {
      this.offsetSec = subtitleOffsetSec;
      this._syncNativeTextTrack();
      this._renderToolbar();
      this._renderActiveCue();
    }
  }

  setStatus(state, label = "") {
    this._ensureMounted();
    this.statusState = state;
    this.statusLabel = label;
    if (this.toolbar && state === "working") {
      this.toolbar.dataset.idle = "false";
    }
    this._renderToolbar();
  }

  toggleSubtitles() {
    if (this.cues.length === 0) return;
    this.ccEnabled = !this.ccEnabled;
    this._syncTrackVisibility();
    this._renderToolbar();
    this._renderActiveCue();
  }

  setCues(cues, { title, language = "en" } = {}) {
    this._ensureMounted();
    this.cues = Array.isArray(cues) ? cues : [];
    if (title) this.title = title;
    this.language = language || "en";
    this.statusState = this.cues.length > 0 ? "ready" : "idle";
    this.statusLabel = "";
    this._syncNativeTextTrack();
    this._renderToolbar();
    this._renderActiveCue();
    this._scheduleIdleFade();
  }

  _syncNativeTextTrack() {
    if (typeof this.video.addTextTrack !== "function" || typeof VTTCue === "undefined") {
      return;
    }
    try {
      if (!this.nativeTrack) {
        this.nativeTrack = this.video.addTextTrack(
          "subtitles",
          "NotebookLM Subtitles",
          this.language || "en"
        );
      }
      if (this.nativeTrack.cues) {
        while (this.nativeTrack.cues.length > 0) {
          this.nativeTrack.removeCue(this.nativeTrack.cues[0]);
        }
      }
      for (const cue of this._shiftedCues()) {
        const vttCue = new VTTCue(cue.startSec, cue.endSec, cue.text);
        this.nativeTrack.addCue(vttCue);
      }
      this._syncTrackVisibility();
    } catch {
      // Non-fatal in headless / mock environments
    }
  }

  _syncTrackVisibility() {
    if (!this.nativeTrack) return;
    // Show native track only inside Picture-in-Picture so inline mode uses our crisp Shadow-DOM overlay
    this.nativeTrack.mode =
      this.ccEnabled && this.inPiP && this.cues.length > 0 ? "showing" : "hidden";
  }

  _renderToolbar() {
    if (!this.toolbar) return;
    const hasCues = this.cues.length > 0;
    const isWorking = this.statusState === "working";

    if (isWorking) {
      this.ccBtn.textContent = "CC";
      this.ccBtn.dataset.active = "false";
      this.ccBtn.dataset.primary = "false";
      this.ccBtn.disabled = true;
    } else if (hasCues) {
      this.ccBtn.textContent = "CC";
      this.ccBtn.dataset.active = this.ccEnabled ? "true" : "false";
      this.ccBtn.dataset.primary = "false";
      this.ccBtn.disabled = false;
    } else {
      this.ccBtn.textContent = "CC · Generate Subtitles";
      this.ccBtn.dataset.active = "false";
      this.ccBtn.dataset.primary = "true";
      this.ccBtn.disabled = false;
    }

    if (this.statusLabel) {
      this.statusEl.style.display = "inline-block";
      this.statusEl.dataset.state = this.statusState;
      this.statusEl.textContent = this.statusLabel;
    } else {
      this.statusEl.style.display = "none";
    }

    this.controlsGroup.style.display = hasCues ? "inline-flex" : "none";
    this.regenBtn.style.display =
      hasCues || this.statusState === "error" ? "inline-flex" : "none";
    this.regenBtn.textContent = hasCues ? "Regen" : "Retry";
    this.regenBtn.disabled = isWorking;

    const sign = this.offsetSec > 0 ? "+" : "";
    this.offsetLabelBtn.textContent = `${sign}${this.offsetSec.toFixed(2)}s`;
  }

  _renderActiveCue() {
    if (!this.captionBox) return;
    if (!this.ccEnabled || this.inPiP || this.cues.length === 0) {
      this.captionBox.dataset.visible = "false";
      return;
    }

    const effectiveTime = (this.video.currentTime || 0) - this.offsetSec;
    const active = findActiveCue(this.cues, effectiveTime);
    if (!active) {
      this.captionBox.dataset.visible = "false";
      return;
    }

    const prefix = active.speaker ? `[${active.speaker}] ` : "";
    this.captionBox.textContent = `${prefix}${active.text}`;
    this.captionBox.dataset.visible = "true";
  }

  destroy() {
    this._stopHighFreqSync();
    if (this.idleTimer) clearTimeout(this.idleTimer);
    this.video.removeEventListener("timeupdate", this._onTimeChange);
    this.video.removeEventListener("seeking", this._onTimeChange);
    this.video.removeEventListener("seeked", this._onTimeChange);
    this.video.removeEventListener("play", this._onPlay);
    this.video.removeEventListener("pause", this._onPause);
    this.video.removeEventListener("enterpictureinpicture", this._onEnterPiP);
    this.video.removeEventListener("leavepictureinpicture", this._onLeavePiP);
    this.host?.remove();
  }
}
