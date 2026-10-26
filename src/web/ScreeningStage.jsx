import React, { useEffect, useMemo, useState } from "react";
import { Tabs } from "radix-ui";
import { motion, useReducedMotion } from "motion/react";
import { serializeSubtitles } from "../lib/subtitles.js";
import { SAMPLE_AUDIO_OVERVIEW, SAMPLE_VIDEO_OVERVIEW } from "./demo-data.jsx";

function formatClock(sec) {
  const s = Math.max(0, Math.floor(sec));
  const mm = String(Math.floor(s / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

export function ScreeningStage() {
  const prefersReducedMotion = useReducedMotion();
  const [stageMode, setStageMode] = useState("video");
  const [playing, setPlaying] = useState(false);
  const [ccEnabled, setCcEnabled] = useState(true);
  const [wordHighlight, setWordHighlight] = useState(true);
  const [highlightDelayMs, setHighlightDelayMs] = useState(0);
  const [currentTime, setCurrentTime] = useState(6.2);
  const [fontSize, setFontSize] = useState("medium");
  const [captionTheme, setCaptionTheme] = useState("classic");
  const [captionColor, setCaptionColor] = useState("white");
  const [offsetSec, setOffsetSec] = useState(0);
  const [panelTab, setPanelTab] = useState("cues");
  const [exportFormat, setExportFormat] = useState("srt");
  const [copied, setCopied] = useState(false);
  const [failoverState, setFailoverState] = useState("idle");

  const activeSample =
    stageMode === "audio" ? SAMPLE_AUDIO_OVERVIEW : SAMPLE_VIDEO_OVERVIEW;

  useEffect(() => {
    if (!playing) return undefined;
    const id = window.setInterval(() => {
      setCurrentTime((prev) => {
        const next = prev + 0.25;
        return next >= activeSample.durationSec ? 0 : next;
      });
    }, 250);
    return () => window.clearInterval(id);
  }, [playing, activeSample.durationSec]);

  const effectiveTime = Math.max(0, currentTime - offsetSec);

  const activeCue = useMemo(() => {
    return (
      activeSample.cues.find(
        (c) => effectiveTime >= c.startSec && effectiveTime < c.endSec
      ) || activeSample.cues[0]
    );
  }, [effectiveTime, activeSample]);

  const activeSlide = useMemo(() => {
    return (
      SAMPLE_VIDEO_OVERVIEW.slides.find((s) => currentTime <= s.untilSec) ||
      SAMPLE_VIDEO_OVERVIEW.slides[SAMPLE_VIDEO_OVERVIEW.slides.length - 1]
    );
  }, [currentTime]);

  const serializedPreview = useMemo(() => {
    return serializeSubtitles(activeSample.cues, exportFormat, {
      title: activeSample.title,
      language: activeSample.language,
      provider: failoverState === "done" ? "mistral" : "groq",
      model:
        failoverState === "done"
          ? "voxtral-mini-latest"
          : activeSample.model,
    });
  }, [activeSample, exportFormat, failoverState]);

  function runSimulatedFailover() {
    setFailoverState("step1");
    window.setTimeout(() => setFailoverState("step2"), 550);
    window.setTimeout(() => setFailoverState("done"), 1150);
  }

  function handleDownloadSample() {
    const blob = new Blob(["\uFEFF", serializedPreview.content], {
      type: serializedPreview.mimeType,
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = serializedPreview.filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 3000);
  }

  async function handleCopySample() {
    try {
      await navigator.clipboard.writeText(serializedPreview.content);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      handleDownloadSample();
    }
  }

  const statusText =
    failoverState === "step1"
      ? "Simulated demo: Groq returned HTTP 429, advancing to #2 Mistral…"
      : failoverState === "step2"
        ? "Simulated demo: Transcribing audio stream with Mistral Voxtral…"
        : failoverState === "done"
          ? "Simulated demo complete: Mistral delivered 6 cues in 2.6s"
          : stageMode === "audio"
            ? "Sample Audio Overview podcast: 3.0 MB audio stream, 2 hosts synchronized"
            : "Sample Video Overview player: 3.4 MB audio stream, 6 cues synchronized";

  return (
    <motion.section
      className="screening-stage"
      aria-label="Interactive NotebookLM caption preview"
      initial={prefersReducedMotion ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="stage-topbar" style={{ flexWrap: "wrap", gap: "8px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
          <div
            role="group"
            aria-label="Preview overview mode"
            style={{
              display: "inline-flex",
              gap: "3px",
              padding: "2px",
              borderRadius: "6px",
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.1)",
            }}
          >
            <button
              type="button"
              className="stage-btn"
              data-active={stageMode === "video" ? "true" : "false"}
              onClick={() => setStageMode("video")}
            >
              Video Overview
            </button>
            <button
              type="button"
              className="stage-btn"
              data-active={stageMode === "audio" ? "true" : "false"}
              onClick={() => setStageMode("audio")}
            >
              Audio Overview (Podcast)
            </button>
          </div>
          <span className="stage-video-title">{activeSample.title}</span>
        </div>
        <span className="stage-meta" aria-live="polite">
          {statusText}
        </span>
      </div>

      <div className="stage-body">
        <div className="stage-viewport">
          {stageMode === "audio" ? (
            <div className="stage-slide-canvas">
              <div className="stage-slide-topic">
                NotebookLM Studio Audio Overview (Two-Host Podcast)
              </div>
              <h2 className="stage-slide-heading">
                Synchronized podcast captions and speaker turn tracking
              </h2>
              <div
                aria-hidden="true"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "5px",
                  height: "48px",
                  margin: "16px 0 12px",
                }}
              >
                {[18, 34, 24, 44, 30, 48, 22, 38, 46, 28, 36, 20, 42, 32, 26, 40, 24, 34, 18, 28].map(
                  (barH, idx) => {
                    const activeBar =
                      idx / 20 <= currentTime / activeSample.durationSec;
                    return (
                      <span
                        key={idx}
                        style={{
                          width: "6px",
                          height: `${barH}px`,
                          borderRadius: "3px",
                          background: activeBar
                            ? "#3b82f6"
                            : "rgba(255, 255, 255, 0.2)",
                          transition: "background-color 150ms ease",
                        }}
                      />
                    );
                  }
                )}
              </div>
              <div style={{ fontSize: "13px", color: "rgba(246, 247, 248, 0.72)" }}>
                Active speaker: <strong style={{ color: "#ffffff" }}>{activeCue.speaker || "Host 1"}</strong>
              </div>
            </div>
          ) : (
            <div className="stage-slide-canvas">
              <div className="stage-slide-topic">{activeSlide.topic}</div>
              <h2 className="stage-slide-heading">{activeSlide.heading}</h2>
              <ul className="stage-slide-points">
                {activeSlide.points.map((pt) => (
                  <li key={pt}>{pt}</li>
                ))}
              </ul>
            </div>
          )}

          {ccEnabled && (
            <div
              className="stage-caption-overlay"
              data-size={fontSize}
              style={{
                background:
                  captionTheme === "minimal"
                    ? "transparent"
                    : captionTheme === "paper"
                      ? "rgba(253, 253, 254, 0.94)"
                      : captionTheme === "amber"
                        ? "rgba(28, 22, 12, 0.92)"
                        : captionTheme === "contrast"
                          ? "#050608"
                          : "rgba(15, 17, 20, 0.92)",
                borderColor:
                  captionTheme === "minimal"
                    ? "transparent"
                    : captionTheme === "contrast"
                      ? "#3b82f6"
                      : captionTheme === "amber"
                        ? "rgba(251, 191, 36, 0.35)"
                        : "rgba(255, 255, 255, 0.12)",
                borderRadius: captionTheme === "cinema" ? "999px" : "6px",
                textShadow:
                  captionTheme === "minimal"
                    ? "0 1px 3px rgba(0, 0, 0, 0.95), 0 0 10px rgba(0, 0, 0, 0.85)"
                    : "none",
                color:
                  captionTheme === "paper" && captionColor === "white"
                    ? "#111315"
                    : captionTheme === "amber" && captionColor === "white"
                      ? "#fde68a"
                      : captionColor === "yellow"
                        ? "#fde047"
                        : captionColor === "cyan"
                          ? "#67e8f9"
                          : "#fdfdfe",
              }}
              aria-live="off"
            >
              {(() => {
                if (!wordHighlight) return activeCue.text;
                const words = activeCue.text.split(/(\s+)/);
                const nonSpace = words.filter((w) => w.trim()).length || 1;
                const delayed = effectiveTime - highlightDelayMs / 1000;
                const rawProg =
                  (delayed - activeCue.startSec) /
                  Math.max(0.25, activeCue.endSec - activeCue.startSec);
                const cueProgress = Math.max(0, Math.min(1, rawProg));
                const activeIdx =
                  highlightDelayMs > 0 && rawProg < 0
                    ? 0
                    : Math.min(
                        nonSpace,
                        Math.max(1, Math.ceil(cueProgress * nonSpace))
                      );
                let seen = 0;
                return words.map((tok, idx) => {
                  if (!tok.trim()) return <span key={idx}>{tok}</span>;
                  seen += 1;
                  if (seen === activeIdx) {
                    return (
                      <span
                        key={idx}
                        style={{
                          background:
                            captionTheme === "paper"
                              ? "rgba(0, 85, 212, 0.16)"
                              : "rgba(29, 92, 246, 0.48)",
                          color:
                            captionTheme === "paper" ? "#0055d4" : "#ffffff",
                          padding: "1px 5px",
                          borderRadius: "4px",
                          fontWeight: 600,
                        }}
                      >
                        {tok}
                      </span>
                    );
                  }
                  if (seen > activeIdx) {
                    return (
                      <span key={idx} style={{ opacity: 0.64 }}>
                        {tok}
                      </span>
                    );
                  }
                  return <span key={idx}>{tok}</span>;
                });
              })()}
            </div>
          )}

          <div className="stage-controls">
            <label htmlFor="stage-scrubber-input" style={{ position: "absolute", left: "-9999px" }}>
              Playback position
            </label>
            <input
              id="stage-scrubber-input"
              className="stage-scrubber"
              type="range"
              min="0"
              max={activeSample.durationSec}
              step="0.1"
              value={currentTime}
              onChange={(e) => setCurrentTime(Number(e.target.value))}
            />

            <div className="stage-control-row">
              <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                <button
                  type="button"
                  className="stage-btn"
                  data-active={playing ? "true" : "false"}
                  onClick={() => setPlaying((p) => !p)}
                >
                  {playing ? "Pause" : "Play"}
                </button>
                <button
                  type="button"
                  className="stage-btn"
                  data-active={ccEnabled ? "true" : "false"}
                  title="Toggle closed captions"
                  onClick={() => setCcEnabled((v) => !v)}
                  style={{
                    fontWeight: 700,
                    letterSpacing: "0.03em",
                    boxShadow: ccEnabled ? "inset 0 -2px 0 #3b82f6" : "none",
                  }}
                >
                  CC
                </button>
                <button
                  type="button"
                  className="stage-btn"
                  data-active={wordHighlight ? "true" : "false"}
                  title="Toggle spoken-word highlight"
                  onClick={() => setWordHighlight((v) => !v)}
                >
                  Highlight
                </button>
                <label htmlFor="stage-delay-select" className="stage-meta">
                  Word delay
                </label>
                <select
                  id="stage-delay-select"
                  className="stage-btn"
                  value={highlightDelayMs}
                  onChange={(e) => setHighlightDelayMs(Number(e.target.value))}
                >
                  <option value={0}>0 ms</option>
                  <option value={150}>+150 ms</option>
                  <option value={300}>+300 ms</option>
                  <option value={500}>+500 ms</option>
                </select>
                <span className="stage-meta">
                  {formatClock(currentTime)} / {formatClock(activeSample.durationSec)}
                </span>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                <label htmlFor="stage-size-select" className="stage-meta">
                  Size
                </label>
                <select
                  id="stage-size-select"
                  className="stage-btn"
                  value={fontSize}
                  onChange={(e) => setFontSize(e.target.value)}
                >
                  <option value="small">Small</option>
                  <option value="medium">Medium</option>
                  <option value="large">Large</option>
                  <option value="xlarge">Extra large</option>
                </select>

                <label htmlFor="stage-theme-select" className="stage-meta">
                  Theme
                </label>
                <select
                  id="stage-theme-select"
                  className="stage-btn"
                  value={captionTheme}
                  onChange={(e) => setCaptionTheme(e.target.value)}
                >
                  <option value="classic">Dark box</option>
                  <option value="contrast">High contrast</option>
                  <option value="minimal">Clean text</option>
                  <option value="cinema">Cinema pill</option>
                  <option value="paper">Paper card</option>
                  <option value="amber">Warm study</option>
                </select>

                <label htmlFor="stage-color-select" className="stage-meta">
                  Color
                </label>
                <select
                  id="stage-color-select"
                  className="stage-btn"
                  value={captionColor}
                  onChange={(e) => setCaptionColor(e.target.value)}
                >
                  <option value="white">White</option>
                  <option value="yellow">Yellow</option>
                  <option value="cyan">Cyan</option>
                </select>

                <button
                  type="button"
                  className="stage-btn"
                  onClick={() =>
                    setOffsetSec((v) => Math.max(-2, Math.round((v - 0.25) * 100) / 100))
                  }
                  title="Shift captions earlier by 0.25s"
                >
                  -0.25s
                </button>
                <span className="stage-meta" style={{ minWidth: "44px", textAlign: "center" }}>
                  {offsetSec >= 0 ? `+${offsetSec.toFixed(2)}s` : `${offsetSec.toFixed(2)}s`}
                </span>
                <button
                  type="button"
                  className="stage-btn"
                  onClick={() =>
                    setOffsetSec((v) => Math.min(2, Math.round((v + 0.25) * 100) / 100))
                  }
                  title="Shift captions later by 0.25s"
                >
                  +0.25s
                </button>
              </div>
            </div>
          </div>
        </div>

        <Tabs.Root
          className="stage-sidepanel"
          value={panelTab}
          onValueChange={setPanelTab}
        >
          <div
            style={{
              padding: "10px 12px",
              borderBottom: "1px solid var(--border-theater)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "8px",
            }}
          >
            <Tabs.List
              aria-label="Transcript inspector"
              style={{ display: "inline-flex", gap: "4px" }}
            >
              <Tabs.Trigger
                value="cues"
                className="stage-btn"
                data-active={panelTab === "cues" ? "true" : "false"}
              >
                Transcript cues
              </Tabs.Trigger>
              <Tabs.Trigger
                value="export"
                className="stage-btn"
                data-active={panelTab === "export" ? "true" : "false"}
              >
                Export formats
              </Tabs.Trigger>
            </Tabs.List>

            <button
              type="button"
              className="stage-btn"
              onClick={runSimulatedFailover}
              disabled={failoverState === "step1" || failoverState === "step2"}
            >
              Simulate 429 failover
            </button>
          </div>

          <Tabs.Content value="cues" className="stage-cue-list">
            {activeSample.cues.map((cue) => {
              const isCurrent = cue.startSec === activeCue.startSec;
              return (
                <button
                  key={cue.startSec}
                  type="button"
                  className="stage-cue-btn"
                  data-current={isCurrent ? "true" : "false"}
                  onClick={() => setCurrentTime(cue.startSec + 0.05)}
                >
                  <span className="stage-cue-time">{formatClock(cue.startSec)}</span>
                  <span>{cue.text}</span>
                </button>
              );
            })}
          </Tabs.Content>

          <Tabs.Content value="export">
            <div
              style={{
                padding: "8px 12px",
                borderBottom: "1px solid var(--border-theater)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "6px",
                flexWrap: "wrap",
              }}
            >
              <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
                {["srt", "vtt", "txt", "md", "csv", "json"].map((fmt) => (
                  <button
                    key={fmt}
                    type="button"
                    className="stage-btn"
                    data-active={exportFormat === fmt ? "true" : "false"}
                    onClick={() => setExportFormat(fmt)}
                  >
                    .{fmt}
                  </button>
                ))}
              </div>
              <div style={{ display: "flex", gap: "6px" }}>
                <button type="button" className="stage-btn" onClick={handleCopySample}>
                  {copied ? "Copied" : "Copy"}
                </button>
                <button
                  type="button"
                  className="stage-btn"
                  data-active="true"
                  onClick={handleDownloadSample}
                >
                  Download .{exportFormat}
                </button>
              </div>
            </div>
            <pre className="stage-export-preview">{serializedPreview.content}</pre>
          </Tabs.Content>

          <div className="stage-footer-bar">
            <span>Click any cue to jump playback</span>
            <span>Interactive sample preview</span>
          </div>
        </Tabs.Root>
      </div>
    </motion.section>
  );
}
