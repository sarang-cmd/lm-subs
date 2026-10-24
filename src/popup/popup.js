/**
 * Extension Toolbar Popup (`src/popup/popup.js` -> `extension/popup.js`).
 *
 * Security invariants:
 * - Never reads raw API keys (`getSavedKeyPresenceMap` returns booleans only).
 * - Requests optional host permissions directly inside user click gestures.
 */

import { NOTEBOOKLM_HOSTS, RUNTIME_MESSAGE } from "../config/selectors.js";
import {
  getProviderOriginPattern,
  getProviderSpec,
  listProviderSpecs,
} from "../lib/providers/registry.js";
import {
  getLastStatus,
  getSavedKeyPresenceMap,
  getSettings,
  getSubtitleCacheList,
  saveSettings,
  setApiKey,
} from "../lib/storage.js";
import { formatSrt } from "../lib/subtitles.js";
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

function downloadSrtFile(title, cues) {
  const srt = formatSrt(cues);
  const blob = new Blob([srt], { type: "application/x-subrip;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const slug = String(title || "video-overview")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  a.href = url;
  a.download = `${slug || "video-overview"}.srt`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
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
  const tabBadge = document.getElementById("tab-badge");
  const tabDescription = document.getElementById("tab-description");
  const generateNowBtn = document.getElementById("generate-now-btn");
  const downloadLatestSrtBtn = document.getElementById("download-latest-srt-btn");
  const lastStatusCard = document.getElementById("last-status-card");
  const lastStatusBadge = document.getElementById("last-status-badge");
  const lastStatusTitle = document.getElementById("last-status-title");
  const lastStatusMeta = document.getElementById("last-status-meta");

  const specs = listProviderSpecs();
  for (const spec of specs) {
    const opt = document.createElement("option");
    opt.value = spec.id;
    opt.textContent = `${spec.name} — ${spec.badge}`;
    providerSelect.appendChild(opt);
  }

  let [settings, presenceMap, lastStatus, cacheList] = await Promise.all([
    getSettings(),
    getSavedKeyPresenceMap(),
    getLastStatus(),
    getSubtitleCacheList(),
  ]);

  let activeTabId = null;

  function renderQueueSummary() {
    const activeIds = settings.queueOrder.filter((id) =>
      id === "custom" ? settings.customEnabled : presenceMap[id]
    );
    if (activeIds.length === 0) {
      queueSummaryText.textContent = "Add Groq or Mistral key below";
    } else {
      queueSummaryText.textContent = activeIds
        .slice(0, 3)
        .map((id, i) => `#${i + 1} ${getProviderSpec(id).name.split(" ")[0]}`)
        .join(" → ");
    }
  }

  function renderSelectedProvider() {
    const selectedId = providerSelect.value;
    const spec = getProviderSpec(selectedId);
    providerTierHint.textContent = spec.freeTierSummary;
    apiKeyInput.placeholder = spec.keyPlaceholder;
    getKeyLink.href = spec.keyUrl;
    getKeyLink.textContent =
      spec.id === "custom" ? "Local server docs ↗" : "Get free key ↗";

    customUrlField.style.display = spec.id === "custom" ? "block" : "none";
    customUrlInput.value = settings.customBaseUrl || "";

    const isConfigured =
      spec.id === "custom" ? settings.customEnabled : Boolean(presenceMap[spec.id]);
    if (isConfigured) {
      keyPresenceBadge.textContent = spec.id === "custom" ? "Enabled" : "Key saved";
      keyPresenceBadge.className = "badge badge-saved";
    } else {
      keyPresenceBadge.textContent = "Not set";
      keyPresenceBadge.className = "badge";
    }
    keyFeedback.textContent = "";
    keyFeedback.dataset.kind = "";
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
      const ratioPart =
        lastStatus.originalBytes && lastStatus.extractedBytes
          ? ` · ${(lastStatus.originalBytes / 1048576).toFixed(1)} MB → ${(
              lastStatus.extractedBytes / 1048576
            ).toFixed(1)} MB`
          : "";
      lastStatusMeta.textContent = `${lastStatus.cueCount || 0} cues${ratioPart}`;
    } else if (lastStatus.state === "working") {
      lastStatusBadge.textContent = "Working";
      lastStatusBadge.className = "badge badge-warn";
      lastStatusMeta.textContent = lastStatus.message || "Transcribing…";
    } else {
      lastStatusBadge.textContent = "Error";
      lastStatusBadge.className = "badge badge-err";
      lastStatusMeta.textContent = lastStatus.message || "Failed";
    }

    if (cacheList.length > 0 && cacheList[0]?.cues?.length > 0) {
      downloadLatestSrtBtn.style.display = "inline-flex";
      downloadLatestSrtBtn.onclick = () =>
        downloadSrtFile(cacheList[0].title, cacheList[0].cues);
    }
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
      tabBadge.textContent = "Not on NotebookLM";
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
          tabBadge.textContent = "NotebookLM open";
          tabBadge.className = "badge";
          tabDescription.textContent =
            "Reload the NotebookLM tab once if you just installed the extension.";
          generateNowBtn.disabled = false;
          return;
        }

        if (state.hasVideoElement || state.readyArtifactCount > 0) {
          tabBadge.textContent = `${Math.max(1, state.readyArtifactCount)} Video ready`;
          tabBadge.className = "badge badge-saved";
          tabDescription.textContent = state.activeArtifact?.title
            ? `Ready: "${state.activeArtifact.title}"`
            : "Video Overview detected and ready for captioning.";
          generateNowBtn.disabled = false;
        } else if (state.generatingCount > 0) {
          tabBadge.textContent = "Rendering video…";
          tabBadge.className = "badge badge-warn";
          tabDescription.textContent =
            "Video Overview is currently rendering — subtitles will start automatically.";
          generateNowBtn.disabled = true;
        } else {
          tabBadge.textContent = "No video yet";
          tabBadge.className = "badge";
          tabDescription.textContent =
            "Click Video Overview in NotebookLM Studio to generate a captioned overview.";
          generateNowBtn.disabled = false;
        }
      }
    );
  }

  enabledToggle.checked = settings.enabled;
  providerSelect.value = settings.primaryProvider || "groq";
  renderQueueSummary();
  renderSelectedProvider();
  renderLastStatus();
  inspectActiveTab();

  enabledToggle.addEventListener("change", async () => {
    settings = await saveSettings({ enabled: enabledToggle.checked });
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
    keyFeedback.textContent = `${spec.name} saved and active in queue.`;
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
      keyFeedback.textContent = `Connected to ${res.providerName} (${res.latencyMs} ms).`;
    } else {
      keyFeedback.dataset.kind = "err";
      keyFeedback.textContent = res?.error || "Connection test failed.";
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

  const openOptions = () => chrome.runtime.openOptionsPage();
  openQueueBtn.addEventListener("click", openOptions);
  openOptionsBtn.addEventListener("click", openOptions);
}

document.addEventListener("DOMContentLoaded", initPopup);
