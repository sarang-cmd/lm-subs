/**
 * Full Settings, Neon Cloud Sync & Provider Failover Queue (`src/options/options.js`).
 *
 * Security invariants:
 * - Never accesses raw API keys or raw sync bearer tokens (`getSavedKeyPresenceMap` returns booleans only).
 * - Requests optional host permissions directly inside user click gestures.
 */

import { RUNTIME_MESSAGE } from "../config/selectors.js";
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
  getSavedKeyPresenceMap,
  getSettings,
  getSubtitleCacheList,
  normalizeSyncServerUrl,
  saveSettings,
  setApiKey,
} from "../lib/storage.js";
import { formatSrt, formatVtt } from "../lib/subtitles.js";
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
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

function slugify(title) {
  return (
    String(title || "video-overview")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "video-overview"
  );
}

async function initOptions() {
  document
    .getElementById("brand-icon-slot")
    ?.appendChild(createBrandMarkSvg(document, 32));

  const optEnabled = document.getElementById("opt-enabled");
  const queueContainer = document.getElementById("provider-queue-list");
  const optAutoGenerate = document.getElementById("opt-auto-generate");
  const optAutoExisting = document.getElementById("opt-auto-existing");
  const optShowToast = document.getElementById("opt-show-toast");
  const optLanguageHint = document.getElementById("opt-language-hint");
  const optTranslateTo = document.getElementById("opt-translate-to");
  const optFontSize = document.getElementById("opt-font-size");
  const optOffsetSec = document.getElementById("opt-offset-sec");
  const optExcludePatterns = document.getElementById("opt-exclude-patterns");
  const saveBehaviorBtn = document.getElementById("save-behavior-btn");
  const savedPill = document.getElementById("settings-saved-pill");

  // Neon Sync elements
  const optSyncBadge = document.getElementById("opt-sync-badge");
  const syncServerUrlInput = document.getElementById("sync-server-url");
  const syncLoggedOutPanel = document.getElementById("sync-logged-out-panel");
  const syncLoggedInPanel = document.getElementById("sync-logged-in-panel");
  const syncEmailInput = document.getElementById("sync-email-input");
  const syncPasswordInput = document.getElementById("sync-password-input");
  const syncNameInput = document.getElementById("sync-name-input");
  const syncSigninBtn = document.getElementById("sync-signin-btn");
  const syncSignupBtn = document.getElementById("sync-signup-btn");
  const syncTokenInput = document.getElementById("sync-token-input");
  const syncTokenBtn = document.getElementById("sync-token-btn");
  const syncAccountLabel = document.getElementById("sync-account-label");
  const syncMetaLabel = document.getElementById("sync-meta-label");
  const syncNowBtn = document.getElementById("sync-now-btn");
  const syncSignoutBtn = document.getElementById("sync-signout-btn");
  const syncKeyHints = document.getElementById("sync-key-hints");
  const syncStatusLine = document.getElementById("sync-status-line");

  const cacheEmpty = document.getElementById("cache-empty");
  const cacheTableWrap = document.getElementById("cache-table-wrap");
  const cacheTbody = document.getElementById("cache-tbody");
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

  let [settings, presenceMap, cacheList, syncProfile] = await Promise.all([
    getSettings(),
    getSavedKeyPresenceMap(),
    getSubtitleCacheList(),
    getCloudSyncProfile(),
  ]);

  function flashSavedPill() {
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
    if (syncServerUrlInput && syncProfile?.serverUrl) {
      syncServerUrlInput.value = syncProfile.serverUrl;
    }

    if (syncProfile?.connected && syncProfile.user?.email) {
      optSyncBadge.textContent = "Synced · Postgres";
      optSyncBadge.className = "badge badge-saved";
      syncLoggedOutPanel.style.display = "none";
      syncLoggedInPanel.style.display = "block";

      syncAccountLabel.textContent = syncProfile.user.name
        ? `${syncProfile.user.name} (${syncProfile.user.email})`
        : syncProfile.user.email;

      const hintEntries = Object.entries(syncProfile.keyHints || {});
      const lastStr = syncProfile.lastSyncedAt
        ? new Date(syncProfile.lastSyncedAt).toLocaleTimeString()
        : "just now";
      syncMetaLabel.textContent = `${hintEntries.length} encrypted API key(s) · ${
        syncProfile.subtitleCount || 0
      } synced transcript(s) · Last sync ${lastStr}`;

      syncKeyHints.textContent = "";
      for (const [provId, hint] of hintEntries) {
        const chip = document.createElement("span");
        chip.className = "key-chip";
        chip.textContent = `${provId}: ${hint}`;
        syncKeyHints.appendChild(chip);
      }
    } else {
      optSyncBadge.textContent = "Offline";
      optSyncBadge.className = "badge";
      syncLoggedOutPanel.style.display = "block";
      syncLoggedInPanel.style.display = "none";
    }
  }

  async function reloadAllLocalState() {
    [settings, presenceMap, cacheList, syncProfile] = await Promise.all([
      getSettings(),
      getSavedKeyPresenceMap(),
      getSubtitleCacheList(),
      getCloudSyncProfile(),
    ]);
    populateForm();
    renderSyncPanel();
    renderProviderQueue();
    renderCacheTable();
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
    optLanguageHint.value = settings.languageHint || "auto";
    optTranslateTo.value = settings.translateTo || "original";
    optFontSize.value = settings.fontSize || "medium";
    optOffsetSec.value = String(settings.subtitleOffsetSec || 0);
    optExcludePatterns.value = (settings.excludePatterns || []).join("\n");
    rpcCreateInput.value = settings.rpcOverrides?.CREATE_STUDIO || "";
    rpcPollInput.value = settings.rpcOverrides?.POLL_STUDIO || "";
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

  function renderProviderQueue() {
    queueContainer.textContent = "";

    settings.queueOrder.forEach((providerId, idx) => {
      const spec = getProviderSpec(providerId);
      const isSaved =
        spec.id === "custom"
          ? Boolean(settings.customEnabled)
          : Boolean(presenceMap[providerId]);

      const row = document.createElement("div");
      row.className = "provider-row";

      const top = document.createElement("div");
      top.className = "provider-row-top";

      const leftInfo = document.createElement("div");
      leftInfo.className = "row";
      leftInfo.style.flexWrap = "wrap";

      const rank = document.createElement("span");
      rank.className = "provider-rank";
      rank.textContent = String(idx + 1).padStart(2, "0");

      const name = document.createElement("strong");
      name.textContent = spec.name;

      const tierBadge = document.createElement("span");
      tierBadge.className = "badge";
      tierBadge.textContent = spec.badge;

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

      leftInfo.append(rank, name, tierBadge, keyStatus);

      const rightControls = document.createElement("div");
      rightControls.className = "row";

      const keyLink = document.createElement("a");
      keyLink.className = "link";
      keyLink.href = spec.keyUrl;
      keyLink.target = "_blank";
      keyLink.rel = "noopener noreferrer";
      keyLink.textContent = spec.id === "custom" ? "Docs ↗" : "Get key ↗";

      const upBtn = document.createElement("button");
      upBtn.type = "button";
      upBtn.className = "btn btn-sm";
      upBtn.textContent = "↑";
      upBtn.title = "Move higher in failover queue";
      upBtn.disabled = idx === 0;
      upBtn.addEventListener("click", () => moveProviderInQueue(idx, -1));

      const downBtn = document.createElement("button");
      downBtn.type = "button";
      downBtn.className = "btn btn-sm";
      downBtn.textContent = "↓";
      downBtn.title = "Move lower in failover queue";
      downBtn.disabled = idx === settings.queueOrder.length - 1;
      downBtn.addEventListener("click", () => moveProviderInQueue(idx, 1));

      rightControls.append(keyLink, upBtn, downBtn);
      top.append(leftInfo, rightControls);

      const desc = document.createElement("div");
      desc.className = "hint";
      desc.style.marginBottom = "8px";
      desc.textContent = spec.freeTierSummary;

      const grid = document.createElement("div");
      grid.className = "provider-grid";

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
        ? "Saved · enter new key to replace"
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
      row.append(top, desc, grid, statusLine);
      queueContainer.appendChild(row);
    });
  }

  function renderCacheTable() {
    cacheTbody.textContent = "";
    if (!cacheList || cacheList.length === 0) {
      cacheEmpty.style.display = "block";
      cacheTableWrap.style.display = "none";
      return;
    }

    cacheEmpty.style.display = "none";
    cacheTableWrap.style.display = "block";

    for (const item of cacheList) {
      const tr = document.createElement("tr");

      const tdTitle = document.createElement("td");
      tdTitle.style.fontWeight = "600";
      tdTitle.textContent = item.title || "Video Overview";

      const tdProv = document.createElement("td");
      const badge = document.createElement("span");
      badge.className = "badge";
      badge.textContent = item.failoverUsed
        ? `${item.provider} (failover)`
        : item.provider || "manual";
      tdProv.appendChild(badge);

      const tdSlim = document.createElement("td");
      tdSlim.style.fontFamily = "var(--mono)";
      tdSlim.style.fontSize = "11px";
      if (item.originalBytes && item.extractedBytes) {
        const savedPct = Math.max(
          0,
          Math.round((1 - item.extractedBytes / item.originalBytes) * 100)
        );
        const speedStr = item.latencyMs ? ` · ${(item.latencyMs / 1000).toFixed(1)}s` : "";
        tdSlim.textContent = `${(item.extractedBytes / 1048576).toFixed(1)} MB (-${savedPct}%)${speedStr}`;
      } else {
        tdSlim.textContent = "—";
      }

      const tdCues = document.createElement("td");
      tdCues.style.fontFamily = "var(--mono)";
      tdCues.textContent = String(item.cueCount || item.cues?.length || 0);

      const tdActions = document.createElement("td");
      const actRow = document.createElement("div");
      actRow.className = "row";

      const srtBtn = document.createElement("button");
      srtBtn.type = "button";
      srtBtn.className = "btn btn-sm";
      srtBtn.textContent = ".SRT";
      srtBtn.addEventListener("click", () => {
        downloadFile(
          formatSrt(item.cues || []),
          `${slugify(item.title)}.srt`,
          "application/x-subrip;charset=utf-8"
        );
      });

      const vttBtn = document.createElement("button");
      vttBtn.type = "button";
      vttBtn.className = "btn btn-sm";
      vttBtn.textContent = ".VTT";
      vttBtn.addEventListener("click", () => {
        downloadFile(
          formatVtt(item.cues || []),
          `${slugify(item.title)}.vtt`,
          "text/vtt;charset=utf-8"
        );
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
      });

      actRow.append(srtBtn, vttBtn, delBtn);
      tdActions.appendChild(actRow);

      tr.append(tdTitle, tdProv, tdSlim, tdCues, tdActions);
      cacheTbody.appendChild(tr);
    }
  }

  populateForm();
  renderSyncPanel();
  renderProviderQueue();
  renderCacheTable();

  // Neon Account & Cloud Sync event handlers
  syncSignupBtn?.addEventListener("click", async () => {
    const serverUrl = syncServerUrlInput.value.trim();
    const email = syncEmailInput.value.trim();
    const password = syncPasswordInput.value;
    const name = syncNameInput.value.trim();

    if (!email || password.length < 8) {
      setSyncFeedback("Enter a valid email and at least 8-character password.", "err");
      return;
    }

    await requestSyncServerOrigin(serverUrl);
    syncSignupBtn.disabled = true;
    setSyncFeedback("Creating Neon account & encrypting keys…", "");

    const res = await sendRuntime({
      type: RUNTIME_MESSAGE.SYNC_SIGNUP,
      serverUrl,
      email,
      password,
      name,
    });

    syncSignupBtn.disabled = false;
    if (res?.ok) {
      syncPasswordInput.value = "";
      await reloadAllLocalState();
      setSyncFeedback("Account created & synced with Neon Lakebase Postgres.", "ok");
    } else {
      setSyncFeedback(res?.error || "Account creation failed.", "err");
    }
  });

  syncSigninBtn?.addEventListener("click", async () => {
    const serverUrl = syncServerUrlInput.value.trim();
    const email = syncEmailInput.value.trim();
    const password = syncPasswordInput.value;

    if (!email || !password) {
      setSyncFeedback("Enter your email and password.", "err");
      return;
    }

    await requestSyncServerOrigin(serverUrl);
    syncSigninBtn.disabled = true;
    setSyncFeedback("Signing in & pulling encrypted API keys from Neon…", "");

    const res = await sendRuntime({
      type: RUNTIME_MESSAGE.SYNC_SIGNIN,
      serverUrl,
      email,
      password,
    });

    syncSigninBtn.disabled = false;
    if (res?.ok) {
      syncPasswordInput.value = "";
      await reloadAllLocalState();
      setSyncFeedback("Signed in & synchronized all settings, API keys, and transcripts.", "ok");
    } else {
      setSyncFeedback(res?.error || "Sign-in failed.", "err");
    }
  });

  syncTokenBtn?.addEventListener("click", async () => {
    const serverUrl = syncServerUrlInput.value.trim();
    const token = syncTokenInput.value.trim();
    if (!token) {
      setSyncFeedback("Paste an Extension Sync Token (lms_...) or Neon Auth JWT.", "err");
      return;
    }

    await requestSyncServerOrigin(serverUrl);
    syncTokenBtn.disabled = true;
    setSyncFeedback("Verifying token & pulling cloud vault…", "");

    const res = await sendRuntime({
      type: RUNTIME_MESSAGE.SYNC_SIGNIN,
      serverUrl,
      token,
    });

    syncTokenBtn.disabled = false;
    if (res?.ok) {
      syncTokenInput.value = "";
      await reloadAllLocalState();
      setSyncFeedback("Token verified & synced with Neon Postgres.", "ok");
    } else {
      setSyncFeedback(res?.error || "Token verification failed.", "err");
    }
  });

  syncNowBtn?.addEventListener("click", async () => {
    syncNowBtn.disabled = true;
    syncNowBtn.textContent = "Syncing…";
    setSyncFeedback("Running bidirectional Postgres sync…", "");

    const res = await sendRuntime({ type: RUNTIME_MESSAGE.SYNC_NOW });
    syncNowBtn.disabled = false;
    syncNowBtn.textContent = "Sync Now";

    if (res?.ok) {
      await reloadAllLocalState();
      setSyncFeedback("All API keys, preferences, and subtitles synced.", "ok");
    } else {
      setSyncFeedback(res?.error || "Sync failed.", "err");
    }
  });

  syncSignoutBtn?.addEventListener("click", async () => {
    await sendRuntime({ type: RUNTIME_MESSAGE.SYNC_SIGNOUT });
    await reloadAllLocalState();
    setSyncFeedback("Signed out of Neon Cloud Sync. Local keys remain intact.", "");
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
        optPermBadge.textContent = "Permissions Withheld";
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
      optCopyDebugBtn.textContent = "Copy Redacted Report";
    }, 1600);
  });

  optClearDebugBtn?.addEventListener("click", async () => {
    await sendRuntime({ type: RUNTIME_MESSAGE.CLEAR_DEBUG_LOGS });
    await refreshDiagnosticsPanel();
  });

  refreshDiagnosticsPanel();
}

document.addEventListener("DOMContentLoaded", initOptions);
