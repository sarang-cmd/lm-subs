/**
 * Extension Toolbar Popup (`src/popup/popup.js` -> `extension/popup.js`).
 *
 * Security invariants:
 * - Never reads raw API keys or raw sync bearer tokens (`getSavedKeyPresenceMap` returns booleans only).
 * - Requests optional host permissions directly inside user click gestures.
 */

import { NOTEBOOKLM_HOSTS, RUNTIME_MESSAGE } from "../config/selectors.js";
import {
  getProviderOriginPattern,
  getProviderSpec,
  listProviderSpecs,
} from "../lib/providers/registry.js";
import {
  getCloudSyncProfile,
  getLastStatus,
  getSavedKeyPresenceMap,
  getSettings,
  getSubtitleCacheList,
  saveSettings,
  setApiKey,
} from "../lib/storage.js";
import { formatTxt, serializeSubtitles } from "../lib/subtitles.js";
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

function exportSubtitleEntry(entry, format = "srt") {
  if (!entry?.cues?.length) return;
  const { content, filename, mimeType } = serializeSubtitles(entry.cues, format, {
    title: entry.title,
    language: entry.language || "en",
    provider: entry.provider,
    model: entry.model,
    artifactId: entry.artifactId,
  });
  const blob = new Blob(["\uFEFF", content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 3000);
}

async function initPopup() {
  const iconSlot = document.getElementById("brand-icon-slot");
  iconSlot?.appendChild(createBrandMarkSvg(document, 28));

  const enabledToggle = document.getElementById("enabled-toggle");
  const queueSummaryText = document.getElementById("queue-summary-text");
  const openQueueBtn = document.getElementById("open-queue-btn");
  const openOptionsBtn = document.getElementById("open-options-btn");
  const providerSelect = document.getElementById("provider-select");
  const keyPresenceBadge = document.getElementById("key-presence-badge");
  const providerTierHint = document.getElementById("provider-tier-hint");
  const customUrlField = document.getElementById("custom-url-field");
  const customUrlInput = document.getElementById("custom-url-input");
  const getKeyLink = document.getElementById("get-key-link");
  const apiKeyInput = document.getElementById("api-key-input");
  const saveKeyBtn = document.getElementById("save-key-btn");
  const testKeyBtn = document.getElementById("test-key-btn");
  const keyFeedback = document.getElementById("key-feedback");

  const popupSyncBadge = document.getElementById("popup-sync-badge");
  const popupSyncSummary = document.getElementById("popup-sync-summary");
  const popupSyncNowBtn = document.getElementById("popup-sync-now-btn");
  const popupOpenSyncBtn = document.getElementById("popup-open-sync-btn");

  const tabBadge = document.getElementById("tab-badge");
  const tabDescription = document.getElementById("tab-description");
  const generateNowBtn = document.getElementById("generate-now-btn");
  const popupExportBar = document.getElementById("popup-export-bar");
  const popupExportSource = document.getElementById("popup-export-source");
  const downloadLatestSrtBtn = document.getElementById("download-latest-srt-btn");
  const downloadLatestVttBtn = document.getElementById("download-latest-vtt-btn");
  const downloadLatestTxtBtn = document.getElementById("download-latest-txt-btn");
  const downloadLatestJsonBtn = document.getElementById("download-latest-json-btn");
  const copyLatestTxtBtn = document.getElementById("copy-latest-txt-btn");
  const lastStatusCard = document.getElementById("last-status-card");
  const lastStatusBadge = document.getElementById("last-status-badge");
  const lastStatusTitle = document.getElementById("last-status-title");
  const lastStatusMeta = document.getElementById("last-status-meta");
  const permWarningCard = document.getElementById("permission-warning-card");
  const grantGooglePermsBtn = document.getElementById("grant-google-perms-btn");
  const debugModeToggle = document.getElementById("debug-mode-toggle");
  const copyDebugBtn = document.getElementById("copy-debug-btn");

  const specs = listProviderSpecs();
  for (const spec of specs) {
    const opt = document.createElement("option");
    opt.value = spec.id;
    opt.textContent = `${spec.name} (${spec.badge})`;
    providerSelect.appendChild(opt);
  }

  let [settings, presenceMap, lastStatus, cacheList, syncProfile] =
    await Promise.all([
      getSettings(),
      getSavedKeyPresenceMap(),
      getLastStatus(),
      getSubtitleCacheList(),
      getCloudSyncProfile(),
    ]);

  let activeTabId = null;
  let activeTabDiagnostics = null;
  let activeTabSubtitles = null;
  let missingGoogleOrigins = [];

  function resolveExportTarget() {
    if (activeTabSubtitles?.cues?.length > 0) {
      return activeTabSubtitles;
    }
    if (cacheList.length > 0 && cacheList[0]?.cues?.length > 0) {
      return cacheList[0];
    }
    return null;
  }

  function renderExportBar() {
    if (!popupExportBar) return;
    const target = resolveExportTarget();
    if (!target) {
      popupExportBar.style.display = "none";
      return;
    }
    popupExportBar.style.display = "block";
    if (popupExportSource) {
      popupExportSource.textContent = `${target.title || "Video Overview"} (${target.cues.length})`;
    }
  }

  async function inspectGoogleHostPermissions() {
    if (!chrome.permissions?.contains) return;
    const required = [
      "https://*.googleusercontent.com/*",
      "https://*.google.com/*",
      "https://*.googlevideo.com/*",
      "https://*.usercontent.google.com/*",
    ];
    const missing = [];
    for (const origin of required) {
      try {
        const ok = await chrome.permissions.contains({ origins: [origin] });
        if (!ok) missing.push(origin);
      } catch {
        // Ignore
      }
    }
    missingGoogleOrigins = missing;
    if (permWarningCard) {
      permWarningCard.style.display = missing.length > 0 ? "block" : "none";
    }
  }

  function renderQueueSummary() {
    const activeIds = settings.queueOrder.filter((id) =>
      id === "custom" ? settings.customEnabled : presenceMap[id]
    );
    const guideEl = document.getElementById("beginner-guide-details");
    if (activeIds.length === 0) {
      queueSummaryText.textContent = "Add Groq or Mistral key";
      if (guideEl) guideEl.open = true;
    } else {
      queueSummaryText.textContent = activeIds
        .slice(0, 3)
        .map((id, i) => `#${i + 1} ${getProviderSpec(id).name.split(" ")[0]}`)
        .join(" -> ");
      if (guideEl) guideEl.open = false;
    }
  }

  function renderSelectedProvider() {
    const selectedId = providerSelect.value;
    const spec = getProviderSpec(selectedId);
    providerTierHint.textContent = spec.freeTierSummary;
    apiKeyInput.placeholder = spec.keyPlaceholder;
    getKeyLink.href = spec.keyUrl;
    getKeyLink.textContent =
      spec.id === "custom" ? "Local server docs" : "Get free key";

    customUrlField.style.display = spec.id === "custom" ? "block" : "none";
    customUrlInput.value = settings.customBaseUrl || "";

    const isConfigured =
      spec.id === "custom" ? settings.customEnabled : Boolean(presenceMap[spec.id]);
    if (isConfigured) {
      keyPresenceBadge.textContent = spec.id === "custom" ? "Enabled" : "Saved";
      keyPresenceBadge.className = "badge badge-saved";
    } else {
      keyPresenceBadge.textContent = "Not set";
      keyPresenceBadge.className = "badge";
    }
    keyFeedback.textContent = "";
    keyFeedback.dataset.kind = "";
  }

  function renderSyncStatus() {
    if (!popupSyncBadge || !popupSyncSummary) return;
    if (syncProfile?.connected && syncProfile.user?.email) {
      popupSyncBadge.textContent = "Synced";
      popupSyncBadge.className = "badge badge-saved";
      const keyCount = Object.keys(syncProfile.keyHints || {}).length;
      popupSyncSummary.textContent = `${syncProfile.user.email}, ${keyCount} key(s), ${
        syncProfile.subtitleCount || 0
      } transcript(s)`;
      if (popupSyncNowBtn) popupSyncNowBtn.style.display = "inline-flex";
      if (popupOpenSyncBtn) popupOpenSyncBtn.textContent = "Account and sync";
    } else {
      popupSyncBadge.textContent = "Signed out";
      popupSyncBadge.className = "badge";
      popupSyncSummary.textContent =
        "Sign in with Google, GitHub, or email to sync encrypted keys and transcripts.";
      if (popupSyncNowBtn) popupSyncNowBtn.style.display = "none";
      if (popupOpenSyncBtn) popupOpenSyncBtn.textContent = "Sign in";
    }
  }

  function renderLastStatus() {
    if (!lastStatus) {
      lastStatusCard.style.display = "none";
      return;
    }
    lastStatusCard.style.display = "block";
    lastStatusTitle.textContent = lastStatus.title || "Video Overview";

    if (lastStatus.state === "success") {
      lastStatusBadge.textContent = lastStatus.failoverUsed
        ? `${lastStatus.provider} (failover)`
        : lastStatus.provider || "Ready";
      lastStatusBadge.className = "badge badge-saved";
      const speedPart = lastStatus.latencyMs
        ? `, ${(lastStatus.latencyMs / 1000).toFixed(1)}s`
        : "";
      const ratioPart =
        lastStatus.originalBytes && lastStatus.extractedBytes
          ? `, ${(lastStatus.extractedBytes / 1048576).toFixed(1)} MB audio`
          : "";
      lastStatusMeta.textContent = `${lastStatus.cueCount || 0} cues${speedPart}${ratioPart}`;
    } else if (lastStatus.state === "working") {
      lastStatusBadge.textContent = "Working";
      lastStatusBadge.className = "badge badge-warn";
      lastStatusMeta.textContent = lastStatus.message || "Transcribing…";
    } else {
      lastStatusBadge.textContent = "Error";
      lastStatusBadge.className = "badge badge-err";
      lastStatusMeta.textContent = lastStatus.message || "Failed";
    }

    renderExportBar();
  }

  async function inspectActiveTab() {
    if (!chrome.tabs?.query) return;
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const tab = tabs?.[0];
    let host = "";
    try {
      host = tab?.url ? new URL(tab.url).hostname : "";
    } catch {
      host = "";
    }

    if (!tab?.id || !NOTEBOOKLM_HOSTS.includes(host)) {
      tabBadge.textContent = "Standby";
      tabBadge.className = "badge";
      generateNowBtn.disabled = true;
      return;
    }

    activeTabId = tab.id;
    chrome.tabs.sendMessage(
      tab.id,
      { type: RUNTIME_MESSAGE.GET_ACTIVE_TAB_STATE },
      (state) => {
        if (chrome.runtime.lastError || !state?.ok) {
          tabBadge.textContent = "NotebookLM";
          tabBadge.className = "badge";
          tabDescription.textContent =
            "Reload the NotebookLM tab once if you just installed LM Subs.";
          generateNowBtn.disabled = false;
          return;
        }

        if (state.diagnostics) {
          activeTabDiagnostics = state.diagnostics;
        }
        if (state.activeSubtitles?.cues?.length > 0) {
          activeTabSubtitles = state.activeSubtitles;
          renderExportBar();
        }
        if (state.hasVideoElement || state.readyArtifactCount > 0) {
          tabBadge.textContent = `${Math.max(1, state.readyArtifactCount)} Ready`;
          tabBadge.className = "badge badge-saved";
          tabDescription.textContent = state.activeArtifact?.title
            ? `Video: "${state.activeArtifact.title}"`
            : "Video Overview ready for instant captioning.";
          generateNowBtn.disabled = false;
        } else if (state.generatingCount > 0) {
          tabBadge.textContent = "Rendering";
          tabBadge.className = "badge badge-warn";
          tabDescription.textContent =
            "Studio is rendering the Video Overview — captions start automatically.";
          generateNowBtn.disabled = true;
        } else {
          tabBadge.textContent = "Idle";
          tabBadge.className = "badge";
          tabDescription.textContent =
            "Open a Video Overview in NotebookLM Studio to generate captions.";
          generateNowBtn.disabled = false;
        }
      }
    );
  }

  enabledToggle.checked = settings.enabled;
  if (debugModeToggle) debugModeToggle.checked = Boolean(settings.debugMode);
  providerSelect.value = settings.primaryProvider || "groq";
  renderQueueSummary();
  renderSelectedProvider();
  renderSyncStatus();
  renderLastStatus();
  renderExportBar();
  inspectGoogleHostPermissions();
  inspectActiveTab();

  enabledToggle.addEventListener("change", async () => {
    settings = await saveSettings({ enabled: enabledToggle.checked });
  });

  debugModeToggle?.addEventListener("change", async () => {
    settings = await saveSettings({ debugMode: debugModeToggle.checked });
  });

  grantGooglePermsBtn?.addEventListener("click", async () => {
    if (!chrome.permissions?.request || missingGoogleOrigins.length === 0) return;
    try {
      const granted = await chrome.permissions.request({
        origins: missingGoogleOrigins,
      });
      if (granted) {
        await inspectGoogleHostPermissions();
      }
    } catch {
      // Ignore
    }
  });

  copyDebugBtn?.addEventListener("click", async () => {
    copyDebugBtn.disabled = true;
    const report = await sendRuntime({
      type: RUNTIME_MESSAGE.GET_DEBUG_REPORT,
      tabContext: activeTabDiagnostics,
    });
    const text = report?.reportText || "No diagnostic data available.";
    try {
      await navigator.clipboard.writeText(text);
      copyDebugBtn.textContent = "Copied";
    } catch {
      copyDebugBtn.textContent = "Failed";
    }
    setTimeout(() => {
      copyDebugBtn.disabled = false;
      copyDebugBtn.textContent = "Report";
    }, 1600);
  });

  providerSelect.addEventListener("change", async () => {
    const nextProvider = providerSelect.value;
    settings = await saveSettings({ primaryProvider: nextProvider });
    renderQueueSummary();
    renderSelectedProvider();
  });

  saveKeyBtn.addEventListener("click", async () => {
    const providerId = providerSelect.value;
    const spec = getProviderSpec(providerId);
    const rawKey = apiKeyInput.value.trim();
    const customUrl = customUrlInput.value.trim();

    const granted = await requestProviderOrigin(providerId, customUrl);
    if (!granted) {
      keyFeedback.dataset.kind = "err";
      keyFeedback.textContent = `Host permission declined for ${spec.name}.`;
      return;
    }

    if (providerId === "custom") {
      settings = await saveSettings({
        customBaseUrl: customUrl || "http://localhost:8000/v1",
        customEnabled: true,
        primaryProvider: "custom",
      });
      if (rawKey) await setApiKey("custom", rawKey);
    } else {
      if (!rawKey) {
        keyFeedback.dataset.kind = "err";
        keyFeedback.textContent = `Paste a ${spec.name} API key first.`;
        return;
      }
      await setApiKey(providerId, rawKey);
      settings = await saveSettings({ primaryProvider: providerId });
    }

    apiKeyInput.value = "";
    presenceMap = await getSavedKeyPresenceMap();
    renderQueueSummary();
    renderSelectedProvider();
    keyFeedback.dataset.kind = "ok";
    keyFeedback.textContent = syncProfile?.connected
      ? `${spec.name} saved locally & syncing to Neon…`
      : `${spec.name} saved and active in queue.`;

    if (syncProfile?.connected) {
      const syncRes = await sendRuntime({ type: RUNTIME_MESSAGE.SYNC_NOW });
      if (syncRes?.ok && syncRes.profile) {
        syncProfile = syncRes.profile;
        renderSyncStatus();
        keyFeedback.textContent = `${spec.name} saved & encrypted in Neon Postgres.`;
      }
    }
  });

  testKeyBtn.addEventListener("click", async () => {
    const providerId = providerSelect.value;
    const customUrl = customUrlInput.value.trim();
    await requestProviderOrigin(providerId, customUrl);

    testKeyBtn.disabled = true;
    keyFeedback.dataset.kind = "";
    keyFeedback.textContent = "Testing connection…";

    const res = await sendRuntime({
      type: RUNTIME_MESSAGE.TEST_PROVIDER,
      providerId,
      unsavedApiKey: apiKeyInput.value.trim(),
      customBaseUrl: customUrl,
    });

    testKeyBtn.disabled = false;
    if (res?.ok) {
      keyFeedback.dataset.kind = "ok";
      keyFeedback.textContent = `Verified ${res.providerName} (${res.latencyMs} ms).`;
    } else {
      keyFeedback.dataset.kind = "err";
      keyFeedback.textContent = res?.error || "Connection test failed.";
    }
  });

  popupSyncNowBtn?.addEventListener("click", async () => {
    popupSyncNowBtn.disabled = true;
    popupSyncNowBtn.textContent = "Syncing…";
    const res = await sendRuntime({ type: RUNTIME_MESSAGE.SYNC_NOW });
    popupSyncNowBtn.disabled = false;
    popupSyncNowBtn.textContent = "Sync Now";
    if (res?.ok && res.profile) {
      syncProfile = res.profile;
      [settings, presenceMap, cacheList] = await Promise.all([
        getSettings(),
        getSavedKeyPresenceMap(),
        getSubtitleCacheList(),
      ]);
      renderQueueSummary();
      renderSelectedProvider();
      renderSyncStatus();
      renderLastStatus();
      renderExportBar();
    } else if (res?.error) {
      popupSyncSummary.textContent = res.error;
    }
  });

  generateNowBtn.addEventListener("click", () => {
    if (!activeTabId) return;
    generateNowBtn.disabled = true;
    chrome.tabs.sendMessage(
      activeTabId,
      { type: RUNTIME_MESSAGE.TRIGGER_ACTIVE_VIDEO, force: true },
      (res) => {
        generateNowBtn.disabled = false;
        if (chrome.runtime.lastError || !res?.ok) {
          tabDescription.textContent =
            res?.error ||
            "Open a Video Overview in NotebookLM Studio and click again.";
          return;
        }
        tabDescription.textContent = `Transcribing "${res.title || "Video Overview"}"…`;
      }
    );
  });

  const bindExportButton = (btn, fmt) => {
    btn?.addEventListener("click", () => {
      const target = resolveExportTarget();
      if (!target) return;
      exportSubtitleEntry(target, fmt);
    });
  };
  bindExportButton(downloadLatestSrtBtn, "srt");
  bindExportButton(downloadLatestVttBtn, "vtt");
  bindExportButton(downloadLatestTxtBtn, "txt");
  bindExportButton(downloadLatestJsonBtn, "json");

  copyLatestTxtBtn?.addEventListener("click", async () => {
    const target = resolveExportTarget();
    if (!target) return;
    const txt = formatTxt(target.cues, {
      includeTimestamps: true,
      title: target.title,
    });
    try {
      await navigator.clipboard.writeText(txt);
      copyLatestTxtBtn.textContent = "Copied";
    } catch {
      exportSubtitleEntry(target, "txt");
      copyLatestTxtBtn.textContent = "Saved";
    }
    setTimeout(() => {
      copyLatestTxtBtn.textContent = "Copy";
    }, 1200);
  });

  try {
    chrome.storage?.onChanged?.addListener(async (changes, areaName) => {
      if (areaName !== "local") return;
      if (changes.subtitleCache || changes.lastStatus) {
        [lastStatus, cacheList] = await Promise.all([
          getLastStatus(),
          getSubtitleCacheList(),
        ]);
        renderLastStatus();
        renderExportBar();
      }
    });
  } catch {
    // Ignore
  }

  const openOptions = () => chrome.runtime.openOptionsPage();
  openQueueBtn.addEventListener("click", openOptions);
  openOptionsBtn.addEventListener("click", openOptions);
  popupOpenSyncBtn?.addEventListener("click", openOptions);
}

document.addEventListener("DOMContentLoaded", initPopup);
