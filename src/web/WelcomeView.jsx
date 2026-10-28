import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Collapsible, Switch, Tabs } from "radix-ui";
import { EXTERNAL_MESSAGE } from "../config/selectors.js";
import { listProviderSpecs } from "../lib/providers/registry.js";
import { BrandMark } from "./App.jsx";
import { trackDownload } from "../lib/downloads.js";

const EXT_ID_STORAGE_KEY = "lmsubs_connected_ext_id";
const SETUP_CHANNEL_NAME = "lmsubs_setup_sync";
const PROVIDERS = listProviderSpecs();

function PuzzleIcon({ size = 16 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M19.4 13a1.6 1.6 0 0 0 0-3.2h-1.4V6.8a1.8 1.8 0 0 0-1.8-1.8h-3v-1.4a1.6 1.6 0 0 0-3.2 0V5H7a1.8 1.8 0 0 0-1.8 1.8v3.1h1.3a1.7 1.7 0 0 1 0 3.4H5.2v3A1.8 1.8 0 0 0 7 18.1h3.1v-1.3a1.7 1.7 0 0 1 3.4 0v1.3h2.7a1.8 1.8 0 0 0 1.8-1.8V13h1.4Z" />
    </svg>
  );
}

function PinIcon({ size = 15, pinned = false }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={pinned ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M9 4h6l-1 6 3 3v2H7v-2l3-3-1-6Z" />
      <path d="M12 15v6" />
    </svg>
  );
}

function detectInitialOs() {
  if (typeof navigator === "undefined") return "mac";
  const ua = String(navigator.userAgent || "").toLowerCase();
  if (ua.includes("win")) return "windows";
  return "mac";
}

function readStoredExtId() {
  try {
    const params = new URLSearchParams(window.location.search);
    const fromQuery = (params.get("extId") || "").trim();
    if (/^[a-p]{32}$/.test(fromQuery)) {
      window.localStorage.setItem(EXT_ID_STORAGE_KEY, fromQuery);
      return fromQuery;
    }
    const saved = (window.localStorage.getItem(EXT_ID_STORAGE_KEY) || "").trim();
    return /^[a-p]{32}$/.test(saved) ? saved : "";
  } catch {
    return "";
  }
}

function sendExternalToExtension(extId, payload) {
  return new Promise((resolve) => {
    const runtime = globalThis.chrome?.runtime;
    if (!extId || !runtime || typeof runtime.sendMessage !== "function") {
      resolve({ ok: false, unavailable: true });
      return;
    }
    try {
      runtime.sendMessage(extId, payload, (res) => {
        const lastErr = globalThis.chrome?.runtime?.lastError;
        if (lastErr) {
          resolve({ ok: false, error: lastErr.message || "Extension unreachable" });
          return;
        }
        resolve(res || { ok: false });
      });
    } catch (err) {
      resolve({ ok: false, error: err?.message || String(err) });
    }
  });
}

export function ChromePuzzlePinDiagram({ verified = false }) {
  return (
    <div
      className="sheet"
      style={{
        padding: "16px 18px",
        background: "#FDFDFE",
        border: "1px solid var(--border-subtle)",
      }}
      aria-label="Chrome Extensions menu showing LM Subs at the top under Access requested"
    >
      {/* Simulated Chrome top-right toolbar strip */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "10px",
          padding: "7px 10px",
          borderRadius: "8px",
          background: "#EEF1F5",
          border: "1px solid #DCE1E8",
          marginBottom: "10px",
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "11.5px",
            color: "var(--ink-secondary)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          lm-subs.vercel.app/welcome
        </span>
        <div style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
          {verified ? (
            <span
              title="LM Subs pinned to toolbar"
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: "26px",
                height: "26px",
                borderRadius: "6px",
                background: "#FDFDFE",
                border: "1px solid #C8D1DC",
              }}
            >
              <BrandMark size={17} />
            </span>
          ) : null}
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "5px",
              padding: "4px 8px",
              borderRadius: "6px",
              background: "#0055D4",
              color: "#FDFDFE",
              fontSize: "11px",
              fontWeight: 600,
            }}
          >
            <PuzzleIcon size={14} />
            <span>Extensions</span>
          </span>
        </div>
      </div>

      {/* Simulated Chrome Extensions puzzle dropdown matching Chrome MV3 Access requested layout */}
      <div
        style={{
          borderRadius: "10px",
          border: "1px solid #D5DCE4",
          background: "#FDFDFE",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: "10px 14px 6px",
            fontSize: "13px",
            fontWeight: 700,
            color: "#111315",
            borderBottom: "1px solid #ECEFF3",
          }}
        >
          Extensions
        </div>

        <div style={{ padding: "10px 14px 12px", background: "#F6F9FE" }}>
          <div
            style={{
              fontSize: "11.5px",
              fontWeight: 700,
              color: "#0055D4",
              marginBottom: "2px",
            }}
          >
            Access requested
          </div>
          <div
            style={{
              fontSize: "11.5px",
              color: "#525866",
              marginBottom: "10px",
            }}
          >
            To give an extension access to this site, click it.
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "10px",
              padding: "8px 10px",
              borderRadius: "8px",
              background: "#FDFDFE",
              border: "1.5px solid #0055D4",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "9px" }}>
              <BrandMark size={22} />
              <div>
                <div style={{ fontSize: "13px", fontWeight: 700, color: "#111315" }}>
                  LM Subs
                </div>
                <div style={{ fontSize: "11px", color: "#525866" }}>
                  {verified
                    ? "Clicked and verified on this tab"
                    : "Listed first above your other extensions"}
                </div>
              </div>
            </div>

            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
                padding: "4px 9px",
                borderRadius: "999px",
                background: verified ? "#ECFDF3" : "#EBF2FF",
                color: verified ? "#067647" : "#0055D4",
                fontSize: "11.5px",
                fontWeight: 600,
              }}
            >
              <PinIcon size={13} pinned={verified} />
              <span>{verified ? "Pinned" : "Click pin"}</span>
            </span>
          </div>
        </div>

        <div
          style={{
            padding: "8px 14px 10px",
            borderTop: "1px solid #ECEFF3",
            color: "#6B7280",
            fontSize: "11.5px",
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: "4px" }}>
            No access needed
          </div>
          <div style={{ opacity: 0.72 }}>
            Other installed browser extensions stay grouped below
          </div>
        </div>
      </div>
    </div>
  );
}

export function WelcomeView({
  token,
  user,
  onNavigate,
  onOpenSignIn,
  onAuthenticated,
}) {
  const [osTab, setOsTab] = useState(detectInitialOs);
  const [extId, setExtId] = useState(readStoredExtId);
  const [manualExtId, setManualExtId] = useState("");
  const [manualIdOpen, setManualIdOpen] = useState(false);
  const [extState, setExtState] = useState(null);
  const [copiedChromeUrl, setCopiedChromeUrl] = useState(false);

  const [providerOpen, setProviderOpen] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState("groq");
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [savingKey, setSavingKey] = useState(false);
  const [keyStatus, setKeyStatus] = useState({ kind: "", text: "" });

  const [localCodeInput, setLocalCodeInput] = useState("");
  const [linkingCloud, setLinkingCloud] = useState(false);
  const [cloudStatus, setCloudStatus] = useState({ kind: "", text: "" });

  const queryFlags = useMemo(() => {
    try {
      const p = new URLSearchParams(window.location.search);
      return {
        installed: p.get("installed") === "1",
        downloading: p.get("downloading") === "1",
      };
    } catch {
      return { installed: false, downloading: false };
    }
  }, []);

  const pollExtensionHandshake = useCallback(async (targetId) => {
    if (!targetId) return;
    const res = await sendExternalToExtension(targetId, {
      type: EXTERNAL_MESSAGE.WEB_HANDSHAKE,
    });
    if (res?.ok) {
      setExtState(res);
      if (res.primaryProvider) {
        setSelectedProvider((prev) => prev || res.primaryProvider);
      }
    }
  }, []);

  // BroadcastChannel + storage sync so an existing /welcome?downloading=1 tab
  // automatically picks up extId when chrome.runtime.onInstalled opens /welcome?installed=1&extId=...
  useEffect(() => {
    let channel = null;
    try {
      if (typeof BroadcastChannel === "function") {
        channel = new BroadcastChannel(SETUP_CHANNEL_NAME);
        if (extId) {
          channel.postMessage({ type: "LMSUBS_EXT_READY", extId });
        }
        channel.onmessage = (event) => {
          const incoming = String(event?.data?.extId || "").trim();
          if (/^[a-p]{32}$/.test(incoming)) {
            try {
              window.localStorage.setItem(EXT_ID_STORAGE_KEY, incoming);
            } catch {
              // Ignore
            }
            setExtId(incoming);
          }
        };
      }
    } catch {
      // Ignore environments without BroadcastChannel
    }

    function onStorage(e) {
      if (e.key === EXT_ID_STORAGE_KEY && e.newValue && /^[a-p]{32}$/.test(e.newValue)) {
        setExtId(e.newValue);
      }
    }
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("storage", onStorage);
      try {
        channel?.close();
      } catch {
        // Ignore
      }
    };
  }, [extId]);

  useEffect(() => {
    if (!extId) return undefined;
    pollExtensionHandshake(extId);
    const timer = window.setInterval(() => {
      pollExtensionHandshake(extId);
    }, 1400);
    return () => window.clearInterval(timer);
  }, [extId, pollExtensionHandshake]);

  const isExtensionConnected = Boolean(extState?.ok);
  const isPinnedOrClicked = Boolean(
    (extState?.setupState?.popupOpenedCount || 0) > 0
  );
  const configuredProviders = extState?.configuredProviders || [];
  const hasAnyProviderKey = configuredProviders.length > 0;
  const activeSpec =
    PROVIDERS.find((p) => p.id === selectedProvider) || PROVIDERS[0];

  async function handleCopyExtensionsUrl() {
    try {
      await navigator.clipboard.writeText("chrome://extensions");
      setCopiedChromeUrl(true);
      setTimeout(() => setCopiedChromeUrl(false), 1800);
    } catch {
      // Ignore clipboard restriction
    }
  }

  async function handleConnectManualId(e) {
    e.preventDefault();
    const cleaned = manualExtId.trim().toLowerCase();
    if (!/^[a-p]{32}$/.test(cleaned)) {
      setKeyStatus({
        kind: "err",
        text: "Enter the 32-letter ID shown on LM Subs in chrome://extensions.",
      });
      return;
    }
    try {
      window.localStorage.setItem(EXT_ID_STORAGE_KEY, cleaned);
    } catch {
      // Ignore
    }
    setExtId(cleaned);
    await pollExtensionHandshake(cleaned);
  }

  async function handleSaveProviderKeyToExtension(e) {
    e.preventDefault();
    const trimmed = apiKeyInput.trim();
    if (!trimmed) {
      setKeyStatus({ kind: "err", text: "Paste an API key first." });
      return;
    }
    if (!extId || !isExtensionConnected) {
      setKeyStatus({
        kind: "err",
        text: "Load LM Subs in chrome://extensions first so this page can send the key directly.",
      });
      return;
    }
    setSavingKey(true);
    setKeyStatus({ kind: "", text: "Saving key directly to extension…" });
    const res = await sendExternalToExtension(extId, {
      type: EXTERNAL_MESSAGE.WEB_SAVE_PROVIDER_KEY,
      provider: selectedProvider,
      apiKey: trimmed,
      makePrimary: true,
    });
    setSavingKey(false);
    if (res?.ok) {
      setExtState(res);
      setApiKeyInput("");
      setKeyStatus({
        kind: "ok",
        text: `Saved ${activeSpec.name} key inside your Chrome extension.`,
      });
    } else {
      setKeyStatus({
        kind: "err",
        text: res?.error || "Could not reach extension.",
      });
    }
  }

  async function handleToggleExtensionPref(patch) {
    if (!extId || !isExtensionConnected) return;
    const res = await sendExternalToExtension(extId, {
      type: EXTERNAL_MESSAGE.WEB_UPDATE_SETUP_PREFS,
      preferences: patch,
    });
    if (res?.ok) {
      setExtState(res);
    }
  }

  async function handleOneClickLinkCloud() {
    if (!token) {
      onOpenSignIn?.();
      return;
    }
    if (!extId || !isExtensionConnected) {
      setCloudStatus({
        kind: "err",
        text: "Load the extension in Step 1 before linking your cloud account.",
      });
      return;
    }
    setLinkingCloud(true);
    setCloudStatus({ kind: "", text: "Generating extension session token…" });
    try {
      const res = await fetch("/api/auth/extension-token", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ label: "Welcome Setup Wizard" }),
      });
      const data = await res.json();
      if (!res.ok || !data?.token) {
        throw new Error(data?.error || "Could not create extension token.");
      }
      const extRes = await sendExternalToExtension(extId, {
        type: EXTERNAL_MESSAGE.WEB_CONNECT_CLOUD_TOKEN,
        token: data.token,
      });
      if (!extRes?.ok) {
        throw new Error(extRes?.error || "Extension rejected cloud token.");
      }
      setExtState(extRes);
      setCloudStatus({
        kind: "ok",
        text: `Connected extension to ${extRes.cloudEmail || user?.email || "your cloud account"}.`,
      });
    } catch (err) {
      setCloudStatus({
        kind: "err",
        text: err?.message || "Cloud link failed.",
      });
    } finally {
      setLinkingCloud(false);
    }
  }

  async function handleConnectLocalCode(e) {
    e.preventDefault();
    const code = localCodeInput.trim();
    if (!code) {
      setCloudStatus({ kind: "err", text: "Paste your lms_ local code first." });
      return;
    }
    if (extId && isExtensionConnected) {
      setLinkingCloud(true);
      const extRes = await sendExternalToExtension(extId, {
        type: EXTERNAL_MESSAGE.WEB_CONNECT_CLOUD_TOKEN,
        token: code,
      });
      setLinkingCloud(false);
      if (extRes?.ok) {
        setExtState(extRes);
        setLocalCodeInput("");
        setCloudStatus({
          kind: "ok",
          text: `Connected extension to ${extRes.cloudEmail || "cloud sync"}.`,
        });
        return;
      }
    }
    // Also verify on web session if not signed in
    try {
      const meRes = await fetch("/api/auth/me", {
        headers: { Authorization: `Bearer ${code}` },
      });
      const meJson = await meRes.json();
      if (meRes.ok && meJson?.user) {
        onAuthenticated?.({ token: code, user: meJson.user });
        setLocalCodeInput("");
        setCloudStatus({
          kind: "ok",
          text: `Signed in as ${meJson.user.email}.`,
        });
      } else {
        setCloudStatus({
          kind: "err",
          text: meJson?.error || "Invalid or expired local code.",
        });
      }
    } catch {
      setCloudStatus({ kind: "err", text: "Could not verify local code." });
    }
  }

  const completedStepsCount =
    (isExtensionConnected ? 1 : 0) +
    (isPinnedOrClicked ? 1 : 0) +
    (hasAnyProviderKey ? 1 : 0);

  return (
    <div className="page-wrap">
      {/* Header + Live Two-Way Extension Link Banner */}
      <section className="section-block" style={{ paddingTop: 0 }}>
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: "20px",
            flexWrap: "wrap",
          }}
        >
          <div style={{ maxWidth: "680px" }}>
            <h1
              className="hero-title"
              style={{
                fontSize: "clamp(28px, 3.6vw, 40px)",
                textAlign: "left",
                marginBottom: "10px",
              }}
            >
              {queryFlags.installed || isExtensionConnected
                ? "LM Subs is installed. Finish setup below."
                : "Interactive LM Subs setup"}
            </h1>
            <p
              className="section-prose"
              style={{ fontSize: "16.5px", marginBottom: 0, maxWidth: "64ch" }}
            >
              {isExtensionConnected
                ? "This page is connected directly to your Chrome extension. Pin LM Subs from the top of your Extensions menu, save a free transcription key, and choose your Video and Audio Overview preferences."
                : queryFlags.downloading
                  ? "Your lm-subs-v0.2.8.zip download has started. Unzip and load the folder in Chrome below, and this setup guide will connect to the extension automatically."
                  : "Download and load LM Subs in Chrome. As soon as the extension loads, this page connects two-way so you can configure keys and preferences live."}
            </p>
          </div>

          <div
            className="sheet"
            style={{
              padding: "14px 18px",
              minWidth: "270px",
              borderColor: isExtensionConnected ? "#0055D4" : "var(--border-subtle)",
            }}
            aria-live="polite"
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "10px",
                marginBottom: "6px",
              }}
            >
              <span style={{ fontSize: "12.5px", fontWeight: 700, color: "var(--ink)" }}>
                Extension bridge
              </span>
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "11.5px",
                  fontWeight: 600,
                  padding: "2px 8px",
                  borderRadius: "999px",
                  background: isExtensionConnected ? "#ECFDF3" : "#F2F4F7",
                  color: isExtensionConnected ? "#067647" : "#525866",
                }}
              >
                {isExtensionConnected
                  ? `Connected v${extState.version || "0.2.8"}`
                  : "Waiting for install"}
              </span>
            </div>
            <div style={{ fontSize: "12.5px", color: "var(--ink-secondary)" }}>
              {isExtensionConnected
                ? `${completedStepsCount} of 3 setup checkpoints verified live`
                : "Listening automatically for Chrome extension handshake"}
            </div>
          </div>
        </div>
      </section>

      {/* Step 1: Download & Load in Chrome (auto-checks when extension connects!) */}
      <section className="section-block">
        <div className="split-section">
          <div>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                fontFamily: "var(--font-mono)",
                fontSize: "12px",
                fontWeight: 600,
                color: isExtensionConnected ? "#067647" : "var(--accent)",
                marginBottom: "8px",
              }}
            >
              <span>Step 1 of 4</span>
              <span>
                {isExtensionConnected ? "(Completed live)" : "(Install extension)"}
              </span>
            </div>
            <h2 className="section-heading">
              {isExtensionConnected
                ? "Extension loaded and communicating with this page"
                : "Unzip lm-subs-v0.2.8.zip and load it in Chrome"}
            </h2>
            <p className="section-prose">
              {isExtensionConnected
                ? "Chrome loaded LM Subs and established a two-way handshake with this setup tab. Continue to Step 2 to pin the toolbar icon."
                : "Extract lm-subs-v0.2.8.zip into a permanent folder such as Documents, open chrome://extensions, turn on Developer mode, and click Load unpacked."}
            </p>

            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginTop: "16px" }}>
              <a
                className="btn btn-primary"
                href="/releases/lm-subs-v0.2.8.zip"
                download
                onClick={() => trackDownload({ source: "welcome" })}
              >
                Download lm-subs-v0.2.8.zip
              </a>
              <button
                type="button"
                className="btn"
                onClick={handleCopyExtensionsUrl}
              >
                {copiedChromeUrl ? "Copied chrome://extensions" : "Copy chrome://extensions"}
              </button>
            </div>

            {!isExtensionConnected ? (
              <Collapsible.Root
                open={manualIdOpen}
                onOpenChange={setManualIdOpen}
                style={{ marginTop: "14px" }}
              >
                <Collapsible.Trigger asChild>
                  <button type="button" className="btn btn-sm">
                    {manualIdOpen
                      ? "Hide manual extension ID link"
                      : "Already installed? Link by extension ID"}
                  </button>
                </Collapsible.Trigger>
                <Collapsible.Content style={{ marginTop: "10px" }}>
                  <form
                    onSubmit={handleConnectManualId}
                    style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}
                  >
                    <label
                      htmlFor="welcome-ext-id-input"
                      style={{ position: "absolute", left: "-9999px" }}
                    >
                      Chrome extension ID
                    </label>
                    <input
                      id="welcome-ext-id-input"
                      type="text"
                      className="form-input form-input-mono"
                      style={{ maxWidth: "300px" }}
                      placeholder="32-letter Chrome extension id"
                      value={manualExtId}
                      onChange={(e) => setManualExtId(e.target.value)}
                      spellCheck={false}
                      autoComplete="off"
                    />
                    <button type="submit" className="btn btn-sm btn-ink">
                      Connect
                    </button>
                  </form>
                </Collapsible.Content>
              </Collapsible.Root>
            ) : null}
          </div>

          <div>
            <Tabs.Root value={osTab} onValueChange={setOsTab}>
              <Tabs.List className="radix-tabs-list" aria-label="Operating system instructions">
                <Tabs.Trigger className="radix-tabs-trigger" value="mac">
                  macOS
                </Tabs.Trigger>
                <Tabs.Trigger className="radix-tabs-trigger" value="windows">
                  Windows
                </Tabs.Trigger>
              </Tabs.List>

              <Tabs.Content value="mac" className="sheet" style={{ padding: "18px 20px", marginTop: "12px" }}>
                <ol style={{ margin: 0, paddingLeft: "20px", display: "grid", gap: "8px", color: "var(--ink-secondary)", fontSize: "14px" }}>
                  <li>Double-click <code style={{ fontFamily: "var(--font-mono)" }}>lm-subs-v0.2.8.zip</code> in Finder and move the extracted folder to <strong style={{ color: "var(--ink)" }}>Documents</strong>.</li>
                  <li>Paste <code style={{ fontFamily: "var(--font-mono)" }}>chrome://extensions</code> into a new tab address bar and press <strong style={{ color: "var(--ink)" }}>Return</strong>.</li>
                  <li>Switch on <strong style={{ color: "var(--ink)" }}>Developer mode</strong> (top right), click <strong style={{ color: "var(--ink)" }}>Load unpacked</strong>, and choose the extracted folder.</li>
                </ol>
              </Tabs.Content>

              <Tabs.Content value="windows" className="sheet" style={{ padding: "18px 20px", marginTop: "12px" }}>
                <ol style={{ margin: 0, paddingLeft: "20px", display: "grid", gap: "8px", color: "var(--ink-secondary)", fontSize: "14px" }}>
                  <li>Right-click <code style={{ fontFamily: "var(--font-mono)" }}>lm-subs-v0.2.8.zip</code> in File Explorer and choose <strong style={{ color: "var(--ink)" }}>Extract All...</strong> into <strong style={{ color: "var(--ink)" }}>Documents</strong>.</li>
                  <li>Paste <code style={{ fontFamily: "var(--font-mono)" }}>chrome://extensions</code> into a new tab address bar and press <strong style={{ color: "var(--ink)" }}>Enter</strong>.</li>
                  <li>Switch on <strong style={{ color: "var(--ink)" }}>Developer mode</strong> (top right), click <strong style={{ color: "var(--ink)" }}>Load unpacked</strong>, and select that extracted folder.</li>
                </ol>
              </Tabs.Content>
            </Tabs.Root>
          </div>
        </div>
      </section>

      {/* Step 2: Top-of-Menu "Access requested" Puzzle Pinning UX */}
      <section className="section-block">
        <div className="split-section">
          <div>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                fontFamily: "var(--font-mono)",
                fontSize: "12px",
                fontWeight: 600,
                color: isPinnedOrClicked ? "#067647" : "var(--accent)",
                marginBottom: "8px",
              }}
            >
              <span>Step 2 of 4</span>
              <span>
                {isPinnedOrClicked
                  ? "(Verified live)"
                  : "(Pin from top of puzzle menu)"}
              </span>
            </div>
            <h2 className="section-heading">
              Click the puzzle icon and pin LM Subs from Access requested
            </h2>
            <p className="section-prose">
              Even if you have dozens of browser extensions installed, Chrome places <strong style={{ color: "var(--ink)" }}>LM Subs</strong> at the top of the puzzle menu on this welcome page under <strong style={{ color: "var(--ink)" }}>Access requested</strong> so you do not have to scroll to find it.
            </p>
            <ol
              style={{
                margin: "14px 0 0",
                paddingLeft: "20px",
                display: "grid",
                gap: "9px",
                color: "var(--ink-secondary)",
                fontSize: "14.5px",
              }}
            >
              <li>
                Click the <strong style={{ color: "var(--ink)" }}>Extensions puzzle icon</strong> in the top-right corner of Chrome.
              </li>
              <li>
                Look at the top <strong style={{ color: "var(--ink)" }}>Access requested</strong> group and click the <strong style={{ color: "var(--ink)" }}>Pin</strong> icon beside <strong style={{ color: "var(--ink)" }}>LM Subs</strong>.
              </li>
              <li>
                Click the pinned <strong style={{ color: "var(--ink)" }}>LM Subs</strong> icon once to verify your toolbar connection live on this page.
              </li>
            </ol>
          </div>

          <ChromePuzzlePinDiagram verified={isPinnedOrClicked} />
        </div>
      </section>

      {/* Step 3: Two-Way BYOK API Key Setup (Collapsible Providers) */}
      <section className="section-block">
        <div className="split-section">
          <div>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                fontFamily: "var(--font-mono)",
                fontSize: "12px",
                fontWeight: 600,
                color: hasAnyProviderKey ? "#067647" : "var(--accent)",
                marginBottom: "8px",
              }}
            >
              <span>Step 3 of 4</span>
              <span>
                {hasAnyProviderKey
                  ? `(Configured: ${configuredProviders.join(", ")})`
                  : "(Add free transcription key)"}
              </span>
            </div>
            <h2 className="section-heading">
              Send your free transcription key directly to the extension
            </h2>
            <p className="section-prose">
              Create a free Groq API key (no credit card required) or choose any of the twelve supported speech-to-text providers. Saving below transmits the key directly into your local Chrome extension storage.
            </p>
            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginTop: "14px" }}>
              <a
                className="btn btn-sm btn-ink"
                href={activeSpec.keyUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                Open {activeSpec.name} key console
              </a>
            </div>
          </div>

          <div className="sheet" style={{ padding: "20px 22px" }}>
            <form onSubmit={handleSaveProviderKeyToExtension} style={{ display: "grid", gap: "12px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px", flexWrap: "wrap" }}>
                <div>
                  <div style={{ fontSize: "13px", fontWeight: 700, color: "var(--ink)" }}>
                    Active provider: {activeSpec.name}
                  </div>
                  <div style={{ fontSize: "12px", color: "var(--ink-secondary)" }}>
                    Model: <code style={{ fontFamily: "var(--font-mono)" }}>{activeSpec.defaultModel}</code>
                  </div>
                </div>

                <Collapsible.Root open={providerOpen} onOpenChange={setProviderOpen}>
                  <Collapsible.Trigger asChild>
                    <button type="button" className="btn btn-sm">
                      {providerOpen ? "Collapse providers" : "Switch provider (12)"}
                    </button>
                  </Collapsible.Trigger>
                </Collapsible.Root>
              </div>

              {providerOpen ? (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(135px, 1fr))",
                    gap: "6px",
                    padding: "10px",
                    borderRadius: "8px",
                    background: "var(--canvas)",
                    border: "1px solid var(--border-subtle)",
                  }}
                >
                  {PROVIDERS.map((p) => {
                    const isConfigured = configuredProviders.includes(p.id);
                    const isSelected = p.id === selectedProvider;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        className="btn btn-sm"
                        style={{
                          justifyContent: "space-between",
                          borderColor: isSelected ? "var(--accent)" : undefined,
                          fontWeight: isSelected ? 700 : 500,
                        }}
                        onClick={() => {
                          setSelectedProvider(p.id);
                          setProviderOpen(false);
                        }}
                      >
                        <span>{p.name}</span>
                        {isConfigured ? (
                          <span style={{ color: "#067647", fontSize: "10.5px" }}>Saved</span>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              ) : null}

              <div>
                <label
                  htmlFor="welcome-provider-key-input"
                  style={{
                    display: "block",
                    fontSize: "12.5px",
                    fontWeight: 600,
                    marginBottom: "6px",
                    color: "var(--ink)",
                  }}
                >
                  {activeSpec.name} API key
                </label>
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  <input
                    id="welcome-provider-key-input"
                    type="password"
                    className="form-input form-input-mono"
                    style={{ flex: 1, minWidth: "210px" }}
                    placeholder={activeSpec.placeholder || "gsk_..."}
                    value={apiKeyInput}
                    onChange={(e) => setApiKeyInput(e.target.value)}
                    spellCheck={false}
                    autoComplete="off"
                  />
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={savingKey}
                  >
                    {savingKey ? "Saving…" : "Save key to extension"}
                  </button>
                </div>
              </div>

              {keyStatus.text ? (
                <div
                  role="status"
                  style={{
                    fontSize: "12.5px",
                    color:
                      keyStatus.kind === "err"
                        ? "#B42318"
                        : keyStatus.kind === "ok"
                          ? "#067647"
                          : "var(--ink-secondary)",
                  }}
                >
                  {keyStatus.text}
                </div>
              ) : null}
            </form>
          </div>
        </div>
      </section>

      {/* Step 4: Live Video + Audio Overview Preferences & Cloud Sync */}
      <section className="section-block">
        <div className="split-section">
          <div>
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "12px",
                fontWeight: 600,
                color: "var(--accent)",
                marginBottom: "8px",
              }}
            >
              Step 4 of 4
            </div>
            <h2 className="section-heading">
              Choose Video and Audio Overview preferences, then open NotebookLM
            </h2>
            <p className="section-prose">
              LM Subs captions both <strong style={{ color: "var(--ink)" }}>Video Overviews</strong> and two-host <strong style={{ color: "var(--ink)" }}>Audio Overviews</strong> (podcasts). Toggle your live preferences on the right or connect optional encrypted cloud sync.
            </p>
            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginTop: "18px" }}>
              <a
                className="btn btn-primary"
                href="https://notebooklm.google.com/"
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => {
                  if (extId && isExtensionConnected) {
                    sendExternalToExtension(extId, {
                      type: EXTERNAL_MESSAGE.WEB_UPDATE_SETUP_PREFS,
                      preferences: {},
                      completedSetup: true,
                    });
                  }
                }}
              >
                Open Google NotebookLM
              </a>
              <button
                type="button"
                className="btn"
                onClick={() => onNavigate?.("overview")}
              >
                Back to product overview
              </button>
            </div>
          </div>

          <div style={{ display: "grid", gap: "14px" }}>
            <div className="sheet" style={{ padding: "18px 20px", display: "grid", gap: "12px" }}>
              {[
                {
                  id: "welcome-sw-video",
                  label: "Caption Video Overviews automatically",
                  desc: "Generates synchronized inside-frame captions when you play a Studio Video Overview.",
                  checked: extState?.settings?.autoOnExistingVideos !== false,
                  onToggle: (val) =>
                    handleToggleExtensionPref({
                      autoOnGenerate: val,
                      autoOnExistingVideos: val,
                    }),
                },
                {
                  id: "welcome-sw-audio",
                  label: "Caption Audio Overviews and podcasts",
                  desc: "Mounts the compact podcast caption dock and searchable transcript drawer on Studio Audio Overviews.",
                  checked: extState?.settings?.autoOnAudioOverviews !== false,
                  onToggle: (val) =>
                    handleToggleExtensionPref({ autoOnAudioOverviews: val }),
                },
                {
                  id: "welcome-sw-highlight",
                  label: "Spoken-word highlight",
                  desc: "Highlights the active word as each sentence is spoken.",
                  checked: extState?.settings?.karaokeHighlight !== false,
                  onToggle: (val) =>
                    handleToggleExtensionPref({ karaokeHighlight: val }),
                },
                {
                  id: "welcome-sw-sound",
                  label: "Completion sound chime",
                  desc: "Plays a gentle acoustic chime when background transcription finishes.",
                  checked: Boolean(extState?.settings?.soundAlerts),
                  onToggle: (val) =>
                    handleToggleExtensionPref({ soundAlerts: val }),
                },
              ].map((item) => (
                <div
                  key={item.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "12px",
                  }}
                >
                  <div>
                    <label
                      htmlFor={item.id}
                      style={{
                        fontSize: "13.5px",
                        fontWeight: 600,
                        color: "var(--ink)",
                        cursor: "pointer",
                      }}
                    >
                      {item.label}
                    </label>
                    <div style={{ fontSize: "12px", color: "var(--ink-secondary)" }}>
                      {item.desc}
                    </div>
                  </div>
                  <Switch.Root
                    id={item.id}
                    className="radix-switch-root"
                    checked={item.checked}
                    disabled={!isExtensionConnected}
                    onCheckedChange={item.onToggle}
                  >
                    <Switch.Thumb className="radix-switch-thumb" />
                  </Switch.Root>
                </div>
              ))}
            </div>

            {/* Optional Cloud Link + Always-Open Local Sign-In Code Box */}
            <div className="sheet" style={{ padding: "18px 20px", display: "grid", gap: "10px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px", flexWrap: "wrap" }}>
                <div>
                  <div style={{ fontSize: "13.5px", fontWeight: 700, color: "var(--ink)" }}>
                    Optional encrypted cloud sync
                  </div>
                  <div style={{ fontSize: "12px", color: "var(--ink-secondary)" }}>
                    {extState?.cloudLinked
                      ? `Linked in extension as ${extState.cloudEmail}`
                      : user
                        ? `Signed in on web as ${user.email}`
                        : "Sync transcripts and AES-256-GCM encrypted keys across browsers"}
                  </div>
                </div>
                <button
                  type="button"
                  className="btn btn-sm btn-ink"
                  disabled={linkingCloud}
                  onClick={handleOneClickLinkCloud}
                >
                  {user ? "Link account to extension" : "Sign in"}
                </button>
              </div>

              <form onSubmit={handleConnectLocalCode} style={{ display: "grid", gap: "6px" }}>
                <label
                  htmlFor="welcome-local-code-input"
                  style={{ fontSize: "12px", fontWeight: 600, color: "var(--ink)" }}
                >
                  Local sign-in code
                </label>
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  <input
                    id="welcome-local-code-input"
                    type="text"
                    className="form-input form-input-mono"
                    style={{ flex: 1, minWidth: "200px" }}
                    placeholder="Paste lms_... local code"
                    value={localCodeInput}
                    onChange={(e) => setLocalCodeInput(e.target.value)}
                    spellCheck={false}
                    autoComplete="one-time-code"
                  />
                  <button type="submit" className="btn btn-sm" disabled={linkingCloud}>
                    Connect code
                  </button>
                </div>
              </form>

              {cloudStatus.text ? (
                <div
                  role="status"
                  style={{
                    fontSize: "12px",
                    color: cloudStatus.kind === "err" ? "#B42318" : "#067647",
                  }}
                >
                  {cloudStatus.text}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
