import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Tabs } from "radix-ui";
import { listProviderSpecs } from "../lib/providers/registry.js";
import { AboutView } from "./AboutView.jsx";
import { AuthDialog } from "./AuthDialog.jsx";
import { GuideView } from "./GuideView.jsx";
import { LibraryView, SyncPreferencesSwitches } from "./LibraryView.jsx";
import { NotificationCenter } from "./NotificationCenter.jsx";
import { ProductShot } from "./ProductShot.jsx";
import { PrivacyView, TermsView } from "./LegalViews.jsx";
import { ScreeningStage } from "./ScreeningStage.jsx";
import { StatsView } from "./StatsView.jsx";
import { WelcomeView } from "./WelcomeView.jsx";

const TOKEN_STORAGE_KEY = "lmsubs_web_session_token";
const ALL_PROVIDERS = listProviderSpecs();

/**
 * The two-by-two screenshot gallery. WebP is the primary format because it
 * cuts these captures from roughly 200 KB to under 90 KB each; the PNG is the
 * fallback for browsers without WebP support.
 */
const GALLERY_SHOTS = [
  {
    src: "/assets/screenshots/01-player-subtitles",
    label: "Video Overview player",
    caption:
      "Spoken words highlight inside the video frame while CC and Transcript controls sit in the bottom play bar.",
    alt: "NotebookLM Video Overview playing with LM Subs captions highlighting the current spoken word and CC controls docked in the play bar",
  },
  {
    src: "/assets/screenshots/08-docked-fine-controls",
    label: "Fine-grained controls",
    caption:
      "Loop, Picture in Picture, snapshot, volume boost and skip silence, hidden behind one master switch.",
    alt: "LM Subs fine-grained playback controls docked in the NotebookLM player bar showing loop, PiP, snapshot and volume boost",
  },
  {
    src: "/assets/screenshots/02-statistics-dashboard",
    label: "Statistics dashboard",
    caption:
      "Watch time, listening time, exports and per-provider usage, identical to the numbers in the extension settings.",
    alt: "LM Subs statistics dashboard showing watch time, listening time, export counts and per-provider usage charts",
  },
  {
    src: "/assets/screenshots/09-welcome-install-page",
    label: "Page that opens on install",
    caption:
      "Setup finishes itself: pin the extension, paste one free API key, then press CC on any overview.",
    alt: "LM Subs install page that opens in a new tab after loading the extension, showing the pin, API key and caption steps",
  },
];

function resolveInitialView() {
  const path = window.location.pathname.replace(/\/+$/, "") || "/";
  if (
    path === "/welcome" ||
    path === "/welcome.html" ||
    path === "/setup" ||
    path === "/setup.html"
  ) {
    return "welcome";
  }
  if (path === "/guide" || path === "/guide.html" || path === "/install") {
    return "guide";
  }
  if (path === "/about" || path === "/about.html") return "about";
  if (path === "/library" || path === "/workspace") return "library";
  if (path === "/stats" || path === "/stats.html") return "stats";
  if (
    path === "/privacy" ||
    path === "/privacy.html" ||
    path === "/privacy-policy.html"
  ) {
    return "privacy";
  }
  if (path === "/terms" || path === "/terms.html") return "terms";

  const params = new URLSearchParams(window.location.search);
  const v = params.get("view");
  if (v === "welcome" || v === "setup") return "welcome";
  if (v === "guide" || v === "install") return "guide";
  if (v === "about") return "about";
  if (v === "library" || v === "workspace") return "library";
  if (v === "stats") return "stats";
  if (v === "privacy") return "privacy";
  if (v === "terms") return "terms";
  return "overview";
}

export function BrandMark({ size = 26 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 128 128"
      fill="none"
      aria-hidden="true"
    >
      <rect width="128" height="128" rx="28" fill="#111315" />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M45.8 21.5C48.2 20.4 51 22.2 51 24.9V103.5C51 106.5 47.5 108.2 45.1 106.4L22.6 89.2C20.1 87.3 18.6 84.3 18.6 81.1V41.6C18.6 37.3 21.1 33.4 25 31.6L45.8 21.5ZM24.5 81.8L42.6 95.6C43.7 96.4 45.2 95.6 45.2 94.3V83.1C45.2 81.7 44 80.5 42.6 80.5H25.1C23.8 80.5 23.4 81 24.5 81.8Z"
        fill="#F6F7F8"
      />
      <rect x="56.5" y="49.5" width="8" height="29" rx="4" fill="#F6F7F8" />
      <rect x="68.5" y="37" width="8.5" height="54" rx="4.25" fill="#F6F7F8" />
      <rect x="81" y="49.5" width="8" height="29" rx="4" fill="#F6F7F8" />
      <path
        d="M84.5 27H98.5C104.851 27 110 32.1487 110 38.5V89.5C110 95.8513 104.851 101 98.5 101H84.5C81.7386 101 79.5 98.7614 79.5 96C79.5 93.2386 81.7386 91 84.5 91H97C98.3807 91 99.5 89.8807 99.5 88.5V39.5C99.5 38.1193 98.3807 37 97 37H84.5C81.7386 37 79.5 34.7614 79.5 32C79.5 29.2386 81.7386 27 84.5 27Z"
        fill="#1D5CF6"
      />
    </svg>
  );
}

const VIEW_URL_MAP = {
  overview: "/",
  welcome: "/welcome",
  guide: "/guide",
  library: "/library",
  stats: "/stats",
  about: "/about",
  privacy: "/privacy",
  terms: "/terms",
};

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
  const [extConnectRequested, setExtConnectRequested] = useState(() => {
    try {
      return new URLSearchParams(window.location.search).get("ext_connect") === "1";
    } catch {
      return false;
    }
  });
  const [providerFilter, setProviderFilter] = useState("all");
  const [focusedCacheKey, setFocusedCacheKey] = useState(null);
  const [localNotifications, setLocalNotifications] = useState([]);
  const [previewPrefs, setPreviewPrefs] = useState({
    syncApiKeys: true,
    syncTranscripts: true,
    syncSettings: true,
  });

  const pushLocalNotification = useCallback((item) => {
    setLocalNotifications((prev) => [
      {
        id: `web_ntf_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        kind: item?.kind || "info",
        title: item?.title || "LM Subs",
        body: item?.body || "",
        cacheKey: item?.cacheKey || null,
        read: false,
        createdAt: new Date().toISOString(),
      },
      ...prev,
    ]);
  }, []);

  const navigate = useCallback((nextView) => {
    setView(nextView);
    const targetUrl = VIEW_URL_MAP[nextView] || "/";
    window.history.pushState({ view: nextView }, "", targetUrl);
    window.scrollTo({ top: 0, behavior: "auto" });
  }, []);

  const handleStartDownloadSetup = useCallback(() => {
    setView("welcome");
    window.history.pushState({ view: "welcome" }, "", "/welcome?downloading=1");
    window.scrollTo({ top: 0, behavior: "auto" });
  }, []);

  useEffect(() => {
    function onPopState() {
      setView(resolveInitialView());
    }
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  // The tab strip scrolls sideways instead of wrapping, so bring the current
  // tab into view on load and on navigation.
  const navRef = useRef(null);
  useEffect(() => {
    const active = navRef.current?.querySelector('[aria-current="page"]');
    active?.scrollIntoView({ inline: "center", block: "nearest" });
  }, [view]);

  useEffect(() => {
    const hash = window.location.hash || "";
    if (hash.startsWith("#auth_token=")) {
      const captured = decodeURIComponent(
        hash.slice("#auth_token=".length)
      ).trim();
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
    if (params.get("ext_connect") === "1") {
      setExtConnectRequested(true);
      setView("library");
    }
    const notice = params.get("oauth_notice");
    if (notice === "google" || notice === "github") {
      setOauthNotice(notice);
      setAuthDialogOpen(true);
    }
  }, []);

  const refreshCloud = useCallback(
    async (activeToken = token) => {
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
    },
    [token]
  );

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

  async function handleUpdateSyncPreferences(
    partialPrefs,
    purgeDisabled = false
  ) {
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
            <span className="brand-text">LM Subs</span>
          </a>

          <nav className="nav-links" aria-label="Primary" ref={navRef}>
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
              href="/guide"
              className="nav-tab"
              aria-current={view === "guide" ? "page" : undefined}
              onClick={(e) => {
                e.preventDefault();
                navigate("guide");
              }}
            >
              Setup guide
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
            <a className="nav-tab" href="/blog">
              Blog
            </a>
            <a
              href="/about"
              className="nav-tab"
              aria-current={view === "about" ? "page" : undefined}
              onClick={(e) => {
                e.preventDefault();
                navigate("about");
              }}
            >
              About
            </a>
          </nav>

          <div className="nav-actions">
            <NotificationCenter
              token={token}
              localNotifications={localNotifications}
              onClearLocalNotifications={() => setLocalNotifications([])}
              onMarkLocalNotificationsRead={() =>
                setLocalNotifications((prev) =>
                  prev.map((n) => ({ ...n, read: true }))
                )
              }
              onSelectTranscript={(ck) => {
                setFocusedCacheKey(ck);
                navigate("library");
              }}
              onOpenSignIn={() => setAuthDialogOpen(true)}
            />
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
              href="/releases/lm-subs-v0.2.8.zip"
              download
              onClick={handleStartDownloadSetup}
            >
              Download<span className="nav-hide-sm">&nbsp;extension</span>
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
                  LM Subs adds synchronized closed captions, word-by-word highlighting, searchable transcripts, and six export formats inside Google NotebookLM Video and Audio Overviews. Sign in to sync transcripts and encrypted API keys across browsers.
                </p>
                <div className="hero-cta-row">
                  <a
                    className="btn btn-primary"
                    href="/releases/lm-subs-v0.2.8.zip"
                    download
                    onClick={handleStartDownloadSetup}
                  >
                    Download Chrome extension (.zip)
                  </a>
                  <button
                    type="button"
                    className="btn"
                    onClick={() => navigate("welcome")}
                  >
                    Interactive setup guide
                  </button>
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
                  Open-source MIT Chrome extension (v0.2.8). Bring your own free-tier Groq, Mistral, or Gemini key.
                </div>
              </div>

              <ScreeningStage />
            </section>

            {/* 2. Beginner-Friendly 4-Step Installation Walkthrough */}
            <section className="section-block">
              <div className="split-section">
                <div>
                  <h2 className="section-heading">
                    Set up LM Subs in under two minutes
                  </h2>
                  <p className="section-prose">
                    No coding background, terminal commands, or paid subscriptions are needed. Downloading opens an interactive setup guide that connects directly to the extension as soon as you load it.
                  </p>
                  <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginTop: "18px" }}>
                    <button
                      type="button"
                      className="btn btn-ink"
                      onClick={() => navigate("welcome")}
                    >
                      Open interactive setup
                    </button>
                    <a
                      className="btn"
                      href="/releases/lm-subs-v0.2.8.zip"
                      download
                      onClick={handleStartDownloadSetup}
                    >
                      Download .zip package
                    </a>
                  </div>
                </div>

                <div className="sheet" style={{ padding: "22px 24px" }}>
                  <ol
                    style={{
                      margin: 0,
                      paddingLeft: "20px",
                      display: "grid",
                      gap: "12px",
                      fontSize: "14.5px",
                      color: "var(--ink-secondary)",
                    }}
                  >
                    <li>
                      <strong style={{ color: "var(--ink)" }}>Download and unzip:</strong>{" "}
                      Save <code style={{ fontFamily: "var(--font-mono)" }}>lm-subs-v0.2.8.zip</code> and extract it into a regular folder in your Documents folder.
                    </li>
                    <li>
                      <strong style={{ color: "var(--ink)" }}>Load and pin from top of menu:</strong>{" "}
                      Open <code style={{ fontFamily: "var(--font-mono)" }}>chrome://extensions</code>, enable <strong style={{ color: "var(--ink)" }}>Developer mode</strong>, click <strong style={{ color: "var(--ink)" }}>Load unpacked</strong>, then pin <strong style={{ color: "var(--ink)" }}>LM Subs</strong> from the top <strong style={{ color: "var(--ink)" }}>Access requested</strong> section of Chrome’s puzzle menu.
                    </li>
                    <li>
                      <strong style={{ color: "var(--ink)" }}>Save one free key:</strong>{" "}
                      Create a free{" "}
                      <a
                        className="link"
                        href="https://console.groq.com/keys"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        console.groq.com/keys
                      </a>{" "}
                      key (<code style={{ fontFamily: "var(--font-mono)" }}>gsk_...</code>) and save it directly from the setup page or toolbar popup.
                    </li>
                    <li>
                      <strong style={{ color: "var(--ink)" }}>Play any Video or Audio Overview:</strong>{" "}
                      Open NotebookLM and press play on a Video Overview or podcast Audio Overview. Captions and export controls appear automatically.
                    </li>
                  </ol>
                </div>
              </div>
            </section>

            {/* 3. Audio-Only Stream Architecture */}
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
                    <ProductShot
                      src="/assets/screenshots/01-player-subtitles"
                      alt="LM Subs highlighted spoken-word captions and bottom play-bar CC controls inside a Google NotebookLM Video Overview player"
                    />
                    <figcaption>
                      Highlighted spoken-word captions inside the video frame with compact CC and Transcript controls docked in the bottom play bar.
                    </figcaption>
                  </figure>
                </div>
              </div>
            </section>

            {/* 3b. Real screenshots, two by two */}
            <section className="section-block">
              <h2 className="section-heading">
                Four surfaces, captured in a real browser
              </h2>
              <p className="section-prose" style={{ marginBottom: "6px" }}>
                Every image on this site is a screenshot of the extension
                running in Chromium, not a mockup. Captions sit inside the
                player, controls dock in NotebookLM’s own play bar, and the
                numbers below are the same ones the extension reports in its
                settings page.
              </p>

              <div className="shot-grid">
                {GALLERY_SHOTS.map((shot) => (
                  <figure className="shot-cell" key={shot.src}>
                    <ProductShot src={shot.src} alt={shot.alt} />
                    <figcaption>
                      <span className="shot-label">{shot.label}</span>
                      <span className="shot-caption">{shot.caption}</span>
                    </figcaption>
                  </figure>
                ))}
              </div>
            </section>

            {/* 4. Hosted Cloud Sync & Opt-In Privacy */}
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

            {/* 5. Supported Speech-to-Text Providers Table */}
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

        {view === "welcome" ? (
          <WelcomeView
            token={token}
            user={user}
            onNavigate={navigate}
            onOpenSignIn={() => setAuthDialogOpen(true)}
            onAuthenticated={handleAuthenticated}
          />
        ) : null}

        {view === "guide" ? (
          <GuideView
            onNavigate={navigate}
            onStartDownloadSetup={handleStartDownloadSetup}
            onOpenSignIn={() => setAuthDialogOpen(true)}
            user={user}
          />
        ) : null}

        {view === "library" ? (
          <LibraryView
            token={token}
            user={user}
            cloudState={cloudState}
            loadingCloud={loadingCloud}
            oauthNotice={oauthNotice}
            extConnectRequested={extConnectRequested}
            focusedCacheKey={focusedCacheKey}
            onPushNotification={pushLocalNotification}
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

        {view === "about" ? <AboutView onNavigate={navigate} /> : null}
        {view === "privacy" ? <PrivacyView onNavigate={navigate} /> : null}
        {view === "terms" ? <TermsView onNavigate={navigate} /> : null}
      </main>

      <footer className="site-footer">
        <div className="site-footer-inner">
          <div>
            <strong>LM Subs</strong> (v0.2.8, MIT License) by{" "}
            <a
              className="link"
              href="/about"
              onClick={(e) => {
                e.preventDefault();
                navigate("about");
              }}
            >
              Sarang (@sarang-cmd)
            </a>
            . Independent open-source tool, unaffiliated with Google LLC.
          </div>
          <div className="footer-links">
            <a
              href="/welcome"
              onClick={(e) => {
                e.preventDefault();
                navigate("welcome");
              }}
            >
              Interactive setup
            </a>
            <a
              href="/guide"
              onClick={(e) => {
                e.preventDefault();
                navigate("guide");
              }}
            >
              Setup guide
            </a>
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
            <a href="/blog">Blog</a>
            <a
              href="/about"
              onClick={(e) => {
                e.preventDefault();
                navigate("about");
              }}
            >
              About
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
              href="https://github.com/sarang-cmd/lm-subs"
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
        redirectAfter={
          extConnectRequested ? "/?view=library&ext_connect=1" : "/library"
        }
      />
    </>
  );
}
