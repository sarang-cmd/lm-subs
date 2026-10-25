import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Tabs } from "radix-ui";
import { listProviderSpecs } from "../lib/providers/registry.js";
import { AuthDialog } from "./AuthDialog.jsx";
import { LibraryView, SyncPreferencesSwitches } from "./LibraryView.jsx";
import { PrivacyView, TermsView } from "./LegalViews.jsx";
import { ScreeningStage } from "./ScreeningStage.jsx";
import { StatsView } from "./StatsView.jsx";

const TOKEN_STORAGE_KEY = "lmsubs_web_session_token";
const ALL_PROVIDERS = listProviderSpecs();

function resolveInitialView() {
  const path = window.location.pathname.replace(/\/+$/, "") || "/";
  if (path === "/library" || path === "/workspace") return "library";
  if (path === "/stats" || path === "/stats.html") return "stats";
  if (path === "/privacy" || path === "/privacy.html" || path === "/privacy-policy.html") {
    return "privacy";
  }
  if (path === "/terms" || path === "/terms.html") return "terms";

  const params = new URLSearchParams(window.location.search);
  const v = params.get("view");
  if (v === "library" || v === "workspace") return "library";
  if (v === "stats") return "stats";
  if (v === "privacy") return "privacy";
  if (v === "terms") return "terms";
  return "overview";
}

function BrandMark() {
  return (
    <svg width="26" height="26" viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <rect width="32" height="32" rx="7" fill="#111315" />
      <rect x="0.5" y="0.5" width="31" height="31" rx="6.5" stroke="#2A2E35" />
      <path d="M12.5 8.2L20.5 12.8L12.5 17.4V8.2Z" fill="#F6F7F8" />
      <rect x="6" y="21.5" width="12" height="2.4" rx="1.2" fill="#3B82F6" />
      <rect x="20" y="21.5" width="6" height="2.4" rx="1.2" fill="#F6F7F8" />
      <rect x="6" y="25.4" width="15" height="2" rx="1" fill="#767D89" />
    </svg>
  );
}

export function App() {
  const [view, setView] = useState(resolveInitialView);
  const [token, setToken] = useState(() => {
    try {
      return window.localStorage.getItem(TOKEN_STORAGE_KEY) || "";
    } catch {
      return "";
    }
  });
  const [user, setUser] = useState(null);
  const [cloudState, setCloudState] = useState(null);
  const [loadingCloud, setLoadingCloud] = useState(false);
  const [authDialogOpen, setAuthDialogOpen] = useState(false);
  const [oauthNotice, setOauthNotice] = useState("");
  const [providerFilter, setProviderFilter] = useState("all");
  const [previewPrefs, setPreviewPrefs] = useState({
    syncApiKeys: true,
    syncTranscripts: true,
    syncSettings: true,
  });

  const navigate = useCallback((nextView) => {
    setView(nextView);
    const targetUrl =
      nextView === "overview"
        ? "/"
        : nextView === "library"
          ? "/library"
          : nextView === "stats"
            ? "/stats"
            : nextView === "privacy"
              ? "/privacy"
              : "/terms";
    window.history.pushState({ view: nextView }, "", targetUrl);
    window.scrollTo({ top: 0, behavior: "auto" });
  }, []);

  useEffect(() => {
    function onPopState() {
      setView(resolveInitialView());
    }
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  // Capture OAuth callback token from URL hash or OAuth setup notice from query
  useEffect(() => {
    const hash = window.location.hash || "";
    if (hash.startsWith("#auth_token=")) {
      const captured = decodeURIComponent(hash.slice("#auth_token=".length)).trim();
      if (captured) {
        try {
          window.localStorage.setItem(TOKEN_STORAGE_KEY, captured);
        } catch {
          // Ignore storage quota errors
        }
        setToken(captured);
        window.history.replaceState(
          null,
          "",
          window.location.pathname + window.location.search
        );
      }
    }

    const params = new URLSearchParams(window.location.search);
    const notice = params.get("oauth_notice");
    if (notice === "google" || notice === "github") {
      setOauthNotice(notice);
      setAuthDialogOpen(true);
    }
  }, []);

  const refreshCloud = useCallback(async (activeToken = token) => {
    if (!activeToken) {
      setUser(null);
      setCloudState(null);
      return;
    }
    setLoadingCloud(true);
    try {
      const res = await fetch("/api/sync/pull?includeSecrets=0", {
        headers: { Authorization: `Bearer ${activeToken}` },
      });
      const data = await res.json();
      if (!res.ok || !data?.ok) {
        if (res.status === 401) {
          try {
            window.localStorage.removeItem(TOKEN_STORAGE_KEY);
          } catch {
            // Ignore
          }
          setToken("");
          setUser(null);
          setCloudState(null);
        }
        return;
      }
      setUser(data.user);
      setCloudState(data);
    } catch {
      // Keep existing state on transient offline error
    } finally {
      setLoadingCloud(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      refreshCloud(token);
    }
  }, [token, refreshCloud]);

  function handleAuthenticated({ token: newToken, user: newUser }) {
    try {
      window.localStorage.setItem(TOKEN_STORAGE_KEY, newToken);
    } catch {
      // Ignore
    }
    setToken(newToken);
    setUser(newUser);
    refreshCloud(newToken);
  }

  async function handleSignOut() {
    if (token) {
      await fetch("/api/auth/signout", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {});
    }
    try {
      window.localStorage.removeItem(TOKEN_STORAGE_KEY);
    } catch {
      // Ignore
    }
    setToken("");
    setUser(null);
    setCloudState(null);
  }

  async function handleUpdateSyncPreferences(partialPrefs, purgeDisabled = false) {
    if (!token) {
      setPreviewPrefs((prev) => ({ ...prev, ...partialPrefs }));
      setAuthDialogOpen(true);
      return;
    }
    const current = cloudState?.syncPreferences || {
      syncApiKeys: true,
      syncTranscripts: true,
      syncSettings: true,
    };
    const nextPrefs = { ...current, ...partialPrefs };
    setCloudState((prev) =>
      prev ? { ...prev, syncPreferences: nextPrefs } : prev
    );

    await fetch("/api/sync/preferences", {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        syncPreferences: nextPrefs,
        purgeDisabled,
      }),
    });
    await refreshCloud(token);
  }

  const visibleProviders = useMemo(() => {
    if (providerFilter === "free") {
      return ALL_PROVIDERS.filter(
        (p) =>
          p.badge.toLowerCase().includes("free") ||
          p.badge.toLowerCase().includes("credit") ||
          p.id === "custom"
      );
    }
    if (providerFilter === "translate") {
      return ALL_PROVIDERS.filter((p) => p.supportsTranslation);
    }
    return ALL_PROVIDERS;
  }, [providerFilter]);

  return (
    <>
      <a className="skip-link" href="#main-content">
        Skip to main content
      </a>

      <header className="site-header">
        <div className="site-header-inner">
          <a
            href="/"
            className="brand-link"
            onClick={(e) => {
              e.preventDefault();
              navigate("overview");
            }}
          >
            <BrandMark />
            <span>LM Subs</span>
          </a>

          <nav className="nav-links" aria-label="Primary">
            <a
              href="/"
              className="nav-tab"
              aria-current={view === "overview" ? "page" : undefined}
              onClick={(e) => {
                e.preventDefault();
                navigate("overview");
              }}
            >
              Overview
            </a>
            <a
              href="/library"
              className="nav-tab"
              aria-current={view === "library" ? "page" : undefined}
              onClick={(e) => {
                e.preventDefault();
                navigate("library");
              }}
            >
              Library and sync
            </a>
            <a
              href="/stats"
              className="nav-tab"
              aria-current={view === "stats" ? "page" : undefined}
              onClick={(e) => {
                e.preventDefault();
                navigate("stats");
              }}
            >
              Statistics
            </a>
          </nav>

          <div className="nav-actions">
            {user ? (
              <button
                type="button"
                className="btn btn-sm"
                onClick={() => navigate("library")}
              >
                {user.email}
              </button>
            ) : (
              <button
                type="button"
                className="btn btn-sm"
                onClick={() => setAuthDialogOpen(true)}
              >
                Sign in
              </button>
            )}
            <a
              className="btn btn-sm btn-primary"
              href="/releases/lm-subs-v0.2.0.zip"
              download
            >
              Download extension
            </a>
          </div>
        </div>
      </header>

      <main id="main-content">
        {view === "overview" ? (
          <div className="page-wrap">
            {/* 1. Centered Product Hero + Interactive Screening Stage */}
            <section className="section-block" style={{ paddingTop: 0 }}>
              <div className="hero-header">
                <h1 className="hero-title">
                  Captions inside NotebookLM in seconds
                </h1>
                <p className="hero-lead">
                  LM Subs adds synchronized closed captions, searchable transcripts, and SRT, WebVTT, TXT, and JSON exports directly inside Google NotebookLM Video Overviews. Sign in to sync your transcripts and encrypted API keys across browsers.
                </p>
                <div className="hero-cta-row">
                  <a
                    className="btn btn-primary"
                    href="/releases/lm-subs-v0.2.0.zip"
                    download
                  >
                    Download Chrome extension (.zip)
                  </a>
                  <button
                    type="button"
                    className="btn"
                    onClick={() =>
                      user ? navigate("library") : setAuthDialogOpen(true)
                    }
                  >
                    {user ? "Open your cloud library" : "Sign in to cloud library"}
                  </button>
                </div>
                <div className="hero-footnote">
                  Open-source MIT Chrome extension (v0.2.0). Bring your own free-tier Groq, Mistral, or Gemini key.
                </div>
              </div>

              <ScreeningStage />
            </section>

            {/* 2. Audio-Only Stream Architecture */}
            <section className="section-block">
              <div className="split-section">
                <div>
                  <h2 className="section-heading">
                    Extracts the audio track instead of uploading full video
                  </h2>
                  <p className="section-prose">
                    A typical 10-minute NotebookLM Video Overview weighs over 50 MB as an MP4 video. Uploading that entire file to a speech model wastes bandwidth and hits 25 MB upload caps.
                  </p>
                  <p className="section-prose">
                    LM Subs locates NotebookLM’s compact audio-only stream (or strips video frames in the browser via HTTP byte-range reads) before sending ~3.4 MB of clean audio to your chosen speech-to-text provider.
                  </p>
                </div>

                <div>
                  <div className="stream-compare" aria-label="Measured payload size comparison">
                    <div className="stream-row">
                      <div className="stream-row-head">
                        <span>Full HD Video Overview MP4 (=m22 stream)</span>
                        <span className="tabular" style={{ fontFamily: "var(--font-mono)" }}>
                          52.0 MB
                        </span>
                      </div>
                      <div className="stream-track">
                        <div className="stream-fill-video" />
                      </div>
                    </div>

                    <div className="stream-row">
                      <div className="stream-row-head">
                        <span style={{ fontWeight: 600 }}>
                          Audio stream sent by LM Subs (=m140 AAC)
                        </span>
                        <span
                          className="tabular"
                          style={{
                            fontFamily: "var(--font-mono)",
                            color: "var(--accent)",
                            fontWeight: 600,
                          }}
                        >
                          3.4 MB
                        </span>
                      </div>
                      <div className="stream-track">
                        <div className="stream-fill-audio" />
                      </div>
                    </div>
                  </div>

                  <figure className="product-figure">
                    <img
                      src="/assets/screenshots/01-player-subtitles.png"
                      alt="LM Subs closed captions and export bar rendered inside a NotebookLM Video Overview player"
                      width="1280"
                      height="800"
                      loading="lazy"
                    />
                    <figcaption>
                      In-player caption bar inside Google NotebookLM with font sizing, timing offset, and direct file export.
                    </figcaption>
                  </figure>
                </div>
              </div>
            </section>

            {/* 3. Hosted Cloud Sync & Opt-In Privacy */}
            <section className="section-block">
              <div className="split-section">
                <div>
                  <h2 className="section-heading">
                    Your transcripts and keys, synced on your terms
                  </h2>
                  <p className="section-prose">
                    Sign in with Google, GitHub, or a 6-digit email verification code. There is no database or server URL to deploy.
                  </p>
                  <p className="section-prose">
                    You decide what syncs to your hosted account. API keys are encrypted per user with AES-256-GCM before reaching Postgres, and turning off any switch lets you purge cloud copies while keeping local browser data intact.
                  </p>
                  <div style={{ display: "flex", gap: "10px", marginTop: "20px", flexWrap: "wrap" }}>
                    <button
                      type="button"
                      className="btn btn-ink"
                      onClick={() =>
                        user ? navigate("library") : setAuthDialogOpen(true)
                      }
                    >
                      {user ? "Manage cloud library" : "Sign in with Google, GitHub, or email"}
                    </button>
                    <button
                      type="button"
                      className="btn"
                      onClick={() => navigate("stats")}
                    >
                      Explore statistics view
                    </button>
                  </div>
                </div>

                <div>
                  <SyncPreferencesSwitches
                    syncPreferences={
                      user && cloudState?.syncPreferences
                        ? cloudState.syncPreferences
                        : previewPrefs
                    }
                    onToggleCategory={(cat, checked) =>
                      handleUpdateSyncPreferences({ [cat]: checked }, false)
                    }
                  />
                  <p
                    style={{
                      marginTop: "12px",
                      fontSize: "13px",
                      color: "var(--ink-tertiary)",
                    }}
                  >
                    {user
                      ? `Connected as ${user.email}. Changes save immediately to your account.`
                      : "Toggle any switch above to sign in and save your sync preferences."}
                  </p>
                </div>
              </div>
            </section>

            {/* 4. Supported Speech-to-Text Providers Table */}
            <section className="section-block">
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-end",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  gap: "16px",
                  marginBottom: "22px",
                }}
              >
                <div>
                  <h2 className="section-heading" style={{ marginBottom: "6px" }}>
                    Twelve speech-to-text providers with automatic failover
                  </h2>
                  <p className="section-prose" style={{ marginBottom: 0 }}>
                    Order your preferred providers in a queue. If your primary key hits an HTTP 429 rate limit, LM Subs retries the next configured provider automatically.
                  </p>
                </div>

                <Tabs.Root
                  value={providerFilter}
                  onValueChange={setProviderFilter}
                >
                  <Tabs.List
                    className="radix-tabs-list"
                    aria-label="Filter speech-to-text providers"
                  >
                    <Tabs.Trigger className="radix-tabs-trigger" value="all">
                      All ({ALL_PROVIDERS.length})
                    </Tabs.Trigger>
                    <Tabs.Trigger className="radix-tabs-trigger" value="free">
                      Free tier friendly
                    </Tabs.Trigger>
                    <Tabs.Trigger className="radix-tabs-trigger" value="translate">
                      Translation
                    </Tabs.Trigger>
                  </Tabs.List>
                </Tabs.Root>
              </div>

              <div className="data-table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Provider</th>
                      <th>Default model</th>
                      <th>Pricing and free tier notes</th>
                      <th style={{ textAlign: "right" }}>Key console</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleProviders.map((spec) => (
                      <tr key={spec.id}>
                        <td style={{ fontWeight: 600 }}>{spec.name}</td>
                        <td>
                          <code>{spec.defaultModel}</code>
                        </td>
                        <td style={{ color: "var(--ink-secondary)" }}>
                          {spec.freeTierSummary}
                        </td>
                        <td style={{ textAlign: "right" }}>
                          <a
                            className="link"
                            href={spec.keyUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            Console
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        ) : null}

        {view === "library" ? (
          <LibraryView
            token={token}
            user={user}
            cloudState={cloudState}
            loadingCloud={loadingCloud}
            oauthNotice={oauthNotice}
            onAuthenticated={handleAuthenticated}
            onSignOut={handleSignOut}
            onRefreshCloud={() => refreshCloud(token)}
            onUpdateSyncPreferences={handleUpdateSyncPreferences}
            onNavigate={navigate}
          />
        ) : null}

        {view === "stats" ? (
          <StatsView
            token={token}
            user={user}
            onOpenSignIn={() => setAuthDialogOpen(true)}
          />
        ) : null}

        {view === "privacy" ? <PrivacyView onNavigate={navigate} /> : null}
        {view === "terms" ? <TermsView onNavigate={navigate} /> : null}
      </main>

      <footer className="site-footer">
        <div className="site-footer-inner">
          <div>
            <strong>LM Subs</strong> (v0.2.0, MIT License). Independent open-source tool, unaffiliated with Google LLC.
          </div>
          <div className="footer-links">
            <a
              href="/library"
              onClick={(e) => {
                e.preventDefault();
                navigate("library");
              }}
            >
              Cloud library
            </a>
            <a
              href="/stats"
              onClick={(e) => {
                e.preventDefault();
                navigate("stats");
              }}
            >
              Statistics
            </a>
            <a
              href="/privacy.html"
              onClick={(e) => {
                e.preventDefault();
                navigate("privacy");
              }}
            >
              Privacy policy
            </a>
            <a
              href="/terms.html"
              onClick={(e) => {
                e.preventDefault();
                navigate("terms");
              }}
            >
              Terms of service
            </a>
            <a
              href="https://github.com/sarang-cmd/notebooklm-subtitles"
              target="_blank"
              rel="noopener noreferrer"
            >
              GitHub source
            </a>
          </div>
        </div>
      </footer>

      <AuthDialog
        open={authDialogOpen}
        onOpenChange={setAuthDialogOpen}
        onAuthenticated={handleAuthenticated}
        oauthNotice={oauthNotice}
      />
    </>
  );
}
