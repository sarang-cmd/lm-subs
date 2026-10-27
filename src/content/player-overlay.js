/**
 * Synchronized Video Player Subtitle Overlay, Live Caption Styler,
 * Smart Chapters & Bookmarks Transcript Drawer, Cue Loop, Chat Citation Bridge,
 * Keyboard Shortcuts Popover, and Native PiP Track Bridge (`src/content/player-overlay.js`).
 *
 * Attaches a closed ShadowRoot to the `<video>` container so captions, the
 * live style studio, searchable click-to-seek transcript drawer, and export
 * controls render cleanly inside both inline Studio playback and Fullscreen,
 * while populating a programmatic `TextTrack` (`VTTCue`) for OS Picture-in-Picture.
 *
 * Strict Trusted-Types CSP compliance: builds all DOM nodes via `createElement`
 * (zero `innerHTML`).
 */

import { DOM_SELECTORS } from "../config/selectors.js";
import {
  CAPTION_COLORS,
  CAPTION_FONT_FAMILIES,
  CAPTION_FONT_SIZES,
  CAPTION_POSITIONS,
  CAPTION_STYLES,
  CAPTION_WIDTHS,
  PLAYBACK_SPEEDS,
} from "../lib/storage.js";
import {
  buildAutoChapters,
  findActiveCue,
  formatShortTimestamp,
  formatTimestamp,
  formatTxt,
  parseSubtitleText,
  serializeSubtitles,
} from "../lib/subtitles.js";
import { unlockChimeAudio } from "../lib/chime.js";

function unlockChimeForGesture() {
  try {
    unlockChimeAudio(globalThis);
  } catch {
    // Ignore restricted autoplay contexts
  }
}

const FONT_SCALE_MAP = {
  small: "clamp(13px, 1.85cqh, 16px)",
  medium: "clamp(15px, 2.35cqh, 21px)",
  large: "clamp(18px, 2.95cqh, 26px)",
  xlarge: "clamp(21px, 3.55cqh, 32px)",
  xxlarge: "clamp(24px, 4.2cqh, 38px)",
};

/**
 * Reference font size (in CSS px at a 720p-tall player) for each caption size
 * preset. `dynamicCaptionScaling` multiplies this by the real player height and
 * by `captionScaleFactor`, then clamps it between `captionMinFontPx` and
 * `captionMaxFontPx`, so Studio sidebar resizes, split views, small inline
 * players, and fullscreen all stay proportionally readable.
 */
const FONT_BASE_PX = {
  small: 17,
  medium: 21,
  large: 25,
  xlarge: 30,
  xxlarge: 35,
};

const REFERENCE_PLAYER_HEIGHT_PX = 720;

/**
 * Seconds a caption line stays on screen after its cue ends (and how early the
 * next cue may start) so brief gaps between spoken lines never make captions
 * or caption controls flicker.
 */
const CAPTION_LINGER_SEC = 0.28;

const FONT_FAMILY_MAP = {
  sans: '"Plus Jakarta Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  serif: 'Charter, "Bitstream Charter", Georgia, Cambria, "Times New Roman", serif',
  mono: '"JetBrains Mono", "SF Mono", ui-monospace, Menlo, Consolas, monospace',
  dyslexic: '"Trebuchet MS", Verdana, "Plus Jakarta Sans", sans-serif',
};

const COLOR_HEX_MAP = {
  white: "#fdfdfe",
  yellow: "#fde047",
  cyan: "#67e8f9",
  green: "#86efac",
  ink: "#111315",
};

const MAX_WIDTH_MAP = {
  compact: "min(86%, 560px)",
  balanced: "min(92%, 780px)",
  wide: "min(96%, 1040px)",
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
  :host([data-mode="audio"]) {
    position: fixed;
    inset: 0;
  }
  .toolbar {
    position: absolute;
    bottom: 10px;
    right: 104px;
    height: 32px;
    display: inline-flex;
    align-items: center;
    flex-wrap: nowrap;
    gap: 2px;
    padding: 0 5px;
    border-radius: 999px;
    background: rgba(18, 20, 24, 0.78);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    border: 1px solid rgba(255, 255, 255, 0.14);
    pointer-events: auto;
    opacity: 0.96;
    font-variant-numeric: tabular-nums;
    transition: opacity 180ms ease, background-color 120ms ease;
  }
  /* Controls follow NotebookLM's own play bar: they fade in together with the
     native controls on hover and fade out together with them. Visibility never
     depends on whether a caption happens to be on screen, so nothing blinks. */
  .toolbar {
    opacity: 0;
    pointer-events: none;
    transition: opacity 180ms ease, background-color 120ms ease;
  }
  :host([data-controls-visible="true"]) .toolbar {
    opacity: 0.96;
    pointer-events: auto;
  }
  :host([data-dock="native"]) .toolbar {
    display: none;
  }
  :host([data-mode="audio"]) .toolbar {
    bottom: 14px;
    left: 50%;
    right: auto;
    transform: translateX(-50%);
    height: 34px;
    gap: 4px;
    padding: 0 8px;
    background: rgba(17, 19, 21, 0.92);
    box-shadow: 0 10px 28px rgba(17, 19, 21, 0.22);
  }
  :host([data-mode="audio"]) .caption-stage {
    bottom: 56px;
  }
  :host([data-mode="audio"]) .tools-popover,
  :host([data-mode="audio"]) .style-popover,
  :host([data-mode="audio"]) .shortcuts-popover {
    bottom: 56px;
    left: 50%;
    right: auto;
    transform: translateX(-50%);
  }
  :host([data-mode="audio"]) .transcript-drawer {
    top: 72px;
    right: 18px;
    left: auto;
    bottom: 60px;
    transform: none;
    width: min(360px, calc(100vw - 36px));
  }
  .audio-mode-tag {
    display: none;
    align-items: center;
    gap: 5px;
    padding: 0 7px 0 4px;
    font-size: 10.5px;
    font-weight: 600;
    color: #93c5fd;
    letter-spacing: 0.01em;
  }
  :host([data-mode="audio"]) .audio-mode-tag {
    display: inline-flex;
  }
  .toolbar[data-idle="true"] {
    opacity: 0;
  }
  .toolbar:hover,
  .toolbar:focus-within {
    opacity: 1 !important;
    pointer-events: auto;
    background: rgba(18, 20, 24, 0.92);
  }
  .cc-pill {
    position: relative;
    height: 22px;
    padding: 0 7px;
    border-radius: 4px;
    border: 1.5px solid rgba(255, 255, 255, 0.72);
    font-size: 10.5px;
    font-weight: 700;
    letter-spacing: 0.03em;
    color: #f3f4f6;
    background: transparent;
  }
  .cc-pill[data-active="true"] {
    background: rgba(255, 255, 255, 0.14);
    border-color: #ffffff;
    color: #ffffff;
    box-shadow: inset 0 -2px 0 #3b82f6;
  }
  .cc-pill[data-primary="true"] {
    border-color: #3b82f6;
    background: rgba(0, 85, 212, 0.85);
    color: #ffffff;
  }
  .bar-pill {
    height: 24px;
    padding: 0 8px;
    border-radius: 999px;
    font-size: 11px;
    font-weight: 600;
    color: #e5e7eb;
  }
  .tools-popover {
    position: absolute;
    bottom: 50px;
    right: 14px;
    width: 288px;
    display: none;
    flex-direction: column;
    gap: 8px;
    padding: 10px 12px;
    border-radius: 10px;
    background: rgba(18, 20, 24, 0.97);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border: 1px solid rgba(255, 255, 255, 0.14);
    color: #f6f7f8;
    pointer-events: auto;
    font-size: 11px;
  }
  .tools-popover[data-open="true"] {
    display: flex;
  }
  .tools-section {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .tools-label {
    font-size: 10px;
    font-weight: 600;
    color: #9ca3af;
  }
  .tools-row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 4px;
  }
  .tools-row button {
    padding: 4px 7px;
    border: 1px solid #2b313c;
    background: #14171c;
    border-radius: 5px;
    font-size: 10.5px;
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

  /* Caption Stage & Customizable Caption Box */
  .caption-stage {
    position: absolute;
    left: 5%;
    right: 5%;
    bottom: var(--lms-caption-bottom, 56px);
    display: flex;
    justify-content: center;
    align-items: flex-end;
    pointer-events: none;
    transition: top 120ms ease, bottom 120ms ease, right 120ms ease;
  }
  .caption-stage[data-pos="raised"] {
    bottom: calc(var(--lms-caption-bottom, 56px) + 42px);
  }
  .caption-stage[data-pos="top"] {
    top: 42px;
    bottom: auto;
    align-items: flex-start;
  }
  .caption-stage[data-drawer-open="true"] {
    right: calc(min(336px, 45%) + 24px);
  }
  .caption-box {
    display: none;
    max-width: min(92%, 780px);
    padding: var(--lms-caption-pad-y, 7px) var(--lms-caption-pad-x, 15px)
      calc(var(--lms-caption-pad-y, 7px) + 1px);
    border-radius: var(--lms-caption-radius, 7px);
    background: rgba(11, 13, 16, 0.88);
    color: #fdfdfe;
    text-align: center;
    font-weight: 500;
    font-size: var(--lms-caption-font, clamp(15px, 2.35cqh, 21px));
    line-height: var(--lms-caption-leading, 1.42);
    letter-spacing: 0.005em;
    white-space: pre-line;
    border: 1px solid rgba(255, 255, 255, 0.12);
    pointer-events: auto;
    cursor: pointer;
    user-select: text;
    text-shadow: var(--lms-caption-stroke, none);
  }
  .caption-box[data-font="dyslexic"] {
    letter-spacing: 0.045em;
    word-spacing: 0.12em;
    line-height: 1.58;
  }
  .caption-box[data-style="contrast"] {
    border: 1.5px solid #3b82f6;
    font-weight: 600;
  }
  .caption-box[data-style="minimal"] {
    background: transparent !important;
    border-color: transparent !important;
    text-shadow: 0 1px 3px rgba(0, 0, 0, 0.96), 0 0 11px rgba(0, 0, 0, 0.88);
    font-weight: 600;
  }
  .caption-box[data-style="cinema"] {
    border-radius: 999px;
    padding: 8px 20px 9px;
    border-color: rgba(255, 255, 255, 0.08);
  }
  .caption-box[data-style="paper"] {
    border-color: rgba(17, 19, 21, 0.18);
    box-shadow: 0 4px 14px rgba(0, 0, 0, 0.25);
  }
  .caption-box[data-style="amber"] {
    border-color: rgba(251, 191, 36, 0.35);
  }
  .caption-box[data-visible="true"] {
    display: inline-block;
  }
  .caption-word-done {
    opacity: 1;
  }
  .caption-word-current {
    background: rgba(29, 92, 246, var(--lms-karaoke-alpha, 0.48));
    color: #ffffff;
    padding: 1px 5px;
    margin: 0 1px;
    border-radius: 4px;
    font-weight: 600;
  }
  .caption-box[data-style="paper"] .caption-word-current {
    background: rgba(0, 85, 212, var(--lms-karaoke-alpha, 0.16));
    color: #0055d4;
  }
  .caption-word-upcoming {
    opacity: var(--lms-upcoming-alpha, 0.64);
  }
  .caption-secondary {
    display: block;
    margin-top: 4px;
    font-size: 0.84em;
    opacity: 0.86;
  }

  /* Live Caption Style Popover */
  .style-popover {
    position: absolute;
    bottom: 50px;
    right: 14px;
    width: 288px;
    display: none;
    flex-direction: column;
    gap: 8px;
    padding: 10px 12px;
    border-radius: 10px;
    background: rgba(18, 20, 24, 0.97);
    border: 1px solid rgba(255, 255, 255, 0.14);
    color: #f6f7f8;
    pointer-events: auto;
    font-size: 11px;
  }
  .style-popover[data-open="true"] {
    display: flex;
  }
  .style-row {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .style-row-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    color: #9ca3af;
    font-size: 10.5px;
    font-weight: 600;
  }
  .style-pills {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
  }
  .style-pills button {
    padding: 4px 7px;
    border: 1px solid #2f3540;
    background: #14171c;
    font-size: 10.5px;
  }
  .style-pills button[data-active="true"] {
    background: #0055d4;
    border-color: #3b82f6;
    color: #fdfdfe;
  }
  .opacity-range {
    width: 100%;
    accent-color: #3b82f6;
    cursor: pointer;
    height: 14px;
    margin: 0;
  }

  /* Interactive Click-to-Seek Transcript, Chapters & Bookmarks Drawer */
  .transcript-drawer {
    position: absolute;
    top: 16px;
    right: 14px;
    bottom: 50px;
    width: min(336px, 45%);
    min-width: 248px;
    display: none;
    flex-direction: column;
    border-radius: 10px;
    background: rgba(18, 20, 24, 0.96);
    border: 1px solid rgba(255, 255, 255, 0.14);
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
  .drawer-tabs {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 4px;
    padding: 5px 10px;
    border-bottom: 1px solid #272b33;
    background: #14171c;
  }
  .drawer-search-row {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 10px;
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
  .cue-item {
    display: flex;
    align-items: flex-start;
    gap: 4px;
    padding: 5px 8px 5px 10px;
    border-left: 2px solid transparent;
  }
  .cue-item:hover {
    background: rgba(255, 255, 255, 0.06);
  }
  .cue-item[data-current="true"] {
    background: rgba(0, 85, 212, 0.22);
    border-left-color: #3b82f6;
  }
  .cue-row {
    display: flex;
    align-items: flex-start;
    gap: 7px;
    flex: 1;
    min-width: 0;
    padding: 1px 0;
    border-radius: 0;
    text-align: left;
    font-weight: 400;
    line-height: 1.4;
    white-space: normal;
  }
  .cue-row:hover {
    background: transparent;
  }
  .cue-actions {
    display: inline-flex;
    align-items: center;
    gap: 2px;
    flex-shrink: 0;
    opacity: 0.72;
  }
  .cue-item:hover .cue-actions,
  .cue-actions[data-starred="true"] {
    opacity: 1;
  }
  .cue-mini-btn {
    padding: 2px 5px;
    font-size: 10px;
    border-radius: 4px;
    color: #9ca3af;
  }
  .cue-mini-btn[data-starred="true"] {
    color: #fde047;
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
  .cue-item[data-current="true"] .cue-text {
    color: #fdfdfe;
    font-weight: 600;
  }
  .chapter-row {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 3px;
    width: 100%;
    box-sizing: border-box;
    padding: 8px 10px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: 0;
    text-align: left;
    white-space: normal;
  }
  .chapter-meta {
    font-family: "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 10px;
    color: #93c5fd;
  }
  .chapter-title {
    font-size: 11.5px;
    font-weight: 600;
    color: #f3f4f6;
    line-height: 1.35;
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
    bottom: 50px;
    right: 14px;
    width: 264px;
    display: none;
    flex-direction: column;
    gap: 5px;
    padding: 10px 12px;
    border-radius: 10px;
    background: rgba(18, 20, 24, 0.97);
    border: 1px solid rgba(255, 255, 255, 0.14);
    color: #f6f7f8;
    pointer-events: auto;
    font-size: 11px;
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
    font-size: 10px;
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

/**
 * Light-DOM stylesheet for the buttons we inject straight into Google
 * NotebookLM's own bottom play bar (`playBarDockMode: "native"`).
 * Deliberately mirrors NotebookLM's Material control language (circular
 * hover affordance, currentColor fill, Google Sans / Roboto type) so the
 * caption controls read as a built-in part of the player.
 */
const DOCK_STYLE_ID = "lm-subs-dock-style";
export const DOCK_CSS = `
  .lms-dock-btn {
    all: unset;
    box-sizing: border-box;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex: 0 0 auto;
    width: 34px;
    height: 34px;
    margin: 0 1px;
    border-radius: 50%;
    color: #f1f3f4;
    fill: currentColor;
    cursor: pointer;
    opacity: 0.92;
    font-family: "Google Sans", Roboto, "Plus Jakarta Sans", sans-serif;
    font-size: 11px;
    font-weight: 600;
    line-height: 1;
    transition: background-color 120ms ease, opacity 120ms ease, color 120ms ease;
  }
  .lms-dock-btn:hover {
    background-color: rgba(255, 255, 255, 0.14);
    opacity: 1;
  }
  .lms-dock-btn:focus-visible {
    outline: 2px solid #8ab4f8;
    outline-offset: 1px;
  }
  .lms-dock-btn[data-active="true"] {
    background-color: rgba(138, 180, 248, 0.22);
    color: #8ab4f8;
  }
  .lms-dock-btn[data-disabled="true"] {
    opacity: 0.4;
    cursor: default;
  }
  .lms-dock-cc {
    width: auto;
    min-width: 30px;
    height: 24px;
    padding: 0 6px;
    margin: 0 3px;
    border-radius: 4px;
    border: 1.5px solid rgba(241, 243, 244, 0.82);
    font-size: 10.5px;
    font-weight: 700;
    letter-spacing: 0.03em;
  }
  .lms-dock-cc[data-active="true"] {
    background-color: rgba(138, 180, 248, 0.24);
    border-color: #8ab4f8;
    color: #ffffff;
  }
  .lms-dock-cc[data-primary="true"] {
    border-color: #8ab4f8;
    background-color: rgba(138, 180, 248, 0.18);
  }

  /* All LM Subs buttons live in one group element, so the host page's flex or
     grid layout treats them as a single unit instead of scattering them
     between the native buttons or wrapping them onto a second row. */
  .lms-dock-group {
    all: unset;
    box-sizing: border-box;
    display: inline-flex;
    align-items: center;
    gap: 1px;
    flex: 0 0 auto;
    max-width: 60%;
    margin: 0 2px;
    position: relative;
  }

  .lms-dock-group::before {
    content: "";
    flex: 0 0 auto;
    width: 1px;
    height: 16px;
    margin: 0 5px 0 3px;
    background: rgba(241, 243, 244, 0.28);
  }

  .lms-dock-group[data-divider="false"]::before {
    display: none;
  }

  .lms-dock-group[data-compact="true"] {
    max-width: 40%;
  }
`;

/**
 * Places the LM Subs dock group directly in front of the host player's
 * right-hand cluster (fullscreen, PiP, settings, captions). Walking up from the
 * matched button to its top-level child inside the bar keeps the group out of
 * nested wrappers, and picking the leftmost match means the group never lands
 * after a flex spacer or pushes the native buttons off the row.
 */
export function findRightClusterAnchor(bar) {
  if (!bar || typeof bar.querySelectorAll !== "function") return null;
  const primaryRe =
    /full ?screen|theater|picture ?-? ?in|\bpip\b|settings|more options|miniplayer/i;
  const fallbackRe = /caption|subtitle|closed caption/i;

  const collect = (re) => {
    let best = null;
    let nodes = [];
    try {
      nodes = [...(bar.querySelectorAll?.("button, [role=button], [aria-label]") || [])];
    } catch {
      nodes = [];
    }
    for (const node of nodes) {
      if (node.closest?.(".lms-dock-group")) continue;
      const label = `${node.getAttribute?.("aria-label") || ""} ${
        node.getAttribute?.("title") || ""
      } ${node.getAttribute?.("data-tooltip") || ""}`;
      if (!re.test(label)) continue;
      const left = Number(node.getBoundingClientRect?.()?.left) || 0;
      if (!best || left < best.left) best = { node, left };
    }
    return best?.node || null;
  };

  const match = collect(primaryRe) || collect(fallbackRe);
  if (!match) return null;

  let node = match;
  try {
    while (node && node.parentElement && node.parentElement !== bar) {
      node = node.parentElement;
    }
  } catch {
    return null;
  }
  return node && node.parentElement === bar ? node : null;
}

export function insertDockGroupBeforeRightCluster(bar, group) {
  if (!bar || !group || typeof bar.insertBefore !== "function") return false;
  const anchor = findRightClusterAnchor(bar);
  if (!anchor) return false;
  try {
    bar.insertBefore(group, anchor);
    return true;
  } catch {
    return false;
  }
}

export function ensureDockStyle(doc) {
  if (!doc || typeof doc.getElementById !== "function") return null;
  let el = doc.getElementById(DOCK_STYLE_ID);
  if (!el) {
    const host = doc.head || doc.documentElement;
    if (!host || typeof host.appendChild !== "function") return null;
    el = doc.createElement("style");
    el.id = DOCK_STYLE_ID;
    el.textContent = DOCK_CSS;
    host.appendChild(el);
  }
  return el;
}

/**
 * Finds the host page's real player control bar so LM Subs buttons can be
 * injected directly into it. Candidates are ranked by (a) how close the bar
 * sits to the bottom of the media box and (b) how compact it is, which keeps
 * the whole video wrapper from being mistaken for the control strip.
 */
export function findNativeControlBar(video, doc) {
  if (!video || typeof video.closest !== "function") return null;
  const labelRe =
    /(play|pause|resume|rewind|forward|mute|unmute|full ?screen|subtitle|caption|closed caption|pip|picture)/i;

  const safeRect = (el) => {
    try {
      return el?.getBoundingClientRect?.() || null;
    } catch {
      return null;
    }
  };
  const videoRect = safeRect(video);
  const videoHeight = Number(videoRect?.height) || 0;

  const score = (node, depth) => {
    if (!node || node === video) return null;
    let buttons = [];
    try {
      buttons = [...(node.querySelectorAll?.("button, [role=button]") || [])];
    } catch {
      buttons = [];
    }
    if (buttons.length < 2 || buttons.length > 26) return null;

    let hits = 0;
    for (const b of buttons) {
      const label = `${b.getAttribute?.("aria-label") || ""} ${
        b.getAttribute?.("title") || ""
      } ${b.getAttribute?.("data-tooltip") || ""}`;
      if (labelRe.test(label)) hits += 1;
    }
    if (hits < 2) return null;

    const rect = safeRect(node);
    const height = Number(rect?.height) || 0;
    let bottomAligned = false;
    if (rect && videoHeight > 0) {
      const delta = Math.abs(rect.bottom - videoRect.bottom);
      bottomAligned = delta <= Math.max(10, videoHeight * 0.08);
    }
    return { node, hits, buttonCount: buttons.length, height, bottomAligned, depth };
  };

  const candidates = [];

  // The control bar is usually a sibling of the media element (a compact strip
  // pinned to the bottom of the player), so scan ancestors and their children.
  let ancestor = video.parentElement;
  let depth = 0;
  while (ancestor && depth < 8) {
    const own = score(ancestor, depth);
    if (own) candidates.push(own);
    let kids = [];
    try {
      kids = [...(ancestor.children || [])];
    } catch {
      kids = [];
    }
    for (const kid of kids) {
      if (kid === video || kid.contains?.(video)) continue;
      const kidScore = score(kid, depth + 1);
      if (kidScore) candidates.push(kidScore);
    }
    ancestor = ancestor.parentElement;
    depth += 1;
  }

  if (candidates.length === 0) return null;

  const compact = candidates
    .filter((c) => c.bottomAligned && c.height > 0 && c.height <= 120)
    .sort((a, b) => a.buttonCount - b.buttonCount || a.depth - b.depth);
  if (compact.length > 0) return compact[0].node;

  const smallest = [...candidates].sort(
    (a, b) => a.buttonCount - b.buttonCount || a.depth - b.depth
  )[0];
  return smallest ? smallest.node : candidates[0].node;
}

function formatBriefStamp(sec) {
  const full = formatTimestamp(sec, ".");
  return sec >= 3600 ? full.slice(0, 8) : full.slice(3, 8);
}

function hexToRgba(hex, alpha) {
  const clean = String(hex || "#0b0d10").replace("#", "");
  const r = parseInt(clean.slice(0, 2), 16) || 11;
  const g = parseInt(clean.slice(2, 4), 16) || 13;
  const b = parseInt(clean.slice(4, 6), 16) || 16;
  return `rgba(${r}, ${g}, ${b}, ${Math.max(0, Math.min(1, alpha)).toFixed(2)})`;
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
      mediaKind = null,
      initialFontSize = "medium",
      initialCaptionStyle = "classic",
      initialFontFamily = "sans",
      initialCaptionColor = "white",
      initialBgOpacity = 88,
      initialCaptionPosition = "bottom",
      initialCaptionMaxWidth = "balanced",
      initialKaraokeHighlight = true,
      initialKaraokeDelayMs = 0,
      initialShowSpeakerLabels = true,
      initialPauseOnCaptionHover = false,
      initialClickCaptionToCopy = true,
      initialPlaybackSpeed = 1,
      initialOffsetSec = 0,
      initialFineGrainedControls = false,
      initialDynamicCaptionScaling = true,
      initialCaptionScaleFactor = 100,
      initialCaptionMinFontPx = 11,
      initialCaptionMaxFontPx = 40,
      initialCaptionPaddingY = 7,
      initialCaptionPaddingX = 15,
      initialCaptionBorderRadius = 7,
      initialCaptionLineHeight = 142,
      initialCaptionBottomOffsetPx = 54,
      initialCaptionTextStrokePx = 0,
      initialKaraokeHighlightOpacity = 48,
      initialUpcomingWordOpacity = 64,
      initialPlayBarDockMode = "native",
      initialHoverFadeDelayMs = 2200,
      initialKeepSubtitlesInPiP = true,
      initialSkipSilenceEnabled = false,
      initialSkipSilenceGapSec = 1.6,
      initialSkipSilenceRate = 2.2,
      initialAudioBoostPercent = 100,
      onRequestGenerate = () => {},
      onOffsetChange = () => {},
      onFontSizeChange = () => {},
      onCaptionStyleChange = () => {},
      onStylePatchChange = () => {},
      onCuesMutated = () => {},
      onCiteCue = null,
      onImportSubtitles = () => {},
      onTelemetry = () => {},
    } = {}
  ) {
    this.video = video;
    this.doc = doc;
    this.mediaKind =
      mediaKind === "audio" ||
      String(video?.tagName || "").toUpperCase() === "AUDIO"
        ? "audio"
        : "video";
    this.cues = [];
    this.title =
      this.mediaKind === "audio"
        ? "NotebookLM Audio Overview"
        : "NotebookLM Video Overview";
    this.ccEnabled = true;

    this.fontSize = CAPTION_FONT_SIZES.includes(initialFontSize)
      ? initialFontSize
      : "medium";
    this.captionStyle = CAPTION_STYLES.includes(initialCaptionStyle)
      ? initialCaptionStyle
      : "classic";
    this.captionFontFamily = CAPTION_FONT_FAMILIES.includes(initialFontFamily)
      ? initialFontFamily
      : "sans";
    this.captionColor = CAPTION_COLORS.includes(initialCaptionColor)
      ? initialCaptionColor
      : "white";
    this.captionBgOpacity = Number.isFinite(Number(initialBgOpacity))
      ? Math.max(0, Math.min(100, Number(initialBgOpacity)))
      : 88;
    this.captionPosition = CAPTION_POSITIONS.includes(initialCaptionPosition)
      ? initialCaptionPosition
      : "bottom";
    this.captionMaxWidth = CAPTION_WIDTHS.includes(initialCaptionMaxWidth)
      ? initialCaptionMaxWidth
      : "balanced";
    this.karaokeHighlight = Boolean(initialKaraokeHighlight);
    this.karaokeDelayMs = Number.isFinite(Number(initialKaraokeDelayMs))
      ? Math.max(-1500, Math.min(3000, Math.round(Number(initialKaraokeDelayMs))))
      : 0;
    this.showSpeakerLabels = initialShowSpeakerLabels !== false;
    this.pauseOnCaptionHover = Boolean(initialPauseOnCaptionHover);
    this.clickCaptionToCopy = initialClickCaptionToCopy !== false;
    this.playbackSpeed = PLAYBACK_SPEEDS.includes(Number(initialPlaybackSpeed))
      ? Number(initialPlaybackSpeed)
      : 1;

    this.fineGrainedControls = Boolean(initialFineGrainedControls);
    this.dynamicCaptionScaling = initialDynamicCaptionScaling !== false;
    this.captionScaleFactor = this._clamp(
      initialCaptionScaleFactor,
      50,
      200,
      100
    );
    this.captionMinFontPx = this._clamp(initialCaptionMinFontPx, 8, 18, 11);
    this.captionMaxFontPx = this._clamp(initialCaptionMaxFontPx, 20, 64, 40);
    this.captionPaddingY = this._clamp(initialCaptionPaddingY, 2, 20, 7);
    this.captionPaddingX = this._clamp(initialCaptionPaddingX, 6, 40, 15);
    this.captionBorderRadius = this._clamp(initialCaptionBorderRadius, 0, 32, 7);
    this.captionLineHeight = this._clamp(initialCaptionLineHeight, 115, 185, 142);
    this.captionBottomOffsetPx = this._clamp(
      initialCaptionBottomOffsetPx,
      24,
      180,
      54
    );
    this.captionTextStrokePx = this._clamp(initialCaptionTextStrokePx, 0, 3, 0);
    this.karaokeHighlightOpacity = this._clamp(
      initialKaraokeHighlightOpacity,
      15,
      95,
      48
    );
    this.upcomingWordOpacity = this._clamp(
      initialUpcomingWordOpacity,
      25,
      100,
      64
    );
    this.playBarDockMode = ["native", "hover", "always"].includes(
      initialPlayBarDockMode
    )
      ? initialPlayBarDockMode
      : "native";
    this.hoverFadeDelayMs = this._clamp(initialHoverFadeDelayMs, 400, 6000, 2200);
    this.keepSubtitlesInPiP = initialKeepSubtitlesInPiP !== false;
    this.skipSilenceEnabled = Boolean(initialSkipSilenceEnabled);
    this.skipSilenceGapSec = this._clamp(initialSkipSilenceGapSec, 0.6, 5, 1.6);
    this.skipSilenceRate = this._clamp(initialSkipSilenceRate, 1.4, 3, 2.2);
    this.audioBoostPercent = this._clamp(initialAudioBoostPercent, 100, 250, 100);

    this.offsetSec = Number.isFinite(initialOffsetSec) ? initialOffsetSec : 0;
    this.statusState = "idle";
    this.statusLabel = "";
    this.nativeTrack = null;
    this.inPiP = false;
    this.idleTimer = null;
    this.syncTimer = null;
    this.pointerOverPlayer = false;
    this.nativeControlsVisible = true;
    this.controlsVisible = true;
    this.nativeControlBar = null;
    this.dockButtons = {};
    this.dockObserver = null;
    this.dockPollTimer = null;
    this.sizeObserver = null;
    this.watchAccumulatorSec = 0;
    this.lastWatchTickMs = 0;
    this.boostCtx = null;
    this.boostSource = null;
    this.pipWindow = null;
    this.pipCaptionEl = null;

    this.drawerOpen = false;
    this.drawerTab = "lines"; // "lines" | "chapters" | "saved"
    this.drawerAutoScroll = true;
    this.drawerQuery = "";
    this.styleOpen = false;
    this.shortcutsOpen = false;
    this.toolsOpen = false;
    this.loopCueIndex = -1;
    this.activeCueIndex = -1;
    this.lastRenderedSignature = "";
    this.pausedByHover = false;
    this.cueRowElements = [];
    this.stylePillButtons = {};

    this.onRequestGenerate = onRequestGenerate;
    this.onOffsetChange = onOffsetChange;
    this.onFontSizeChange = onFontSizeChange;
    this.onCaptionStyleChange = onCaptionStyleChange;
    this.onStylePatchChange = onStylePatchChange;
    this.onCuesMutated = onCuesMutated;
    this.onCiteCue = onCiteCue;
    this.onImportSubtitles = onImportSubtitles;
    this.onTelemetry = onTelemetry;

    this._mount();
    this._bindEvents();
    this._applyPlaybackSpeed(this.playbackSpeed, false);
    this._mountNativeDock();
    this._startControlVisibilitySync();
    this._applyCaptionMetrics();
  }

  _clamp(value, min, max, fallback) {
    const n = Number(value);
    if (!Number.isFinite(n)) return fallback;
    return Math.max(min, Math.min(max, n));
  }

  _emitTelemetry(patch = {}) {
    try {
      this.onTelemetry(patch);
    } catch {
      // Telemetry is strictly best-effort
    }
  }

  /**
   * Mirrors Google NotebookLM's own play bar: we read the host page's control
   * bar opacity/visibility and match it, so caption controls appear and
   * disappear exactly with the native controls instead of blinking on their own.
   */
  _startControlVisibilitySync() {
    const bar = this.nativeControlBar;
    if (!bar || typeof MutationObserver === "undefined") {
      this.nativeControlsVisible = true;
      this._updateControlsVisibility();
      return;
    }
    const readNative = () => {
      let visible = true;
      try {
        const cs = globalThis.getComputedStyle?.(bar);
        if (cs) {
          const opacity = Number(cs.opacity);
          if (Number.isFinite(opacity) && opacity < 0.12) visible = false;
          if (cs.visibility === "hidden" || cs.visibility === "collapse") {
            visible = false;
          }
          if (cs.display === "none") visible = false;
        }
        if (
          bar.hasAttribute?.("aria-hidden") &&
          bar.getAttribute("aria-hidden") === "true"
        ) {
          visible = false;
        }
      } catch {
        visible = true;
      }
      if (visible !== this.nativeControlsVisible) {
        this.nativeControlsVisible = visible;
        this._updateControlsVisibility();
      }
    };

    try {
      this.dockObserver = new MutationObserver(readNative);
      this.dockObserver.observe(bar, {
        attributes: true,
        attributeFilter: ["class", "style", "aria-hidden", "hidden"],
        subtree: false,
      });
    } catch {
      this.dockObserver = null;
    }
    readNative();
    // Cheap belt-and-braces poll for players that animate opacity via CSS vars
    this.dockPollTimer = setInterval(readNative, 420);
  }

  _updateControlsVisibility() {
    const anyPopoverOpen =
      this.drawerOpen || this.styleOpen || this.shortcutsOpen || this.toolsOpen;
    let visible = true;
    if (this.playBarDockMode === "always" || this.mediaKind === "audio") {
      visible = true;
    } else if (anyPopoverOpen || this.statusState === "working") {
      visible = true;
    } else if (this.pointerOverPlayer || this.video?.paused) {
      visible = true;
    } else if (this.playBarDockMode === "native") {
      visible = this.nativeControlsVisible;
    } else {
      visible = this.nativeControlsVisible;
    }
    if (visible === this.controlsVisible && this.host?.dataset) {
      this.host.dataset.controlsVisible = visible ? "true" : "false";
      return;
    }
    this.controlsVisible = visible;
    if (this.host?.dataset) {
      this.host.dataset.controlsVisible = visible ? "true" : "false";
    }
    for (const btn of Object.values(this.dockButtons)) {
      if (!btn) continue;
      btn.style.opacity = visible ? "" : "0";
      btn.style.pointerEvents = visible ? "" : "none";
    }
  }

  _resolveMountParent() {
    if (this.mediaKind === "audio") {
      return (
        this.doc?.body ||
        this.doc?.documentElement ||
        this.video?.parentElement ||
        null
      );
    }
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

  _svgIcon(size, nodes = []) {
    const NS = "http://www.w3.org/2000/svg";
    const svg = this.doc.createElementNS(NS, "svg");
    svg.setAttribute("width", String(size || 20));
    svg.setAttribute("height", String(size || 20));
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("focusable", "false");
    svg.setAttribute("aria-hidden", "true");
    for (const node of nodes) {
      let el = null;
      if (node.t === "path") {
        el = this.doc.createElementNS(NS, "path");
        el.setAttribute("d", node.d);
        if (node.stroke) {
          el.setAttribute("fill", "none");
          el.setAttribute("stroke", "currentColor");
          el.setAttribute("stroke-width", String(node.sw || 1.7));
          el.setAttribute("stroke-linecap", "round");
          el.setAttribute("stroke-linejoin", "round");
        } else {
          el.setAttribute("fill", "currentColor");
        }
      } else if (node.t === "rect") {
        el = this.doc.createElementNS(NS, "rect");
        el.setAttribute("x", String(node.x));
        el.setAttribute("y", String(node.y));
        el.setAttribute("width", String(node.w));
        el.setAttribute("height", String(node.h));
        el.setAttribute("rx", String(node.rx || 0));
        if (node.stroke) {
          el.setAttribute("fill", "none");
          el.setAttribute("stroke", "currentColor");
          el.setAttribute("stroke-width", String(node.sw || 1.7));
        } else {
          el.setAttribute("fill", "currentColor");
        }
      } else if (node.t === "circle") {
        el = this.doc.createElementNS(NS, "circle");
        el.setAttribute("cx", String(node.cx));
        el.setAttribute("cy", String(node.cy));
        el.setAttribute("r", String(node.r));
        el.setAttribute("fill", node.stroke ? "none" : "currentColor");
        if (node.stroke) {
          el.setAttribute("stroke", "currentColor");
          el.setAttribute("stroke-width", String(node.sw || 1.7));
        }
      }
      if (el) svg.appendChild(el);
    }
    return svg;
  }

  _teardownNativeDock() {
    try {
      this.dockObserver?.disconnect?.();
    } catch {
      // Ignore
    }
    this.dockObserver = null;
    if (this.dockPollTimer) {
      clearInterval(this.dockPollTimer);
      this.dockPollTimer = null;
    }
    for (const btn of Object.values(this.dockButtons)) {
      try {
        btn?.remove?.();
      } catch {
        // Ignore
      }
    }
    this.dockButtons = {};
    if (this.dockGroupEl) {
      try {
        this.dockGroupEl.remove();
      } catch {
        // Ignore
      }
      this.dockGroupEl = null;
    }
    this.nativeControlBar = null;
  }

  /**
   * Injects LM Subs caption controls directly into Google NotebookLM's own
   * bottom play bar so they look and behave like native player buttons.
   */
  _mountNativeDock() {
    this._teardownNativeDock();
    this.host?.setAttribute?.("data-dock", this.playBarDockMode);
    if (this.mediaKind === "audio" || this.playBarDockMode !== "native") {
      return false;
    }
    if (!this.doc || typeof this.doc.createElement !== "function") return false;

    const bar = findNativeControlBar(this.video, this.doc);
    if (!bar) {
      this.host?.setAttribute?.("data-dock", "hover");
      return false;
    }
    ensureDockStyle(this.doc);
    this.nativeControlBar = bar;

    const makeDockButton = (key, label, iconNodes, onClick, { cc = false } = {}) => {
      const btn = this.doc.createElement("button");
      btn.type = "button";
      btn.className = cc ? "lms-dock-btn lms-dock-cc" : "lms-dock-btn";
      btn.dataset.lmsKey = key;
      btn.setAttribute("aria-label", label);
      btn.title = label;
      if (cc) {
        btn.textContent = "CC";
      } else if (iconNodes === null) {
        btn.textContent = label;
      } else {
        btn.appendChild(this._svgIcon(20, iconNodes));
      }
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        unlockChimeForGesture();
        onClick();
      });
      this.dockButtons[key] = btn;
      return btn;
    };

    const ccBtn = makeDockButton(
      "cc",
      "Toggle LM Subs captions (C)",
      null,
      () => {
        if (this.cues.length === 0 && this.statusState !== "working") {
          this.onRequestGenerate({ force: true });
          return;
        }
        this.toggleSubtitles();
      },
      { cc: true }
    );

    const optionsBtn = makeDockButton(
      "options",
      "LM Subs caption options (O)",
      [
        {
          t: "path",
          d: "M4 6h10v2H4V6zm0 5h6v2H4v-2zm0 5h10v2H4v-2zm13.5-9.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5zm0 9.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5z",
        },
      ],
      () => this.toggleToolsPopover()
    );

    const built = [ccBtn, optionsBtn];

    if (this.fineGrainedControls) {
      // No speed button: NotebookLM's own play bar already ships one, so a
      // second control crowded the row without adding anything.
      built.push(
        makeDockButton(
          "loop",
          "Loop active caption sentence (L)",
          [
            {
              t: "path",
              d: "M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z",
            },
          ],
          () => this.toggleCueLoop()
        ),
        makeDockButton(
          "pip",
          "Picture-in-Picture with captions (P)",
          [
            { t: "rect", x: 3, y: 5, w: 18, h: 14, rx: 2, stroke: true },
            { t: "rect", x: 12, y: 12, w: 7, h: 5, rx: 1 },
          ],
          () => this.togglePictureInPicture()
        ),
        makeDockButton(
          "snapshot",
          "Save frame with the caption burned in (X)",
          [
            {
              t: "path",
              d: "M9 3h6l1.5 2H20a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h3.5L9 3zm3 5.2A4.3 4.3 0 1 0 12 17.8 4.3 4.3 0 0 0 12 8.2zm0 2a2.3 2.3 0 1 1 0 4.6 2.3 2.3 0 0 1 0-4.6z",
            },
          ],
          () => this.captureSnapshot()
        ),
        makeDockButton("boost", "Volume boost", [
          {
            t: "path",
            d: "M3 9v6h4l5 5V4L7 9H3zm13.5 3a4.5 4.5 0 0 0-2.5-4v8a4.5 4.5 0 0 0 2.5-4z",
          },
        ], () => this.cycleAudioBoost()),
        makeDockButton(
          "silence",
          "Skip silence",
          [
            {
              t: "path",
              d: "M4 18l8.5-6L4 6v12zm9-12v12l8.5-6L13 6z",
            },
          ],
          () => this.toggleSkipSilence()
        )
      );
    }

    // One wrapper holds every LM Subs button so the host bar lays them out as
    // a single unit instead of interleaving them with the native controls.
    const group = this.doc.createElement("div");
    group.className = "lms-dock-group";
    group.setAttribute("role", "group");
    group.setAttribute("aria-label", "LM Subs caption controls");
    for (const btn of built) {
      group.appendChild(btn);
    }
    this.dockGroupEl = group;

    const inserted = insertDockGroupBeforeRightCluster(bar, group);
    if (!inserted) {
      try {
        bar.appendChild(group);
      } catch {
        // Ignore hostile DOM
      }
    }

    // A narrow bar cannot hold eight extra buttons without pushing the native
    // controls off the row, so fall back to CC plus options only.
    this._fitDockGroupToBar(bar, group, built);

    this.host?.setAttribute?.("data-dock", "native");
    this._renderDockButtons();
    this._startControlVisibilitySync();
    return true;
  }

  /**
   * Removes the extra dock buttons when the host bar is too narrow to hold
   * them next to the native controls. CC and the options button always stay;
   * everything else stays reachable from the caption options popover.
   */
  _fitDockGroupToBar(bar, group, built) {
    if (!bar || !group) return;
    group.dataset.divider = "true";
    group.dataset.compact = "false";

    const measure = () => {
      try {
        const barRect = bar.getBoundingClientRect?.() || null;
        const groupRect = group.getBoundingClientRect?.() || null;
        return {
          barWidth: Number(barRect?.width) || 0,
          groupWidth: Number(groupRect?.width) || 0,
        };
      } catch {
        return { barWidth: 0, groupWidth: 0 };
      }
    };
    const overflows = () => {
      try {
        return bar.scrollWidth > bar.clientWidth + 2;
      } catch {
        return false;
      }
    };

    let { barWidth, groupWidth } = measure();
    if (barWidth <= 0 || groupWidth <= 0) return;

    const essential = new Set(["cc", "options"]);
    const extras = built
      .filter((btn) => btn && !essential.has(btn.dataset?.lmsKey))
      .reverse();

    let compacted = false;
    for (const btn of extras) {
      if (groupWidth <= barWidth * 0.45 && !overflows()) break;
      try {
        btn.remove();
        compacted = true;
      } catch {
        // Ignore hostile DOM
      }
      ({ barWidth, groupWidth } = measure());
    }

    group.dataset.compact = compacted ? "true" : "false";
  }

  _renderDockButtons() {
    const hasCues = this.cues.length > 0;
    const isWorking = this.statusState === "working";
    const cc = this.dockButtons.cc;
    if (cc) {
      cc.dataset.active = hasCues && this.ccEnabled ? "true" : "false";
      cc.dataset.primary = !hasCues && !isWorking ? "true" : "false";
      cc.dataset.disabled = isWorking ? "true" : "false";
      cc.title = hasCues
        ? this.ccEnabled
          ? "Hide LM Subs captions (C)"
          : "Show LM Subs captions (C)"
        : "Generate LM Subs captions";
    }
    const options = this.dockButtons.options;
    if (options) {
      options.dataset.active = this.toolsOpen ? "true" : "false";
    }
    const loop = this.dockButtons.loop;
    if (loop) {
      loop.dataset.active = this.loopCueIndex >= 0 ? "true" : "false";
    }
    const pip = this.dockButtons.pip;
    if (pip) {
      pip.dataset.active = this.inPiP ? "true" : "false";
    }
    const boost = this.dockButtons.boost;
    if (boost) {
      boost.dataset.active = this.audioBoostPercent > 100 ? "true" : "false";
      boost.title = `Volume boost: ${this.audioBoostPercent}%`;
    }
    const silence = this.dockButtons.silence;
    if (silence) {
      silence.dataset.active = this.skipSilenceEnabled ? "true" : "false";
      silence.title = this.skipSilenceEnabled
        ? `Skip silence on (${this.skipSilenceGapSec}s gaps)`
        : "Skip silence off";
    }
  }

  _closePopoversExcept(keepName) {
    if (keepName !== "drawer" && this.drawerOpen) {
      this.drawerOpen = false;
      if (this.drawerEl) this.drawerEl.dataset.open = "false";
      if (this.stageEl) this.stageEl.dataset.drawerOpen = "false";
      if (this.transcriptBtn) this.transcriptBtn.dataset.active = "false";
    }
    if (keepName !== "style" && this.styleOpen) {
      this.styleOpen = false;
      if (this.stylePopoverEl) this.stylePopoverEl.dataset.open = "false";
      if (this.stylerBtn) this.stylerBtn.dataset.active = "false";
    }
    if (keepName !== "shortcuts" && this.shortcutsOpen) {
      this.shortcutsOpen = false;
      if (this.shortcutsEl) this.shortcutsEl.dataset.open = "false";
      if (this.shortcutsBtn) this.shortcutsBtn.dataset.active = "false";
    }
    if (keepName !== "tools" && this.toolsOpen) {
      this.toolsOpen = false;
      if (this.toolsPopoverEl) this.toolsPopoverEl.dataset.open = "false";
      if (this.moreBtn) this.moreBtn.dataset.active = "false";
    }
  }

  toggleToolsPopover(forceState) {
    this._ensureMounted();
    const next = typeof forceState === "boolean" ? forceState : !this.toolsOpen;
    if (next) this._closePopoversExcept("tools");
    this.toolsOpen = next;
    if (this.toolsPopoverEl) {
      this.toolsPopoverEl.dataset.open = next ? "true" : "false";
    }
    if (this.moreBtn) {
      this.moreBtn.dataset.active = next ? "true" : "false";
    }
    return this.toolsOpen;
  }

  _mount() {
    const parent = this._resolveMountParent();
    if (!parent) return;

    if (parent.style && this.mediaKind !== "audio") {
      const computedPos = globalThis.getComputedStyle?.(parent)?.position;
      if (!computedPos || computedPos === "static") {
        parent.style.position = "relative";
      }
    }

    const hostClass =
      this.mediaKind === "audio"
        ? `${DOM_SELECTORS.OVERLAY_HOST_CLASS}-audio`
        : DOM_SELECTORS.OVERLAY_HOST_CLASS;
    const old = parent.querySelector?.(`.${hostClass}`);
    if (old) old.remove();

    this.host = this.doc.createElement("div");
    this.host.className = hostClass;
    if (this.host.dataset) {
      this.host.dataset.mode = this.mediaKind;
    }
    this.host.setAttribute?.("data-mode", this.mediaKind);
    this.host.setAttribute?.("data-dock", this.playBarDockMode);
    if (this.host.dataset) {
      this.host.dataset.controlsVisible = "true";
    }
    const shadow = this.host.attachShadow({ mode: "closed" });
    this.shadow = shadow;

    const style = this.doc.createElement("style");
    style.textContent = OVERLAY_CSS;

    this.toolbar = this.doc.createElement("div");
    this.toolbar.className = "toolbar";

    this.ccBtn = this.doc.createElement("button");
    this.ccBtn.type = "button";
    this.ccBtn.className = "cc-pill";
    this.ccBtn.title = "Toggle closed captions (C)";
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
      "Toggle transcript, smart chapters, and saved bookmarks (T)",
      () => this.toggleTranscriptDrawer()
    );

    this.loopBtn = this._makeBtn(
      "Loop",
      "Repeat active caption sentence continuously (L)",
      () => this.toggleCueLoop()
    );

    this.speedBtn = this._makeBtn(
      "1x",
      "Cycle video playback speed (< / >)",
      () => this.cyclePlaybackSpeed()
    );

    this.pipBtn = this._makeBtn(
      "PiP",
      "Toggle Picture-in-Picture window with live captions (P)",
      () => this.togglePictureInPicture()
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
    this.stylerBtn = this._makeBtn(
      "Style",
      "Customize caption font, color, position, opacity, and word highlight (S)",
      () => this.toggleStylePopover()
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

    this.csvBtn = this._makeBtn(".CSV", "Export CSV spreadsheet / Anki deck (.csv)", () => {
      if (this.cues.length === 0) return;
      this.exportSubtitles("csv");
      flashButtonLabel(this.csvBtn, "Saved");
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

    this.transcriptBtn.className = "bar-pill";

    this.moreBtn = this._makeBtn(
      "Options",
      "Subtitle style, timing, playback, and export options",
      () => this.toggleToolsPopover()
    );
    this.moreBtn.className = "bar-pill";

    // Fine-grained playback controls (only rendered when advanced mode is on)
    this.snapshotBtn = this._makeBtn(
      "Shot",
      "Save the current frame with the caption burned in (X)",
      () => this.captureSnapshot()
    );
    this.boostBtn = this._makeBtn(
      "Vol",
      "Cycle volume boost for quiet NotebookLM narration",
      () => this.cycleAudioBoost()
    );
    this.silenceBtn = this._makeBtn(
      "Silence",
      "Skip silent gaps between spoken sentences (Z)",
      () => this.toggleSkipSilence()
    );
    this.fullscreenBtn = this._makeBtn(
      "Full",
      "Toggle fullscreen playback with captions (F)",
      () => this.toggleFullscreen()
    );
    this.back10Btn = this._makeBtn("-10s", "Rewind 10 seconds (,)", () =>
      this.seekBySeconds(-10)
    );
    this.fwd10Btn = this._makeBtn("+10s", "Forward 10 seconds (.)", () =>
      this.seekBySeconds(10)
    );

    // Build compact Player Subtitle Menu Popover above the bottom play bar
    this.toolsPopoverEl = this.doc.createElement("div");
    this.toolsPopoverEl.className = "tools-popover";
    this.toolsPopoverEl.dataset.open = "false";

    const makeToolsSection = (labelText, ...buttons) => {
      const sec = this.doc.createElement("div");
      sec.className = "tools-section";
      const lbl = this.doc.createElement("div");
      lbl.className = "tools-label";
      lbl.textContent = labelText;
      const row = this.doc.createElement("div");
      row.className = "tools-row";
      row.append(...buttons);
      sec.append(lbl, row);
      return sec;
    };

    this.controlsGroup.style.display = "flex";
    this.controlsGroup.style.flexDirection = "column";
    this.controlsGroup.style.gap = "8px";
    this.controlsGroup.append(
      makeToolsSection(
        "Appearance and studio",
        this.sizeDownBtn,
        this.sizeUpBtn,
        this.styleBtn,
        this.stylerBtn
      ),
      makeToolsSection(
        "Playback and timing",
        this.loopBtn,
        this.speedBtn,
        this.pipBtn,
        this.offsetMinusBtn,
        this.offsetLabelBtn,
        this.offsetPlusBtn
      ),
      makeToolsSection(
        "Export transcript",
        this.srtBtn,
        this.vttBtn,
        this.txtBtn,
        this.mdBtn,
        this.csvBtn,
        this.copyBtn
      )
    );

    const utilitySection = makeToolsSection(
      "Source and shortcuts",
      this.importBtn,
      this.regenBtn,
      this.shortcutsBtn
    );

    this.fineSection = makeToolsSection(
      "Fine-grained playback",
      this.snapshotBtn,
      this.boostBtn,
      this.silenceBtn,
      this.fullscreenBtn,
      this.back10Btn,
      this.fwd10Btn
    );
    this.fineSection.dataset.fine = "true";
    this.fineSection.style.display = this.fineGrainedControls
      ? "flex"
      : "none";

    this.toolsPopoverEl.append(
      this.controlsGroup,
      utilitySection,
      this.fineSection
    );

    if (this.mediaKind === "audio" && this.pipBtn) {
      this.pipBtn.style.display = "none";
    }

    if (this.mediaKind === "audio") {
      this.audioTagEl = this.doc.createElement("span");
      this.audioTagEl.className = "audio-mode-tag";
      this.audioTagEl.textContent = "Podcast";
      this.toolbar.append(
        this.audioTagEl,
        this.ccBtn,
        this.statusEl,
        this.transcriptBtn,
        this.moreBtn,
        this.fileInput
      );
    } else {
      this.toolbar.append(
        this.ccBtn,
        this.statusEl,
        this.transcriptBtn,
        this.moreBtn,
        this.fileInput
      );
    }

    // Build Live Caption Style Studio Popover
    this._mountStylePopover();

    // Build Interactive Click-to-Seek Transcript, Chapters & Bookmarks Drawer
    this._mountTranscriptDrawer();

    // Build Keyboard Shortcuts Cheat Sheet
    this.shortcutsEl = this.doc.createElement("div");
    this.shortcutsEl.className = "shortcuts-popover";
    this.shortcutsEl.dataset.open = "false";
    const shortcutPairs = [
      ["Toggle captions", "C"],
      ["Transcript & chapters", "T"],
      ["Caption style studio", "S"],
      ["Prev / next cue", "J / K"],
      ["Loop active sentence", "L"],
      ["Bookmark active cue", "M"],
      ["Playback speed", "< / >"],
      ["Picture-in-Picture", "P"],
      ["Caption size", "- / +"],
      ["Cycle backdrop", "B"],
      ["Timing -0.25s / +0.25s", "[ / ]"],
      ["Word delay -50 / +50ms", "{ / }"],
      ["Reset timing", "\\"],
      ["Rewind / forward 10s", ", / ."],
      ["Fullscreen", "F"],
      ["Frame snapshot with caption", "X"],
      ["Skip silence", "Z"],
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
    this.captionBox.title = "Click to copy spoken line";

    this.captionBox.addEventListener("click", async (e) => {
      if (!this.clickCaptionToCopy) return;
      e.stopPropagation();
      const active = this._getActiveCueObject();
      if (!active) return;
      const line = `[${formatShortTimestamp(active.startSec)}] ${String(active.text || "")
        .replace(/\s*\n\s*/g, " ")
        .trim()}`;
      try {
        await globalThis.navigator?.clipboard?.writeText(line);
        flashButtonLabel(this.copyBtn, "Copied cue");
      } catch {
        // Ignore clipboard denial
      }
    });

    this.captionBox.addEventListener("mouseenter", () => {
      if (this.pauseOnCaptionHover && this.video && !this.video.paused) {
        this.pausedByHover = true;
        try {
          this.video.pause();
        } catch {
          // Ignore
        }
      }
    });

    this.captionBox.addEventListener("mouseleave", () => {
      if (this.pausedByHover && this.video && this.video.paused) {
        this.pausedByHover = false;
        try {
          this.video.play?.().catch?.(() => {});
        } catch {
          // Ignore
        }
      }
    });

    this.stageEl.appendChild(this.captionBox);

    shadow.append(
      style,
      this.stageEl,
      this.drawerEl,
      this.toolsPopoverEl,
      this.stylePopoverEl,
      this.shortcutsEl,
      this.toolbar
    );
    parent.appendChild(this.host);

    this._observePlayerSize();
    this._applyCaptionMetrics();
    this._applyAllCaptionVisuals();
    this._renderToolbar();
  }

  _mountStylePopover() {
    this.stylePopoverEl = this.doc.createElement("div");
    this.stylePopoverEl.className = "style-popover";
    this.stylePopoverEl.dataset.open = "false";

    const addPillGroup = (groupKey, labelText, options, onSelect) => {
      const row = this.doc.createElement("div");
      row.className = "style-row";
      const head = this.doc.createElement("div");
      head.className = "style-row-head";
      const lbl = this.doc.createElement("span");
      lbl.textContent = labelText;
      head.appendChild(lbl);

      const pills = this.doc.createElement("div");
      pills.className = "style-pills";
      this.stylePillButtons[groupKey] = [];

      for (const [val, text] of options) {
        const b = this._makeBtn(text, text, () => onSelect(val));
        b.dataset.val = String(val);
        pills.appendChild(b);
        this.stylePillButtons[groupKey].push(b);
      }

      row.append(head, pills);
      this.stylePopoverEl.appendChild(row);
    };

    addPillGroup(
      "position",
      "Position (V)",
      [
        ["bottom", "Bottom"],
        ["raised", "Raised"],
        ["top", "Top"],
      ],
      (val) => this._updateStylePatch({ captionPosition: val })
    );

    addPillGroup(
      "style",
      "Backdrop (B)",
      [
        ["classic", "Dark"],
        ["contrast", "Contrast"],
        ["minimal", "Clean"],
        ["cinema", "Pill"],
        ["paper", "Paper"],
        ["amber", "Warm"],
      ],
      (val) => {
        this.captionStyle = val;
        this._applyAllCaptionVisuals();
        this.onCaptionStyleChange(val);
        this.onStylePatchChange({ captionStyle: val });
      }
    );

    addPillGroup(
      "font",
      "Typeface",
      [
        ["sans", "Sans"],
        ["serif", "Serif"],
        ["mono", "Mono"],
        ["dyslexic", "Readable"],
      ],
      (val) => this._updateStylePatch({ captionFontFamily: val })
    );

    addPillGroup(
      "color",
      "Text color",
      [
        ["white", "White"],
        ["yellow", "Yellow"],
        ["cyan", "Cyan"],
        ["green", "Green"],
        ["ink", "Ink"],
      ],
      (val) => this._updateStylePatch({ captionColor: val })
    );

    addPillGroup(
      "width",
      "Line width",
      [
        ["compact", "Compact"],
        ["balanced", "Balanced"],
        ["wide", "Wide"],
      ],
      (val) => this._updateStylePatch({ captionMaxWidth: val })
    );

    // Opacity slider
    const opRow = this.doc.createElement("div");
    opRow.className = "style-row";
    const opHead = this.doc.createElement("div");
    opHead.className = "style-row-head";
    const opLbl = this.doc.createElement("span");
    opLbl.textContent = "Backdrop opacity";
    this.opacityValEl = this.doc.createElement("span");
    this.opacityValEl.textContent = `${this.captionBgOpacity}%`;
    opHead.append(opLbl, this.opacityValEl);

    this.opacityInput = this.doc.createElement("input");
    this.opacityInput.type = "range";
    this.opacityInput.className = "opacity-range";
    this.opacityInput.min = "20";
    this.opacityInput.max = "100";
    this.opacityInput.step = "5";
    this.opacityInput.value = String(this.captionBgOpacity);
    this.opacityInput.addEventListener("input", (e) => {
      e.stopPropagation();
      const v = Number(this.opacityInput.value);
      this._updateStylePatch({ captionBgOpacity: v });
    });
    opRow.append(opHead, this.opacityInput);
    this.stylePopoverEl.appendChild(opRow);

    // Word-for-word highlight delay slider
    const kdRow = this.doc.createElement("div");
    kdRow.className = "style-row";
    const kdHead = this.doc.createElement("div");
    kdHead.className = "style-row-head";
    const kdLbl = this.doc.createElement("span");
    kdLbl.textContent = "Word highlight delay ({ / })";
    this.karaokeDelayValEl = this.doc.createElement("span");
    this.karaokeDelayValEl.textContent = `${
      this.karaokeDelayMs > 0 ? "+" : ""
    }${this.karaokeDelayMs} ms`;
    kdHead.append(kdLbl, this.karaokeDelayValEl);

    this.karaokeDelayInput = this.doc.createElement("input");
    this.karaokeDelayInput.type = "range";
    this.karaokeDelayInput.className = "opacity-range";
    this.karaokeDelayInput.min = "-500";
    this.karaokeDelayInput.max = "1500";
    this.karaokeDelayInput.step = "50";
    this.karaokeDelayInput.value = String(this.karaokeDelayMs);
    this.karaokeDelayInput.addEventListener("input", (e) => {
      e.stopPropagation();
      const v = Number(this.karaokeDelayInput.value);
      this._updateStylePatch({ karaokeDelayMs: v });
    });
    kdRow.append(kdHead, this.karaokeDelayInput);
    this.stylePopoverEl.appendChild(kdRow);

    // Feature toggles inside Style popover
    const toggleRow = this.doc.createElement("div");
    toggleRow.className = "style-pills";
    this.karaokeBtn = this._makeBtn(
      "Word highlight",
      "Highlight spoken words progressively through each cue",
      () => this._updateStylePatch({ karaokeHighlight: !this.karaokeHighlight })
    );
    this.hoverPauseBtn = this._makeBtn(
      "Hover pause",
      "Pause video automatically while hovering over captions",
      () =>
        this._updateStylePatch({
          pauseOnCaptionHover: !this.pauseOnCaptionHover,
        })
    );
    toggleRow.append(this.karaokeBtn, this.hoverPauseBtn);
    this.stylePopoverEl.appendChild(toggleRow);
  }

  _mountTranscriptDrawer() {
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

    const tabsRow = this.doc.createElement("div");
    tabsRow.className = "drawer-tabs";
    const tabGroup = this.doc.createElement("div");
    tabGroup.style.display = "inline-flex";
    tabGroup.style.gap = "3px";

    this.tabLinesBtn = this._makeBtn("Lines", "All spoken lines", () =>
      this._setDrawerTab("lines")
    );
    this.tabChaptersBtn = this._makeBtn("Chapters", "Smart topic chapters", () =>
      this._setDrawerTab("chapters")
    );
    this.tabSavedBtn = this._makeBtn("Saved", "Bookmarked study moments", () =>
      this._setDrawerTab("saved")
    );
    this.tabLinesBtn.dataset.active = "true";
    tabGroup.append(this.tabLinesBtn, this.tabChaptersBtn, this.tabSavedBtn);

    this.bookmarkNowBtn = this._makeBtn(
      "+ Bookmark",
      "Bookmark active spoken cue (M)",
      () => this.toggleBookmarkActiveCue()
    );
    tabsRow.append(tabGroup, this.bookmarkNowBtn);

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

    this.drawerEl.append(drawerHead, tabsRow, searchRow, this.drawerListEl);
  }

  _setDrawerTab(tab) {
    this.drawerTab = tab;
    if (this.tabLinesBtn) this.tabLinesBtn.dataset.active = tab === "lines" ? "true" : "false";
    if (this.tabChaptersBtn) this.tabChaptersBtn.dataset.active = tab === "chapters" ? "true" : "false";
    if (this.tabSavedBtn) this.tabSavedBtn.dataset.active = tab === "saved" ? "true" : "false";
    this._renderTranscriptList();
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
      this._enforceCueLoop();
      this._applySkipSilence();
      this._renderActiveCue();
    };
    this._onPlay = () => {
      this._ensureMounted();
      if (this.playbackSpeed !== 1) {
        this._applyPlaybackSpeed(this.playbackSpeed, false);
      }
      this._startHighFreqSync();
      this._startWatchClock();
      this._updateControlsVisibility();
    };
    this._onPause = () => {
      this._stopHighFreqSync();
      this._flushWatchClock();
      this._updateControlsVisibility();
      this._renderActiveCue();
    };
    this._onEnterPiP = () => {
      this.inPiP = true;
      this._emitTelemetry({ pipDelta: 1 });
      if (this.pipBtn) this.pipBtn.dataset.active = "true";
      this._renderDockButtons();
      this._syncTrackVisibility();
      this._renderActiveCue();
    };
    this._onLeavePiP = () => {
      this.inPiP = false;
      if (this.pipBtn) this.pipBtn.dataset.active = "false";
      this._renderDockButtons();
      this._syncTrackVisibility();
      this._renderActiveCue();
    };
    this._onPointerEnter = () => {
      this.pointerOverPlayer = true;
      this._updateControlsVisibility();
    };
    this._onPointerLeave = () => {
      this.pointerOverPlayer = false;
      this._updateControlsVisibility();
    };
    this._onFullscreenChange = () => {
      this._ensureMounted();
      this._applyCaptionMetrics();
      this._updateControlsVisibility();
    };

    this.video.addEventListener("timeupdate", this._onTimeChange);
    this.video.addEventListener("seeking", this._onTimeChange);
    this.video.addEventListener("seeked", this._onTimeChange);
    this.video.addEventListener("play", this._onPlay);
    this.video.addEventListener("pause", this._onPause);
    this.video.addEventListener("enterpictureinpicture", this._onEnterPiP);
    this.video.addEventListener("leavepictureinpicture", this._onLeavePiP);

    // Hover state is tracked with enter/leave (not mousemove) so caption
    // controls never flicker while the pointer rests over the player.
    const container = this.host?.parentElement || this.video.parentElement;
    if (container) {
      container.addEventListener?.("pointerenter", this._onPointerEnter, {
        passive: true,
      });
      container.addEventListener?.("pointerleave", this._onPointerLeave, {
        passive: true,
      });
      container.addEventListener?.("mouseenter", this._onPointerEnter, {
        passive: true,
      });
      container.addEventListener?.("mouseleave", this._onPointerLeave, {
        passive: true,
      });
    }
    this.doc.addEventListener?.("fullscreenchange", this._onFullscreenChange, {
      passive: true,
    });
    globalThis.addEventListener?.("resize", this._onFullscreenChange, {
      passive: true,
    });
  }

  _startWatchClock() {
    this.lastWatchTickMs = Date.now();
  }

  _flushWatchClock() {
    if (!this.lastWatchTickMs) return;
    const elapsedMs = Date.now() - this.lastWatchTickMs;
    this.lastWatchTickMs = 0;
    if (elapsedMs < 500) return;
    const seconds = elapsedMs / 1000;
    this.watchAccumulatorSec += seconds;
    if (this.watchAccumulatorSec < 5) return;
    const whole = Math.round(this.watchAccumulatorSec);
    this.watchAccumulatorSec = 0;
    const speedSaved =
      this.playbackSpeed > 1
        ? Math.round(whole * (this.playbackSpeed - 1))
        : 0;
    this._emitTelemetry({
      [this.mediaKind === "audio" ? "listenSeconds" : "watchSeconds"]: whole,
      speedSavedSeconds: speedSaved,
    });
  }

  _startHighFreqSync() {
    if (this.syncTimer) return;
    this.syncTimer = setInterval(() => {
      this._enforceCueLoop();
      this._renderActiveCue();
    }, 90);
  }

  _stopHighFreqSync() {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }
  }

  /**
   * Controls stay visible while the pointer is over the player, while any
   * popover is open, while paused, and while NotebookLM's own controls are
   * on screen. They never toggle on cue presence, which is what used to make
   * the caption options blink between sentences.
   */
  _scheduleIdleFade() {
    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
      this.idleTimer = null;
    }
    if (this.toolbar) this.toolbar.dataset.idle = "false";
    this._updateControlsVisibility();
  }

  seekBySeconds(deltaSec) {
    try {
      const next = Math.max(
        0,
        Math.min(
          Number.isFinite(this.video.duration) && this.video.duration > 0
            ? this.video.duration - 0.05
            : Number.MAX_SAFE_INTEGER,
          (this.video.currentTime || 0) + deltaSec
        )
      );
      this.video.currentTime = next;
      this._renderActiveCue();
      return true;
    } catch {
      return false;
    }
  }

  async toggleFullscreen() {
    try {
      const target = this.host?.parentElement || this.video.parentElement;
      if (this.doc.fullscreenElement) {
        await this.doc.exitFullscreen?.();
        return false;
      }
      if (target?.requestFullscreen) {
        await target.requestFullscreen();
        return true;
      }
      if (this.video.requestFullscreen) {
        await this.video.requestFullscreen();
        return true;
      }
    } catch {
      // Ignore fullscreen rejection
    }
    return false;
  }

  /**
   * Saves the current video frame with the live caption painted onto it.
   * Uses a canvas snapshot rather than `innerHTML` so it stays Trusted Types safe.
   */
  captureSnapshot() {
    try {
      const w = this.video.videoWidth;
      const h = this.video.videoHeight;
      if (!w || !h) return false;
      const canvas = this.doc.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext?.("2d");
      if (!ctx) return false;
      ctx.drawImage(this.video, 0, 0, w, h);

      const active = this._getActiveCueObject();
      if (active && this.ccEnabled) {
        const prefix =
          this.showSpeakerLabels && active.speaker ? `[${active.speaker}] ` : "";
        const text = `${prefix}${active.text}`.replace(/\s*\n\s*/g, " ").trim();
        const fontSize = Math.max(16, Math.round(h * 0.045));
        ctx.font = `600 ${fontSize}px "Plus Jakarta Sans", Roboto, sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "bottom";
        const maxWidth = w * 0.86;
        const words = String(text).split(" ");
        const lines = [];
        let line = "";
        for (const word of words) {
          const candidate = line ? `${line} ${word}` : word;
          if (ctx.measureText(candidate).width > maxWidth && line) {
            lines.push(line);
            line = word;
          } else {
            line = candidate;
          }
        }
        if (line) lines.push(line);

        const lineHeight = fontSize * 1.35;
        const padX = fontSize * 0.7;
        const padY = fontSize * 0.45;
        const boxWidth = Math.min(
          maxWidth + padX * 2,
          Math.max(
            ...lines.map((l) => ctx.measureText(l).width + padX * 2),
            fontSize
          )
        );
        const boxHeight = lines.length * lineHeight + padY * 2;
        const boxX = (w - boxWidth) / 2;
        const boxY = h - boxHeight - fontSize * 0.9;
        ctx.fillStyle = "rgba(11, 13, 16, 0.86)";
        if (typeof ctx.roundRect === "function") {
          ctx.beginPath();
          ctx.roundRect(boxX, boxY, boxWidth, boxHeight, fontSize * 0.4);
          ctx.fill();
        } else {
          ctx.fillRect(boxX, boxY, boxWidth, boxHeight);
        }
        ctx.fillStyle = "#fdfdfe";
        lines.forEach((l, idx) => {
          ctx.fillText(
            l,
            w / 2,
            boxY + padY + lineHeight * (idx + 0.82),
            maxWidth
          );
        });
      }

      const dataUrl = canvas.toDataURL?.("image/png");
      if (!dataUrl) return false;
      const a = this.doc.createElement("a");
      a.href = dataUrl;
      a.download = `lm-subs-shot-${Math.round((this.video.currentTime || 0) * 10) / 10}s.png`;
      a.rel = "noopener";
      a.style.display = "none";
      (this.doc.body || this.doc.documentElement)?.appendChild?.(a);
      a.click();
      a.remove();
      this._emitTelemetry({ snapshotsDelta: 1 });
      return true;
    } catch {
      return false;
    }
  }

  cycleAudioBoost() {
    const steps = [100, 125, 150, 175, 200];
    const idx = steps.indexOf(this.audioBoostPercent);
    const next = steps[(idx + 1) % steps.length];
    this.applyAudioBoost(next);
    return next;
  }

  applyAudioBoost(percent) {
    this.audioBoostPercent = this._clamp(percent, 100, 250, 100);
    try {
      const AudioCtx =
        globalThis.AudioContext || globalThis.webkitAudioContext;
      if (this.audioBoostPercent <= 100) {
        if (this.boostSource) {
          try {
            this.boostSource.disconnect();
          } catch {
            // Ignore
          }
          this.boostSource = null;
        }
        this.video.volume = 1;
      } else if (AudioCtx && typeof AudioCtx.prototype.createMediaElementSource === "function") {
        if (!this.boostCtx) {
          this.boostCtx = new AudioCtx();
          this.boostSource = this.boostCtx.createMediaElementSource(this.video);
          this.boostGain = this.boostCtx.createGain();
          this.boostSource.connect(this.boostGain);
          this.boostGain.connect(this.boostCtx.destination);
        }
        if (this.boostCtx.state === "suspended") {
          this.boostCtx.resume?.().catch?.(() => {});
        }
        if (this.boostGain) {
          this.boostGain.gain.value = this.audioBoostPercent / 100;
        }
      }
    } catch {
      // Boost is best-effort; NotebookLM may block MediaElementSource routing
    }
    if (this.boostBtn) {
      this.boostBtn.textContent =
        this.audioBoostPercent > 100 ? `${this.audioBoostPercent}%` : "Vol";
      this.boostBtn.dataset.active =
        this.audioBoostPercent > 100 ? "true" : "false";
    }
    this._renderDockButtons();
    return this.audioBoostPercent;
  }

  toggleSkipSilence(forceState) {
    this.skipSilenceEnabled =
      typeof forceState === "boolean" ? forceState : !this.skipSilenceEnabled;
    if (this.silenceBtn) {
      this.silenceBtn.dataset.active = this.skipSilenceEnabled
        ? "true"
        : "false";
    }
    this._renderDockButtons();
    this.onStylePatchChange({ skipSilenceEnabled: this.skipSilenceEnabled });
    this._applySkipSilence();
    return this.skipSilenceEnabled;
  }

  /**
   * Speeds playback through silent gaps between caption cues, then restores
   * the chosen rate as soon as the next spoken line begins.
   */
  _applySkipSilence() {
    if (!this.skipSilenceEnabled || this.cues.length === 0) return;
    const t = this.video.currentTime || 0;
    const shifted = this._shiftedCues();
    const active = findActiveCue(shifted, t - this.offsetSec);
    if (active) {
      if (this.video.playbackRate !== this.playbackSpeed) {
        this.video.playbackRate = this.playbackSpeed;
      }
      return;
    }
    let nextStart = null;
    for (const cue of shifted) {
      if (cue.startSec > t) {
        nextStart = cue.startSec;
        break;
      }
    }
    let prevEnd = 0;
    for (const cue of shifted) {
      if (cue.endSec <= t) prevEnd = Math.max(prevEnd, cue.endSec);
    }
    const gap =
      nextStart !== null
        ? nextStart - t
        : Number.POSITIVE_INFINITY;
    const behindGap = t - prevEnd;
    const inGap =
      gap > this.skipSilenceGapSec || behindGap > this.skipSilenceGapSec;
    if (inGap && this.video.playbackRate !== this.skipSilenceRate) {
      this.video.playbackRate = this.skipSilenceRate;
    } else if (!inGap && this.video.playbackRate !== this.playbackSpeed) {
      this.video.playbackRate = this.playbackSpeed;
    }
  }

  _enforceCueLoop() {
    if (this.loopCueIndex < 0 || this.loopCueIndex >= this.cues.length) return;
    const shifted = this._shiftedCues();
    const target = shifted[this.loopCueIndex];
    if (!target) return;
    const now = this.video.currentTime || 0;
    if (now >= target.endSec - 0.03 || now < target.startSec - 0.25) {
      try {
        this.video.currentTime = Math.max(0, target.startSec + 0.01);
      } catch {
        // Ignore
      }
    }
  }

  toggleCueLoop() {
    if (this.cues.length === 0) return false;
    if (this.loopCueIndex >= 0) {
      this.loopCueIndex = -1;
      if (this.loopBtn) this.loopBtn.dataset.active = "false";
      this._renderDockButtons();
      return false;
    }
    const idx = this.activeCueIndex >= 0 ? this.activeCueIndex : this._findNearestCueIndex();
    if (idx < 0) return false;
    this.loopCueIndex = idx;
    this._emitTelemetry({ loopsDelta: 1 });
    if (this.loopBtn) this.loopBtn.dataset.active = "true";
    this._renderDockButtons();
    return true;
  }

  _findNearestCueIndex() {
    const shifted = this._shiftedCues();
    if (!shifted.length) return -1;
    const now = this.video.currentTime || 0;
    let best = 0;
    let bestDist = Infinity;
    for (let i = 0; i < shifted.length; i++) {
      const dist = Math.abs(shifted[i].startSec - now);
      if (dist < bestDist) {
        bestDist = dist;
        best = i;
      }
    }
    return best;
  }

  seekRelativeCue(step) {
    const shifted = this._shiftedCues();
    if (!shifted.length) return false;
    const base =
      this.activeCueIndex >= 0 ? this.activeCueIndex : this._findNearestCueIndex();
    const nextIdx = Math.max(0, Math.min(shifted.length - 1, base + step));
    const cue = shifted[nextIdx];
    if (!cue) return false;
    if (this.loopCueIndex >= 0) {
      this.loopCueIndex = nextIdx;
    }
    try {
      this.video.currentTime = Math.max(0, cue.startSec + 0.01);
      this._renderActiveCue();
    } catch {
      // Ignore
    }
    return true;
  }

  cyclePlaybackSpeed(stepDir = 1) {
    const idx = PLAYBACK_SPEEDS.indexOf(this.playbackSpeed);
    const nextIdx =
      idx < 0
        ? 1
        : (idx + stepDir + PLAYBACK_SPEEDS.length) % PLAYBACK_SPEEDS.length;
    const nextSpeed = PLAYBACK_SPEEDS[nextIdx];
    this._applyPlaybackSpeed(nextSpeed, true);
    return nextSpeed;
  }

  _applyPlaybackSpeed(rate, persist = false) {
    this.playbackSpeed = rate;
    try {
      if (this.video) {
        this.video.playbackRate = rate;
      }
    } catch {
      // Ignore
    }
    if (this.speedBtn) {
      this.speedBtn.textContent = `${rate}x`;
      this.speedBtn.dataset.active = rate !== 1 ? "true" : "false";
    }
    if (persist) {
      this.onStylePatchChange({ defaultPlaybackSpeed: rate });
    }
  }

  /**
   * Picture-in-Picture that keeps captions on screen.
   *
   * 1. If `keepSubtitlesInPiP` is on and the Document Picture-in-Picture API is
   *    available, we open a real PiP window and render the live caption box into
   *    it (full styling, speaker labels, and karaoke word highlight included).
   * 2. Otherwise we fall back to the native `<video>` PiP window and populate a
   *    programmatic `TextTrack` so the OS/browser renders captions inside it.
   */
  async togglePictureInPicture() {
    try {
      if (this.doc.pictureInPictureElement) {
        await this.doc.exitPictureInPicture?.();
        return false;
      }
      if (this.pipWindow && !this.pipWindow.closed) {
        this.pipWindow.close();
        return false;
      }
      if (
        this.keepSubtitlesInPiP &&
        this.cues.length > 0 &&
        globalThis.documentPictureInPicture?.requestWindow
      ) {
        const win = await globalThis.documentPictureInPicture.requestWindow({
          width: 480,
          height: 270,
        });
        this.pipWindow = win;
        const doc = win.document;
        doc.title = "LM Subs captions";
        const style = doc.createElement("style");
        style.textContent = `
          html, body { margin: 0; height: 100%; background: #0b0d10; overflow: hidden; }
          .lms-pip-caption {
            position: absolute;
            left: 4%; right: 4%; bottom: 6%;
            display: inline-block;
            max-width: 92%;
            margin: 0 auto;
            padding: 7px 15px 8px;
            border-radius: 7px;
            background: rgba(11, 13, 16, 0.88);
            color: #fdfdfe;
            text-align: center;
            font-family: "Plus Jakarta Sans", Roboto, sans-serif;
            font-weight: 500;
            line-height: 1.42;
            white-space: pre-line;
          }
          .lms-pip-caption[data-visible="false"] { display: none; }
          .lms-pip-caption .caption-word-current {
            background: rgba(29, 92, 246, 0.48);
            color: #ffffff;
            padding: 1px 5px;
            border-radius: 4px;
            font-weight: 600;
          }
          .lms-pip-caption .caption-word-upcoming { opacity: 0.64; }
        `;
        const captionEl = doc.createElement("div");
        captionEl.className = "lms-pip-caption";
        captionEl.dataset.visible = "false";
        doc.body.append(style, captionEl);
        this.pipCaptionEl = captionEl;
        this.pipDoc = doc;
        win.addEventListener("pagehide", () => {
          this.pipWindow = null;
          this.pipCaptionEl = null;
          this.pipDoc = null;
        });
        this._renderPipCaption();
        this._emitTelemetry({ pipDelta: 1 });
        return true;
      }
      if (typeof this.video?.requestPictureInPicture === "function") {
        this._syncNativeTextTrack();
        await this.video.requestPictureInPicture();
        return true;
      }
    } catch {
      // Ignore browser gesture / PiP restriction
    }
    return false;
  }

  _renderPipCaption() {
    if (!this.pipCaptionEl || !this.pipDoc) return;
    const effectiveTime = (this.video.currentTime || 0) - this.offsetSec;
    const active =
      findActiveCue(this.cues, effectiveTime) ||
      (this.lastActiveCue &&
      effectiveTime - this.lastActiveCue.endSec <= CAPTION_LINGER_SEC
        ? this.lastActiveCue
        : null);

    if (!this.ccEnabled || !active) {
      this.pipCaptionEl.dataset.visible = "false";
      return;
    }
    const prefix =
      this.showSpeakerLabels && active.speaker ? `[${active.speaker}] ` : "";
    const fullText = `${prefix}${active.text}`;
    while (this.pipCaptionEl.firstChild) {
      this.pipCaptionEl.removeChild(this.pipCaptionEl.firstChild);
    }
    if (this.karaokeHighlight) {
      const span = Math.max(0.25, active.endSec - active.startSec);
      const delayedTime = effectiveTime - (this.karaokeDelayMs || 0) / 1000;
      const progress = Math.max(
        0,
        Math.min(1, (delayedTime - active.startSec) / span)
      );
      const tokens = fullText.split(/(\s+)/);
      const wordPositions = [];
      for (let i = 0; i < tokens.length; i++) {
        if (tokens[i].trim()) wordPositions.push(i);
      }
      const activeWordCount = Math.min(
        wordPositions.length,
        Math.max(1, Math.ceil(progress * wordPositions.length))
      );
      let seen = 0;
      for (const tok of tokens) {
        if (!tok.trim()) {
          this.pipCaptionEl.appendChild(this.pipDoc.createTextNode(tok));
          continue;
        }
        seen += 1;
        const w = this.pipDoc.createElement("span");
        w.className =
          seen === activeWordCount
            ? "caption-word-current"
            : seen < activeWordCount
              ? "caption-word-done"
              : "caption-word-upcoming";
        w.textContent = tok;
        this.pipCaptionEl.appendChild(w);
      }
    } else {
      this.pipCaptionEl.textContent = fullText;
    }
    this.pipCaptionEl.dataset.visible = "true";
  }

  toggleBookmarkCueAt(index) {
    if (index < 0 || index >= this.cues.length) return false;
    const target = this.cues[index];
    const nextBookmarked = !target.bookmarked;
    this.cues[index] = {
      ...target,
      ...(nextBookmarked ? { bookmarked: true } : {}),
    };
    if (!nextBookmarked) {
      delete this.cues[index].bookmarked;
    } else {
      this._emitTelemetry({ bookmarksDelta: 1 });
    }
    this.onCuesMutated(this.cues);
    if (this.drawerOpen) {
      this._renderTranscriptList();
    }
    return nextBookmarked;
  }

  toggleBookmarkActiveCue() {
    if (this.cues.length === 0) return false;
    const idx =
      this.activeCueIndex >= 0 ? this.activeCueIndex : this._findNearestCueIndex();
    if (idx < 0) return false;
    const starred = this.toggleBookmarkCueAt(idx);
    flashButtonLabel(this.bookmarkNowBtn, starred ? "Saved" : "Removed", 1000);
    return starred;
  }

  stepFontSize(delta) {
    this._stepFontSize(delta);
  }

  _stepFontSize(delta) {
    const idx = CAPTION_FONT_SIZES.indexOf(this.fontSize);
    const nextIdx = Math.max(
      0,
      Math.min(CAPTION_FONT_SIZES.length - 1, idx + delta)
    );
    this.fontSize = CAPTION_FONT_SIZES[nextIdx];
    this._applyAllCaptionVisuals();
    this.onFontSizeChange(this.fontSize);
  }

  cycleCaptionStyle() {
    const idx = CAPTION_STYLES.indexOf(this.captionStyle);
    this.captionStyle = CAPTION_STYLES[(idx + 1) % CAPTION_STYLES.length];
    this._applyAllCaptionVisuals();
    this.onCaptionStyleChange(this.captionStyle);
    return this.captionStyle;
  }

  cycleCaptionPosition() {
    const idx = CAPTION_POSITIONS.indexOf(this.captionPosition);
    const next = CAPTION_POSITIONS[(idx + 1) % CAPTION_POSITIONS.length];
    this._updateStylePatch({ captionPosition: next });
    return next;
  }

  toggleStylePopover(forceState) {
    this.styleOpen =
      typeof forceState === "boolean" ? forceState : !this.styleOpen;
    if (this.styleOpen) {
      this._closePopoversExcept("style");
    }
    if (this.stylePopoverEl) {
      this.stylePopoverEl.dataset.open = this.styleOpen ? "true" : "false";
    }
    if (this.stylerBtn) {
      this.stylerBtn.dataset.active = this.styleOpen ? "true" : "false";
    }
    return this.styleOpen;
  }

  _updateStylePatch(patch) {
    this.setSettings(patch);
    this.onStylePatchChange(patch);
  }

  /**
   * Computes the live caption font size from the real player box so captions
   * shrink in the compact Studio sidebar preview and grow in fullscreen, then
   * clamps the result between `captionMinFontPx` and `captionMaxFontPx`.
   */
  _resolveCaptionFontSizePx() {
    const base = FONT_BASE_PX[this.fontSize] || FONT_BASE_PX.medium;
    if (!this.dynamicCaptionScaling) {
      return Math.max(
        this.captionMinFontPx,
        Math.min(this.captionMaxFontPx, base)
      );
    }
    let height = 0;
    let width = 0;
    try {
      const rect =
        this.host?.getBoundingClientRect?.() ||
        this.video?.getBoundingClientRect?.();
      height = Number(rect?.height) || 0;
      width = Number(rect?.width) || 0;
    } catch {
      height = 0;
    }
    if (!height && typeof this.video?.videoHeight === "number") {
      height = this.video.videoHeight;
      width = this.video.videoWidth || height * 1.777;
    }
    if (!height) height = REFERENCE_PLAYER_HEIGHT_PX;
    if (!width) width = height * 1.777;

    // Scale by the smaller dimension so ultrawide and tall crops stay balanced
    const scaleBase = Math.min(height, width * 0.5625);
    const raw =
      base *
      Math.max(0.35, Math.min(3, scaleBase / REFERENCE_PLAYER_HEIGHT_PX)) *
      (this.captionScaleFactor / 100);
    return Math.max(
      this.captionMinFontPx,
      Math.min(this.captionMaxFontPx, Math.round(raw * 10) / 10)
    );
  }

  _applyCaptionMetrics() {
    const root = this.host || this.stageEl;
    if (!root || !root.style) return;
    const box = this.captionBox?.style ? this.captionBox : null;
    const setVar = (name, value) => {
      if (typeof root.style?.setProperty === "function") {
        root.style.setProperty(name, value);
      }
      // Fall back to the caption box itself for lightweight DOM environments
      if (box && typeof box.setProperty === "function") {
        box.setProperty(name, value);
      }
    };
    const px = this._resolveCaptionFontSizePx();
    setVar("--lms-caption-font", `${px}px`);
    setVar(
      "--lms-caption-pad-y",
      `${Math.round((this.captionPaddingY * px) / 18.5)}px`
    );
    setVar(
      "--lms-caption-pad-x",
      `${Math.round((this.captionPaddingX * px) / 18.5)}px`
    );
    setVar("--lms-caption-radius", `${this.captionBorderRadius}px`);
    setVar("--lms-caption-leading", String(this.captionLineHeight / 100));
    setVar("--lms-caption-bottom", `${this.captionBottomOffsetPx}px`);
    setVar("--lms-karaoke-alpha", String(this.karaokeHighlightOpacity / 100));
    setVar("--lms-upcoming-alpha", String(this.upcomingWordOpacity / 100));
    setVar(
      "--lms-caption-stroke",
      this.captionTextStrokePx > 0
        ? `0 0 ${this.captionTextStrokePx}px rgba(0,0,0,0.92), 0 1px 2px rgba(0,0,0,0.85)`
        : "none"
    );
    if (this.pipCaptionEl?.style) {
      this.pipCaptionEl.style.fontSize = `${px}px`;
    }
  }

  _observePlayerSize() {
    if (typeof ResizeObserver === "undefined") return;
    const targets = [];
    if (this.host) targets.push(this.host);
    const parent = this.video?.parentElement;
    if (parent && parent !== this.host) targets.push(parent);
    if (!targets.length) return;
    try {
      this.sizeObserver?.disconnect?.();
      this.sizeObserver = new ResizeObserver(() => {
        this._applyCaptionMetrics();
      });
      for (const t of targets) this.sizeObserver.observe(t);
    } catch {
      this.sizeObserver = null;
    }
  }

  _applyAllCaptionVisuals() {
    if (this.stageEl) {
      this.stageEl.dataset.pos = this.captionPosition;
    }
    if (this.captionBox) {
      this.captionBox.style.fontSize =
        this.dynamicCaptionScaling && this.host?.style
          ? ""
          : FONT_SCALE_MAP[this.fontSize] || FONT_SCALE_MAP.medium;
      this.captionBox.style.fontFamily =
        FONT_FAMILY_MAP[this.captionFontFamily] || FONT_FAMILY_MAP.sans;
      this.captionBox.style.maxWidth =
        MAX_WIDTH_MAP[this.captionMaxWidth] || MAX_WIDTH_MAP.balanced;
      this.captionBox.dataset.style = this.captionStyle;
      this.captionBox.dataset.font = this.captionFontFamily;
      this._applyCaptionMetrics();

      const alpha = this.captionBgOpacity / 100;
      let bgCss = hexToRgba("#0b0d10", alpha);
      let textHex = COLOR_HEX_MAP[this.captionColor] || COLOR_HEX_MAP.white;

      if (this.captionStyle === "contrast") {
        bgCss = hexToRgba("#050608", Math.max(0.75, alpha));
      } else if (this.captionStyle === "minimal") {
        bgCss = "transparent";
        if (this.captionColor === "ink") textHex = "#fdfdfe";
      } else if (this.captionStyle === "paper") {
        bgCss = hexToRgba("#fdfdfe", Math.max(0.82, alpha));
        if (this.captionColor === "white") textHex = "#111315";
      } else if (this.captionStyle === "amber") {
        bgCss = hexToRgba("#1c160c", Math.max(0.78, alpha));
        if (this.captionColor === "white") textHex = "#fde68a";
      }

      this.captionBox.style.backgroundColor = bgCss;
      this.captionBox.style.color = textHex;
    }

    if (this.styleBtn) {
      const labelMap = {
        classic: "Box",
        contrast: "Hi-Con",
        minimal: "Clean",
        cinema: "Pill",
        paper: "Paper",
        amber: "Warm",
      };
      this.styleBtn.textContent = labelMap[this.captionStyle] || "Box";
    }

    if (this.opacityValEl) {
      this.opacityValEl.textContent = `${this.captionBgOpacity}%`;
    }
    if (this.opacityInput) {
      this.opacityInput.value = String(this.captionBgOpacity);
    }
    if (this.karaokeDelayValEl) {
      const sign = this.karaokeDelayMs > 0 ? "+" : "";
      this.karaokeDelayValEl.textContent = `${sign}${this.karaokeDelayMs} ms`;
    }
    if (this.karaokeDelayInput) {
      this.karaokeDelayInput.value = String(this.karaokeDelayMs);
    }
    if (this.karaokeBtn) {
      this.karaokeBtn.dataset.active = this.karaokeHighlight ? "true" : "false";
    }
    if (this.hoverPauseBtn) {
      this.hoverPauseBtn.dataset.active = this.pauseOnCaptionHover ? "true" : "false";
    }

    const syncPills = (group, activeVal) => {
      for (const b of this.stylePillButtons[group] || []) {
        b.dataset.active = b.dataset.val === String(activeVal) ? "true" : "false";
      }
    };
    syncPills("position", this.captionPosition);
    syncPills("style", this.captionStyle);
    syncPills("font", this.captionFontFamily);
    syncPills("color", this.captionColor);
    syncPills("width", this.captionMaxWidth);

    this.lastRenderedSignature = "";
    this._renderActiveCue();
  }

  adjustKaraokeDelay(deltaMs) {
    const next = Math.max(
      -1500,
      Math.min(3000, Math.round((this.karaokeDelayMs + deltaMs) / 10) * 10)
    );
    this._updateStylePatch({ karaokeDelayMs: next });
    return next;
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
      this._closePopoversExcept("drawer");
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
    if (this.shortcutsOpen) {
      this._closePopoversExcept("shortcuts");
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

  setSettings(patch = {}) {
    if (patch.fontSize && CAPTION_FONT_SIZES.includes(patch.fontSize)) {
      this.fontSize = patch.fontSize;
    }
    if (patch.captionStyle && CAPTION_STYLES.includes(patch.captionStyle)) {
      this.captionStyle = patch.captionStyle;
    }
    if (patch.captionFontFamily && CAPTION_FONT_FAMILIES.includes(patch.captionFontFamily)) {
      this.captionFontFamily = patch.captionFontFamily;
    }
    if (patch.captionColor && CAPTION_COLORS.includes(patch.captionColor)) {
      this.captionColor = patch.captionColor;
    }
    if (Number.isFinite(Number(patch.captionBgOpacity))) {
      this.captionBgOpacity = Math.max(
        0,
        Math.min(100, Math.round(Number(patch.captionBgOpacity)))
      );
    }
    if (patch.captionPosition && CAPTION_POSITIONS.includes(patch.captionPosition)) {
      this.captionPosition = patch.captionPosition;
    }
    if (patch.captionMaxWidth && CAPTION_WIDTHS.includes(patch.captionMaxWidth)) {
      this.captionMaxWidth = patch.captionMaxWidth;
    }
    if (typeof patch.karaokeHighlight === "boolean") {
      this.karaokeHighlight = patch.karaokeHighlight;
    }
    if (Number.isFinite(Number(patch.karaokeDelayMs))) {
      this.karaokeDelayMs = Math.max(
        -1500,
        Math.min(3000, Math.round(Number(patch.karaokeDelayMs) / 10) * 10)
      );
    }
    if (typeof patch.showSpeakerLabels === "boolean") {
      this.showSpeakerLabels = patch.showSpeakerLabels;
    }
    if (typeof patch.pauseOnCaptionHover === "boolean") {
      this.pauseOnCaptionHover = patch.pauseOnCaptionHover;
    }
    if (typeof patch.clickCaptionToCopy === "boolean") {
      this.clickCaptionToCopy = patch.clickCaptionToCopy;
    }
    if (PLAYBACK_SPEEDS.includes(Number(patch.defaultPlaybackSpeed))) {
      this._applyPlaybackSpeed(Number(patch.defaultPlaybackSpeed), false);
    }
    if (Number.isFinite(patch.subtitleOffsetSec)) {
      this.offsetSec = patch.subtitleOffsetSec;
      this._syncNativeTextTrack();
      this._renderToolbar();
      this._renderTranscriptList();
    }
    if (typeof patch.fineGrainedControls === "boolean") {
      this.fineGrainedControls = patch.fineGrainedControls;
      if (this.fineSection) {
        this.fineSection.style.display = this.fineGrainedControls
          ? "flex"
          : "none";
      }
      this._mountNativeDock();
    }
    if (typeof patch.dynamicCaptionScaling === "boolean") {
      this.dynamicCaptionScaling = patch.dynamicCaptionScaling;
    }
    if (Number.isFinite(Number(patch.captionScaleFactor))) {
      this.captionScaleFactor = this._clamp(
        patch.captionScaleFactor,
        50,
        200,
        100
      );
    }
    if (Number.isFinite(Number(patch.captionMinFontPx))) {
      this.captionMinFontPx = this._clamp(patch.captionMinFontPx, 8, 18, 11);
    }
    if (Number.isFinite(Number(patch.captionMaxFontPx))) {
      this.captionMaxFontPx = this._clamp(patch.captionMaxFontPx, 20, 64, 40);
    }
    if (Number.isFinite(Number(patch.captionPaddingY))) {
      this.captionPaddingY = this._clamp(patch.captionPaddingY, 2, 20, 7);
    }
    if (Number.isFinite(Number(patch.captionPaddingX))) {
      this.captionPaddingX = this._clamp(patch.captionPaddingX, 6, 40, 15);
    }
    if (Number.isFinite(Number(patch.captionBorderRadius))) {
      this.captionBorderRadius = this._clamp(
        patch.captionBorderRadius,
        0,
        32,
        7
      );
    }
    if (Number.isFinite(Number(patch.captionLineHeight))) {
      this.captionLineHeight = this._clamp(
        patch.captionLineHeight,
        115,
        185,
        142
      );
    }
    if (Number.isFinite(Number(patch.captionBottomOffsetPx))) {
      this.captionBottomOffsetPx = this._clamp(
        patch.captionBottomOffsetPx,
        24,
        180,
        54
      );
    }
    if (Number.isFinite(Number(patch.captionTextStrokePx))) {
      this.captionTextStrokePx = this._clamp(
        patch.captionTextStrokePx,
        0,
        3,
        0
      );
    }
    if (Number.isFinite(Number(patch.karaokeHighlightOpacity))) {
      this.karaokeHighlightOpacity = this._clamp(
        patch.karaokeHighlightOpacity,
        15,
        95,
        48
      );
    }
    if (Number.isFinite(Number(patch.upcomingWordOpacity))) {
      this.upcomingWordOpacity = this._clamp(
        patch.upcomingWordOpacity,
        25,
        100,
        64
      );
    }
    if (
      patch.playBarDockMode &&
      ["native", "hover", "always"].includes(patch.playBarDockMode)
    ) {
      this.playBarDockMode = patch.playBarDockMode;
      this.host?.setAttribute?.("data-dock", this.playBarDockMode);
      this._mountNativeDock();
      this._updateControlsVisibility();
    }
    if (Number.isFinite(Number(patch.hoverFadeDelayMs))) {
      this.hoverFadeDelayMs = this._clamp(patch.hoverFadeDelayMs, 400, 6000, 2200);
    }
    if (typeof patch.keepSubtitlesInPiP === "boolean") {
      this.keepSubtitlesInPiP = patch.keepSubtitlesInPiP;
      this._syncTrackVisibility();
    }
    if (typeof patch.skipSilenceEnabled === "boolean") {
      this.skipSilenceEnabled = patch.skipSilenceEnabled;
      if (this.silenceBtn) {
        this.silenceBtn.dataset.active = this.skipSilenceEnabled
          ? "true"
          : "false";
      }
    }
    if (Number.isFinite(Number(patch.skipSilenceGapSec))) {
      this.skipSilenceGapSec = this._clamp(patch.skipSilenceGapSec, 0.6, 5, 1.6);
    }
    if (Number.isFinite(Number(patch.skipSilenceRate))) {
      this.skipSilenceRate = this._clamp(patch.skipSilenceRate, 1.4, 3, 2.2);
    }
    if (Number.isFinite(Number(patch.audioBoostPercent))) {
      this.audioBoostPercent = this._clamp(patch.audioBoostPercent, 100, 250, 100);
    }
    this._applyCaptionMetrics();
    this._applyAllCaptionVisuals();
    this._renderDockButtons();
    this._renderToolbar();
  }

  setStatus(state, label = "") {
    this._ensureMounted();
    this.statusState = state;
    this.statusLabel = label;
    this._renderDockButtons();
    this._renderToolbar();
    this._updateControlsVisibility();
  }

  toggleSubtitles() {
    if (this.cues.length === 0) return;
    this.ccEnabled = !this.ccEnabled;
    this._syncTrackVisibility();
    this._renderDockButtons();
    this._renderToolbar();
    this.lastRenderedSignature = "";
    this._renderActiveCue();
  }

  setCues(cues, { title, language = "en" } = {}) {
    this._ensureMounted();
    this.cues = Array.isArray(cues) ? cues : [];
    if (title) this.title = title;
    this.language = language || "en";
    this.statusState = this.cues.length > 0 ? "ready" : "idle";
    this.statusLabel = "";
    this.loopCueIndex = -1;
    if (this.loopBtn) this.loopBtn.dataset.active = "false";
    if (this.drawerTitleEl) {
      this.drawerTitleEl.textContent = `Transcript (${this.cues.length})`;
    }
    this._syncNativeTextTrack();
    this._renderDockButtons();
    this._renderToolbar();
    if (this.drawerOpen) {
      this._renderTranscriptList();
    }
    this.lastRenderedSignature = "";
    this._renderActiveCue();
    this._updateControlsVisibility();
  }

  getExportCues() {
    return this._shiftedCues();
  }

  exportSubtitles(format = "srt") {
    if (this.cues.length === 0) return false;
    this._emitTelemetry({ exportsDelta: 1 });
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

  async _citeCueIntoNotebook(cue, citeBtn) {
    const clean = String(cue.text || "")
      .replace(/\s*\n\s*/g, " ")
      .trim();
    const formatted = `[${formatBriefStamp(cue.startSec)}] "${clean}"`;
    let inserted = false;
    if (typeof this.onCiteCue === "function") {
      try {
        inserted = Boolean(await this.onCiteCue(formatted, cue));
      } catch {
        inserted = false;
      }
    }
    if (!inserted) {
      try {
        await globalThis.navigator?.clipboard?.writeText(formatted);
      } catch {
        // Ignore
      }
    } else {
      this._emitTelemetry({ citationsDelta: 1 });
    }
    flashButtonLabel(citeBtn, inserted ? "Cited" : "Copied", 1100);
  }

  _renderTranscriptList() {
    if (!this.drawerListEl) return;
    while (this.drawerListEl.firstChild) {
      this.drawerListEl.removeChild(this.drawerListEl.firstChild);
    }
    this.cueRowElements = [];

    const shifted = this._shiftedCues();
    const q = String(this.drawerQuery || "").trim().toLowerCase();

    if (this.drawerTab === "chapters") {
      const chapters = buildAutoChapters(shifted);
      if (this.drawerCountEl) {
        this.drawerCountEl.textContent = `${chapters.length} sec`;
      }
      if (chapters.length === 0) {
        const empty = this.doc.createElement("div");
        empty.className = "drawer-empty";
        empty.textContent = "No smart chapters available yet.";
        this.drawerListEl.appendChild(empty);
        return;
      }
      for (const ch of chapters) {
        if (q && !ch.title.toLowerCase().includes(q)) continue;
        const btn = this.doc.createElement("button");
        btn.type = "button";
        btn.className = "chapter-row";
        btn.addEventListener("click", (e) => {
          e.stopPropagation();
          try {
            this.video.currentTime = Math.max(0, ch.startSec + 0.01);
            if (this.video.paused && typeof this.video.play === "function") {
              this.video.play().catch(() => {});
            }
          } catch {
            // Ignore
          }
        });
        const meta = this.doc.createElement("span");
        meta.className = "chapter-meta";
        meta.textContent = `Part ${ch.chapterNumber}  [${ch.timestamp}]  (${ch.wordCount} words)`;
        const title = this.doc.createElement("span");
        title.className = "chapter-title";
        title.textContent = ch.title;
        btn.append(meta, title);
        this.drawerListEl.appendChild(btn);
      }
      return;
    }

    let matchCount = 0;
    for (let i = 0; i < shifted.length; i++) {
      const cue = shifted[i];
      if (this.drawerTab === "saved" && !cue.bookmarked) {
        this.cueRowElements.push(null);
        continue;
      }
      const singleLine = String(cue.text || "").replace(/\s*\n\s*/g, " ").trim();
      const hay = `${cue.speaker || ""} ${singleLine}`.toLowerCase();
      if (q && !hay.includes(q)) {
        this.cueRowElements.push(null);
        continue;
      }
      matchCount += 1;

      const rowWrap = this.doc.createElement("div");
      rowWrap.className = "cue-item";
      rowWrap.dataset.cueIndex = String(i);

      const btn = this.doc.createElement("button");
      btn.type = "button";
      btn.className = "cue-row";
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
      textSpan.textContent =
        this.showSpeakerLabels && cue.speaker
          ? `[${cue.speaker}] ${singleLine}`
          : singleLine;

      btn.append(stamp, textSpan);

      const actions = this.doc.createElement("div");
      actions.className = "cue-actions";
      actions.dataset.starred = cue.bookmarked ? "true" : "false";

      const starBtn = this._makeBtn(
        cue.bookmarked ? "Saved" : "Save",
        "Bookmark this spoken moment",
        () => this.toggleBookmarkCueAt(i)
      );
      starBtn.className = "cue-mini-btn";
      starBtn.dataset.starred = cue.bookmarked ? "true" : "false";

      const citeBtn = this._makeBtn(
        "Cite",
        "Insert quote with timestamp into NotebookLM chat or copy",
        () => this._citeCueIntoNotebook(cue, citeBtn)
      );
      citeBtn.className = "cue-mini-btn";

      actions.append(starBtn, citeBtn);
      rowWrap.append(btn, actions);
      this.drawerListEl.appendChild(rowWrap);
      this.cueRowElements.push(rowWrap);
    }

    if (this.drawerCountEl) {
      this.drawerCountEl.textContent =
        this.drawerTab === "saved"
          ? `${matchCount} saved`
          : q
            ? `${matchCount}/${shifted.length}`
            : `${shifted.length}`;
    }

    if (matchCount === 0) {
      const empty = this.doc.createElement("div");
      empty.className = "drawer-empty";
      empty.textContent =
        this.drawerTab === "saved"
          ? "No bookmarked cues yet. Click Save on any line or press M while watching."
          : q
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
      this.ccEnabled &&
      this.keepSubtitlesInPiP &&
      this.inPiP &&
      this.cues.length > 0
        ? "showing"
        : "hidden";
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
      this.ccBtn.textContent = "CC";
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

    this.controlsGroup.style.display = hasCues ? "flex" : "none";
    if (this.transcriptBtn) {
      this.transcriptBtn.style.display = hasCues ? "inline-flex" : "none";
      this.transcriptBtn.dataset.active = this.drawerOpen ? "true" : "false";
    }
    if (this.moreBtn) {
      this.moreBtn.dataset.active = this.toolsOpen ? "true" : "false";
    }
    this.regenBtn.style.display =
      hasCues || this.statusState === "error" ? "inline-flex" : "none";
    this.regenBtn.textContent = hasCues ? "Regen" : "Retry";
    this.regenBtn.disabled = isWorking;

    const sign = this.offsetSec > 0 ? "+" : "";
    this.offsetLabelBtn.textContent = `${sign}${this.offsetSec.toFixed(2)}s`;
  }

  _getActiveCueObject() {
    const effectiveTime = (this.video.currentTime || 0) - this.offsetSec;
    return findActiveCue(this.cues, effectiveTime);
  }

  _renderActiveCue() {
    if (!this.captionBox) return;
    const effectiveTime = (this.video.currentTime || 0) - this.offsetSec;
    let active = findActiveCue(this.cues, effectiveTime);

    // Anti-flicker: hold the previous line through tiny gaps between cues so the
    // caption box never blinks out for a fraction of a second between sentences.
    if (!active && this.lastActiveCue) {
      const endedAgo = effectiveTime - this.lastActiveCue.endSec;
      if (endedAgo >= 0 && endedAgo <= CAPTION_LINGER_SEC) {
        active = this.lastActiveCue;
      }
    }
    if (active) this.lastActiveCue = active;
    const nextIdx = active ? this.cues.indexOf(active) : -1;
    if (nextIdx !== this.activeCueIndex) {
      this.activeCueIndex = nextIdx;
      this._highlightDrawerActiveCue(false);
    }

    if (
      !this.ccEnabled ||
      (this.inPiP && !this.pipWindow) ||
      !active
    ) {
      this.captionBox.dataset.visible = "false";
      this.lastRenderedSignature = "";
      this._renderPipCaption();
      return;
    }

    const prefix =
      this.showSpeakerLabels && active.speaker ? `[${active.speaker}] ` : "";
    const fullText = `${prefix}${active.text}`;

    if (!this.karaokeHighlight) {
      const sig = `plain:${nextIdx}:${fullText}:${active.secondaryText || ""}`;
      if (sig !== this.lastRenderedSignature) {
        this.lastRenderedSignature = sig;
        while (this.captionBox.firstChild) {
          this.captionBox.removeChild(this.captionBox.firstChild);
        }
        if (active.secondaryText) {
          const primarySpan = this.doc.createElement("span");
          primarySpan.textContent = fullText;
          const secSpan = this.doc.createElement("span");
          secSpan.className = "caption-secondary";
          secSpan.textContent = active.secondaryText;
          this.captionBox.append(primarySpan, secSpan);
        } else {
          this.captionBox.textContent = fullText;
        }
      }
      this.captionBox.dataset.visible = "true";
      this._renderPipCaption();
      return;
    }

    // Progressive spoken-word karaoke highlight with optional syllable delay (`karaokeDelayMs`)
    const span = Math.max(0.25, active.endSec - active.startSec);
    const delayedTime = effectiveTime - (this.karaokeDelayMs || 0) / 1000;
    const rawProgress = (delayedTime - active.startSec) / span;
    const progress = Math.max(0, Math.min(1, rawProgress));
    const tokens = fullText.split(/(\s+)/);
    const wordPositions = [];
    for (let i = 0; i < tokens.length; i++) {
      if (tokens[i].trim()) wordPositions.push(i);
    }
    const activeWordCount =
      this.karaokeDelayMs > 0 && rawProgress < 0
        ? 0
        : Math.min(
            wordPositions.length,
            Math.max(1, Math.ceil(progress * wordPositions.length))
          );
    const sig = `karaoke:${nextIdx}:${activeWordCount}:${fullText}`;
    if (sig !== this.lastRenderedSignature) {
      this.lastRenderedSignature = sig;
      while (this.captionBox.firstChild) {
        this.captionBox.removeChild(this.captionBox.firstChild);
      }
      let seenWords = 0;
      for (const tok of tokens) {
        if (!tok.trim()) {
          this.captionBox.appendChild(this.doc.createTextNode(tok));
          continue;
        }
        seenWords += 1;
        if (seenWords === activeWordCount) {
          const w = this.doc.createElement("span");
          w.className = "caption-word-done caption-word-current";
          w.textContent = tok;
          this.captionBox.appendChild(w);
        } else if (seenWords < activeWordCount) {
          const w = this.doc.createElement("span");
          w.className = "caption-word-done";
          w.textContent = tok;
          this.captionBox.appendChild(w);
        } else {
          const w = this.doc.createElement("span");
          w.className = "caption-word-upcoming";
          w.textContent = tok;
          this.captionBox.appendChild(w);
        }
      }
    }
    this.captionBox.dataset.visible = "true";
    this._renderPipCaption();
  }

  destroy() {
    this._flushWatchClock();
    this._stopHighFreqSync();
    if (this.idleTimer) clearTimeout(this.idleTimer);
    if (this.dockPollTimer) clearInterval(this.dockPollTimer);
    this.dockPollTimer = null;
    try {
      this.sizeObserver?.disconnect?.();
    } catch {
      // Ignore
    }
    this.sizeObserver = null;
    this._teardownNativeDock();
    try {
      if (this.pipWindow && !this.pipWindow.closed) this.pipWindow.close();
    } catch {
      // Ignore
    }
    this.pipWindow = null;
    this.pipCaptionEl = null;
    this.video.removeEventListener("timeupdate", this._onTimeChange);
    this.video.removeEventListener("seeking", this._onTimeChange);
    this.video.removeEventListener("seeked", this._onTimeChange);
    this.video.removeEventListener("play", this._onPlay);
    this.video.removeEventListener("pause", this._onPause);
    this.video.removeEventListener("enterpictureinpicture", this._onEnterPiP);
    this.video.removeEventListener("leavepictureinpicture", this._onLeavePiP);

    const container = this.host?.parentElement || this.video.parentElement;
    if (container) {
      container.removeEventListener?.("pointerenter", this._onPointerEnter);
      container.removeEventListener?.("pointerleave", this._onPointerLeave);
      container.removeEventListener?.("mouseenter", this._onPointerEnter);
      container.removeEventListener?.("mouseleave", this._onPointerLeave);
    }
    this.doc.removeEventListener?.("fullscreenchange", this._onFullscreenChange);
    globalThis.removeEventListener?.("resize", this._onFullscreenChange);
    this.host?.remove();
  }
}
