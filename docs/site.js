/**
 * LM Subs Interactive Web App, Fast-Path Simulator & Neon Cloud Sync Console (`docs/site.js`).
 *
 * Uses strictly relative `/api/*` paths so it works identically on:
 * - Local `npm start` (`http://localhost:4173`)
 * - Sandboxed live browser previews (`https://4173-*.e2b.app`)
 * - Vercel Serverless / Fluid Compute (`api/[...route].js`)
 */

(() => {
  const DEMO_CUES = [
    {
      startSec: 0.0,
      endSec: 4.2,
      slideKicker: "01 · CONSENSUS SAFETY",
      slideTitle: "Distributed Consensus & Raft",
      text: "Welcome to this NotebookLM Video Overview\non distributed consensus with Raft.",
    },
    {
      startSec: 4.3,
      endSec: 8.8,
      slideKicker: "01 · LEADER ELECTION",
      slideTitle: "Term-Numbered Leader Election",
      text: "Every cluster term elects at most one leader\nusing randomized heartbeat timeouts.",
    },
    {
      startSec: 8.9,
      endSec: 14.2,
      slideKicker: "02 · LOG REPLICATION",
      slideTitle: "Quorum AppendEntries Replication",
      text: "Once a majority of followers append an entry,\nthe leader marks it committed safely.",
    },
    {
      startSec: 14.3,
      endSec: 20.0,
      slideKicker: "03 · INSTANT CLOUD VAULT",
      slideTitle: "Direct =m140 Audio + Neon Postgres Sync",
      text: "Fetching the 4.1 MB audio stream directly cuts latency\nfrom five minutes down to three seconds.",
    },
  ];

  // =========================================================================
  // Theme Switcher
  // =========================================================================
  const themeBtn = document.getElementById("theme-toggle");
  const prefersDark =
    window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  let currentTheme =
    localStorage.getItem("lmsubs-theme") || (prefersDark ? "dark" : "light");

  function applyTheme(t) {
    currentTheme = t;
    document.documentElement.setAttribute("data-theme", t);
    if (themeBtn) themeBtn.textContent = t === "dark" ? "Light" : "Dark";
  }
  applyTheme(currentTheme);

  themeBtn?.addEventListener("click", () => {
    const next = currentTheme === "dark" ? "light" : "dark";
    localStorage.setItem("lmsubs-theme", next);
    applyTheme(next);
  });

  // =========================================================================
  // Provider Table Filter
  // =========================================================================
  const filterBtns = document.querySelectorAll(".filter-pill");
  const provRows = document.querySelectorAll("#prov-tbody tr");
  filterBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const cat = btn.dataset.filter;
      filterBtns.forEach((b) => {
        b.dataset.active = b === btn ? "true" : "false";
      });
      provRows.forEach((row) => {
        row.style.display =
          cat === "all" || row.dataset.cat === cat ? "" : "none";
      });
    });
  });

  // =========================================================================
  // Interactive Broadcast Player & Fast-Path Simulator
  // =========================================================================
  const runBtn = document.getElementById("sim-run-btn");
  const failoverToggle = document.getElementById("sim-failover-toggle");
  const logBox = document.getElementById("sim-log");
  const ccBtn = document.getElementById("sim-cc-btn");
  const fontDownBtn = document.getElementById("sim-font-down");
  const fontUpBtn = document.getElementById("sim-font-up");
  const offsetDownBtn = document.getElementById("sim-offset-down");
  const offsetLblBtn = document.getElementById("sim-offset-lbl");
  const offsetUpBtn = document.getElementById("sim-offset-up");
  const dlSrtBtn = document.getElementById("sim-dl-srt");
  const dlVttBtn = document.getElementById("sim-dl-vtt");
  const dlTxtBtn = document.getElementById("sim-dl-txt");
  const captionEl = document.getElementById("sim-caption");
  const slideKickerEl = document.getElementById("sim-slide-kicker");
  const slideTitleEl = document.getElementById("sim-slide-title");
  const playBtn = document.getElementById("sim-play-btn");
  const rangeEl = document.getElementById("sim-range");
  const timeEl = document.getElementById("sim-time");

  let ccEnabled = true;
  let fontIdx = 1;
  const fontSizes = ["13px", "15px", "18px", "21px"];
  let offsetSec = 0;
  let playTimer = null;
  let currentTime = 1.2;

  function appendLog(text, cls = "") {
    if (!logBox) return;
    const line = document.createElement("div");
    line.className = `sim-log-line ${cls}`.trim();
    line.textContent = text;
    logBox.appendChild(line);
    logBox.scrollTop = logBox.scrollHeight;
  }

  function formatClock(sec) {
    const s = Math.max(0, Math.floor(sec));
    const mm = String(Math.floor(s / 60)).padStart(2, "0");
    const ss = String(s % 60).padStart(2, "0");
    return `${mm}:${ss}`;
  }

  function formatSubTime(sec, sep) {
    const msTotal = Math.max(0, Math.round((sec + offsetSec) * 1000));
    const ms = String(msTotal % 1000).padStart(3, "0");
    const totalS = Math.floor(msTotal / 1000);
    const ss = String(totalS % 60).padStart(2, "0");
    const mm = String(Math.floor(totalS / 60) % 60).padStart(2, "0");
    return `00:${mm}:${ss}${sep}${ms}`;
  }

  function renderPlayerState() {
    if (!captionEl) return;
    timeEl.textContent = `${formatClock(currentTime)} / 00:20`;
    rangeEl.value = String(currentTime);

    const sign = offsetSec > 0 ? "+" : "";
    offsetLblBtn.textContent = `${sign}${offsetSec.toFixed(2)}s`;
    captionEl.style.fontSize = fontSizes[fontIdx];

    const effective = currentTime - offsetSec;
    const active = DEMO_CUES.find(
      (c) => effective >= c.startSec && effective <= c.endSec
    );

    if (active) {
      slideKickerEl.textContent = active.slideKicker;
      slideTitleEl.textContent = active.slideTitle;
    }

    if (!ccEnabled || !active) {
      captionEl.style.visibility = "hidden";
      captionEl.textContent = "";
    } else {
      captionEl.style.visibility = "visible";
      captionEl.textContent = active.text;
    }
  }

  function togglePlayback() {
    if (playTimer) {
      clearInterval(playTimer);
      playTimer = null;
      playBtn.textContent = "Play";
      return;
    }
    playBtn.textContent = "Pause";
    playTimer = setInterval(() => {
      currentTime += 0.1;
      if (currentTime > 20) currentTime = 0;
      renderPlayerState();
    }, 100);
  }

  function downloadBlob(text, filename, mime) {
    const blob = new Blob([text], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  }

  playBtn?.addEventListener("click", togglePlayback);
  rangeEl?.addEventListener("input", () => {
    currentTime = Number(rangeEl.value) || 0;
    renderPlayerState();
  });

  ccBtn?.addEventListener("click", () => {
    ccEnabled = !ccEnabled;
    ccBtn.dataset.active = ccEnabled ? "true" : "false";
    renderPlayerState();
  });
  fontDownBtn?.addEventListener("click", () => {
    fontIdx = Math.max(0, fontIdx - 1);
    renderPlayerState();
  });
  fontUpBtn?.addEventListener("click", () => {
    fontIdx = Math.min(fontSizes.length - 1, fontIdx + 1);
    renderPlayerState();
  });
  offsetDownBtn?.addEventListener("click", () => {
    offsetSec = Math.max(-5, offsetSec - 0.25);
    renderPlayerState();
  });
  offsetUpBtn?.addEventListener("click", () => {
    offsetSec = Math.min(5, offsetSec + 0.25);
    renderPlayerState();
  });
  offsetLblBtn?.addEventListener("click", () => {
    offsetSec = 0;
    renderPlayerState();
  });

  dlSrtBtn?.addEventListener("click", () => {
    const srt = DEMO_CUES.map(
      (c, i) =>
        `${i + 1}\n${formatSubTime(c.startSec, ",")} --> ${formatSubTime(
          c.endSec,
          ","
        )}\n${c.text}\n`
    ).join("\n");
    downloadBlob(srt, "raft-consensus-overview.srt", "application/x-subrip;charset=utf-8");
  });

  dlVttBtn?.addEventListener("click", () => {
    const body = DEMO_CUES.map(
      (c, i) =>
        `${i + 1}\n${formatSubTime(c.startSec, ".")} --> ${formatSubTime(
          c.endSec,
          "."
        )}\n${c.text}\n`
    ).join("\n");
    downloadBlob(`WEBVTT\n\n${body}`, "raft-consensus-overview.vtt", "text/vtt;charset=utf-8");
  });

  dlTxtBtn?.addEventListener("click", () => {
    const txt = `# Distributed Consensus & Raft\n\n${DEMO_CUES.map(
      (c) => `[${formatClock(c.startSec)}] ${c.text.replace(/\s+/g, " ").trim()}`
    ).join("\n")}\n`;
    downloadBlob(txt, "raft-consensus-overview.txt", "text/plain;charset=utf-8");
  });

  async function runSimulation() {
    if (!logBox || !runBtn) return;
    runBtn.disabled = true;
    logBox.textContent = "";
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

    appendLog("[00.0s] AF_initDataCallback -> Video Overview detected (id=9f41c8e2)");
    await sleep(220);
    appendLog("[00.4s] SW Fast-Path -> GET =m140 (4.1 MB direct AAC audio, skipped 92 MB HD MP4)", "ok");
    await sleep(260);

    if (failoverToggle?.checked) {
      appendLog("[01.1s] Queue #1 Groq (whisper-large-v3-turbo, segment) -> HTTP 429 rate limit", "warn");
      await sleep(240);
      appendLog("[01.2s] Automatic Queue Failover -> #2 Mistral (voxtral-mini-transcribe-3)");
      await sleep(320);
      appendLog("[03.1s] Mistral returned 42 cues · Encrypted & synced to Neon Postgres", "ok");
    } else {
      appendLog("[02.8s] Queue #1 Groq (whisper-large-v3-turbo, segment) -> 42 cues in 1.9s", "ok");
    }

    currentTime = 0.2;
    renderPlayerState();
    if (!playTimer) togglePlayback();
    runBtn.disabled = false;
  }

  runBtn?.addEventListener("click", runSimulation);
  appendLog("[READY] Direct =m140 audio fast-path + HTTP 206 Range remuxer armed.", "ok");
  renderPlayerState();

  // =========================================================================
  // Live Neon Account & Cloud Sync Console (`/api/*`)
  // =========================================================================
  const TOKEN_STORAGE_KEY = "lmsubs_web_sync_token";
  const healthBadge = document.getElementById("api-health-badge");
  const authLoggedOut = document.getElementById("web-auth-logged-out");
  const authLoggedIn = document.getElementById("web-auth-logged-in");
  const authEmail = document.getElementById("web-auth-email");
  const authPassword = document.getElementById("web-auth-password");
  const authName = document.getElementById("web-auth-name");
  const signupBtn = document.getElementById("web-signup-btn");
  const signinBtn = document.getElementById("web-signin-btn");
  const signoutBtn = document.getElementById("web-signout-btn");
  const refreshVaultBtn = document.getElementById("web-refresh-vault-btn");
  const mintTokenBtn = document.getElementById("web-mint-token-btn");
  const extTokenOutput = document.getElementById("web-ext-token-output");
  const userTitle = document.getElementById("web-user-title");
  const userSub = document.getElementById("web-user-sub");
  const authFeedback = document.getElementById("web-auth-feedback");

  const vaultLocked = document.getElementById("web-vault-locked");
  const vaultUnlocked = document.getElementById("web-vault-unlocked");
  const keyProvider = document.getElementById("web-key-provider");
  const keySecret = document.getElementById("web-key-secret");
  const saveKeyBtn = document.getElementById("web-save-key-btn");
  const keyHintsEl = document.getElementById("web-key-hints");
  const prefPrimary = document.getElementById("web-pref-primary");
  const prefLang = document.getElementById("web-pref-lang");
  const prefFont = document.getElementById("web-pref-font");
  const savePrefsBtn = document.getElementById("web-save-prefs-btn");
  const subsEmpty = document.getElementById("web-subs-empty");
  const subsList = document.getElementById("web-subs-list");
  const exportAllBtn = document.getElementById("web-export-all-btn");

  let activeToken = localStorage.getItem(TOKEN_STORAGE_KEY) || "";
  let currentSettings = {};
  let cachedVaultSubtitles = [];

  function setFeedback(msg, isError = false) {
    if (!authFeedback) return;
    authFeedback.style.color = isError ? "var(--red)" : "var(--green)";
    authFeedback.textContent = msg;
  }

  async function apiRequest(path, { method = "GET", body = null } = {}) {
    const headers = {};
    if (body !== null) headers["Content-Type"] = "application/json";
    if (activeToken) headers.Authorization = `Bearer ${activeToken}`;
    const res = await fetch(path, {
      method,
      headers,
      body: body !== null ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.ok) {
      throw new Error(data?.error || `HTTP ${res.status}`);
    }
    return data;
  }

  async function checkApiHealth() {
    if (!healthBadge) return;
    try {
      const h = await fetch("/api/health").then((r) => r.json());
      if (h?.ok) {
        healthBadge.textContent = `ONLINE · ${String(h.databaseMode || "POSTGRES").toUpperCase()}`;
        healthBadge.className = "spec-tag spec-tag-ok";
      } else {
        healthBadge.textContent = "STATIC PREVIEW MODE";
      }
    } catch {
      healthBadge.textContent = "STATIC PREVIEW MODE";
    }
  }

  function renderLoggedOut() {
    authLoggedOut.style.display = "flex";
    authLoggedIn.style.display = "none";
    vaultLocked.style.display = "block";
    vaultUnlocked.style.display = "none";
  }

  function renderVaultData(pullData) {
    authLoggedOut.style.display = "none";
    authLoggedIn.style.display = "flex";
    vaultLocked.style.display = "none";
    vaultUnlocked.style.display = "block";

    const u = pullData.user || {};
    userTitle.textContent = u.name ? `${u.name} (${u.email})` : u.email;
    const hintPairs = Object.entries(pullData.keyHints || {});
    userSub.textContent = `ID: ${u.id} · ${hintPairs.length} ENCRYPTED KEY(S)`;

    keyHintsEl.textContent = "";
    if (hintPairs.length === 0) {
      const empty = document.createElement("span");
      empty.style.fontSize = "12px";
      empty.style.color = "var(--ink-muted)";
      empty.textContent = "No encrypted API keys saved yet.";
      keyHintsEl.appendChild(empty);
    } else {
      for (const [prov, hint] of hintPairs) {
        const chip = document.createElement("span");
        chip.className = "hint-chip";
        const txt = document.createElement("span");
        txt.textContent = `${prov}: ${hint}`;
        const del = document.createElement("button");
        del.type = "button";
        del.title = `Delete ${prov} key from Postgres`;
        del.textContent = "×";
        del.addEventListener("click", async () => {
          try {
            await apiRequest("/api/sync/push", {
              method: "POST",
              body: { deletedProviders: [prov] },
            });
            await loadVault();
            setFeedback(`Deleted ${prov} key from Neon Postgres.`);
          } catch (err) {
            setFeedback(err.message, true);
          }
        });
        chip.append(txt, del);
        keyHintsEl.appendChild(chip);
      }
    }

    currentSettings = pullData.settings || {};
    if (currentSettings.primaryProvider) prefPrimary.value = currentSettings.primaryProvider;
    if (currentSettings.languageHint) prefLang.value = currentSettings.languageHint;
    if (currentSettings.fontSize) prefFont.value = currentSettings.fontSize;

    const subs = Array.isArray(pullData.subtitles) ? pullData.subtitles : [];
    cachedVaultSubtitles = subs;
    subsList.textContent = "";
    subsEmpty.style.display = subs.length === 0 ? "block" : "none";
    if (exportAllBtn) exportAllBtn.style.display = subs.length > 0 ? "inline-flex" : "none";

    const slugFor = (title) =>
      String(title || "overview")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 64) || "overview";

    for (const s of subs) {
      const row = document.createElement("div");
      row.style.cssText =
        "display:flex;align-items:center;justify-content:space-between;gap:10px;padding:8px 10px;border:1px solid var(--border);border-radius:3px;background:var(--bg);flex-wrap:wrap";
      const info = document.createElement("div");
      info.innerHTML = `<strong style="font-size:13px"></strong><div style="font-family:var(--mono);font-size:11px;color:var(--ink-muted)"></div>`;
      info.querySelector("strong").textContent = s.title || "Video Overview";
      info.querySelector("div").textContent = `${s.cueCount || s.cues?.length || 0} cues · ${
        s.provider || "stt"
      }`;

      const cues = Array.isArray(s.cues) ? s.cues : [];
      const slug = slugFor(s.title);
      const btnWrap = document.createElement("div");
      btnWrap.style.cssText = "display:flex;gap:5px;flex-wrap:wrap";

      const srtB = document.createElement("button");
      srtB.type = "button";
      srtB.className = "btn btn-sm";
      srtB.textContent = ".SRT";
      srtB.addEventListener("click", () => {
        const srt =
          cues
            .map(
              (c, idx) =>
                `${idx + 1}\n${formatSubTime(c.startSec, ",")} --> ${formatSubTime(
                  c.endSec,
                  ","
                )}\n${c.text}`
            )
            .join("\n\n") + "\n";
        downloadBlob(`\uFEFF${srt}`, `${slug}.srt`, "application/x-subrip;charset=utf-8");
      });

      const vttB = document.createElement("button");
      vttB.type = "button";
      vttB.className = "btn btn-sm";
      vttB.textContent = ".VTT";
      vttB.addEventListener("click", () => {
        const vtt =
          "WEBVTT\n\n" +
          cues
            .map(
              (c, idx) =>
                `${idx + 1}\n${formatSubTime(c.startSec, ".")} --> ${formatSubTime(
                  c.endSec,
                  "."
                )}\n${c.text}`
            )
            .join("\n\n") +
          "\n";
        downloadBlob(`\uFEFF${vtt}`, `${slug}.vtt`, "text/vtt;charset=utf-8");
      });

      const txtB = document.createElement("button");
      txtB.type = "button";
      txtB.className = "btn btn-sm";
      txtB.textContent = ".TXT";
      txtB.addEventListener("click", () => {
        const txt = `# ${s.title || "Video Overview"}\n\n${cues
          .map((c) => `[${formatClock(c.startSec)}] ${String(c.text || "").replace(/\s+/g, " ").trim()}`)
          .join("\n")}\n`;
        downloadBlob(`\uFEFF${txt}`, `${slug}.txt`, "text/plain;charset=utf-8");
      });

      const jsonB = document.createElement("button");
      jsonB.type = "button";
      jsonB.className = "btn btn-sm";
      jsonB.textContent = ".JSON";
      jsonB.addEventListener("click", () => {
        const payload = {
          schema: "lm-subs/v1",
          title: s.title || "Video Overview",
          language: s.language || "en",
          provider: s.provider,
          model: s.model,
          cueCount: cues.length,
          exportedAt: new Date().toISOString(),
          cues,
        };
        downloadBlob(
          `${JSON.stringify(payload, null, 2)}\n`,
          `${slug}.json`,
          "application/json;charset=utf-8"
        );
      });

      const copyB = document.createElement("button");
      copyB.type = "button";
      copyB.className = "btn btn-sm";
      copyB.textContent = "Copy";
      copyB.addEventListener("click", async () => {
        const txt = `# ${s.title || "Video Overview"}\n\n${cues
          .map((c) => `[${formatClock(c.startSec)}] ${String(c.text || "").replace(/\s+/g, " ").trim()}`)
          .join("\n")}\n`;
        try {
          await navigator.clipboard.writeText(txt);
          copyB.textContent = "Copied";
        } catch {
          downloadBlob(`\uFEFF${txt}`, `${slug}.txt`, "text/plain;charset=utf-8");
          copyB.textContent = "Saved";
        }
        setTimeout(() => {
          copyB.textContent = "Copy";
        }, 1200);
      });

      btnWrap.append(srtB, vttB, txtB, jsonB, copyB);
      row.append(info, btnWrap);
      subsList.appendChild(row);
    }
  }

  exportAllBtn?.addEventListener("click", () => {
    if (!cachedVaultSubtitles.length) return;
    const bundle = {
      schema: "lm-subs-vault/v1",
      exportedAt: new Date().toISOString(),
      count: cachedVaultSubtitles.length,
      transcripts: cachedVaultSubtitles,
    };
    downloadBlob(
      `${JSON.stringify(bundle, null, 2)}\n`,
      `lm-subs-vault-${new Date().toISOString().slice(0, 10)}.json`,
      "application/json;charset=utf-8"
    );
  });

  async function loadVault() {
    if (!activeToken) {
      renderLoggedOut();
      return;
    }
    try {
      const pull = await apiRequest("/api/sync/pull?includeSecrets=0");
      renderVaultData(pull);
    } catch {
      activeToken = "";
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      renderLoggedOut();
    }
  }

  signupBtn?.addEventListener("click", async () => {
    try {
      signupBtn.disabled = true;
      const res = await apiRequest("/api/auth/signup", {
        method: "POST",
        body: {
          email: authEmail.value.trim(),
          password: authPassword.value,
          name: authName.value.trim(),
          deviceLabel: "web-console",
        },
      });
      activeToken = res.token;
      localStorage.setItem(TOKEN_STORAGE_KEY, activeToken);
      authPassword.value = "";
      await loadVault();
      setFeedback("Neon account created & session active.");
    } catch (err) {
      setFeedback(err.message, true);
    } finally {
      signupBtn.disabled = false;
    }
  });

  signinBtn?.addEventListener("click", async () => {
    try {
      signinBtn.disabled = true;
      const res = await apiRequest("/api/auth/signin", {
        method: "POST",
        body: {
          email: authEmail.value.trim(),
          password: authPassword.value,
          deviceLabel: "web-console",
        },
      });
      activeToken = res.token;
      localStorage.setItem(TOKEN_STORAGE_KEY, activeToken);
      authPassword.value = "";
      await loadVault();
      setFeedback("Signed in to Neon Lakebase Postgres.");
    } catch (err) {
      setFeedback(err.message, true);
    } finally {
      signinBtn.disabled = false;
    }
  });

  signoutBtn?.addEventListener("click", async () => {
    try {
      await apiRequest("/api/auth/signout", { method: "POST" });
    } catch {
      // Ignore
    }
    activeToken = "";
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    if (extTokenOutput) extTokenOutput.value = "";
    renderLoggedOut();
    setFeedback("Signed out.");
  });

  refreshVaultBtn?.addEventListener("click", async () => {
    await loadVault();
    setFeedback("Refreshed cloud vault.");
  });

  mintTokenBtn?.addEventListener("click", async () => {
    try {
      const res = await apiRequest("/api/auth/extension-token", { method: "POST" });
      extTokenOutput.value = res.token;
      try {
        await navigator.clipboard.writeText(res.token);
        setFeedback("Minted & copied Extension Sync Token to clipboard.");
      } catch {
        setFeedback("Minted Extension Sync Token — copy and paste into LM Subs Settings.");
      }
    } catch (err) {
      setFeedback(err.message, true);
    }
  });

  saveKeyBtn?.addEventListener("click", async () => {
    const prov = keyProvider.value;
    const raw = keySecret.value.trim();
    if (!raw) {
      setFeedback("Paste an API key first.", true);
      return;
    }
    try {
      saveKeyBtn.disabled = true;
      await apiRequest("/api/sync/push", {
        method: "POST",
        body: {
          apiKeys: { [prov]: raw },
        },
      });
      keySecret.value = "";
      await loadVault();
      setFeedback(`Encrypted & saved ${prov} key to Neon Postgres.`);
    } catch (err) {
      setFeedback(err.message, true);
    } finally {
      saveKeyBtn.disabled = false;
    }
  });

  savePrefsBtn?.addEventListener("click", async () => {
    try {
      savePrefsBtn.disabled = true;
      const merged = {
        ...currentSettings,
        primaryProvider: prefPrimary.value,
        languageHint: prefLang.value,
        fontSize: prefFont.value,
      };
      await apiRequest("/api/sync/push", {
        method: "POST",
        body: { settings: merged },
      });
      await loadVault();
      setFeedback("Preferences synced to Neon Postgres.");
    } catch (err) {
      setFeedback(err.message, true);
    } finally {
      savePrefsBtn.disabled = false;
    }
  });

  checkApiHealth();
  loadVault();
})();
