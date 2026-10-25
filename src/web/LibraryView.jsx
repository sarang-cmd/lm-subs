import React, { useMemo, useState } from "react";
import { Dialog, DropdownMenu, Switch } from "radix-ui";
import { listProviderSpecs } from "../lib/providers/registry.js";
import { formatTxt, serializeSubtitles } from "../lib/subtitles.js";
import { AuthCard } from "./AuthDialog.jsx";

const PROVIDERS = listProviderSpecs().filter((p) => p.id !== "custom");

export function SyncPreferencesSwitches({
  syncPreferences,
  onToggleCategory,
  disabled = false,
}) {
  return (
    <div role="group" aria-label="What to sync with your LM Subs account">
      <div className="switch-row">
        <div>
          <label className="switch-label" htmlFor="switch-sync-keys">
            Sync encrypted API keys
          </label>
          <div className="switch-desc">
            Encrypts your speech-to-text API keys with per-user HKDF-SHA256 and AES-256-GCM before storing them in Postgres.
          </div>
        </div>
        <Switch.Root
          id="switch-sync-keys"
          className="radix-switch-root"
          checked={Boolean(syncPreferences.syncApiKeys)}
          disabled={disabled}
          onCheckedChange={(checked) => onToggleCategory("syncApiKeys", checked)}
        >
          <Switch.Thumb className="radix-switch-thumb" />
        </Switch.Root>
      </div>

      <div className="switch-row">
        <div>
          <label className="switch-label" htmlFor="switch-sync-transcripts">
            Sync Video Overview transcriptions
          </label>
          <div className="switch-desc">
            Stores generated caption cues so opening the same NotebookLM video on another computer loads captions immediately.
          </div>
        </div>
        <Switch.Root
          id="switch-sync-transcripts"
          className="radix-switch-root"
          checked={Boolean(syncPreferences.syncTranscripts)}
          disabled={disabled}
          onCheckedChange={(checked) =>
            onToggleCategory("syncTranscripts", checked)
          }
        >
          <Switch.Thumb className="radix-switch-thumb" />
        </Switch.Root>
      </div>

      <div className="switch-row">
        <div>
          <label className="switch-label" htmlFor="switch-sync-settings">
            Sync caption and queue preferences
          </label>
          <div className="switch-desc">
            Keeps your provider failover order, default language hint, and caption font size consistent everywhere.
          </div>
        </div>
        <Switch.Root
          id="switch-sync-settings"
          className="radix-switch-root"
          checked={Boolean(syncPreferences.syncSettings)}
          disabled={disabled}
          onCheckedChange={(checked) =>
            onToggleCategory("syncSettings", checked)
          }
        >
          <Switch.Thumb className="radix-switch-thumb" />
        </Switch.Root>
      </div>
    </div>
  );
}

export function LibraryView({
  token,
  user,
  cloudState,
  loadingCloud,
  oauthNotice,
  onAuthenticated,
  onSignOut,
  onRefreshCloud,
  onUpdateSyncPreferences,
  onNavigate,
}) {
  const [selectedProvider, setSelectedProvider] = useState("groq");
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [keyBusy, setKeyBusy] = useState(false);
  const [keyNotice, setKeyNotice] = useState("");
  const [keyError, setKeyError] = useState("");

  const [extTokenText, setExtTokenText] = useState("");
  const [extTokenCopied, setExtTokenCopied] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [expandedKey, setExpandedKey] = useState(null);
  const [copiedKey, setCopiedKey] = useState(null);

  const [confirmDisableModal, setConfirmDisableModal] = useState(null);
  const [confirmDeleteTranscript, setConfirmDeleteTranscript] = useState(null);

  const syncPrefs = cloudState?.syncPreferences || {
    syncApiKeys: true,
    syncTranscripts: true,
    syncSettings: true,
  };

  const filteredSubtitles = useMemo(() => {
    const list = cloudState?.subtitles || [];
    const q = searchQuery.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (s) =>
        String(s.title || "")
          .toLowerCase()
          .includes(q) ||
        String(s.provider || "")
          .toLowerCase()
          .includes(q) ||
        String(s.language || "")
          .toLowerCase()
          .includes(q)
    );
  }, [cloudState?.subtitles, searchQuery]);

  if (!token || !user) {
    return (
      <div className="page-wrap">
        <div
          className="section-block"
          style={{ maxWidth: "520px", margin: "0 auto" }}
        >
          <h1 className="section-heading">Cloud library and sync</h1>
          <p className="section-prose">
            Sign in with Google, GitHub, or a 6-digit email code to manage your encrypted API keys, choose which categories sync, and download your NotebookLM Video Overview transcripts.
          </p>
          <AuthCard
            oauthNotice={oauthNotice}
            redirectAfter="/library"
            onAuthenticated={onAuthenticated}
          />
        </div>
      </div>
    );
  }

  function handleRequestToggleCategory(category, checked) {
    if (!checked) {
      const hasStoredKeys =
        category === "syncApiKeys" &&
        Object.keys(cloudState?.keyHints || {}).length > 0;
      const hasStoredSubs =
        category === "syncTranscripts" &&
        (cloudState?.subtitles?.length || 0) > 0;
      if (hasStoredKeys || hasStoredSubs) {
        setConfirmDisableModal({ category });
        return;
      }
    }
    onUpdateSyncPreferences({ [category]: checked }, false);
  }

  async function handleSaveKey(e) {
    e.preventDefault();
    setKeyError("");
    setKeyNotice("");
    const trimmed = apiKeyInput.trim();
    if (!trimmed) {
      setKeyError("Paste an API key before saving.");
      return;
    }
    if (!syncPrefs.syncApiKeys) {
      setKeyError("Enable Sync encrypted API keys above before storing keys in the cloud.");
      return;
    }
    setKeyBusy(true);
    try {
      const res = await fetch("/api/sync/push", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          apiKeys: { [selectedProvider]: trimmed },
        }),
      });
      const data = await res.json();
      if (!res.ok || !data?.ok) {
        setKeyError(data?.error || "Could not store encrypted key.");
        return;
      }
      setApiKeyInput("");
      setKeyNotice(`Encrypted and stored ${selectedProvider} key.`);
      await onRefreshCloud();
    } catch {
      setKeyError("Network error while saving API key.");
    } finally {
      setKeyBusy(false);
    }
  }

  async function handleRemoveKey(providerId) {
    setKeyBusy(true);
    try {
      await fetch("/api/sync/push", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ deletedProviders: [providerId] }),
      });
      await onRefreshCloud();
    } finally {
      setKeyBusy(false);
    }
  }

  async function handleMintExtensionToken() {
    const res = await fetch("/api/auth/extension-token", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (res.ok && data?.token) {
      setExtTokenText(data.token);
      try {
        await navigator.clipboard.writeText(data.token);
        setExtTokenCopied(true);
        window.setTimeout(() => setExtTokenCopied(false), 2000);
      } catch {
        // Fallback displays the token input for manual copy
      }
    }
  }

  async function handleExportTranscript(sub, format) {
    const serialized = serializeSubtitles(sub.cues || [], format, {
      title: sub.title,
      language: sub.language || "en",
      provider: sub.provider,
      model: sub.model,
      artifactId: sub.artifactId,
    });
    const blob = new Blob(["\uFEFF", serialized.content], {
      type: serialized.mimeType,
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = serialized.filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 3000);

    fetch("/api/stats/event", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        eventType: "export",
        cacheKey: sub.cacheKey,
        provider: sub.provider,
        language: sub.language,
        format,
        cueCount: sub.cues?.length || 0,
      }),
    }).catch(() => {});
  }

  async function handleExportAllJson() {
    const res = await fetch("/api/sync/export-all", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `lm-subs-vault-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 3000);
  }

  async function handleConfirmDeleteTranscript() {
    if (!confirmDeleteTranscript) return;
    await fetch("/api/sync/push", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        deletedCacheKeys: [confirmDeleteTranscript.cacheKey],
      }),
    });
    setConfirmDeleteTranscript(null);
    await onRefreshCloud();
  }

  const keyEntries = Object.entries(cloudState?.keyHints || {});

  return (
    <div className="page-wrap">
      {/* Account Summary Header */}
      <section className="section-block" style={{ paddingBottom: "40px" }}>
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "16px",
          }}
        >
          <div>
            <h1 className="section-heading" style={{ marginBottom: "6px" }}>
              Cloud library
            </h1>
            <p className="section-prose" style={{ marginBottom: 0 }}>
              Signed in as <strong>{user.email}</strong> ({user.authProvider || "email"}). Hosted on encrypted Neon Postgres.
            </p>
          </div>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            <button
              type="button"
              className="btn btn-sm"
              onClick={() => onNavigate("stats")}
            >
              View statistics
            </button>
            <button
              type="button"
              className="btn btn-sm"
              onClick={handleMintExtensionToken}
            >
              {extTokenCopied
                ? "Copied extension token"
                : "Link Chrome extension"}
            </button>
            <button
              type="button"
              className="btn btn-sm"
              onClick={onRefreshCloud}
              disabled={loadingCloud}
            >
              {loadingCloud ? "Refreshing…" : "Refresh"}
            </button>
            <button
              type="button"
              className="btn btn-sm btn-danger"
              onClick={onSignOut}
            >
              Sign out
            </button>
          </div>
        </div>

        {extTokenText ? (
          <div className="notice-banner" data-tone="ok" style={{ marginTop: "16px", marginBottom: 0 }}>
            Extension link token generated. Open LM Subs Settings in Chrome and paste:{" "}
            <code>{extTokenText}</code>
          </div>
        ) : null}
      </section>

      {/* Granular Sync Opt-In Controls */}
      <section className="section-block">
        <div className="split-section">
          <div>
            <h2 className="section-heading">Choose what syncs</h2>
            <p className="section-prose">
              Every category is under your control. Turning off a category stops new uploads immediately and lets you purge existing copies from the cloud database while keeping local browser copies intact.
            </p>
          </div>
          <SyncPreferencesSwitches
            syncPreferences={syncPrefs}
            onToggleCategory={handleRequestToggleCategory}
          />
        </div>
      </section>

      {/* Encrypted BYOK API Keys */}
      <section className="section-block">
        <div className="split-section">
          <div>
            <h2 className="section-heading">Encrypted API keys</h2>
            <p className="section-prose">
              Bring your own free-tier or paid API keys from Groq, Mistral, Gemini, Deepgram, OpenAI, and more. Keys are encrypted per user with AES-256-GCM; only masked hints appear here.
            </p>

            {keyEntries.length > 0 ? (
              <div className="data-table-wrap" style={{ marginTop: "18px" }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Provider</th>
                      <th>Stored hint</th>
                      <th style={{ textAlign: "right" }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {keyEntries.map(([provId, hint]) => (
                      <tr key={provId}>
                        <td style={{ fontWeight: 600 }}>{provId}</td>
                        <td>
                          <code>{hint}</code>
                        </td>
                        <td style={{ textAlign: "right" }}>
                          <button
                            type="button"
                            className="btn btn-sm btn-danger"
                            onClick={() => handleRemoveKey(provId)}
                            disabled={keyBusy}
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p style={{ fontSize: "14px", color: "var(--ink-tertiary)" }}>
                {syncPrefs.syncApiKeys
                  ? "No API keys stored in your cloud account yet."
                  : "API key sync is turned off."}
              </p>
            )}
          </div>

          <form onSubmit={handleSaveKey} noValidate>
            <div className="form-field">
              <label className="form-label" htmlFor="vault-provider-select">
                Speech-to-text provider
              </label>
              <select
                id="vault-provider-select"
                className="form-select"
                value={selectedProvider}
                onChange={(e) => setSelectedProvider(e.target.value)}
              >
                {PROVIDERS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.badge})
                  </option>
                ))}
              </select>
            </div>

            <div className="form-field">
              <label className="form-label" htmlFor="vault-key-input">
                API key
              </label>
              <input
                id="vault-key-input"
                type="password"
                className="form-input form-input-mono"
                placeholder={
                  PROVIDERS.find((p) => p.id === selectedProvider)
                    ?.keyPlaceholder || "Paste API key"
                }
                autoComplete="off"
                spellCheck={false}
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
              />
              {keyError ? (
                <div className="field-error" role="alert">
                  {keyError}
                </div>
              ) : null}
              {keyNotice ? (
                <div
                  style={{
                    marginTop: "6px",
                    fontSize: "13px",
                    color: "var(--status-ok)",
                  }}
                  role="status"
                >
                  {keyNotice}
                </div>
              ) : null}
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={keyBusy || !syncPrefs.syncApiKeys}
            >
              {keyBusy ? "Encrypting and saving…" : "Encrypt and save key"}
            </button>
          </form>
        </div>
      </section>

      {/* Synced Transcripts Table */}
      <section className="section-block">
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "16px",
            marginBottom: "20px",
          }}
        >
          <div>
            <h2 className="section-heading" style={{ marginBottom: "6px" }}>
              Synced transcriptions
            </h2>
            <p className="section-prose" style={{ marginBottom: 0 }}>
              Search, read, and export your captioned NotebookLM Video Overviews.
            </p>
          </div>

          <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
            <label htmlFor="transcript-search" style={{ position: "absolute", left: "-9999px" }}>
              Filter transcripts
            </label>
            <input
              id="transcript-search"
              type="search"
              className="form-input"
              style={{ width: "240px" }}
              placeholder="Search title or provider…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {(cloudState?.subtitles?.length || 0) > 0 ? (
              <button
                type="button"
                className="btn btn-sm"
                onClick={handleExportAllJson}
              >
                Export all (.json)
              </button>
            ) : null}
          </div>
        </div>

        {loadingCloud ? (
          <div aria-busy="true" aria-label="Loading synced transcripts">
            <div className="skeleton-row" />
            <div className="skeleton-row" />
            <div className="skeleton-row" />
          </div>
        ) : !syncPrefs.syncTranscripts ? (
          <div className="notice-banner">
            Transcription sync is turned off. Turn on <strong>Sync Video Overview transcriptions</strong> above if you want captions backed up here.
          </div>
        ) : filteredSubtitles.length === 0 ? (
          <div className="notice-banner">
            {searchQuery
              ? "No synced transcripts match your search."
              : "No synced Video Overview transcripts yet. Open a Video Overview in Google NotebookLM with the Chrome extension installed to generate and sync your first transcript."}
          </div>
        ) : (
          <div className="data-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Video Overview</th>
                  <th>Language</th>
                  <th>Provider</th>
                  <th data-num="true">Cues</th>
                  <th style={{ textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredSubtitles.map((sub) => {
                  const isOpen = expandedKey === sub.cacheKey;
                  return (
                    <React.Fragment key={sub.cacheKey}>
                      <tr>
                        <td>
                          <button
                            type="button"
                            style={{
                              appearance: "none",
                              border: 0,
                              background: "none",
                              padding: 0,
                              font: "inherit",
                              fontWeight: 600,
                              color: "var(--ink-primary)",
                              cursor: "pointer",
                              textAlign: "left",
                            }}
                            onClick={() =>
                              setExpandedKey(isOpen ? null : sub.cacheKey)
                            }
                          >
                            {sub.title}
                          </button>
                        </td>
                        <td>{sub.language || "en"}</td>
                        <td>{sub.provider || "manual"}</td>
                        <td data-num="true">{sub.cueCount || sub.cues?.length || 0}</td>
                        <td style={{ textAlign: "right" }}>
                          <div
                            style={{
                              display: "inline-flex",
                              gap: "6px",
                              alignItems: "center",
                            }}
                          >
                            <button
                              type="button"
                              className="btn btn-sm"
                              onClick={async () => {
                                const text = formatTxt(sub.cues || [], {
                                  includeTimestamps: true,
                                  title: sub.title,
                                });
                                await navigator.clipboard.writeText(text);
                                setCopiedKey(sub.cacheKey);
                                window.setTimeout(() => setCopiedKey(null), 1500);
                              }}
                            >
                              {copiedKey === sub.cacheKey ? "Copied" : "Copy"}
                            </button>

                            <DropdownMenu.Root>
                              <DropdownMenu.Trigger asChild>
                                <button type="button" className="btn btn-sm">
                                  Export
                                </button>
                              </DropdownMenu.Trigger>
                              <DropdownMenu.Portal>
                                <DropdownMenu.Content
                                  className="radix-dropdown-content"
                                  sideOffset={6}
                                  align="end"
                                >
                                  {[
                                    ["srt", "SubRip (.srt)"],
                                    ["vtt", "WebVTT (.vtt)"],
                                    ["txt", "Timestamped text (.txt)"],
                                    ["json", "Structured cues (.json)"],
                                  ].map(([fmt, label]) => (
                                    <DropdownMenu.Item
                                      key={fmt}
                                      className="radix-dropdown-item"
                                      onSelect={() =>
                                        handleExportTranscript(sub, fmt)
                                      }
                                    >
                                      {label}
                                    </DropdownMenu.Item>
                                  ))}
                                </DropdownMenu.Content>
                              </DropdownMenu.Portal>
                            </DropdownMenu.Root>

                            <button
                              type="button"
                              className="btn btn-sm btn-danger"
                              onClick={() => setConfirmDeleteTranscript(sub)}
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                      {isOpen ? (
                        <tr>
                          <td colSpan={5} style={{ background: "var(--bg-sheet)" }}>
                            <div
                              style={{
                                maxHeight: "220px",
                                overflowY: "auto",
                                fontFamily: "var(--font-mono)",
                                fontSize: "12px",
                                lineHeight: 1.55,
                                whiteSpace: "pre-wrap",
                              }}
                            >
                              {formatTxt(sub.cues || [], {
                                includeTimestamps: true,
                              })}
                            </div>
                          </td>
                        </tr>
                      ) : null}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Destructive Opt-Out Purge Confirmation Dialog */}
      <Dialog.Root
        open={Boolean(confirmDisableModal)}
        onOpenChange={(o) => !o && setConfirmDisableModal(null)}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="radix-dialog-overlay" />
          <Dialog.Content className="radix-dialog-content">
            <Dialog.Title className="radix-dialog-title">
              Turn off sync and delete cloud copies?
            </Dialog.Title>
            <Dialog.Description className="radix-dialog-desc">
              {confirmDisableModal?.category === "syncApiKeys"
                ? "Turning off API key sync can also delete your stored encrypted keys from Postgres. Keys saved locally in Chrome stay untouched."
                : "Turning off transcription sync can also delete your stored transcripts from Postgres. Cached captions in Chrome stay untouched."}
            </Dialog.Description>
            <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end", flexWrap: "wrap" }}>
              <button
                type="button"
                className="btn"
                onClick={() => setConfirmDisableModal(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn"
                onClick={() => {
                  onUpdateSyncPreferences(
                    { [confirmDisableModal.category]: false },
                    false
                  );
                  setConfirmDisableModal(null);
                }}
              >
                Pause sync only
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={() => {
                  onUpdateSyncPreferences(
                    { [confirmDisableModal.category]: false },
                    true
                  );
                  setConfirmDisableModal(null);
                }}
              >
                Turn off and purge cloud data
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* Delete Single Transcript Confirmation Dialog */}
      <Dialog.Root
        open={Boolean(confirmDeleteTranscript)}
        onOpenChange={(o) => !o && setConfirmDeleteTranscript(null)}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="radix-dialog-overlay" />
          <Dialog.Content className="radix-dialog-content">
            <Dialog.Title className="radix-dialog-title">
              Delete synced transcript?
            </Dialog.Title>
            <Dialog.Description className="radix-dialog-desc">
              Remove “{confirmDeleteTranscript?.title}” from your cloud library? This action cannot be undone.
            </Dialog.Description>
            <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
              <button
                type="button"
                className="btn"
                onClick={() => setConfirmDeleteTranscript(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={handleConfirmDeleteTranscript}
              >
                Delete transcript
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
