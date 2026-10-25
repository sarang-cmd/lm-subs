/**
 * Full Settings, Cloud Sync & Collapsible Provider Failover Queue (`src/options/options.js`).
 *
 * Security invariants:
 * - Never accesses raw API keys or raw sync bearer tokens (`getSavedKeyPresenceMap` returns booleans only).
 * - Requests optional host permissions directly inside user click gestures.
 */

import { RUNTIME_MESSAGE } from "../config/selectors.js";
import { resolveAvoidedVideoBytes } from "../lib/audio-extract.js";
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
  normalizeSyncServerUrl,
  saveSettings,
  setApiKey,
} from "../lib/storage.js";
import {
  formatTimestamp,
  formatTxt,
  parseTimestampSec,
  searchCues,
  serializeSubtitles,
} from "../lib/subtitles.js";
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
  const optShowToast = document.getElementById("opt-show-toast");
  const optLanguageHint = document.getElementById("opt-language-hint");
  const optTranslateTo = document.getElementById("opt-translate-to");
  const optFontSize = document.getElementById("opt-font-size");
  const optCaptionStyle = document.getElementById("opt-caption-style");
  const optOffsetSec = document.getElementById("opt-offset-sec");
  const optExcludePatterns = document.getElementById("opt-exclude-patterns");
  const saveBehaviorBtn = document.getElementById("save-behavior-btn");
  const savedPill = document.getElementById("settings-saved-pill");

  // Notifications & Desktop Alerts elements
  const optNotifUnreadBadge = document.getElementById("opt-notif-unread-badge");
  const optDesktopNotifications = document.getElementById("opt-desktop-notifications");
  const optBadgeAlerts = document.getElementById("opt-badge-alerts");
  const optSoundAlerts = document.getElementById("opt-sound-alerts");
  const optNotifyFailover = document.getElementById("opt-notify-failover");
  const optNotifySync = document.getElementById("opt-notify-sync");
  const optTestNotifBtn = document.getElementById("opt-test-notif-btn");
  const optMarkNotifReadBtn = document.getElementById("opt-mark-notif-read-btn");
  const optClearNotifBtn = document.getElementById("opt-clear-notif-btn");
  const optNotifList = document.getElementById("opt-notif-list");

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

  // Statistics elements
  const refreshStatsBtn = document.getElementById("refresh-stats-btn");
  const statsSummaryNote = document.getElementById("stats-summary-note");
  const statVideos = document.getElementById("stat-videos");
  const statCues = document.getElementById("stat-cues");
  const statSaved = document.getElementById("stat-saved");
  const statLatency = document.getElementById("stat-latency");

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

  let [settings, presenceMap, cacheList, syncProfile, notifications] = await Promise.all([
    getSettings(),
    getSavedKeyPresenceMap(),
    getSubtitleCacheList(),
    getCloudSyncProfile(),
    getNotifications(),
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

  function computeLocalFallbackStats() {
    let cues = 0;
    let savedBytes = 0;
    const lats = [];
    for (const item of cacheList) {
      cues += Number(item.cueCount || item.cues?.length || 0);
      const byteStats = resolveAvoidedVideoBytes({
        originalBytes: item.originalBytes,
        extractedBytes: item.extractedBytes,
        durationSeconds: item.durationSeconds,
        cues: item.cues,
      });
      savedBytes += byteStats.savedBytes;
      if (Number(item.latencyMs) > 0) lats.push(Number(item.latencyMs));
    }
    lats.sort((a, b) => a - b);
    const med = lats.length > 0 ? lats[Math.floor(lats.length / 2)] : null;
    return {
      videos: cacheList.length,
      cues,
      savedBytes,
      medianLatencyMs: med,
    };
  }

  async function renderStatisticsPanel() {
    if (!statVideos) return;
    const localStats = computeLocalFallbackStats();

    if (syncProfile?.connected) {
      const res = await sendRuntime({ type: RUNTIME_MESSAGE.SYNC_GET_STATS });
      if (res?.ok && res.totals) {
        const t = res.totals;
        const cloudSaved = Number(t.bandwidthSavedBytes) || 0;
        const bestSaved = Math.max(cloudSaved, localStats.savedBytes);
        const bestVideos = Math.max(Number(t.videosCaptioned) || 0, localStats.videos);
        const bestCues = Math.max(Number(t.totalCues) || 0, localStats.cues);
        const medMs = t.medianLatencyMs || localStats.medianLatencyMs;

        statVideos.textContent = String(bestVideos);
        statCues.textContent = String(bestCues);
        statSaved.textContent = formatMegabytesLabel(bestSaved);
        statLatency.textContent = medMs ? `${(medMs / 1000).toFixed(1)}s` : "n/a";
        if (statsSummaryNote) {
          statsSummaryNote.textContent = `Live account metrics (${t.spokenMinutes || 0} spoken minutes across ${bestVideos} captioned videos).`;
        }
        return;
      }
    }

    statVideos.textContent = String(localStats.videos);
    statCues.textContent = String(localStats.cues);
    statSaved.textContent = formatMegabytesLabel(localStats.savedBytes);
    statLatency.textContent = localStats.medianLatencyMs
      ? `${(localStats.medianLatencyMs / 1000).toFixed(1)}s`
      : "n/a";
    if (statsSummaryNote) {
      statsSummaryNote.textContent =
        "Computed from transcripts cached in this browser. Sign in above to include cross-device statistics.";
    }
  }

  async function reloadAllLocalState() {
    [settings, presenceMap, cacheList, syncProfile, notifications] = await Promise.all([
      getSettings(),
      getSavedKeyPresenceMap(),
      getSubtitleCacheList(),
      getCloudSyncProfile(),
      getNotifications(),
    ]);
    populateForm();
    renderSyncPanel();
    renderProviderQueue();
    renderNotificationsPanel();
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

  function populateForm() {
    optEnabled.checked = settings.enabled;
    if (optDebugMode) optDebugMode.checked = Boolean(settings.debugMode);
    optAutoGenerate.checked = settings.autoOnGenerate;
    optAutoExisting.checked = settings.autoOnExistingVideos;
    optShowToast.checked = settings.showToast;
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
    optOffsetSec.value = String(settings.subtitleOffsetSec || 0);
    optExcludePatterns.value = (settings.excludePatterns || []).join("\n");
    rpcCreateInput.value = settings.rpcOverrides?.CREATE_STUDIO || "";
    rpcPollInput.value = settings.rpcOverrides?.POLL_STUDIO || "";
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
      row.appendChild(head);

      if (item.body) {
        const body = document.createElement("div");
        body.className = "notif-row-body";
        body.textContent = item.body;
        row.appendChild(body);
      }

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

      actRow.append(editBtn, srtBtn, vttBtn, txtBtn, mdBtn, jsonBtn, copyBtn, delBtn);
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
  renderCacheTable();
  renderStatisticsPanel();

  cacheSearchInput?.addEventListener("input", () => {
    cacheFilterQuery = cacheSearchInput.value || "";
    renderCacheTable();
  });

  async function saveNotificationToggles() {
    settings = await saveSettings({
      desktopNotifications: Boolean(optDesktopNotifications?.checked),
      badgeAlerts: Boolean(optBadgeAlerts?.checked),
      soundAlerts: Boolean(optSoundAlerts?.checked),
      notifyOnFailover: Boolean(optNotifyFailover?.checked),
      notifyOnSync: Boolean(optNotifySync?.checked),
    });
    flashSavedPill();
    await sendRuntime({ type: RUNTIME_MESSAGE.GET_NOTIFICATIONS });
  }

  optDesktopNotifications?.addEventListener("change", async () => {
    if (optDesktopNotifications.checked && chrome.permissions?.request) {
      try {
        await chrome.permissions.request({ permissions: ["notifications"] });
      } catch {
        // Ignore
      }
    }
    await saveNotificationToggles();
  });
  optBadgeAlerts?.addEventListener("change", saveNotificationToggles);
  optSoundAlerts?.addEventListener("change", saveNotificationToggles);
  optNotifyFailover?.addEventListener("change", saveNotificationToggles);
  optNotifySync?.addEventListener("change", saveNotificationToggles);

  optTestNotifBtn?.addEventListener("click", async () => {
    if (chrome.permissions?.request) {
      try {
        await chrome.permissions.request({ permissions: ["notifications"] });
      } catch {
        // Ignore
      }
    }
    if (optDesktopNotifications) optDesktopNotifications.checked = true;
    settings = await saveSettings({ desktopNotifications: true });
    await sendRuntime({ type: RUNTIME_MESSAGE.TEST_DESKTOP_NOTIFICATION });
    notifications = await getNotifications();
    renderNotificationsPanel();
  });

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

  saveBehaviorBtn.addEventListener("click", async () => {
    const patterns = optExcludePatterns.value
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean);

    settings = await saveSettings({
      autoOnGenerate: optAutoGenerate.checked,
      autoOnExistingVideos: optAutoExisting.checked,
      showToast: optShowToast.checked,
      languageHint: optLanguageHint.value,
      translateTo: optTranslateTo.value,
      fontSize: optFontSize.value,
      captionStyle: optCaptionStyle ? optCaptionStyle.value : settings.captionStyle,
      subtitleOffsetSec: Number(optOffsetSec.value) || 0,
      excludePatterns: patterns,
    });
    flashSavedPill();
    await triggerAutoSyncIfConnected({ pushOnly: true });
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
