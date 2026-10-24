/**
 * Interactive Landing Page Simulator & Provider Filter (`docs/site.js`).
 */

(() => {
  const DEMO_CUES = [
    {
      startSec: 0.0,
      endSec: 4.2,
      slideKicker: "SECTION 01 · CONSENSUS SAFETY",
      slideTitle: "Distributed Consensus & Raft",
      text: "Welcome to this NotebookLM Video Overview\non distributed consensus with Raft.",
    },
    {
      startSec: 4.3,
      endSec: 8.8,
      slideKicker: "SECTION 01 · LEADER ELECTION",
      slideTitle: "Term-Numbered Leader Election",
      text: "Every cluster term elects at most one leader\nusing randomized heartbeat timeouts.",
    },
    {
      startSec: 8.9,
      endSec: 14.2,
      slideKicker: "SECTION 02 · LOG REPLICATION",
      slideTitle: "Quorum AppendEntries Replication",
      text: "Once a majority of followers append an entry,\nthe leader marks it committed safely.",
    },
    {
      startSec: 14.3,
      endSec: 20.0,
      slideKicker: "SECTION 03 · SUBTITLE EXPORT",
      slideTitle: "Local .M4A Slimming + Multi-Provider BYOK",
      text: "Stripping the video track locally cuts upload size\nby over ninety percent before transcription.",
    },
  ];

  // Theme toggle
  const themeBtn = document.getElementById("theme-toggle");
  const prefersDark =
    window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  let currentTheme = localStorage.getItem("nlm-sub-theme") || (prefersDark ? "dark" : "light");

  function applyTheme(t) {
    currentTheme = t;
    document.documentElement.setAttribute("data-theme", t);
    if (themeBtn) themeBtn.textContent = t === "dark" ? "Light" : "Dark";
  }
  applyTheme(currentTheme);

  themeBtn?.addEventListener("click", () => {
    const next = currentTheme === "dark" ? "light" : "dark";
    localStorage.setItem("nlm-sub-theme", next);
    applyTheme(next);
  });

  // Provider table category filter
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

  // Interactive Pipeline & Player Simulator
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
  const captionEl = document.getElementById("sim-caption");
  const slideKickerEl = document.getElementById("sim-slide-kicker");
  const slideTitleEl = document.getElementById("sim-slide-title");
  const playBtn = document.getElementById("sim-play-btn");
  const rangeEl = document.getElementById("sim-range");
  const timeEl = document.getElementById("sim-time");

  let ccEnabled = true;
  let fontIdx = 1;
  const fontSizes = ["13.5px", "16px", "19px", "22px"];
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
    offsetSec = Math.round((offsetSec - 0.25) * 100) / 100;
    renderPlayerState();
  });

  offsetUpBtn?.addEventListener("click", () => {
    offsetSec = Math.round((offsetSec + 0.25) * 100) / 100;
    renderPlayerState();
  });

  offsetLblBtn?.addEventListener("click", () => {
    offsetSec = 0;
    renderPlayerState();
  });

  function triggerDownload(content, name, mime) {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  dlSrtBtn?.addEventListener("click", () => {
    const srt =
      DEMO_CUES.map(
        (c, i) =>
          `${i + 1}\n${formatSubTime(c.startSec, ",")} --> ${formatSubTime(
            c.endSec,
            ","
          )}\n${c.text}`
      ).join("\n\n") + "\n";
    triggerDownload(srt, "raft-consensus-overview.srt", "application/x-subrip;charset=utf-8");
  });

  dlVttBtn?.addEventListener("click", () => {
    const vtt =
      "WEBVTT\n\n" +
      DEMO_CUES.map(
        (c, i) =>
          `${i + 1}\n${formatSubTime(c.startSec, ".")} --> ${formatSubTime(
            c.endSec,
            "."
          )}\n${c.text}`
      ).join("\n\n") +
      "\n";
    triggerDownload(vtt, "raft-consensus-overview.vtt", "text/vtt;charset=utf-8");
  });

  function sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
  }

  async function runSimulation() {
    if (!runBtn || !logBox) return;
    runBtn.disabled = true;
    logBox.textContent = "";

    appendLog("[00.00s] page.js observed POST /_/LabsTailwindUi/data/batchexecute (gArtLc)");
    await sleep(320);
    appendLog("[00.08s] Matched row[2]===3 (VIDEO_OVERVIEW) · status=READY · lang=\"en\"");
    await sleep(340);
    appendLog("[00.24s] SSRF guard verified https://lh3.googleusercontent.com/notebooklm/...=m22-dv");
    await sleep(380);
    appendLog("[00.41s] extractAudioTrackFromMp4(): stripped H.264 vide track (58.4 MB -> 4.3 MB .m4a, -92.6%)", "ok");
    await sleep(380);

    if (failoverToggle?.checked) {
      appendLog("[00.62s] Queue #1 Groq (whisper-large-v3-turbo) -> HTTP 429 RPM rate limit", "warn");
      await sleep(360);
      appendLog("[00.63s] Failing over automatically to Queue #2 Mistral (voxtral-mini-transcribe-3)…", "warn");
      await sleep(480);
      appendLog("[01.84s] Mistral returned 64 timed cues · cached in chrome.storage.local", "ok");
    } else {
      appendLog("[00.62s] Queue #1 Groq (whisper-large-v3-turbo) -> HTTP 200 OK in 740 ms", "ok");
      await sleep(380);
      appendLog("[01.36s] Groq returned 64 word-aligned cues · cached in chrome.storage.local", "ok");
    }

    appendLog("[01.86s] Injected Shadow-DOM player overlay + VTTCue PiP track. Playing preview…", "ok");
    currentTime = 0;
    renderPlayerState();
    if (!playTimer) togglePlayback();
    runBtn.disabled = false;
  }

  runBtn?.addEventListener("click", runSimulation);

  // Seed initial terminal log & player state
  appendLog("[Ready] Click 'Simulate Video Overview Generation' to trace the 3-world MV3 pipeline.");
  appendLog("[Info] Player controls ([CC], [A-/A+], [±0.25s], [.SRT], [.VTT]) are live right now.", "ok");
  renderPlayerState();
})();
