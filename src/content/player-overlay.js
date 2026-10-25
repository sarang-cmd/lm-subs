/**
 * Synchronized Video Player Subtitle Overlay, Interactive Transcript Drawer,
 * Keyboard Shortcuts Popover, and Native PiP Track Bridge (`src/content/player-overlay.js`).
 *
 * Attaches a closed ShadowRoot to the `<video>` container so captions, the
 * searchable click-to-seek transcript drawer, and export controls render cleanly
 * inside both inline Studio playback and Fullscreen, while populating a
 * programmatic `TextTrack` (`VTTCue`) for OS-level Picture-in-Picture windows.
 */

import { DOM_SELECTORS } from "../config/selectors.js";
import {
  findActiveCue,
  formatTimestamp,
  formatTxt,
  parseSubtitleText,
  serializeSubtitles,
} from "../lib/subtitles.js";

const FONT_SIZES = ["small", "medium", "large", "xlarge"];
const CAPTION_STYLES = ["classic", "contrast", "minimal"];
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
    font-family: "Plus Jakarta Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  }
  .toolbar {
    position: absolute;
    top: 52px;
    right: 14px;
    display: inline-flex;
    align-items: center;
    flex-wrap: wrap;
    justify-content: flex-end;
    max-width: calc(100% - 28px);
    gap: 3px;
    padding: 4px 6px;
    border-radius: 7px;
    background: rgba(23, 26, 31, 0.95);
    border: 1px solid #272b33;
    pointer-events: auto;
    opacity: 0.96;
    font-variant-numeric: tabular-nums;
    transition: opacity 120ms ease;
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
    border-radius: 5px;
    font-size: 11px;
    font-weight: 600;
    line-height: 1;
    color: #e5e7eb;
    background: transparent;
    transition: background-color 100ms ease, color 100ms ease;
    user-select: none;
    white-space: nowrap;
  }
  button:hover {
    background: rgba(255, 255, 255, 0.12);
    color: #fdfdfe;
  }
  button:focus-visible,
  input:focus-visible {
    outline: 2px solid #3b82f6;
    outline-offset: 1px;
  }
  button[data-active="true"] {
    background: #0055d4;
    color: #fdfdfe;
  }
  button[data-primary="true"] {
    background: #0055d4;
    color: #fdfdfe;
  }
  button[data-primary="true"]:hover {
    background: #0044aa;
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
    color: #d1d5db;
    padding: 2px 6px;
    white-space: nowrap;
  }
  .status-pill[data-state="working"] {
    color: #93c5fd;
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
  .caption-stage[data-drawer-open="true"] {
    right: calc(min(320px, 44%) + 26px);
  }
  .caption-box {
    display: none;
    max-width: min(92%, 780px);
    padding: 7px 15px 8px;
    border-radius: 7px;
    background: rgba(11, 13, 16, 0.88);
    color: #fdfdfe;
    text-align: center;
    font-weight: 500;
    line-height: 1.4;
    letter-spacing: 0.005em;
    white-space: pre-line;
    border: 1px solid rgba(255, 255, 255, 0.12);
  }
  .caption-box[data-style="contrast"] {
    background: #050608;
    color: #fdfdfe;
    border: 1px solid #3b82f6;
    font-weight: 600;
  }
  .caption-box[data-style="minimal"] {
    background: transparent;
    border-color: transparent;
    text-shadow: 0 1px 3px rgba(0, 0, 0, 0.96), 0 0 10px rgba(0, 0, 0, 0.85);
    font-weight: 600;
  }
  .caption-box[data-visible="true"] {
    display: inline-block;
  }

  /* Interactive Click-to-Seek Transcript Drawer */
  .transcript-drawer {
    position: absolute;
    top: 86px;
    right: 14px;
    bottom: 58px;
    width: min(320px, 44%);
    min-width: 240px;
    display: none;
    flex-direction: column;
    border-radius: 8px;
    background: rgba(17, 19, 21, 0.96);
    border: 1px solid #272b33;
    color: #f6f7f8;
    pointer-events: auto;
    overflow: hidden;
    font-variant-numeric: tabular-nums;
  }
  .transcript-drawer[data-open="true"] {
    display: flex;
  }
  .drawer-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 6px;
    padding: 8px 10px;
    border-bottom: 1px solid #272b33;
  }
  .drawer-title {
    font-size: 11.5px;
    font-weight: 700;
    color: #fdfdfe;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .drawer-search-row {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 7px 10px;
    border-bottom: 1px solid #272b33;
    background: #14171c;
  }
  .drawer-search-input {
    all: unset;
    flex: 1;
    min-width: 0;
    padding: 4px 7px;
    border-radius: 5px;
    border: 1px solid #2f3540;
    background: #0c0e12;
    color: #fdfdfe;
    font-size: 11.5px;
    line-height: 1.3;
  }
  .drawer-search-input::placeholder {
    color: #8b93a1;
  }
  .drawer-count {
    font-size: 10.5px;
    color: #9ca3af;
    white-space: nowrap;
  }
  .drawer-list {
    flex: 1;
    overflow-y: auto;
    padding: 4px 0;
    overscroll-behavior: contain;
  }
  .cue-row {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    width: 100%;
    box-sizing: border-box;
    padding: 6px 10px;
    border-radius: 0;
    text-align: left;
    font-weight: 400;
    line-height: 1.4;
    white-space: normal;
    border-left: 2px solid transparent;
  }
  .cue-row:hover {
    background: rgba(255, 255, 255, 0.07);
  }
  .cue-row[data-current="true"] {
    background: rgba(0, 85, 212, 0.22);
    border-left-color: #3b82f6;
  }
  .cue-stamp {
    font-family: "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 10.5px;
    font-weight: 600;
    color: #93c5fd;
    padding-top: 1px;
    flex-shrink: 0;
  }
  .cue-text {
    font-size: 11.5px;
    color: #e5e7eb;
    word-break: break-word;
  }
  .cue-row[data-current="true"] .cue-text {
    color: #fdfdfe;
    font-weight: 600;
  }
  .drawer-empty {
    padding: 16px 12px;
    font-size: 11.5px;
    color: #9ca3af;
    text-align: center;
  }

  /* Keyboard Shortcuts Cheat Sheet Popover */
  .shortcuts-popover {
    position: absolute;
    top: 86px;
    right: 14px;
    width: 248px;
    display: none;
    flex-direction: column;
    gap: 5px;
    padding: 10px 12px;
    border-radius: 8px;
    background: rgba(17, 19, 21, 0.96);
    border: 1px solid #272b33;
    color: #f6f7f8;
    pointer-events: auto;
    font-size: 11.5px;
  }
  .shortcuts-popover[data-open="true"] {
    display: flex;
  }
  .shortcut-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    color: #d1d5db;
  }
  .kbd {
    font-family: "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 10.5px;
    font-weight: 600;
    padding: 2px 5px;
    border-radius: 4px;
    background: #1d2129;
    border: 1px solid #323846;
    color: #fdfdfe;
  }

  input[type="file"] {
    display: none;
  }
`;

function formatBriefStamp(sec) {
  const full = formatTimestamp(sec, ".");
  return sec >= 3600 ? full.slice(0, 8) : full.slice(3, 8);
}

function triggerTextDownload(doc, content, filename, mimeType, mountContainer = null) {
  const blob = new Blob(["\uFEFF", content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = doc.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  a.style.display = "none";
  a.addEventListener("click", (ev) => {
    ev.stopPropagation();
  });

  // Mount inside ShadowRoot / open `<dialog>` / fullscreenElement so HTML5 modal
  // top-layer `inert` rules and Angular document router listeners never block `.click()`.
  const container =
    mountContainer ||
    doc.fullscreenElement ||
    doc.body ||
    doc.documentElement;
  container?.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

function flashButtonLabel(btn, tempLabel, durationMs = 1200) {
  if (!btn) return;
  const original = btn.dataset.origLabel || btn.textContent;
  btn.dataset.origLabel = original;
  btn.textContent = tempLabel;
  btn.dataset.active = "true";
  setTimeout(() => {
    btn.textContent = original;
    btn.dataset.active = "false";
  }, durationMs);
}

export class VideoSubtitleController {
  constructor(
    video,
    {
      doc = globalThis.document,
      initialFontSize = "medium",
      initialCaptionStyle = "classic",
      initialOffsetSec = 0,
      onRequestGenerate = () => {},
      onOffsetChange = () => {},
      onFontSizeChange = () => {},
      onCaptionStyleChange = () => {},
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
    this.captionStyle = CAPTION_STYLES.includes(initialCaptionStyle)
      ? initialCaptionStyle
      : "classic";
    this.offsetSec = Number.isFinite(initialOffsetSec) ? initialOffsetSec : 0;
    this.statusState = "idle"; // "idle" | "working" | "ready" | "error"
    this.statusLabel = "";
    this.nativeTrack = null;
    this.inPiP = false;
    this.idleTimer = null;
    this.syncTimer = null;

    this.drawerOpen = false;
    this.drawerAutoScroll = true;
    this.drawerQuery = "";
    this.shortcutsOpen = false;
    this.activeCueIndex = -1;
    this.cueRowElements = [];

    this.onRequestGenerate = onRequestGenerate;
    this.onOffsetChange = onOffsetChange;
    this.onFontSizeChange = onFontSizeChange;
    this.onCaptionStyleChange = onCaptionStyleChange;
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
    this.shadow = shadow;

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
      this.toggleSubtitles();
    });

    this.statusEl = this.doc.createElement("span");
    this.statusEl.className = "status-pill";

    this.controlsGroup = this.doc.createElement("span");
    this.controlsGroup.style.display = "inline-flex";
    this.controlsGroup.style.alignItems = "center";
    this.controlsGroup.style.gap = "3px";

    const sep0 = this.doc.createElement("span");
    sep0.className = "sep";

    this.transcriptBtn = this._makeBtn(
      "Transcript",
      "Toggle interactive click-to-seek transcript (T)",
      () => this.toggleTranscriptDrawer()
    );

    const sep1 = this.doc.createElement("span");
    sep1.className = "sep";

    this.sizeDownBtn = this._makeBtn("A-", "Smaller captions (-)", () =>
      this._stepFontSize(-1)
    );
    this.sizeUpBtn = this._makeBtn("A+", "Larger captions (+)", () =>
      this._stepFontSize(1)
    );
    this.styleBtn = this._makeBtn("Box", "Cycle caption backdrop (B)", () =>
      this.cycleCaptionStyle()
    );

    const sep2 = this.doc.createElement("span");
    sep2.className = "sep";

    this.offsetMinusBtn = this._makeBtn("-0.25s", "Shift subtitles earlier ([)", () =>
      this._adjustOffset(-0.25)
    );
    this.offsetLabelBtn = this._makeBtn("0.0s", "Reset timing offset (\\)", () =>
      this._resetOffset()
    );
    this.offsetPlusBtn = this._makeBtn("+0.25s", "Shift subtitles later (])", () =>
      this._adjustOffset(0.25)
    );

    const sep3 = this.doc.createElement("span");
    sep3.className = "sep";

    this.srtBtn = this._makeBtn(".SRT", "Export SubRip (.srt)", () => {
      if (this.cues.length === 0) return;
      this.exportSubtitles("srt");
      flashButtonLabel(this.srtBtn, "Saved");
    });

    this.vttBtn = this._makeBtn(".VTT", "Export WebVTT (.vtt)", () => {
      if (this.cues.length === 0) return;
      this.exportSubtitles("vtt");
      flashButtonLabel(this.vttBtn, "Saved");
    });

    this.txtBtn = this._makeBtn(".TXT", "Export timestamped transcript (.txt)", () => {
      if (this.cues.length === 0) return;
      this.exportSubtitles("txt");
      flashButtonLabel(this.txtBtn, "Saved");
    });

    this.mdBtn = this._makeBtn(".MD", "Export Markdown study notes (.md)", () => {
      if (this.cues.length === 0) return;
      this.exportSubtitles("md");
      flashButtonLabel(this.mdBtn, "Saved");
    });

    this.copyBtn = this._makeBtn("Copy", "Copy transcript to clipboard", async () => {
      if (this.cues.length === 0) return;
      const text = formatTxt(this._shiftedCues(), {
        includeTimestamps: true,
        title: this.title,
      });
      try {
        await globalThis.navigator?.clipboard?.writeText(text);
        flashButtonLabel(this.copyBtn, "Copied");
      } catch {
        this.exportSubtitles("txt");
        flashButtonLabel(this.copyBtn, "Saved");
      }
    });

    this.shortcutsBtn = this._makeBtn("?", "Keyboard shortcuts (?)", () =>
      this.toggleShortcutsHelp()
    );

    this.fileInput = this.doc.createElement("input");
    this.fileInput.type = "file";
    this.fileInput.accept = ".srt,.vtt,.json,text/vtt,text/plain,application/json";
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

    this.importBtn = this._makeBtn("Import", "Load external .srt, .vtt, or .json file", () => {
      this.fileInput.click();
    });

    this.regenBtn = this._makeBtn("Retry", "Regenerate subtitles with AI", () => {
      this.onRequestGenerate({ force: true });
    });

    this.controlsGroup.append(
      sep0,
      this.transcriptBtn,
      sep1,
      this.sizeDownBtn,
      this.sizeUpBtn,
      this.styleBtn,
      sep2,
      this.offsetMinusBtn,
      this.offsetLabelBtn,
      this.offsetPlusBtn,
      sep3,
      this.srtBtn,
      this.vttBtn,
      this.txtBtn,
      this.mdBtn,
      this.copyBtn,
      this.shortcutsBtn
    );

    this.toolbar.append(
      this.ccBtn,
      this.statusEl,
      this.controlsGroup,
      this.importBtn,
      this.regenBtn,
      this.fileInput
    );

    // Interactive Click-to-Seek Transcript Drawer
    this.drawerEl = this.doc.createElement("aside");
    this.drawerEl.className = "transcript-drawer";
    this.drawerEl.dataset.open = "false";
    this.drawerEl.setAttribute?.("aria-label", "Interactive video transcript");

    const drawerHead = this.doc.createElement("div");
    drawerHead.className = "drawer-head";
    this.drawerTitleEl = this.doc.createElement("div");
    this.drawerTitleEl.className = "drawer-title";
    this.drawerTitleEl.textContent = "Transcript";

    const drawerHeadActions = this.doc.createElement("div");
    drawerHeadActions.style.display = "inline-flex";
    drawerHeadActions.style.gap = "4px";

    this.drawerAutoBtn = this._makeBtn("Follow", "Auto-scroll active line", () => {
      this.drawerAutoScroll = !this.drawerAutoScroll;
      this.drawerAutoBtn.dataset.active = this.drawerAutoScroll ? "true" : "false";
    });
    this.drawerAutoBtn.dataset.active = "true";

    const drawerCloseBtn = this._makeBtn("Close", "Close transcript (T)", () => {
      this.toggleTranscriptDrawer(false);
    });
    drawerHeadActions.append(this.drawerAutoBtn, drawerCloseBtn);
    drawerHead.append(this.drawerTitleEl, drawerHeadActions);

    const searchRow = this.doc.createElement("div");
    searchRow.className = "drawer-search-row";
    this.drawerSearchInput = this.doc.createElement("input");
    this.drawerSearchInput.type = "search";
    this.drawerSearchInput.className = "drawer-search-input";
    this.drawerSearchInput.placeholder = "Filter spoken words…";
    this.drawerSearchInput.setAttribute?.("aria-label", "Filter transcript");
    for (const evtName of ["keydown", "keyup", "keypress"]) {
      this.drawerSearchInput.addEventListener(evtName, (ev) => {
        ev.stopPropagation();
      });
    }
    this.drawerSearchInput.addEventListener("input", () => {
      this.drawerQuery = this.drawerSearchInput.value || "";
      this._renderTranscriptList();
    });

    this.drawerCountEl = this.doc.createElement("span");
    this.drawerCountEl.className = "drawer-count";
    searchRow.append(this.drawerSearchInput, this.drawerCountEl);

    this.drawerListEl = this.doc.createElement("div");
    this.drawerListEl.className = "drawer-list";

    this.drawerEl.append(drawerHead, searchRow, this.drawerListEl);

    // Keyboard Shortcuts Cheat Sheet
    this.shortcutsEl = this.doc.createElement("div");
    this.shortcutsEl.className = "shortcuts-popover";
    this.shortcutsEl.dataset.open = "false";
    const shortcutPairs = [
      ["Toggle captions", "C"],
      ["Transcript drawer", "T"],
      ["Caption size", "- / +"],
      ["Caption backdrop", "B"],
      ["Timing -0.25s / +0.25s", "[ / ]"],
      ["Reset timing", "\\"],
      ["Shortcut guide", "?"],
    ];
    for (const [desc, keyLabel] of shortcutPairs) {
      const row = this.doc.createElement("div");
      row.className = "shortcut-item";
      const d = this.doc.createElement("span");
      d.textContent = desc;
      const k = this.doc.createElement("span");
      k.className = "kbd";
      k.textContent = keyLabel;
      row.append(d, k);
      this.shortcutsEl.appendChild(row);
    }

    this.stageEl = this.doc.createElement("div");
    this.stageEl.className = "caption-stage";
    this.captionBox = this.doc.createElement("div");
    this.captionBox.className = "caption-box";
    this.stageEl.appendChild(this.captionBox);

    shadow.append(style, this.stageEl, this.drawerEl, this.shortcutsEl, this.toolbar);
    parent.appendChild(this.host);

    this._applyFontSize();
    this._applyCaptionStyle();
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
    if (!this.video.paused && this.statusState !== "working" && !this.drawerOpen && !this.shortcutsOpen) {
      this.idleTimer = setTimeout(() => {
        if (this.toolbar && !this.video.paused && !this.drawerOpen && !this.shortcutsOpen) {
          this.toolbar.dataset.idle = "true";
        }
      }, 2800);
    }
  }

  stepFontSize(delta) {
    this._stepFontSize(delta);
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

  cycleCaptionStyle() {
    const idx = CAPTION_STYLES.indexOf(this.captionStyle);
    this.captionStyle = CAPTION_STYLES[(idx + 1) % CAPTION_STYLES.length];
    this._applyCaptionStyle();
    this.onCaptionStyleChange(this.captionStyle);
    return this.captionStyle;
  }

  _applyCaptionStyle() {
    if (this.captionBox) {
      this.captionBox.dataset.style = this.captionStyle;
    }
    if (this.styleBtn) {
      const labelMap = {
        classic: "Box",
        contrast: "Hi-Con",
        minimal: "Clean",
      };
      this.styleBtn.textContent = labelMap[this.captionStyle] || "Box";
    }
  }

  adjustOffset(delta) {
    this._adjustOffset(delta);
  }

  resetOffset() {
    this._resetOffset();
  }

  _adjustOffset(delta) {
    this.offsetSec = Math.round((this.offsetSec + delta) * 100) / 100;
    this._syncNativeTextTrack();
    this._renderToolbar();
    this._renderTranscriptList();
    this._renderActiveCue();
    this.onOffsetChange(this.offsetSec);
  }

  _resetOffset() {
    this.offsetSec = 0;
    this._syncNativeTextTrack();
    this._renderToolbar();
    this._renderTranscriptList();
    this._renderActiveCue();
    this.onOffsetChange(0);
  }

  toggleTranscriptDrawer(forceState) {
    if (this.cues.length === 0) return false;
    this.drawerOpen =
      typeof forceState === "boolean" ? forceState : !this.drawerOpen;
    if (this.drawerOpen) {
      this.shortcutsOpen = false;
      if (this.shortcutsEl) this.shortcutsEl.dataset.open = "false";
    }
    if (this.drawerEl) {
      this.drawerEl.dataset.open = this.drawerOpen ? "true" : "false";
    }
    if (this.stageEl) {
      this.stageEl.dataset.drawerOpen = this.drawerOpen ? "true" : "false";
    }
    if (this.transcriptBtn) {
      this.transcriptBtn.dataset.active = this.drawerOpen ? "true" : "false";
    }
    if (this.drawerOpen) {
      this._renderTranscriptList();
      this._highlightDrawerActiveCue(true);
    }
    this._renderToolbar();
    return this.drawerOpen;
  }

  toggleShortcutsHelp(forceState) {
    this.shortcutsOpen =
      typeof forceState === "boolean" ? forceState : !this.shortcutsOpen;
    if (this.shortcutsOpen && this.drawerOpen) {
      this.toggleTranscriptDrawer(false);
    }
    if (this.shortcutsEl) {
      this.shortcutsEl.dataset.open = this.shortcutsOpen ? "true" : "false";
    }
    if (this.shortcutsBtn) {
      this.shortcutsBtn.dataset.active = this.shortcutsOpen ? "true" : "false";
    }
    return this.shortcutsOpen;
  }

  _shiftedCues() {
    if (!this.offsetSec) return this.cues;
    return this.cues.map((c) => ({
      ...c,
      startSec: Math.max(0, Math.round((c.startSec + this.offsetSec) * 1000) / 1000),
      endSec: Math.max(0.25, Math.round((c.endSec + this.offsetSec) * 1000) / 1000),
    }));
  }

  setSettings({ fontSize, captionStyle, subtitleOffsetSec } = {}) {
    if (fontSize && FONT_SIZES.includes(fontSize)) {
      this.fontSize = fontSize;
      this._applyFontSize();
    }
    if (captionStyle && CAPTION_STYLES.includes(captionStyle)) {
      this.captionStyle = captionStyle;
      this._applyCaptionStyle();
    }
    if (Number.isFinite(subtitleOffsetSec)) {
      this.offsetSec = subtitleOffsetSec;
      this._syncNativeTextTrack();
      this._renderToolbar();
      this._renderTranscriptList();
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
    if (this.drawerTitleEl) {
      this.drawerTitleEl.textContent = `Transcript (${this.cues.length})`;
    }
    this._syncNativeTextTrack();
    this._renderToolbar();
    if (this.drawerOpen) {
      this._renderTranscriptList();
    }
    this._renderActiveCue();
    this._scheduleIdleFade();
  }

  getExportCues() {
    return this._shiftedCues();
  }

  exportSubtitles(format = "srt") {
    if (this.cues.length === 0) return false;
    const { content, filename, mimeType } = serializeSubtitles(
      this._shiftedCues(),
      format,
      {
        title: this.title,
        language: this.language || "en",
      }
    );
    const openDialog = this.video?.closest?.("dialog[open]") || null;
    triggerTextDownload(
      this.doc,
      content,
      filename,
      mimeType,
      this.shadow || openDialog
    );
    return true;
  }

  _renderTranscriptList() {
    if (!this.drawerListEl) return;
    while (this.drawerListEl.firstChild) {
      this.drawerListEl.removeChild(this.drawerListEl.firstChild);
    }
    this.cueRowElements = [];

    const shifted = this._shiftedCues();
    const q = String(this.drawerQuery || "").trim().toLowerCase();
    let matchCount = 0;

    for (let i = 0; i < shifted.length; i++) {
      const cue = shifted[i];
      const singleLine = String(cue.text || "").replace(/\s*\n\s*/g, " ").trim();
      const hay = `${cue.speaker || ""} ${singleLine}`.toLowerCase();
      if (q && !hay.includes(q)) {
        this.cueRowElements.push(null);
        continue;
      }
      matchCount += 1;

      const btn = this.doc.createElement("button");
      btn.type = "button";
      btn.className = "cue-row";
      btn.dataset.cueIndex = String(i);
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        try {
          this.video.currentTime = Math.max(0, cue.startSec + 0.01);
          if (this.video.paused && typeof this.video.play === "function") {
            this.video.play().catch(() => {});
          }
        } catch {
          // Ignore seek errors on unloaded media
        }
      });

      const stamp = this.doc.createElement("span");
      stamp.className = "cue-stamp";
      stamp.textContent = formatBriefStamp(cue.startSec);

      const textSpan = this.doc.createElement("span");
      textSpan.className = "cue-text";
      textSpan.textContent = cue.speaker
        ? `[${cue.speaker}] ${singleLine}`
        : singleLine;

      btn.append(stamp, textSpan);
      this.drawerListEl.appendChild(btn);
      this.cueRowElements.push(btn);
    }

    if (this.drawerCountEl) {
      this.drawerCountEl.textContent = q
        ? `${matchCount}/${shifted.length}`
        : `${shifted.length}`;
    }

    if (matchCount === 0) {
      const empty = this.doc.createElement("div");
      empty.className = "drawer-empty";
      empty.textContent = q
        ? "No spoken lines match your filter."
        : "No transcript cues loaded yet.";
      this.drawerListEl.appendChild(empty);
    }

    this._highlightDrawerActiveCue(false);
  }

  _highlightDrawerActiveCue(forceScroll = false) {
    if (!this.drawerOpen || !this.cueRowElements.length) return;
    for (let i = 0; i < this.cueRowElements.length; i++) {
      const el = this.cueRowElements[i];
      if (!el) continue;
      const isCurrent = i === this.activeCueIndex;
      el.dataset.current = isCurrent ? "true" : "false";
      if (
        isCurrent &&
        (forceScroll || this.drawerAutoScroll) &&
        !this.drawerQuery &&
        typeof el.scrollIntoView === "function"
      ) {
        try {
          el.scrollIntoView({ block: "nearest" });
        } catch {
          // Ignore in non-DOM test mocks
        }
      }
    }
  }

  _syncNativeTextTrack() {
    if (typeof this.video.addTextTrack !== "function" || typeof VTTCue === "undefined") {
      return;
    }
    try {
      if (!this.nativeTrack) {
        this.nativeTrack = this.video.addTextTrack(
          "subtitles",
          DOM_SELECTORS.TRACK_LABEL || "LM Subs",
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
    if (this.transcriptBtn) {
      this.transcriptBtn.dataset.active = this.drawerOpen ? "true" : "false";
    }
    this.regenBtn.style.display =
      hasCues || this.statusState === "error" ? "inline-flex" : "none";
    this.regenBtn.textContent = hasCues ? "Regen" : "Retry";
    this.regenBtn.disabled = isWorking;

    const sign = this.offsetSec > 0 ? "+" : "";
    this.offsetLabelBtn.textContent = `${sign}${this.offsetSec.toFixed(2)}s`;
  }

  _renderActiveCue() {
    if (!this.captionBox) return;
    const effectiveTime = (this.video.currentTime || 0) - this.offsetSec;
    const active = findActiveCue(this.cues, effectiveTime);
    const nextIdx = active ? this.cues.indexOf(active) : -1;
    if (nextIdx !== this.activeCueIndex) {
      this.activeCueIndex = nextIdx;
      this._highlightDrawerActiveCue(false);
    }

    if (!this.ccEnabled || this.inPiP || !active) {
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
