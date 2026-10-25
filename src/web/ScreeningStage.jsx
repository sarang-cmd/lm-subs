import React, { useEffect, useMemo, useState } from "react";
import { Tabs } from "radix-ui";
import { motion, useReducedMotion } from "motion/react";
import { serializeSubtitles } from "../lib/subtitles.js";
import { SAMPLE_VIDEO_OVERVIEW } from "./demo-data.jsx";

function formatClock(sec) {
  const s = Math.max(0, Math.floor(sec));
  const mm = String(Math.floor(s / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

export function ScreeningStage() {
  const prefersReducedMotion = useReducedMotion();
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(6.2);
  const [fontSize, setFontSize] = useState("medium");
  const [captionTheme, setCaptionTheme] = useState("classic");
  const [captionColor, setCaptionColor] = useState("white");
  const [offsetSec, setOffsetSec] = useState(0);
  const [panelTab, setPanelTab] = useState("cues");
  const [exportFormat, setExportFormat] = useState("srt");
  const [copied, setCopied] = useState(false);
  const [failoverState, setFailoverState] = useState("idle");

  useEffect(() => {
    if (!playing) return undefined;
    const id = window.setInterval(() => {
      setCurrentTime((prev) => {
        const next = prev + 0.25;
        return next >= SAMPLE_VIDEO_OVERVIEW.durationSec ? 0 : next;
      });
    }, 250);
    return () => window.clearInterval(id);
  }, [playing]);

  const effectiveTime = Math.max(0, currentTime - offsetSec);

  const activeCue = useMemo(() => {
    return (
      SAMPLE_VIDEO_OVERVIEW.cues.find(
        (c) => effectiveTime >= c.startSec && effectiveTime < c.endSec
      ) || SAMPLE_VIDEO_OVERVIEW.cues[0]
    );
  }, [effectiveTime]);

  const activeSlide = useMemo(() => {
    return (
      SAMPLE_VIDEO_OVERVIEW.slides.find((s) => currentTime <= s.untilSec) ||
      SAMPLE_VIDEO_OVERVIEW.slides[SAMPLE_VIDEO_OVERVIEW.slides.length - 1]
    );
  }, [currentTime]);

  const serializedPreview = useMemo(() => {
    return serializeSubtitles(SAMPLE_VIDEO_OVERVIEW.cues, exportFormat, {
      title: SAMPLE_VIDEO_OVERVIEW.title,
      language: SAMPLE_VIDEO_OVERVIEW.language,
      provider: failoverState === "done" ? "mistral" : "groq",
      model:
        failoverState === "done"
          ? "voxtral-mini-latest"
          : SAMPLE_VIDEO_OVERVIEW.model,
    });
  }, [exportFormat, failoverState]);

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
        ? "Simulated demo: Transcribing 3.4 MB audio stream with Mistral Voxtral…"
        : failoverState === "done"
          ? "Simulated demo complete: Mistral delivered 6 cues in 2.6s"
          : "Sample NotebookLM player: 3.4 MB audio stream, 6 cues synchronized";

  return (
    <motion.section
      className="screening-stage"
      aria-label="Interactive NotebookLM caption preview"
      initial={prefersReducedMotion ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="stage-topbar">
        <span className="stage-video-title">{SAMPLE_VIDEO_OVERVIEW.title}</span>
        <span className="stage-meta" aria-live="polite">
          {statusText}
        </span>
      </div>

      <div className="stage-body">
        <div className="stage-viewport">
          <div className="stage-slide-canvas">
            <div className="stage-slide-topic">{activeSlide.topic}</div>
            <h2 className="stage-slide-heading">{activeSlide.heading}</h2>
            <ul className="stage-slide-points">
              {activeSlide.points.map((pt) => (
                <li key={pt}>{pt}</li>
              ))}
            </ul>
          </div>

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
            {activeCue.text}
          </div>

          <div className="stage-controls">
            <label htmlFor="stage-scrubber-input" style={{ position: "absolute", left: "-9999px" }}>
              Playback position
            </label>
            <input
              id="stage-scrubber-input"
              className="stage-scrubber"
              type="range"
              min="0"
              max={SAMPLE_VIDEO_OVERVIEW.durationSec}
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
                  {playing ? "Pause" : "Play demo"}
                </button>
                <span className="stage-meta">
                  {formatClock(currentTime)} / {formatClock(SAMPLE_VIDEO_OVERVIEW.durationSec)}
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
            {SAMPLE_VIDEO_OVERVIEW.cues.map((cue) => {
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
