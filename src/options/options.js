/**
 * Full Settings, Cloud Sync & Collapsible Provider Failover Queue (`src/options/options.js`).
 *
 * Security invariants:
 * - Never accesses raw API keys or raw sync bearer tokens (`getSavedKeyPresenceMap` returns booleans only).
 * - Requests optional host permissions directly inside user click gestures.
 */

import { RUNTIME_MESSAGE } from "../config/selectors.js";
import { resolveAvoidedVideoBytes } from "../lib/audio-extract.js";
import { renderReleaseNotes } from "../lib/release-notes.js";
import {
  playCompletionChimeSound,
  SOUND_PRESETS,
  unlockChimeAudio,
} from "../lib/chime.js";
import {
  buildUnifiedStatsReport,
  formatMegabytesValue,
  formatMinutesLabel,
} from "../lib/stats-model.js";
import {
  getProviderOriginPattern,
  getProviderSpec,
} from "../lib/providers/registry.js";
import {
  clearAllCachedSubtitles,
  clearApiKey,
  deleteCachedSubtitles,
  getCloudSyncProfile,
  getModelForProvider,
  getNotifications,
  getSavedKeyPresenceMap,
  getSettings,
  getSubtitleCacheList,
  getUpdateStatus,
  normalizeSyncServerUrl,
  saveSettings,
  saveUpdateStatus,
  setApiKey,
} from "../lib/storage.js";
import {
  formatTimestamp,
  formatTxt,
  parseTimestampSec,
  searchCues,
  serializeSubtitles,
} from "../lib/subtitles.js";
import {
  inspectLinkedDirPermission,
  loadLinkedExtensionDirHandle,
  saveLinkedExtensionDirHandle,
} from "../lib/unpacked-updater.js";
import { createBrandMarkSvg } from "../ui/brand-icon.js";

function sendRuntime(msg) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(msg, (res) => {
      if (chrome.runtime.lastError) {
        resolve({ ok: false, error: chrome.runtime.lastError.message });
        return;
      }
      resolve(res || null);
    });
  });
}

async function requestProviderOrigin(providerId, customBaseUrl = "") {
  const origin = getProviderOriginPattern(providerId, customBaseUrl);
  if (!origin || !chrome.permissions?.request) return true;
  try {
    return await chrome.permissions.request({ origins: [origin] });
  } catch {
    return true;
  }
}

async function requestSyncServerOrigin(rawUrl) {
  if (!chrome.permissions?.request) return true;
  try {
    const u = new URL(normalizeSyncServerUrl(rawUrl));
    return await chrome.permissions.request({ origins: [`${u.origin}/*`] });
  } catch {
    return true;
  }
}

function downloadFile(content, filename, mime) {
  const blob = new Blob(["\uFEFF", content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 3000);
}

function formatMegabytesLabel(bytes) {
  const b = Math.max(0, Number(bytes) || 0);
  if (b >= 1073741824) {
    return `${(b / 1073741824).toFixed(2)} GB`;
  }
  return `${(b / 1048576).toFixed(1)} MB`;
}

async function initOptions() {
  document
    .getElementById("brand-icon-slot")
    ?.appendChild(createBrandMarkSvg(document, 26));

  const optEnabled = document.getElementById("opt-enabled");
  const queueWrap = document.getElementById("provider-queue-wrap");
  const queueContainer = document.getElementById("provider-queue-list");
  const queueSummary = document.getElementById("provider-queue-summary");
  const collapseAllBtn = document.getElementById("provider-collapse-all-btn");
  const toggleSectionBtn = document.getElementById("provider-section-toggle-btn");

  const optAutoGenerate = document.getElementById("opt-auto-generate");
  const optAutoExisting = document.getElementById("opt-auto-existing");
  const optAutoAudio = document.getElementById("opt-auto-audio");
  const optShowToast = document.getElementById("opt-show-toast");
  const optLanguageHint = document.getElementById("opt-language-hint");
  const optTranslateTo = document.getElementById("opt-translate-to");
  const optFontSize = document.getElementById("opt-font-size");
  const optCaptionStyle = document.getElementById("opt-caption-style");
  const optCaptionFont = document.getElementById("opt-caption-font");
  const optCaptionColor = document.getElementById("opt-caption-color");
  const optCaptionPosition = document.getElementById("opt-caption-position");
  const optCaptionWidth = document.getElementById("opt-caption-width");
  const optCaptionOpacity = document.getElementById("opt-caption-opacity");
  const optCaptionOpacityLabel = document.getElementById("opt-caption-opacity-label");
  const optKaraokeDelay = document.getElementById("opt-karaoke-delay");
  const optKaraokeDelayLabel = document.getElementById("opt-karaoke-delay-label");
  const optPlaybackSpeed = document.getElementById("opt-playback-speed");
  const optPlayBarDock = document.getElementById("opt-play-bar-dock");

  // Fine-grained controls
  const optFineGrained = document.getElementById("opt-fine-grained");
  const advancedControlsBody = document.getElementById("advanced-controls-body");
  const optCaptionScale = document.getElementById("opt-caption-scale");
  const optCaptionScaleLabel = document.getElementById("opt-caption-scale-label");
  const optDynamicScaling = document.getElementById("opt-dynamic-scaling");
  const optCaptionMin = document.getElementById("opt-caption-min");
  const optCaptionMax = document.getElementById("opt-caption-max");
  const optCaptionPadY = document.getElementById("opt-caption-pad-y");
  const optCaptionPadX = document.getElementById("opt-caption-pad-x");
  const optCaptionRadius = document.getElementById("opt-caption-radius");
  const optCaptionLeading = document.getElementById("opt-caption-leading");
  const optCaptionLeadingLabel = document.getElementById("opt-caption-leading-label");
  const optCaptionBottom = document.getElementById("opt-caption-bottom");
  const optCaptionStroke = document.getElementById("opt-caption-stroke");
  const optKaraokeAlpha = document.getElementById("opt-karaoke-alpha");
  const optKaraokeAlphaLabel = document.getElementById("opt-karaoke-alpha-label");
  const optUpcomingAlpha = document.getElementById("opt-upcoming-alpha");
  const optUpcomingAlphaLabel = document.getElementById("opt-upcoming-alpha-label");
  const optSkipGap = document.getElementById("opt-skip-gap");
  const optSkipGapLabel = document.getElementById("opt-skip-gap-label");
  const optSkipRate = document.getElementById("opt-skip-rate");
  const optSkipRateLabel = document.getElementById("opt-skip-rate-label");
  const optAudioBoost = document.getElementById("opt-audio-boost");
  const optAudioBoostLabel = document.getElementById("opt-audio-boost-label");
  const optHoverFade = document.getElementById("opt-hover-fade");
  const optHoverFadeLabel = document.getElementById("opt-hover-fade-label");
  const optKeepPip = document.getElementById("opt-keep-pip");
  const optSkipSilence = document.getElementById("opt-skip-silence");
  const saveAdvancedBtn = document.getElementById("save-advanced-btn");
  const resetAdvancedBtn = document.getElementById("reset-advanced-btn");

  // Notification sound presets
  const optSoundPreset = document.getElementById("opt-sound-preset");
  const optSoundVolume = document.getElementById("opt-sound-volume");
  const optSoundVolumeLabel = document.getElementById("opt-sound-volume-label");
  const optSoundBadge = document.getElementById("opt-sound-badge");
  const optPreviewSoundBtn = document.getElementById("opt-preview-sound-btn");
  const optSoundFeedback = document.getElementById("opt-sound-feedback");
  const optKaraokeHighlight = document.getElementById("opt-karaoke-highlight");
  const optShowSpeakers = document.getElementById("opt-show-speakers");
  const optHoverPause = document.getElementById("opt-hover-pause");
  const optClickCopy = document.getElementById("opt-click-copy");
  const resetCaptionStyleBtn = document.getElementById("reset-caption-style-btn");
  const optPreviewStage = document.getElementById("opt-caption-preview-stage");
  const optPreviewBox = document.getElementById("opt-caption-preview-box");
  const optOffsetSec = document.getElementById("opt-offset-sec");
  const optExcludePatterns = document.getElementById("opt-exclude-patterns");
  const saveBehaviorBtn = document.getElementById("save-behavior-btn");
  const savedPill = document.getElementById("settings-saved-pill");

  // Notifications, Auto-Updates & Desktop Alerts elements
  const optNotifUnreadBadge = document.getElementById("opt-notif-unread-badge");
  const optAutoUpdate = document.getElementById("opt-auto-update");
  const optAutoBgSync = document.getElementById("opt-auto-bg-sync");
  const optDesktopNotifications = document.getElementById("opt-desktop-notifications");
  const optBadgeAlerts = document.getElementById("opt-badge-alerts");
  const optSoundAlerts = document.getElementById("opt-sound-alerts");
  const optNotifyFailover = document.getElementById("opt-notify-failover");
  const optNotifySync = document.getElementById("opt-notify-sync");
  const optTestNotifBtn = document.getElementById("opt-test-notif-btn");
  const optTestChimeBtn = document.getElementById("opt-test-chime-btn");
  const optMarkNotifReadBtn = document.getElementById("opt-mark-notif-read-btn");
  const optClearNotifBtn = document.getElementById("opt-clear-notif-btn");
  const optNotifList = document.getElementById("opt-notif-list");

  const optUpdateCard = document.getElementById("opt-update-card");
  const optUpdateBadge = document.getElementById("opt-update-badge");
  const optUpdateSummary = document.getElementById("opt-update-summary");
  const optUpdateNotes = document.getElementById("opt-update-notes");
  const optCheckUpdatesBtn = document.getElementById("opt-check-updates-btn");
  const optLinkFolderBtn = document.getElementById("opt-link-folder-btn");
  const optApplyUpdateBtn = document.getElementById("opt-apply-update-btn");
  const optUpdateFeedback = document.getElementById("opt-update-feedback");

  // Account & Cloud Sync elements
  const optSyncBadge = document.getElementById("opt-sync-badge");
  const syncLoggedOutPanel = document.getElementById("sync-logged-out-panel");
  const syncLoggedInPanel = document.getElementById("sync-logged-in-panel");
  const syncGoogleBtn = document.getElementById("sync-google-btn");
  const syncGithubBtn = document.getElementById("sync-github-btn");
  const syncEmailInput = document.getElementById("sync-email-input");
  const syncSendCodeBtn = document.getElementById("sync-send-code-btn");
  const syncCodeInput = document.getElementById("sync-code-input");
  const syncVerifyCodeBtn = document.getElementById("sync-verify-code-btn");
  const syncTokenInput = document.getElementById("sync-token-input");
  const syncTokenBtn = document.getElementById("sync-token-btn");
  const syncGetWebCodeBtn = document.getElementById("sync-get-web-code-btn");
  const syncLocalCodePreview = document.getElementById("sync-local-code-preview");
  const syncLocalCodeDigits = document.getElementById("sync-local-code-digits");
  const syncCopyLocalCodeBtn = document.getElementById("sync-copy-local-code-btn");
  const syncAccountLabel = document.getElementById("sync-account-label");
  const syncMetaLabel = document.getElementById("sync-meta-label");
  const syncOpenWebStatsBtn = document.getElementById("sync-open-web-stats-btn");
  const syncNowBtn = document.getElementById("sync-now-btn");
  const syncSignoutBtn = document.getElementById("sync-signout-btn");
  const syncKeyHints = document.getElementById("sync-key-hints");
  const syncStatusLine = document.getElementById("sync-status-line");

  // Granular Sync Opt-In Switches
  const syncPrefKeys = document.getElementById("sync-pref-keys");
  const syncPrefTranscripts = document.getElementById("sync-pref-transcripts");
  const syncPrefSettings = document.getElementById("sync-pref-settings");

  // Statistics elements (unified with the website dashboard and toolbar popup)
  const refreshStatsBtn = document.getElementById("refresh-stats-btn");
  const statsSummaryNote = document.getElementById("stats-summary-note");
  const statVideos = document.getElementById("stat-videos");
  const statCues = document.getElementById("stat-cues");
  const statSaved = document.getElementById("stat-saved");
  const statLatency = document.getElementById("stat-latency");
  const statNotebooks = document.getElementById("stat-notebooks");
  const statSources = document.getElementById("stat-sources");
  const statArtifacts = document.getElementById("stat-artifacts");
  const statStudy = document.getElementById("stat-study");
  const statVideoOv = document.getElementById("stat-video-ov");
  const statAudioOv = document.getElementById("stat-audio-ov");
  const statCitations = document.getElementById("stat-citations");
  const statBookmarks = document.getElementById("stat-bookmarks");
  const notebookLmTableWrap = document.getElementById("notebook-lm-table-wrap");
  const notebookLmTbody = document.getElementById("notebook-lm-tbody");

  const cacheEmpty = document.getElementById("cache-empty");
  const cacheTableWrap = document.getElementById("cache-table-wrap");
  const cacheTbody = document.getElementById("cache-tbody");
  const cacheSearchInput = document.getElementById("cache-search-input");
  const exportAllVaultBtn = document.getElementById("export-all-vault-btn");
  const clearCacheBtn = document.getElementById("clear-cache-btn");

  const rpcCreateInput = document.getElementById("rpc-create-input");
  const rpcPollInput = document.getElementById("rpc-poll-input");
  const saveRpcBtn = document.getElementById("save-rpc-btn");

  const optDebugMode = document.getElementById("opt-debug-mode");
  const optPermBadge = document.getElementById("opt-perm-badge");
  const optGrantPermsBtn = document.getElementById("opt-grant-perms-btn");
  const optRefreshDebugBtn = document.getElementById("opt-refresh-debug-btn");
  const optCopyDebugBtn = document.getElementById("opt-copy-debug-btn");
  const optClearDebugBtn = document.getElementById("opt-clear-debug-btn");
  const debugLogViewer = document.getElementById("debug-log-viewer");
  let missingOriginsForOptions = [];
  let cacheFilterQuery = "";
  let editingCacheKey = null;

  let [settings, presenceMap, cacheList, syncProfile, notifications, updateStatus] =
    await Promise.all([
      getSettings(),
      getSavedKeyPresenceMap(),
      getSubtitleCacheList(),
      getCloudSyncProfile(),
      getNotifications(),
      getUpdateStatus(),
    ]);

  // Collapsible provider rows: start compact (all collapsed) if any key exists;
  // expand only the first provider if zero keys exist yet.
  const hasAnySavedKey = () =>
    settings.queueOrder.some((id) =>
      id === "custom" ? Boolean(settings.customEnabled) : Boolean(presenceMap[id])
    );
  const expandedProviders = new Set(
    hasAnySavedKey() ? [] : [settings.queueOrder[0] || "groq"]
  );
  let providerListHidden = false;

  function flashSavedPill() {
    if (!savedPill) return;
    savedPill.style.display = "inline-flex";
    setTimeout(() => {
      savedPill.style.display = "none";
    }, 1800);
  }

  function setSyncFeedback(message, kind = "") {
    if (!syncStatusLine) return;
    syncStatusLine.dataset.kind = kind;
    syncStatusLine.textContent = message;
  }

  function renderSyncPanel() {
    const prefs = syncProfile?.syncPreferences || {
      syncApiKeys: true,
      syncTranscripts: true,
      syncSettings: true,
    };
    if (syncPrefKeys) syncPrefKeys.checked = Boolean(prefs.syncApiKeys);
    if (syncPrefTranscripts) {
      syncPrefTranscripts.checked = Boolean(prefs.syncTranscripts);
    }
    if (syncPrefSettings) {
      syncPrefSettings.checked = Boolean(prefs.syncSettings);
    }

    if (syncProfile?.connected && syncProfile.user?.email) {
      optSyncBadge.textContent = "Synced";
      optSyncBadge.className = "badge badge-saved";
      syncLoggedOutPanel.style.display = "none";
      syncLoggedInPanel.style.display = "block";

      syncAccountLabel.textContent = syncProfile.user.name
        ? `${syncProfile.user.name} (${syncProfile.user.email})`
        : syncProfile.user.email;

      const hintEntries = Object.entries(syncProfile.keyHints || {});
      const lastStr = syncProfile.lastSyncedAt
        ? new Date(syncProfile.lastSyncedAt).toLocaleTimeString()
        : "moments ago";
      syncMetaLabel.textContent = `${hintEntries.length} encrypted key(s), ${
        syncProfile.subtitleCount || 0
      } synced transcript(s), last sync ${lastStr}`;

      syncKeyHints.textContent = "";
      for (const [provId, hint] of hintEntries) {
        const chip = document.createElement("span");
        chip.className = "key-chip";
        chip.textContent = `${provId}: ${hint}`;
        syncKeyHints.appendChild(chip);
      }
    } else {
      optSyncBadge.textContent = "Signed out";
      optSyncBadge.className = "badge";
      syncLoggedOutPanel.style.display = "block";
      syncLoggedInPanel.style.display = "none";
    }
  }

  async function computeUnifiedStats() {
    const [historyList, notebookLmStats] = await Promise.all([
      sendRuntime({ type: RUNTIME_MESSAGE.GET_DEBUG_REPORT })
        .then(() => [])
        .catch(() => []),
      sendRuntime({ type: RUNTIME_MESSAGE.GET_NOTEBOOKLM_STATS })
        .then((res) => (res?.ok ? res.stats : null))
        .catch(() => null),
    ]);

    let cloudStats = null;
    if (syncProfile?.connected) {
      const res = await sendRuntime({ type: RUNTIME_MESSAGE.SYNC_GET_STATS });
      if (res?.ok && res.totals) cloudStats = res;
    }

    return buildUnifiedStatsReport({
      cacheList,
      historyList,
      notebookLmStats,
      cloudStats,
    });
  }

  function renderNotebookLmTable(notebooks = []) {
    if (!notebookLmTableWrap || !notebookLmTbody) return;
    notebookLmTbody.textContent = "";
    if (!notebooks.length) {
      notebookLmTableWrap.style.display = "none";
      return;
    }
    notebookLmTableWrap.style.display = "block";
    for (const nb of notebooks) {
      const tr = document.createElement("tr");

      const tdTitle = document.createElement("td");
      tdTitle.style.fontWeight = "600";
      tdTitle.textContent = nb.title || "Untitled notebook";

      const tdSources = document.createElement("td");
      tdSources.dataset.num = "true";
      tdSources.textContent = String(nb.sourceCount || 0);

      const tdVideo = document.createElement("td");
      tdVideo.dataset.num = "true";
      tdVideo.textContent = String(nb.videoCount || 0);

      const tdAudio = document.createElement("td");
      tdAudio.dataset.num = "true";
      tdAudio.textContent = String(nb.audioCount || 0);

      const tdWatch = document.createElement("td");
      tdWatch.dataset.num = "true";
      tdWatch.textContent = formatMinutesLabel(
        (Number(nb.watchSeconds) || 0) + (Number(nb.listenSeconds) || 0)
      );

      const tdLast = document.createElement("td");
      tdLast.dataset.num = "true";
      tdLast.textContent = nb.lastSeenAt
        ? new Date(nb.lastSeenAt).toLocaleDateString()
        : "n/a";

      tr.append(tdTitle, tdSources, tdVideo, tdAudio, tdWatch, tdLast);
      notebookLmTbody.appendChild(tr);
    }
  }

  async function renderStatisticsPanel() {
    if (!statVideos) return;
    const report = await computeUnifiedStats();
    const t = report.totals;
    const nb = report.notebookLm;

    statVideos.textContent = String(t.videosCaptioned || 0);
    statCues.textContent = String(t.totalCues || 0);
    statSaved.textContent = formatMegabytesValue(t.bandwidthSavedBytes || 0);
    statLatency.textContent = t.medianLatencyMs
      ? `${(t.medianLatencyMs / 1000).toFixed(1)}s`
      : "n/a";

    if (statNotebooks) statNotebooks.textContent = String(nb.notebooksCount || 0);
    if (statSources) statSources.textContent = String(nb.sourcesIndexed || 0);
    if (statArtifacts) {
      statArtifacts.textContent = String(nb.studioArtifactsCount || 0);
    }
    if (statStudy) statStudy.textContent = formatMinutesLabel(nb.activeStudyMinutes * 60);
    if (statVideoOv) statVideoOv.textContent = String(nb.videoOverviewsCount || 0);
    if (statAudioOv) statAudioOv.textContent = String(nb.audioOverviewsCount || 0);
    if (statCitations) statCitations.textContent = String(nb.citationsCount || 0);
    if (statBookmarks) statBookmarks.textContent = String(nb.bookmarksCount || 0);

    renderNotebookLmTable(nb.notebooks);

    if (statsSummaryNote) {
      statsSummaryNote.textContent = syncProfile?.connected
        ? `Live account metrics merged with this browser: ${t.spokenMinutes || 0} spoken minutes across ${t.videosCaptioned || 0} captioned overviews in ${nb.notebooksCount || 0} notebooks.`
        : `Computed on this device from ${t.videosCaptioned || 0} captioned overviews and ${nb.notebooksCount || 0} Google NotebookLM notebooks. Sign in above to merge cross-device numbers.`;
    }
  }

  async function reloadAllLocalState() {
    [settings, presenceMap, cacheList, syncProfile, notifications, updateStatus] =
      await Promise.all([
        getSettings(),
        getSavedKeyPresenceMap(),
        getSubtitleCacheList(),
        getCloudSyncProfile(),
        getNotifications(),
        getUpdateStatus(),
      ]);
    populateForm();
    renderSyncPanel();
    renderProviderQueue();
    renderNotificationsPanel();
    await renderUpdatePanel();
    renderCacheTable();
    await renderStatisticsPanel();
  }

  async function triggerAutoSyncIfConnected(extra = {}) {
    if (!syncProfile?.connected) return;
    const res = await sendRuntime({
      type: RUNTIME_MESSAGE.SYNC_NOW,
      ...extra,
    });
    if (res?.ok && res.profile) {
      syncProfile = res.profile;
      renderSyncPanel();
    }
  }

  function renderCaptionPreview() {
    if (!optPreviewStage || !optPreviewBox) return;
    const size = optFontSize?.value || settings.fontSize || "medium";
    const style = optCaptionStyle?.value || settings.captionStyle || "classic";
    const font = optCaptionFont?.value || settings.captionFontFamily || "sans";
    const color = optCaptionColor?.value || settings.captionColor || "white";
    const pos = optCaptionPosition?.value || settings.captionPosition || "bottom";
    const width = optCaptionWidth?.value || settings.captionMaxWidth || "balanced";
    const opacity = Number(optCaptionOpacity?.value ?? settings.captionBgOpacity ?? 88);
    const karaoke = Boolean(optKaraokeHighlight?.checked);
    const showSpk = optShowSpeakers ? Boolean(optShowSpeakers.checked) : true;

    if (optCaptionOpacityLabel) {
      optCaptionOpacityLabel.textContent = `${opacity}%`;
    }
    if (optKaraokeDelayLabel && optKaraokeDelay) {
      const kdVal = Number(optKaraokeDelay.value) || 0;
      optKaraokeDelayLabel.textContent = `${kdVal > 0 ? "+" : ""}${kdVal} ms`;
    }

    optPreviewStage.dataset.pos = pos;
    const sizePx = {
      small: "13px",
      medium: "15px",
      large: "17.5px",
      xlarge: "20px",
      xxlarge: "23px",
    }[size] || "15px";
    const fontCss = {
      sans: 'var(--font-sans)',
      serif: 'Charter, Georgia, Cambria, serif',
      mono: 'var(--font-mono)',
      dyslexic: '"Trebuchet MS", Verdana, sans-serif',
    }[font] || "var(--font-sans)";
    const colorHex = {
      white: "#fdfdfe",
      yellow: "#fde047",
      cyan: "#67e8f9",
      green: "#86efac",
      ink: "#111315",
    }[color] || "#fdfdfe";
    const maxWidthCss = {
      compact: "68%",
      balanced: "86%",
      wide: "98%",
    }[width] || "86%";

    const alpha = Math.max(0.2, Math.min(1, opacity / 100));
    let bg = `rgba(11, 13, 16, ${alpha.toFixed(2)})`;
    let border = "1px solid rgba(255, 255, 255, 0.14)";
    let radius = "7px";
    let shadow = "none";
    let resolvedText = colorHex;

    if (style === "contrast") {
      bg = `rgba(5, 6, 8, ${Math.max(0.75, alpha).toFixed(2)})`;
      border = "1.5px solid #3b82f6";
    } else if (style === "minimal") {
      bg = "transparent";
      border = "1px solid transparent";
      shadow = "0 1px 3px rgba(0,0,0,0.95), 0 0 10px rgba(0,0,0,0.85)";
      if (color === "ink") resolvedText = "#fdfdfe";
    } else if (style === "cinema") {
      radius = "999px";
    } else if (style === "paper") {
      bg = `rgba(253, 253, 254, ${Math.max(0.82, alpha).toFixed(2)})`;
      border = "1px solid rgba(17, 19, 21, 0.2)";
      if (color === "white") resolvedText = "#111315";
    } else if (style === "amber") {
      bg = `rgba(28, 22, 12, ${Math.max(0.78, alpha).toFixed(2)})`;
      border = "1px solid rgba(251, 191, 36, 0.35)";
      if (color === "white") resolvedText = "#fde68a";
    }

    optPreviewBox.style.fontSize = sizePx;
    optPreviewBox.style.fontFamily = fontCss;
    optPreviewBox.style.maxWidth = maxWidthCss;
    optPreviewBox.style.background = bg;
    optPreviewBox.style.border = border;
    optPreviewBox.style.borderRadius = radius;
    optPreviewBox.style.textShadow = shadow;
    optPreviewBox.style.color = resolvedText;
    optPreviewBox.style.letterSpacing = font === "dyslexic" ? "0.045em" : "0.005em";
    optPreviewBox.style.wordSpacing = font === "dyslexic" ? "0.12em" : "normal";

    while (optPreviewBox.firstChild) {
      optPreviewBox.removeChild(optPreviewBox.firstChild);
    }
    const prefix = showSpk ? "[Host] " : "";
    if (!karaoke) {
      optPreviewBox.textContent = `${prefix}Logical qubits suppress phase errors across physical stabilizer arrays.`;
    } else {
      const done = document.createElement("span");
      done.textContent = `${prefix}Logical qubits suppress `;
      const activeWord = document.createElement("span");
      activeWord.style.background =
        style === "paper" ? "rgba(0, 85, 212, 0.16)" : "rgba(29, 92, 246, 0.48)";
      activeWord.style.color = style === "paper" ? "#0055d4" : "#ffffff";
      activeWord.style.padding = "1px 5px";
      activeWord.style.borderRadius = "4px";
      activeWord.style.fontWeight = "600";
      activeWord.textContent = "phase errors";
      const upcoming = document.createElement("span");
      upcoming.style.opacity = "0.64";
      upcoming.textContent = " across physical stabilizer arrays.";
      optPreviewBox.append(done, activeWord, upcoming);
    }
  }

  function populateForm() {
    optEnabled.checked = settings.enabled;
    if (optDebugMode) optDebugMode.checked = Boolean(settings.debugMode);
    optAutoGenerate.checked = settings.autoOnGenerate;
    optAutoExisting.checked = settings.autoOnExistingVideos;
    if (optAutoAudio) optAutoAudio.checked = settings.autoOnAudioOverviews !== false;
    optShowToast.checked = settings.showToast;
    if (optAutoUpdate) optAutoUpdate.checked = Boolean(settings.autoUpdateExtension);
    if (optAutoBgSync) optAutoBgSync.checked = Boolean(settings.autoBackgroundSync);
    if (optDesktopNotifications) {
      optDesktopNotifications.checked = Boolean(settings.desktopNotifications);
    }
    if (optBadgeAlerts) optBadgeAlerts.checked = Boolean(settings.badgeAlerts);
    if (optSoundAlerts) optSoundAlerts.checked = Boolean(settings.soundAlerts);
    if (optNotifyFailover) {
      optNotifyFailover.checked = Boolean(settings.notifyOnFailover);
    }
    if (optNotifySync) optNotifySync.checked = Boolean(settings.notifyOnSync);
    optLanguageHint.value = settings.languageHint || "auto";
    optTranslateTo.value = settings.translateTo || "original";
    optFontSize.value = settings.fontSize || "medium";
    if (optCaptionStyle) optCaptionStyle.value = settings.captionStyle || "classic";
    if (optCaptionFont) optCaptionFont.value = settings.captionFontFamily || "sans";
    if (optCaptionColor) optCaptionColor.value = settings.captionColor || "white";
    if (optCaptionPosition) optCaptionPosition.value = settings.captionPosition || "bottom";
    if (optCaptionWidth) optCaptionWidth.value = settings.captionMaxWidth || "balanced";
    if (optCaptionOpacity) optCaptionOpacity.value = String(settings.captionBgOpacity ?? 88);
    if (optKaraokeDelay) optKaraokeDelay.value = String(settings.karaokeDelayMs ?? 0);
    if (optPlaybackSpeed) optPlaybackSpeed.value = String(settings.defaultPlaybackSpeed || 1);
    if (optPlayBarDock) optPlayBarDock.value = settings.playBarDockMode || "native";

    // Fine-grained controls
    if (optFineGrained) optFineGrained.checked = Boolean(settings.fineGrainedControls);
    if (advancedControlsBody) {
      advancedControlsBody.style.display = settings.fineGrainedControls
        ? "block"
        : "none";
    }
    if (optCaptionScale) optCaptionScale.value = String(settings.captionScaleFactor ?? 100);
    if (optCaptionScaleLabel) {
      optCaptionScaleLabel.textContent = `${settings.captionScaleFactor ?? 100}%`;
    }
    if (optDynamicScaling) {
      optDynamicScaling.checked = settings.dynamicCaptionScaling !== false;
    }
    if (optCaptionMin) optCaptionMin.value = String(settings.captionMinFontPx ?? 11);
    if (optCaptionMax) optCaptionMax.value = String(settings.captionMaxFontPx ?? 40);
    if (optCaptionPadY) optCaptionPadY.value = String(settings.captionPaddingY ?? 7);
    if (optCaptionPadX) optCaptionPadX.value = String(settings.captionPaddingX ?? 15);
    if (optCaptionRadius) {
      optCaptionRadius.value = String(settings.captionBorderRadius ?? 7);
    }
    if (optCaptionLeading) {
      optCaptionLeading.value = String(settings.captionLineHeight ?? 142);
    }
    if (optCaptionLeadingLabel) {
      optCaptionLeadingLabel.textContent = `${settings.captionLineHeight ?? 142}%`;
    }
    if (optCaptionBottom) {
      optCaptionBottom.value = String(settings.captionBottomOffsetPx ?? 54);
    }
    if (optCaptionStroke) {
      optCaptionStroke.value = String(settings.captionTextStrokePx ?? 0);
    }
    if (optKaraokeAlpha) {
      optKaraokeAlpha.value = String(settings.karaokeHighlightOpacity ?? 48);
    }
    if (optKaraokeAlphaLabel) {
      optKaraokeAlphaLabel.textContent = `${settings.karaokeHighlightOpacity ?? 48}%`;
    }
    if (optUpcomingAlpha) {
      optUpcomingAlpha.value = String(settings.upcomingWordOpacity ?? 64);
    }
    if (optUpcomingAlphaLabel) {
      optUpcomingAlphaLabel.textContent = `${settings.upcomingWordOpacity ?? 64}%`;
    }
    if (optSkipGap) optSkipGap.value = String(settings.skipSilenceGapSec ?? 1.6);
    if (optSkipGapLabel) optSkipGapLabel.textContent = `${settings.skipSilenceGapSec ?? 1.6}s`;
    if (optSkipRate) optSkipRate.value = String(settings.skipSilenceRate ?? 2.2);
    if (optSkipRateLabel) {
      optSkipRateLabel.textContent = `${settings.skipSilenceRate ?? 2.2}x`;
    }
    if (optAudioBoost) optAudioBoost.value = String(settings.audioBoostPercent ?? 100);
    if (optAudioBoostLabel) {
      optAudioBoostLabel.textContent = `${settings.audioBoostPercent ?? 100}%`;
    }
    if (optHoverFade) optHoverFade.value = String(settings.hoverFadeDelayMs ?? 2200);
    if (optHoverFadeLabel) {
      optHoverFadeLabel.textContent = `${settings.hoverFadeDelayMs ?? 2200} ms`;
    }
    if (optKeepPip) optKeepPip.checked = settings.keepSubtitlesInPiP !== false;
    if (optSkipSilence) optSkipSilence.checked = Boolean(settings.skipSilenceEnabled);

    // Alert sound
    if (optSoundPreset) {
      optSoundPreset.textContent = "";
      for (const preset of SOUND_PRESETS) {
        const option = document.createElement("option");
        option.value = preset.id;
        option.textContent = preset.label;
        optSoundPreset.appendChild(option);
      }
      optSoundPreset.value = settings.notificationSoundPreset || "chime";
    }
    if (optSoundVolume) {
      optSoundVolume.value = String(settings.notificationSoundVolume ?? 75);
    }
    if (optSoundVolumeLabel) {
      optSoundVolumeLabel.textContent = `${settings.notificationSoundVolume ?? 75}%`;
    }
    if (optSoundBadge) {
      const spec = SOUND_PRESETS.find(
        (p) => p.id === (settings.notificationSoundPreset || "chime")
      );
      optSoundBadge.textContent = spec ? spec.label.split(" (")[0] : "Chime";
    }
    if (optKaraokeHighlight) optKaraokeHighlight.checked = Boolean(settings.karaokeHighlight);
    if (optShowSpeakers) optShowSpeakers.checked = settings.showSpeakerLabels !== false;
    if (optHoverPause) optHoverPause.checked = Boolean(settings.pauseOnCaptionHover);
    if (optClickCopy) optClickCopy.checked = settings.clickCaptionToCopy !== false;
    optOffsetSec.value = String(settings.subtitleOffsetSec || 0);
    optExcludePatterns.value = (settings.excludePatterns || []).join("\n");
    rpcCreateInput.value = settings.rpcOverrides?.CREATE_STUDIO || "";
    rpcPollInput.value = settings.rpcOverrides?.POLL_STUDIO || "";
    renderCaptionPreview();
  }

  async function renderUpdatePanel() {
    if (!optUpdateCard) return;
    const dirHandle = await loadLinkedExtensionDirHandle();
    const dirInfo = await inspectLinkedDirPermission(dirHandle);
    const curVer =
      chrome.runtime?.getManifest?.()?.version ||
      updateStatus?.currentVersion ||
      "0.2.7";

    const avail = Boolean(updateStatus?.updateAvailable);
    optUpdateCard.dataset.available = avail ? "true" : "false";

    if (optUpdateBadge) {
      optUpdateBadge.textContent = avail
        ? `Update v${updateStatus.latestVersion}`
        : `v${curVer} current`;
      optUpdateBadge.className = avail ? "badge badge-saved" : "badge";
    }
    if (optLinkFolderBtn) {
      optLinkFolderBtn.textContent = dirInfo.linked
        ? `Linked folder: ${dirInfo.folderName}`
        : "Link unpacked folder";
    }
    if (optApplyUpdateBtn) {
      optApplyUpdateBtn.style.display = avail ? "inline-flex" : "none";
      optApplyUpdateBtn.textContent = dirInfo.linked
        ? "Update and reload"
        : "Link folder and update";
    }
    if (optUpdateSummary) {
      if (avail) {
        optUpdateSummary.textContent = dirInfo.linked
          ? `LM Subs v${updateStatus.latestVersion} is ready to write into ${dirInfo.folderName} and reload.`
          : `LM Subs v${updateStatus.latestVersion} is available. Link your unzipped lm-subs folder to update in place.`;
      } else {
        optUpdateSummary.textContent = dirInfo.linked
          ? `Installed v${curVer}. Linked to ${dirInfo.folderName} for automatic in-place updates.`
          : `Installed v${curVer}. Link your unzipped lm-subs folder once so updates write directly without manual zip extraction.`;
      }
    }

    // Always show what the newest release changes, even when this install is
    // already current, so the changelog is never more than one click away.
    renderReleaseNotes(optUpdateNotes, updateStatus.latestNotes, {
      version: avail ? updateStatus.latestVersion : curVer,
    });
  }

  function renderNotificationsPanel() {
    if (!optNotifList) return;
    const list = Array.isArray(notifications) ? notifications : [];
    const unread = list.filter((n) => !n.read).length;

    if (optNotifUnreadBadge) {
      optNotifUnreadBadge.textContent = `${unread} unread`;
      optNotifUnreadBadge.className = unread > 0 ? "badge badge-saved" : "badge";
    }

    optNotifList.textContent = "";
    if (list.length === 0) {
      const empty = document.createElement("div");
      empty.className = "hint";
      empty.style.padding = "12px 14px";
      empty.style.margin = "0";
      empty.textContent =
        "No notifications recorded yet. Completed captions, rate-limit failovers, and sync events appear here.";
      optNotifList.appendChild(empty);
      return;
    }

    for (const item of list.slice(0, 25)) {
      const row = document.createElement("div");
      row.className = "notif-row";
      row.dataset.unread = item.read ? "false" : "true";

      const logo = document.createElement("img");
      logo.src = "icons/icon32.png";
      logo.alt = "";
      logo.width = 22;
      logo.height = 22;
      logo.className = "notif-row-logo";

      const content = document.createElement("div");
      content.className = "notif-row-content";

      const head = document.createElement("div");
      head.className = "notif-row-head";

      const title = document.createElement("span");
      title.className = "notif-row-title";
      title.textContent = item.title || "LM Subs";

      const time = document.createElement("span");
      time.className = "hint";
      time.style.margin = "0";
      time.textContent = item.createdAt
        ? new Date(item.createdAt).toLocaleString()
        : "";

      head.append(title, time);
      content.appendChild(head);

      if (item.body) {
        const body = document.createElement("div");
        body.className = "notif-row-body";
        body.textContent = item.body;
        content.appendChild(body);
      }

      row.append(logo, content);
      optNotifList.appendChild(row);
    }
  }

  function moveProviderInQueue(index, delta) {
    const order = [...settings.queueOrder];
    const target = index + delta;
    if (target < 0 || target >= order.length) return;
    const [moved] = order.splice(index, 1);
    order.splice(target, 0, moved);
    saveSettings({ queueOrder: order, primaryProvider: order[0] }).then(async (next) => {
      settings = next;
      renderProviderQueue();
      await triggerAutoSyncIfConnected({ pushOnly: true });
    });
  }

  function renderProviderSummaryAndControls() {
    const activeIds = settings.queueOrder.filter((id) =>
      id === "custom" ? Boolean(settings.customEnabled) : Boolean(presenceMap[id])
    );
    if (queueSummary) {
      if (activeIds.length > 0) {
        const chain = activeIds
          .slice(0, 4)
          .map((id, i) => `#${i + 1} ${getProviderSpec(id).name.split(" ")[0]}`)
          .join(" -> ");
        queueSummary.textContent = `${activeIds.length} active in failover queue (${chain}). Click any row to edit its API key or model.`;
      } else {
        queueSummary.textContent =
          "No API keys saved yet. Paste a free-tier Groq or Mistral key below; unused providers stay collapsed.";
      }
    }
    if (collapseAllBtn) {
      collapseAllBtn.textContent =
        expandedProviders.size > 0 ? "Collapse rows" : "Expand configured";
    }
    if (toggleSectionBtn && queueWrap) {
      queueWrap.style.display = providerListHidden ? "none" : "block";
      toggleSectionBtn.textContent = providerListHidden
        ? `Show providers (${settings.queueOrder.length})`
        : "Hide list";
    }
  }

  function renderProviderQueue() {
    renderProviderSummaryAndControls();
    queueContainer.textContent = "";

    settings.queueOrder.forEach((providerId, idx) => {
      const spec = getProviderSpec(providerId);
      const isSaved =
        spec.id === "custom"
          ? Boolean(settings.customEnabled)
          : Boolean(presenceMap[providerId]);
      const isExpanded = expandedProviders.has(providerId);

      const item = document.createElement("div");
      item.className = "provider-item";

      const bar = document.createElement("div");
      bar.className = "provider-item-bar";

      const leftInfo = document.createElement("div");
      leftInfo.className = "provider-item-left";

      const rank = document.createElement("span");
      rank.className = "provider-rank";
      rank.textContent = String(idx + 1).padStart(2, "0");

      const name = document.createElement("span");
      name.className = "provider-name";
      name.textContent = spec.name;

      const tier = document.createElement("span");
      tier.className = "provider-tier";
      tier.textContent = spec.badge;

      const cloudHint = syncProfile?.keyHints?.[providerId];
      const keyStatus = document.createElement("span");
      keyStatus.className = isSaved ? "badge badge-saved" : "badge";
      keyStatus.textContent = isSaved
        ? spec.id === "custom"
          ? "Active"
          : cloudHint
            ? `Synced (${cloudHint})`
            : "Saved"
        : "Unset";

      leftInfo.append(rank, name, tier, keyStatus);

      const rightControls = document.createElement("div");
      rightControls.className = "provider-item-right";

      const upBtn = document.createElement("button");
      upBtn.type = "button";
      upBtn.className = "btn btn-sm";
      upBtn.textContent = "Up";
      upBtn.title = "Move higher in failover queue";
      upBtn.disabled = idx === 0;
      upBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        moveProviderInQueue(idx, -1);
      });

      const downBtn = document.createElement("button");
      downBtn.type = "button";
      downBtn.className = "btn btn-sm";
      downBtn.textContent = "Down";
      downBtn.title = "Move lower in failover queue";
      downBtn.disabled = idx === settings.queueOrder.length - 1;
      downBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        moveProviderInQueue(idx, 1);
      });

      const expandBtn = document.createElement("button");
      expandBtn.type = "button";
      expandBtn.className = "btn btn-sm";
      expandBtn.setAttribute("aria-expanded", isExpanded ? "true" : "false");
      expandBtn.textContent = isExpanded
        ? "Close"
        : isSaved
          ? "Edit key"
          : "Add key";

      const toggleRow = () => {
        if (expandedProviders.has(providerId)) {
          expandedProviders.delete(providerId);
        } else {
          expandedProviders.add(providerId);
        }
        renderProviderQueue();
      };

      expandBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        toggleRow();
      });
      bar.addEventListener("click", toggleRow);

      rightControls.append(upBtn, downBtn, expandBtn);
      bar.append(leftInfo, rightControls);
      item.appendChild(bar);

      if (isExpanded) {
        const drawer = document.createElement("div");
        drawer.className = "provider-item-drawer";

        const descRow = document.createElement("div");
        descRow.className = "row";
        descRow.style.justifyContent = "space-between";
        descRow.style.flexWrap = "wrap";

        const desc = document.createElement("span");
        desc.className = "hint";
        desc.style.marginTop = "0";
        desc.textContent = spec.freeTierSummary;

        const keyLink = document.createElement("a");
        keyLink.className = "link";
        keyLink.href = spec.keyUrl;
        keyLink.target = "_blank";
        keyLink.rel = "noopener noreferrer";
        keyLink.textContent = spec.id === "custom" ? "Server docs" : "Get API key";

        descRow.append(desc, keyLink);

        // Beginner walkthrough: exactly how to create the account and grab the key
        const guide = document.createElement("details");
        guide.className = "key-guide";
        guide.open = !isSaved;

        const guideSummary = document.createElement("summary");
        guideSummary.className = "key-guide-summary";
        guideSummary.textContent = `How to get a ${spec.name} key, step by step`;

        const guideBody = document.createElement("div");
        guideBody.className = "key-guide-body";

        const reqLine = document.createElement("p");
        reqLine.className = "key-guide-req";
        reqLine.textContent = spec.accountRequirements || "";
        guideBody.appendChild(reqLine);

        const steps = document.createElement("ol");
        steps.className = "key-guide-steps";
        for (const stepText of spec.setupSteps || []) {
          const li = document.createElement("li");
          li.textContent = stepText;
          steps.appendChild(li);
        }
        guideBody.appendChild(steps);

        const formatLine = document.createElement("p");
        formatLine.className = "key-guide-format";
        formatLine.textContent = `Key format: ${spec.keyFormatHint || "provider secret"}`;
        guideBody.appendChild(formatLine);

        const openLink = document.createElement("a");
        openLink.className = "link";
        openLink.href = spec.keyUrl;
        openLink.target = "_blank";
        openLink.rel = "noopener noreferrer";
        openLink.textContent = `Open the ${spec.name} key page in a new tab`;
        guideBody.appendChild(openLink);

        guide.append(guideSummary, guideBody);

        const grid = document.createElement("div");
        grid.className = "provider-drawer-grid";

        const keyOrUrlWrap = document.createElement("div");
        keyOrUrlWrap.className = "row";

        let urlInput = null;
        if (spec.id === "custom") {
          urlInput = document.createElement("input");
          urlInput.type = "url";
          urlInput.placeholder = "http://localhost:8000/v1";
          urlInput.value = settings.customBaseUrl || "";
          keyOrUrlWrap.appendChild(urlInput);
        }

        const keyInput = document.createElement("input");
        keyInput.type = "password";
        keyInput.placeholder = isSaved
          ? "Saved (paste new key to replace)"
          : spec.keyPlaceholder;
        keyInput.autocomplete = "off";
        keyInput.spellcheck = false;
        keyOrUrlWrap.appendChild(keyInput);

        const modelInput = document.createElement("input");
        modelInput.type = "text";
        modelInput.className = "mono-input";
        modelInput.value = getModelForProvider(settings, providerId);
        modelInput.title = `Model ID (default: ${spec.defaultModel})`;
        modelInput.placeholder = spec.defaultModel;

        const actions = document.createElement("div");
        actions.className = "row";

        const statusLine = document.createElement("div");
        statusLine.className = "status-line";

        const saveBtn = document.createElement("button");
        saveBtn.type = "button";
        saveBtn.className = "btn btn-sm btn-primary";
        saveBtn.textContent = "Save";
        saveBtn.addEventListener("click", async () => {
          const customUrl = urlInput ? urlInput.value.trim() : settings.customBaseUrl;
          const granted = await requestProviderOrigin(providerId, customUrl);
          if (!granted) {
            statusLine.dataset.kind = "err";
            statusLine.textContent = `Host permission denied for ${spec.name}.`;
            return;
          }

          const nextModels = {
            ...settings.providerModels,
            [providerId]: modelInput.value.trim() || spec.defaultModel,
          };

          if (providerId === "custom") {
            settings = await saveSettings({
              customBaseUrl: customUrl || "http://localhost:8000/v1",
              customEnabled: true,
              providerModels: nextModels,
            });
            if (keyInput.value.trim()) {
              await setApiKey("custom", keyInput.value.trim());
            }
          } else {
            if (keyInput.value.trim()) {
              await setApiKey(providerId, keyInput.value.trim());
            } else if (!presenceMap[providerId]) {
              statusLine.dataset.kind = "err";
              statusLine.textContent = `Paste a ${spec.name} key first.`;
              return;
            }
            settings = await saveSettings({ providerModels: nextModels });
          }

          keyInput.value = "";
          presenceMap = await getSavedKeyPresenceMap();
          expandedProviders.delete(providerId);
          await triggerAutoSyncIfConnected();
          renderProviderQueue();
        });

        const testBtn = document.createElement("button");
        testBtn.type = "button";
        testBtn.className = "btn btn-sm";
        testBtn.textContent = "Test";
        testBtn.addEventListener("click", async () => {
          const customUrl = urlInput ? urlInput.value.trim() : settings.customBaseUrl;
          await requestProviderOrigin(providerId, customUrl);
          testBtn.disabled = true;
          statusLine.dataset.kind = "";
          statusLine.textContent = "Testing endpoint…";

          const res = await sendRuntime({
            type: RUNTIME_MESSAGE.TEST_PROVIDER,
            providerId,
            model: modelInput.value.trim() || spec.defaultModel,
            unsavedApiKey: keyInput.value.trim(),
            customBaseUrl: customUrl,
          });

          testBtn.disabled = false;
          if (res?.ok) {
            statusLine.dataset.kind = "ok";
            statusLine.textContent = `Verified ${res.providerName} (${res.model}) in ${res.latencyMs} ms.`;
          } else {
            statusLine.dataset.kind = "err";
            statusLine.textContent = res?.error || "Test failed.";
          }
        });

        actions.append(saveBtn, testBtn);

        if (isSaved) {
          const clearBtn = document.createElement("button");
          clearBtn.type = "button";
          clearBtn.className = "btn btn-sm btn-danger";
          clearBtn.textContent = spec.id === "custom" ? "Disable" : "Clear";
          clearBtn.addEventListener("click", async () => {
            if (spec.id === "custom") {
              settings = await saveSettings({ customEnabled: false });
            }
            await clearApiKey(providerId);
            presenceMap = await getSavedKeyPresenceMap();
            await triggerAutoSyncIfConnected({ deletedProviders: [providerId] });
            renderProviderQueue();
          });
          actions.appendChild(clearBtn);
        }

        grid.append(keyOrUrlWrap, modelInput, actions);
        drawer.append(descRow, grid, statusLine);
        item.appendChild(drawer);
      }

      queueContainer.appendChild(item);
    });
  }

  collapseAllBtn?.addEventListener("click", () => {
    if (expandedProviders.size > 0) {
      expandedProviders.clear();
    } else {
      const configured = settings.queueOrder.filter((id) =>
        id === "custom" ? Boolean(settings.customEnabled) : Boolean(presenceMap[id])
      );
      const targets = configured.length > 0 ? configured : [settings.queueOrder[0] || "groq"];
      for (const id of targets) expandedProviders.add(id);
    }
    providerListHidden = false;
    renderProviderQueue();
  });

  toggleSectionBtn?.addEventListener("click", () => {
    providerListHidden = !providerListHidden;
    renderProviderSummaryAndControls();
  });

  function renderCacheTable() {
    cacheTbody.textContent = "";
    if (!cacheList || cacheList.length === 0) {
      cacheEmpty.style.display = "block";
      cacheEmpty.textContent =
        "No transcripts cached yet. Open a Video Overview in NotebookLM or sign in above to pull synced transcripts.";
      cacheTableWrap.style.display = "none";
      if (exportAllVaultBtn) exportAllVaultBtn.style.display = "none";
      return;
    }

    if (exportAllVaultBtn) exportAllVaultBtn.style.display = "inline-flex";

    const q = cacheFilterQuery.trim().toLowerCase();
    const visibleItems = !q
      ? cacheList.map((item) => ({ item, cueMatches: [] }))
      : cacheList
          .map((item) => {
            const titleHit =
              String(item.title || "")
                .toLowerCase()
                .includes(q) ||
              String(item.provider || "")
                .toLowerCase()
                .includes(q);
            const cueMatches = searchCues(item.cues || [], q);
            return titleHit || cueMatches.length > 0
              ? { item, cueMatches }
              : null;
          })
          .filter(Boolean);

    if (visibleItems.length === 0) {
      cacheEmpty.style.display = "block";
      cacheEmpty.textContent = "No transcripts or spoken lines match your search.";
      cacheTableWrap.style.display = "none";
      return;
    }

    cacheEmpty.style.display = "none";
    cacheTableWrap.style.display = "block";

    const makeFormatButton = (item, label, fmt) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "btn btn-sm";
      b.textContent = label;
      b.addEventListener("click", () => {
        const { content, filename, mimeType } = serializeSubtitles(
          item.cues || [],
          fmt,
          {
            title: item.title,
            language: item.language || "en",
            provider: item.provider,
            model: item.model,
            artifactId: item.artifactId,
          }
        );
        downloadFile(content, filename, mimeType);
      });
      return b;
    };

    for (const { item, cueMatches } of visibleItems) {
      const tr = document.createElement("tr");

      const tdTitle = document.createElement("td");
      const titleDiv = document.createElement("div");
      titleDiv.style.fontWeight = "600";
      titleDiv.textContent = item.title || "Video Overview";
      tdTitle.appendChild(titleDiv);
      if (cueMatches.length > 0) {
        const matchSub = document.createElement("div");
        matchSub.className = "hint";
        matchSub.style.color = "var(--accent)";
        matchSub.textContent = `${cueMatches.length} matching spoken line${
          cueMatches.length === 1 ? "" : "s"
        }`;
        tdTitle.appendChild(matchSub);
      }

      const tdProv = document.createElement("td");
      const badge = document.createElement("span");
      badge.className = "badge";
      badge.textContent = item.failoverUsed
        ? `${item.provider} (failover)`
        : item.provider || "manual";
      tdProv.appendChild(badge);

      const tdSlim = document.createElement("td");
      tdSlim.style.fontFamily = "var(--font-mono)";
      tdSlim.style.fontSize = "11.5px";
      const byteStats = resolveAvoidedVideoBytes({
        originalBytes: item.originalBytes,
        extractedBytes: item.extractedBytes,
        durationSeconds: item.durationSeconds,
        cues: item.cues,
      });
      if (byteStats.originalBytes > 0 && byteStats.extractedBytes > 0) {
        const savedPct = Math.max(
          0,
          Math.round((1 - byteStats.extractedBytes / byteStats.originalBytes) * 100)
        );
        const speedStr = item.latencyMs ? `, ${(item.latencyMs / 1000).toFixed(1)}s` : "";
        tdSlim.textContent = `${(byteStats.extractedBytes / 1048576).toFixed(1)} MB (-${savedPct}%)${speedStr}`;
      } else {
        tdSlim.textContent = "n/a";
      }

      const tdCues = document.createElement("td");
      tdCues.style.fontFamily = "var(--font-mono)";
      tdCues.textContent = String(item.cueCount || item.cues?.length || 0);

      const tdActions = document.createElement("td");
      const actRow = document.createElement("div");
      actRow.className = "row";
      actRow.style.flexWrap = "wrap";

      const isEditing = editingCacheKey === item.cacheKey;
      const editBtn = document.createElement("button");
      editBtn.type = "button";
      editBtn.className = "btn btn-sm";
      editBtn.textContent = isEditing ? "Close" : "Edit cues";
      editBtn.addEventListener("click", () => {
        editingCacheKey = isEditing ? null : item.cacheKey;
        renderCacheTable();
      });

      const srtBtn = makeFormatButton(item, ".SRT", "srt");
      const vttBtn = makeFormatButton(item, ".VTT", "vtt");
      const txtBtn = makeFormatButton(item, ".TXT", "txt");
      const mdBtn = makeFormatButton(item, ".MD", "md");
      const csvBtn = makeFormatButton(item, ".CSV", "csv");
      const jsonBtn = makeFormatButton(item, ".JSON", "json");

      const copyBtn = document.createElement("button");
      copyBtn.type = "button";
      copyBtn.className = "btn btn-sm";
      copyBtn.textContent = "Copy";
      copyBtn.addEventListener("click", async () => {
        const txt = formatTxt(item.cues || [], {
          includeTimestamps: true,
          title: item.title,
        });
        try {
          await navigator.clipboard.writeText(txt);
          copyBtn.textContent = "Copied";
        } catch {
          const { content, filename, mimeType } = serializeSubtitles(
            item.cues || [],
            "txt",
            { title: item.title }
          );
          downloadFile(content, filename, mimeType);
          copyBtn.textContent = "Saved";
        }
        setTimeout(() => {
          copyBtn.textContent = "Copy";
        }, 1200);
      });

      const delBtn = document.createElement("button");
      delBtn.type = "button";
      delBtn.className = "btn btn-sm btn-danger";
      delBtn.textContent = "Delete";
      delBtn.addEventListener("click", async () => {
        await deleteCachedSubtitles(item.cacheKey);
        cacheList = await getSubtitleCacheList();
        await triggerAutoSyncIfConnected({ deletedCacheKeys: [item.cacheKey] });
        renderCacheTable();
        renderStatisticsPanel();
      });

      actRow.append(editBtn, srtBtn, vttBtn, txtBtn, mdBtn, csvBtn, jsonBtn, copyBtn, delBtn);
      tdActions.appendChild(actRow);

      tr.append(tdTitle, tdProv, tdSlim, tdCues, tdActions);
      cacheTbody.appendChild(tr);

      if (isEditing) {
        const editTr = document.createElement("tr");
        const editTd = document.createElement("td");
        editTd.colSpan = 5;
        editTd.style.background = "var(--bg-canvas)";

        const editorWrap = document.createElement("div");
        editorWrap.style.display = "grid";
        editorWrap.style.gap = "8px";

        const topBar = document.createElement("div");
        topBar.className = "row";
        topBar.style.justifyContent = "space-between";

        const titleInput = document.createElement("input");
        titleInput.type = "text";
        titleInput.value = item.title || "Video Overview";
        titleInput.style.maxWidth = "340px";

        const saveEditsBtn = document.createElement("button");
        saveEditsBtn.type = "button";
        saveEditsBtn.className = "btn btn-sm btn-primary";
        saveEditsBtn.textContent = "Save cue edits";

        const errLine = document.createElement("div");
        errLine.className = "status-line";

        const cueRowsBox = document.createElement("div");
        cueRowsBox.className = "ext-cue-editor";

        const draftRows = (item.cues || []).map((c) => ({
          start: formatTimestamp(c.startSec, "."),
          end: formatTimestamp(c.endSec, "."),
          text: String(c.text || ""),
          speaker: c.speaker || "",
        }));

        const rebuildRowsDom = () => {
          cueRowsBox.textContent = "";
          draftRows.forEach((dr, idx) => {
            const rowEl = document.createElement("div");
            rowEl.className = "ext-cue-row";

            const sIn = document.createElement("input");
            sIn.type = "text";
            sIn.className = "mono-input";
            sIn.value = dr.start;
            sIn.addEventListener("input", () => {
              dr.start = sIn.value;
            });

            const eIn = document.createElement("input");
            eIn.type = "text";
            eIn.className = "mono-input";
            eIn.value = dr.end;
            eIn.addEventListener("input", () => {
              dr.end = eIn.value;
            });

            const tIn = document.createElement("input");
            tIn.type = "text";
            tIn.value = dr.text;
            tIn.addEventListener("input", () => {
              dr.text = tIn.value;
            });

            const rmBtn = document.createElement("button");
            rmBtn.type = "button";
            rmBtn.className = "btn btn-sm btn-danger";
            rmBtn.textContent = "Remove";
            rmBtn.addEventListener("click", () => {
              draftRows.splice(idx, 1);
              rebuildRowsDom();
            });

            rowEl.append(sIn, eIn, tIn, rmBtn);
            cueRowsBox.appendChild(rowEl);
          });
        };
        rebuildRowsDom();

        saveEditsBtn.addEventListener("click", async () => {
          const nextCues = [];
          for (const dr of draftRows) {
            const txt = String(dr.text || "").trim();
            if (!txt) continue;
            const s = parseTimestampSec(dr.start);
            const e = parseTimestampSec(dr.end);
            if (!Number.isFinite(s) || !Number.isFinite(e)) {
              errLine.dataset.kind = "err";
              errLine.textContent = "Enter valid HH:MM:SS.mmm timestamps.";
              return;
            }
            nextCues.push({
              startSec: s,
              endSec: Math.max(s + 0.25, e),
              text: txt,
              ...(dr.speaker ? { speaker: dr.speaker } : {}),
            });
          }
          saveEditsBtn.disabled = true;
          const res = await sendRuntime({
            type: RUNTIME_MESSAGE.UPDATE_CACHED_SUBTITLES,
            cacheKey: item.cacheKey,
            title: titleInput.value.trim(),
            cues: nextCues,
          });
          saveEditsBtn.disabled = false;
          if (!res?.ok) {
            errLine.dataset.kind = "err";
            errLine.textContent = res?.error || "Could not save edits.";
            return;
          }
          editingCacheKey = null;
          await reloadAllLocalState();
          flashSavedPill();
        });

        topBar.append(titleInput, saveEditsBtn);
        editorWrap.append(topBar, errLine, cueRowsBox);
        editTd.appendChild(editorWrap);
        editTr.appendChild(editTd);
        cacheTbody.appendChild(editTr);
      }
    }
  }

  exportAllVaultBtn?.addEventListener("click", () => {
    if (!cacheList || cacheList.length === 0) return;
    const bundle = {
      schema: "lm-subs-vault/v1",
      exportedAt: new Date().toISOString(),
      count: cacheList.length,
      transcripts: cacheList,
    };
    downloadFile(
      `${JSON.stringify(bundle, null, 2)}\n`,
      `lm-subs-vault-${new Date().toISOString().slice(0, 10)}.json`,
      "application/json;charset=utf-8"
    );
  });

  populateForm();
  renderSyncPanel();
  renderProviderQueue();
  renderNotificationsPanel();
  renderUpdatePanel();
  renderCacheTable();
  renderStatisticsPanel();

  sendRuntime({
    type: RUNTIME_MESSAGE.BACKGROUND_SYNC_TICK,
    includeUpdateCheck: true,
  }).catch(() => {});

  cacheSearchInput?.addEventListener("input", () => {
    cacheFilterQuery = cacheSearchInput.value || "";
    renderCacheTable();
  });

  async function saveNotificationToggles() {
    settings = await saveSettings({
      autoUpdateExtension: optAutoUpdate
        ? Boolean(optAutoUpdate.checked)
        : settings.autoUpdateExtension,
      autoBackgroundSync: optAutoBgSync
        ? Boolean(optAutoBgSync.checked)
        : settings.autoBackgroundSync,
      desktopNotifications: Boolean(optDesktopNotifications?.checked),
      badgeAlerts: Boolean(optBadgeAlerts?.checked),
      soundAlerts: Boolean(optSoundAlerts?.checked),
      notifyOnFailover: Boolean(optNotifyFailover?.checked),
      notifyOnSync: Boolean(optNotifySync?.checked),
    });
    flashSavedPill();
    await sendRuntime({ type: RUNTIME_MESSAGE.GET_NOTIFICATIONS });
  }

  optAutoUpdate?.addEventListener("change", saveNotificationToggles);
  optAutoBgSync?.addEventListener("change", saveNotificationToggles);
  optDesktopNotifications?.addEventListener("change", saveNotificationToggles);
  optBadgeAlerts?.addEventListener("change", saveNotificationToggles);
  optSoundAlerts?.addEventListener("change", async () => {
    await saveNotificationToggles();
    if (optSoundAlerts.checked) {
      unlockChimeAudio(window);
      await playCompletionChimeSound({ win: window, force: true });
    }
  });
  optNotifyFailover?.addEventListener("change", saveNotificationToggles);
  optNotifySync?.addEventListener("change", saveNotificationToggles);

  optCheckUpdatesBtn?.addEventListener("click", async () => {
    optCheckUpdatesBtn.disabled = true;
    optCheckUpdatesBtn.textContent = "Checking…";
    const res = await sendRuntime({ type: RUNTIME_MESSAGE.CHECK_FOR_UPDATES });
    optCheckUpdatesBtn.disabled = false;
    optCheckUpdatesBtn.textContent = "Check for updates";
    updateStatus = res?.status || (await getUpdateStatus());
    notifications = await getNotifications();
    renderNotificationsPanel();
    await renderUpdatePanel();
    if (optUpdateFeedback) {
      optUpdateFeedback.dataset.kind = res?.ok ? "ok" : "err";
      optUpdateFeedback.textContent = res?.ok
        ? res.autoApplied
          ? "Updated automatically and reloading…"
          : res.updateAvailable
            ? `New version v${updateStatus.latestVersion} is ready.`
            : "You are running the latest build."
        : res?.error || "Could not check for updates.";
    }
  });

  async function pickAndSaveExtensionFolder() {
    if (typeof window.showDirectoryPicker !== "function") {
      throw new Error("Folder linking requires Chrome, Brave, Edge, or Arc.");
    }
    const dirHandle = await window.showDirectoryPicker({ mode: "readwrite" });
    await dirHandle.requestPermission?.({ mode: "readwrite" });
    await saveLinkedExtensionDirHandle(dirHandle);
    updateStatus = await saveUpdateStatus({
      linkedFolderName: dirHandle.name || "lm-subs",
    });
    await renderUpdatePanel();
    return dirHandle;
  }

  optLinkFolderBtn?.addEventListener("click", async () => {
    try {
      const dirHandle = await pickAndSaveExtensionFolder();
      if (optUpdateFeedback) {
        optUpdateFeedback.dataset.kind = "ok";
        optUpdateFeedback.textContent = `Linked ${dirHandle.name || "lm-subs"} for automatic updates.`;
      }
    } catch (err) {
      if (optUpdateFeedback && err?.name !== "AbortError") {
        optUpdateFeedback.dataset.kind = "err";
        optUpdateFeedback.textContent = err?.message || "Folder linking canceled.";
      }
    }
  });

  optApplyUpdateBtn?.addEventListener("click", async () => {
    optApplyUpdateBtn.disabled = true;
    try {
      let dirHandle = await loadLinkedExtensionDirHandle();
      if (!dirHandle) {
        dirHandle = await pickAndSaveExtensionFolder();
      } else {
        await dirHandle.requestPermission?.({ mode: "readwrite" });
      }
      optApplyUpdateBtn.textContent = "Updating…";
      const res = await sendRuntime({
        type: RUNTIME_MESSAGE.APPLY_UNPACKED_UPDATE,
      });
      if (!res?.ok && optUpdateFeedback) {
        optUpdateFeedback.dataset.kind = "err";
        optUpdateFeedback.textContent =
          res?.error || "Could not write update files.";
      }
    } catch (err) {
      if (optUpdateFeedback && err?.name !== "AbortError") {
        optUpdateFeedback.dataset.kind = "err";
        optUpdateFeedback.textContent =
          err?.message || "Update canceled.";
      }
    } finally {
      optApplyUpdateBtn.disabled = false;
      updateStatus = await getUpdateStatus();
      await renderUpdatePanel();
    }
  });

  optTestNotifBtn?.addEventListener("click", async () => {
    if (optDesktopNotifications) optDesktopNotifications.checked = true;
    settings = await saveSettings({ desktopNotifications: true });
    if (optSoundAlerts?.checked) {
      unlockChimeAudio(window);
      playCompletionChimeSound({ win: window, force: true }).catch(() => {});
    }
    await sendRuntime({ type: RUNTIME_MESSAGE.TEST_DESKTOP_NOTIFICATION });
    notifications = await getNotifications();
    renderNotificationsPanel();
  });

  optTestChimeBtn?.addEventListener("click", async () => {
    unlockChimeAudio(window);
    optTestChimeBtn.textContent = "Playing…";
    await playCompletionChimeSound({
      win: window,
      preset: settings.notificationSoundPreset || "chime",
      volume: Number(settings.notificationSoundVolume) || 75,
      force: true,
    });
    setTimeout(() => {
      optTestChimeBtn.textContent = "Preview chime";
    }, 650);
  });

  try {
    chrome.runtime?.onMessage?.addListener((msg) => {
      if (msg?.type === RUNTIME_MESSAGE.SUBTITLES_READY && settings.soundAlerts) {
        playCompletionChimeSound({ win: window }).catch(() => {});
      }
      return false;
    });
  } catch {
    // Ignore runtime listener outside extension context
  }

  optMarkNotifReadBtn?.addEventListener("click", async () => {
    const res = await sendRuntime({
      type: RUNTIME_MESSAGE.MARK_NOTIFICATIONS_READ,
    });
    notifications = res?.notifications || (await getNotifications());
    renderNotificationsPanel();
  });

  optClearNotifBtn?.addEventListener("click", async () => {
    await sendRuntime({ type: RUNTIME_MESSAGE.CLEAR_NOTIFICATIONS });
    notifications = [];
    renderNotificationsPanel();
  });

  function openWebLocalCodePage() {
    const base = normalizeSyncServerUrl(syncProfile?.serverUrl);
    const url = `${base}/?view=library&ext_connect=1`;
    if (chrome.tabs?.create) {
      chrome.tabs.create({ url });
    } else {
      window.open(url, "_blank", "noopener,noreferrer");
    }
    setSyncFeedback(
      "Sign in on the opened page, copy the local code at the top, and paste it into the open box above.",
      ""
    );
  }

  function openHostedOAuth(provider) {
    const base = normalizeSyncServerUrl(syncProfile?.serverUrl);
    const url = `${base}/api/auth/oauth/${provider}?device=chrome-extension&next=${encodeURIComponent(
      "/?view=library&ext_connect=1"
    )}`;
    if (chrome.tabs?.create) {
      chrome.tabs.create({ url });
    } else {
      window.open(url, "_blank", "noopener,noreferrer");
    }
    setSyncFeedback(
      `Complete ${provider === "google" ? "Google" : "GitHub"} sign-in in the opened tab, then copy your local code from the top of the library into the open box above.`,
      ""
    );
  }

  syncGetWebCodeBtn?.addEventListener("click", openWebLocalCodePage);
  syncGoogleBtn?.addEventListener("click", () => openHostedOAuth("google"));
  syncGithubBtn?.addEventListener("click", () => openHostedOAuth("github"));

  syncCopyLocalCodeBtn?.addEventListener("click", async () => {
    const digits = syncLocalCodeDigits?.textContent?.trim() || "";
    if (!digits) return;
    try {
      await navigator.clipboard.writeText(digits);
      syncCopyLocalCodeBtn.textContent = "Copied";
      setTimeout(() => {
        syncCopyLocalCodeBtn.textContent = "Copy";
      }, 1500);
    } catch {
      // Ignore
    }
  });

  syncSendCodeBtn?.addEventListener("click", async () => {
    const email = (syncEmailInput?.value || "").trim().toLowerCase();
    if (!email) {
      setSyncFeedback("Enter your email address first.", "err");
      syncEmailInput?.focus();
      return;
    }

    const base = normalizeSyncServerUrl(syncProfile?.serverUrl);
    const granted = await requestSyncServerOrigin(base);
    if (!granted) {
      setSyncFeedback("Permission denied for LM Subs sync service.", "err");
      return;
    }

    syncSendCodeBtn.disabled = true;
    setSyncFeedback("Sending 6-digit verification code…", "");

    const res = await sendRuntime({
      type: RUNTIME_MESSAGE.SYNC_EMAIL_SEND_CODE,
      email,
    });
    syncSendCodeBtn.disabled = false;

    if (!res?.ok) {
      setSyncFeedback(res?.error || "Could not send verification code.", "err");
      return;
    }

    if (res.delivery === "preview" && res.previewCode) {
      if (syncLocalCodePreview && syncLocalCodeDigits) {
        syncLocalCodeDigits.textContent = res.previewCode;
        syncLocalCodePreview.style.display = "flex";
      }
      if (syncCodeInput) syncCodeInput.value = res.previewCode;
      if (syncTokenInput) syncTokenInput.value = res.previewCode;
      setSyncFeedback(
        `Local sign-in code ready: ${res.previewCode}. Click Connect code or Verify to finish signing in.`,
        "ok"
      );
    } else {
      if (syncLocalCodePreview) syncLocalCodePreview.style.display = "none";
      setSyncFeedback(
        `Sent a 6-digit code to ${email}. Enter it in either open code box above.`,
        "ok"
      );
    }
    syncCodeInput?.focus();
  });

  async function verifyCodeOrSessionToken(rawInput, triggerButton) {
    const cleaned = String(rawInput || "").trim();
    if (!cleaned) {
      setSyncFeedback("Paste your lms_ local code or 6-digit email code first.", "err");
      return;
    }

    const base = normalizeSyncServerUrl(syncProfile?.serverUrl);
    const granted = await requestSyncServerOrigin(base);
    if (!granted) {
      setSyncFeedback("Permission denied for LM Subs sync service.", "err");
      return;
    }

    // 6-digit numeric email code path
    const compactDigits = cleaned.replace(/\s+/g, "");
    if (/^\d{6}$/.test(compactDigits)) {
      const email = (syncEmailInput?.value || "").trim().toLowerCase();
      if (!email) {
        setSyncFeedback("Enter the email address for this 6-digit code.", "err");
        syncEmailInput?.focus();
        return;
      }
      if (triggerButton) triggerButton.disabled = true;
      setSyncFeedback("Verifying 6-digit code…", "");
      const res = await sendRuntime({
        type: RUNTIME_MESSAGE.SYNC_EMAIL_VERIFY_CODE,
        email,
        code: compactDigits,
        syncPreferences: {
          syncApiKeys: Boolean(syncPrefKeys?.checked),
          syncTranscripts: Boolean(syncPrefTranscripts?.checked),
          syncSettings: Boolean(syncPrefSettings?.checked),
        },
      });
      if (triggerButton) triggerButton.disabled = false;

      if (!res?.ok) {
        setSyncFeedback(res?.error || "Invalid or expired code.", "err");
        return;
      }
      if (syncCodeInput) syncCodeInput.value = "";
      if (syncTokenInput) syncTokenInput.value = "";
      if (syncLocalCodePreview) syncLocalCodePreview.style.display = "none";
      await reloadAllLocalState();
      setSyncFeedback("Signed in and synced opted-in categories.", "ok");
      return;
    }

    // `lms_...` local extension token path
    if (triggerButton) triggerButton.disabled = true;
    setSyncFeedback("Connecting local extension code…", "");
    const res = await sendRuntime({
      type: RUNTIME_MESSAGE.SYNC_SIGNIN,
      token: cleaned,
      syncPreferences: {
        syncApiKeys: Boolean(syncPrefKeys?.checked),
        syncTranscripts: Boolean(syncPrefTranscripts?.checked),
        syncSettings: Boolean(syncPrefSettings?.checked),
      },
    });
    if (triggerButton) triggerButton.disabled = false;

    if (!res?.ok) {
      setSyncFeedback(res?.error || "Invalid or expired local code.", "err");
      return;
    }

    if (syncTokenInput) syncTokenInput.value = "";
    if (syncCodeInput) syncCodeInput.value = "";
    await reloadAllLocalState();
    setSyncFeedback("Connected Chrome extension and synced your account.", "ok");
  }

  syncTokenBtn?.addEventListener("click", () => {
    verifyCodeOrSessionToken(syncTokenInput?.value, syncTokenBtn);
  });
  syncTokenInput?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      verifyCodeOrSessionToken(syncTokenInput.value, syncTokenBtn);
    }
  });

  syncVerifyCodeBtn?.addEventListener("click", () => {
    verifyCodeOrSessionToken(syncCodeInput?.value, syncVerifyCodeBtn);
  });
  syncCodeInput?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      verifyCodeOrSessionToken(syncCodeInput.value, syncVerifyCodeBtn);
    }
  });

  async function saveSyncOptInPreferences() {
    const nextPrefs = {
      syncApiKeys: Boolean(syncPrefKeys?.checked),
      syncTranscripts: Boolean(syncPrefTranscripts?.checked),
      syncSettings: Boolean(syncPrefSettings?.checked),
    };
    const res = await sendRuntime({
      type: RUNTIME_MESSAGE.SYNC_SAVE_PREFERENCES,
      syncPreferences: nextPrefs,
      purgeDisabled: true,
    });
    if (res?.ok) {
      syncProfile = res.profile || syncProfile;
      renderSyncPanel();
      setSyncFeedback("Updated sync preferences.", "ok");
    } else {
      setSyncFeedback(res?.error || "Could not update sync preferences.", "err");
    }
  }

  syncPrefKeys?.addEventListener("change", saveSyncOptInPreferences);
  syncPrefTranscripts?.addEventListener("change", saveSyncOptInPreferences);
  syncPrefSettings?.addEventListener("change", saveSyncOptInPreferences);

  syncOpenWebStatsBtn?.addEventListener("click", () => {
    const base = normalizeSyncServerUrl(syncProfile?.serverUrl);
    const url = `${base}/?view=stats`;
    if (chrome.tabs?.create) {
      chrome.tabs.create({ url });
    } else {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  });

  refreshStatsBtn?.addEventListener("click", () => {
    renderStatisticsPanel();
  });

  syncNowBtn?.addEventListener("click", async () => {
    syncNowBtn.disabled = true;
    syncNowBtn.textContent = "Syncing…";
    setSyncFeedback("Synchronizing opted-in data…", "");

    const res = await sendRuntime({ type: RUNTIME_MESSAGE.SYNC_NOW });
    syncNowBtn.disabled = false;
    syncNowBtn.textContent = "Sync now";

    if (res?.ok) {
      await reloadAllLocalState();
      setSyncFeedback("Synchronized opted-in categories.", "ok");
    } else {
      setSyncFeedback(res?.error || "Sync failed.", "err");
    }
  });

  syncSignoutBtn?.addEventListener("click", async () => {
    await sendRuntime({ type: RUNTIME_MESSAGE.SYNC_SIGNOUT });
    await reloadAllLocalState();
    setSyncFeedback("Signed out. Local keys and cached transcripts remain in this browser.", "");
  });

  optEnabled.addEventListener("change", async () => {
    settings = await saveSettings({ enabled: optEnabled.checked });
    flashSavedPill();
    await triggerAutoSyncIfConnected({ pushOnly: true });
  });

  function collectCaptionBehaviorPatch() {
    const patterns = optExcludePatterns.value
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean);
    return {
      autoOnGenerate: optAutoGenerate.checked,
      autoOnExistingVideos: optAutoExisting.checked,
      autoOnAudioOverviews: optAutoAudio
        ? Boolean(optAutoAudio.checked)
        : settings.autoOnAudioOverviews !== false,
      showToast: optShowToast.checked,
      languageHint: optLanguageHint.value,
      translateTo: optTranslateTo.value,
      fontSize: optFontSize.value,
      captionStyle: optCaptionStyle ? optCaptionStyle.value : settings.captionStyle,
      captionFontFamily: optCaptionFont ? optCaptionFont.value : settings.captionFontFamily,
      captionColor: optCaptionColor ? optCaptionColor.value : settings.captionColor,
      captionPosition: optCaptionPosition ? optCaptionPosition.value : settings.captionPosition,
      captionMaxWidth: optCaptionWidth ? optCaptionWidth.value : settings.captionMaxWidth,
      captionBgOpacity: optCaptionOpacity ? Number(optCaptionOpacity.value) : settings.captionBgOpacity,
      karaokeDelayMs: optKaraokeDelay ? Number(optKaraokeDelay.value) : settings.karaokeDelayMs,
      defaultPlaybackSpeed: optPlaybackSpeed ? Number(optPlaybackSpeed.value) : settings.defaultPlaybackSpeed,
      karaokeHighlight: optKaraokeHighlight ? Boolean(optKaraokeHighlight.checked) : settings.karaokeHighlight,
      showSpeakerLabels: optShowSpeakers ? Boolean(optShowSpeakers.checked) : settings.showSpeakerLabels,
      pauseOnCaptionHover: optHoverPause ? Boolean(optHoverPause.checked) : settings.pauseOnCaptionHover,
      clickCaptionToCopy: optClickCopy ? Boolean(optClickCopy.checked) : settings.clickCaptionToCopy,
      subtitleOffsetSec: Number(optOffsetSec.value) || 0,
      playBarDockMode: optPlayBarDock ? optPlayBarDock.value : settings.playBarDockMode,
      excludePatterns: patterns,
    };
  }

  function collectAdvancedPatch() {
    return {
      fineGrainedControls: optFineGrained
        ? Boolean(optFineGrained.checked)
        : settings.fineGrainedControls,
      dynamicCaptionScaling: optDynamicScaling
        ? Boolean(optDynamicScaling.checked)
        : settings.dynamicCaptionScaling,
      captionScaleFactor: optCaptionScale
        ? Number(optCaptionScale.value)
        : settings.captionScaleFactor,
      captionMinFontPx: optCaptionMin
        ? Number(optCaptionMin.value)
        : settings.captionMinFontPx,
      captionMaxFontPx: optCaptionMax
        ? Number(optCaptionMax.value)
        : settings.captionMaxFontPx,
      captionPaddingY: optCaptionPadY
        ? Number(optCaptionPadY.value)
        : settings.captionPaddingY,
      captionPaddingX: optCaptionPadX
        ? Number(optCaptionPadX.value)
        : settings.captionPaddingX,
      captionBorderRadius: optCaptionRadius
        ? Number(optCaptionRadius.value)
        : settings.captionBorderRadius,
      captionLineHeight: optCaptionLeading
        ? Number(optCaptionLeading.value)
        : settings.captionLineHeight,
      captionBottomOffsetPx: optCaptionBottom
        ? Number(optCaptionBottom.value)
        : settings.captionBottomOffsetPx,
      captionTextStrokePx: optCaptionStroke
        ? Number(optCaptionStroke.value)
        : settings.captionTextStrokePx,
      karaokeHighlightOpacity: optKaraokeAlpha
        ? Number(optKaraokeAlpha.value)
        : settings.karaokeHighlightOpacity,
      upcomingWordOpacity: optUpcomingAlpha
        ? Number(optUpcomingAlpha.value)
        : settings.upcomingWordOpacity,
      skipSilenceEnabled: optSkipSilence
        ? Boolean(optSkipSilence.checked)
        : settings.skipSilenceEnabled,
      skipSilenceGapSec: optSkipGap
        ? Number(optSkipGap.value)
        : settings.skipSilenceGapSec,
      skipSilenceRate: optSkipRate
        ? Number(optSkipRate.value)
        : settings.skipSilenceRate,
      audioBoostPercent: optAudioBoost
        ? Number(optAudioBoost.value)
        : settings.audioBoostPercent,
      hoverFadeDelayMs: optHoverFade
        ? Number(optHoverFade.value)
        : settings.hoverFadeDelayMs,
      keepSubtitlesInPiP: optKeepPip
        ? Boolean(optKeepPip.checked)
        : settings.keepSubtitlesInPiP,
    };
  }

  for (const liveCtrl of [
    optAutoGenerate,
    optAutoExisting,
    optAutoAudio,
    optShowToast,
    optFontSize,
    optCaptionStyle,
    optCaptionFont,
    optCaptionColor,
    optCaptionPosition,
    optCaptionWidth,
    optCaptionOpacity,
    optKaraokeDelay,
    optPlaybackSpeed,
    optKaraokeHighlight,
    optShowSpeakers,
    optHoverPause,
    optClickCopy,
  ]) {
    liveCtrl?.addEventListener("input", renderCaptionPreview);
    liveCtrl?.addEventListener("change", async () => {
      renderCaptionPreview();
      settings = await saveSettings(collectCaptionBehaviorPatch());
      flashSavedPill();
    });
  }

  resetCaptionStyleBtn?.addEventListener("click", async () => {
    settings = await saveSettings({
      fontSize: "medium",
      captionStyle: "classic",
      captionFontFamily: "sans",
      captionColor: "white",
      captionPosition: "bottom",
      captionMaxWidth: "balanced",
      captionBgOpacity: 88,
      defaultPlaybackSpeed: 1,
      karaokeHighlight: true,
      karaokeDelayMs: 0,
      showSpeakerLabels: true,
      pauseOnCaptionHover: false,
      clickCaptionToCopy: true,
      subtitleOffsetSec: 0,
    });
    populateForm();
    flashSavedPill();
    await triggerAutoSyncIfConnected({ pushOnly: true });
  });

  saveBehaviorBtn.addEventListener("click", async () => {
    settings = await saveSettings(collectCaptionBehaviorPatch());
    flashSavedPill();
    await triggerAutoSyncIfConnected({ pushOnly: true });
  });

  // Fine-grained controls: master switch + explicit save
  optFineGrained?.addEventListener("change", async () => {
    settings = await saveSettings({
      fineGrainedControls: Boolean(optFineGrained.checked),
    });
    if (advancedControlsBody) {
      advancedControlsBody.style.display = optFineGrained.checked
        ? "block"
        : "none";
    }
    flashSavedPill();
    await triggerAutoSyncIfConnected({ pushOnly: true });
  });

  const bindRangeLabel = (input, labelEl, format) => {
    if (!input || !labelEl) return;
    input.addEventListener("input", () => {
      labelEl.textContent = format(Number(input.value));
    });
  };

  bindRangeLabel(optCaptionScale, optCaptionScaleLabel, (v) => `${v}%`);
  bindRangeLabel(optCaptionLeading, optCaptionLeadingLabel, (v) => `${v}%`);
  bindRangeLabel(optKaraokeAlpha, optKaraokeAlphaLabel, (v) => `${v}%`);
  bindRangeLabel(optUpcomingAlpha, optUpcomingAlphaLabel, (v) => `${v}%`);
  bindRangeLabel(optSkipGap, optSkipGapLabel, (v) => `${v.toFixed(1)}s`);
  bindRangeLabel(optSkipRate, optSkipRateLabel, (v) => `${v.toFixed(1)}x`);
  bindRangeLabel(optAudioBoost, optAudioBoostLabel, (v) => `${v}%`);
  bindRangeLabel(optHoverFade, optHoverFadeLabel, (v) => `${v} ms`);
  bindRangeLabel(optSoundVolume, optSoundVolumeLabel, (v) => `${v}%`);

  saveAdvancedBtn?.addEventListener("click", async () => {
    settings = await saveSettings(collectAdvancedPatch());
    flashSavedPill();
    await triggerAutoSyncIfConnected({ pushOnly: true });
  });

  resetAdvancedBtn?.addEventListener("click", async () => {
    settings = await saveSettings({
      fineGrainedControls: false,
      dynamicCaptionScaling: true,
      captionScaleFactor: 100,
      captionMinFontPx: 11,
      captionMaxFontPx: 40,
      captionPaddingY: 7,
      captionPaddingX: 15,
      captionBorderRadius: 7,
      captionLineHeight: 142,
      captionBottomOffsetPx: 54,
      captionTextStrokePx: 0,
      karaokeHighlightOpacity: 48,
      upcomingWordOpacity: 64,
      playBarDockMode: "native",
      hoverFadeDelayMs: 2200,
      keepSubtitlesInPiP: true,
      skipSilenceEnabled: false,
      skipSilenceGapSec: 1.6,
      skipSilenceRate: 2.2,
      audioBoostPercent: 100,
    });
    populateForm();
    flashSavedPill();
  });

  // Alert sound preset + volume
  async function saveSoundPreset() {
    settings = await saveSettings({
      notificationSoundPreset: optSoundPreset?.value || "chime",
      notificationSoundVolume: optSoundVolume ? Number(optSoundVolume.value) : 75,
    });
    if (optSoundBadge) {
      const spec = SOUND_PRESETS.find(
        (p) => p.id === (settings.notificationSoundPreset || "chime")
      );
      optSoundBadge.textContent = spec ? spec.label.split(" (")[0] : "Chime";
    }
    flashSavedPill();
    await triggerAutoSyncIfConnected({ pushOnly: true });
  }

  optSoundPreset?.addEventListener("change", async () => {
    unlockChimeAudio(globalThis);
    await saveSoundPreset();
    await playCompletionChimeSound({
      preset: optSoundPreset.value,
      volume: optSoundVolume ? Number(optSoundVolume.value) : 75,
      force: true,
    });
  });

  optSoundVolume?.addEventListener("change", async () => {
    unlockChimeAudio(globalThis);
    await saveSoundPreset();
    await playCompletionChimeSound({
      preset: optSoundPreset?.value || "chime",
      volume: Number(optSoundVolume.value),
      force: true,
    });
  });

  optPreviewSoundBtn?.addEventListener("click", async () => {
    unlockChimeAudio(globalThis);
    const preset = optSoundPreset?.value || "chime";
    if (optSoundFeedback) {
      optSoundFeedback.dataset.kind = "";
      optSoundFeedback.textContent =
        preset === "none" ? "Sound is set to silent." : "Playing…";
    }
    const played = await playCompletionChimeSound({
      preset,
      volume: optSoundVolume ? Number(optSoundVolume.value) : 75,
      force: true,
    });
    if (optSoundFeedback) {
      optSoundFeedback.dataset.kind = played ? "ok" : "err";
      optSoundFeedback.textContent = played
        ? `Played ${SOUND_PRESETS.find((p) => p.id === preset)?.label || preset}.`
        : "Browser blocked playback. Click anywhere on the page and try again.";
    }
  });

  clearCacheBtn.addEventListener("click", async () => {
    await clearAllCachedSubtitles();
    cacheList = [];
    renderCacheTable();
    renderStatisticsPanel();
  });

  saveRpcBtn.addEventListener("click", async () => {
    const rpcOverrides = {};
    if (rpcCreateInput.value.trim()) {
      rpcOverrides.CREATE_STUDIO = rpcCreateInput.value.trim();
    }
    if (rpcPollInput.value.trim()) {
      rpcOverrides.POLL_STUDIO = rpcPollInput.value.trim();
    }
    settings = await saveSettings({ rpcOverrides });
    flashSavedPill();
    await triggerAutoSyncIfConnected({ pushOnly: true });
  });

  async function refreshDiagnosticsPanel() {
    if (!debugLogViewer) return;
    const report = await sendRuntime({
      type: RUNTIME_MESSAGE.GET_DEBUG_REPORT,
    });
    if (!report?.ok) {
      debugLogViewer.textContent =
        report?.error || "Unable to fetch diagnostic report from Service Worker.";
      return;
    }

    missingOriginsForOptions = report.missingOrigins || [];
    if (optPermBadge) {
      if (report.permissionsOk) {
        optPermBadge.textContent = "Google CDN: OK";
        optPermBadge.className = "badge badge-saved";
        if (optGrantPermsBtn) optGrantPermsBtn.style.display = "none";
      } else {
        optPermBadge.textContent = "Permissions withheld";
        optPermBadge.className = "badge badge-err";
        if (optGrantPermsBtn) optGrantPermsBtn.style.display = "inline-flex";
      }
    }

    debugLogViewer.textContent = report.reportText || "(empty)";
  }

  optDebugMode?.addEventListener("change", async () => {
    settings = await saveSettings({ debugMode: optDebugMode.checked });
    flashSavedPill();
    await refreshDiagnosticsPanel();
  });

  optGrantPermsBtn?.addEventListener("click", async () => {
    if (!chrome.permissions?.request || missingOriginsForOptions.length === 0) return;
    try {
      await chrome.permissions.request({ origins: missingOriginsForOptions });
      await refreshDiagnosticsPanel();
    } catch {
      // Ignore
    }
  });

  optRefreshDebugBtn?.addEventListener("click", () => {
    refreshDiagnosticsPanel();
  });

  optCopyDebugBtn?.addEventListener("click", async () => {
    const report = await sendRuntime({
      type: RUNTIME_MESSAGE.GET_DEBUG_REPORT,
    });
    const text = report?.reportText || "";
    try {
      await navigator.clipboard.writeText(text);
      optCopyDebugBtn.textContent = "Copied";
    } catch {
      optCopyDebugBtn.textContent = "Failed";
    }
    setTimeout(() => {
      optCopyDebugBtn.textContent = "Copy redacted report";
    }, 1600);
  });

  optClearDebugBtn?.addEventListener("click", async () => {
    await sendRuntime({ type: RUNTIME_MESSAGE.CLEAR_DEBUG_LOGS });
    await refreshDiagnosticsPanel();
  });

  try {
    chrome.storage?.onChanged?.addListener(async (changes, areaName) => {
      if (areaName !== "local") return;
      if (changes.notifications) {
        notifications = await getNotifications();
        renderNotificationsPanel();
      }
      if (changes.updateStatus) {
        updateStatus = await getUpdateStatus();
        await renderUpdatePanel();
      }
      if (changes.subtitleCache) {
        cacheList = await getSubtitleCacheList();
        renderCacheTable();
      }
    });
  } catch {
    // Ignore
  }

  refreshDiagnosticsPanel();
}

document.addEventListener("DOMContentLoaded", initOptions);
