import React, { useEffect, useMemo, useState } from "react";
import { Switch, Tooltip } from "radix-ui";
import { maskEmail } from "../lib/avatars.js";
import { buildSampleStatsDataset } from "./demo-data.jsx";
import {
  buildUnifiedStatsReport,
  formatMegabytesValue,
  formatMinutesLabel,
} from "../lib/stats-model.js";

const numFmt = new Intl.NumberFormat("en-US");

function formatMegabytes(bytes) {
  return formatMegabytesValue(bytes);
}

export function StatsView({ token, user, onOpenSignIn }) {
  const [liveStats, setLiveStats] = useState(null);
  const [loading, setLoading] = useState(Boolean(token));
  const [error, setError] = useState("");
  const [showSample, setShowSample] = useState(false);

  async function loadStats() {
    if (!token) {
      setLiveStats(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/stats", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok || !data?.ok) {
        setError(data?.error || "Could not load account statistics.");
        return;
      }
      setLiveStats(data);
    } catch {
      setError("Network error while loading statistics.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadStats();
  }, [token]);

  const sampleDataset = useMemo(() => buildSampleStatsDataset(), []);

  const [notebookLmStats, setNotebookLmStats] = useState(null);

  useEffect(() => {
    if (!token) {
      setNotebookLmStats(null);
      return;
    }
    fetch("/api/notebooklm/stats", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setNotebookLmStats(d?.ok ? d.stats : null))
      .catch(() => setNotebookLmStats(null));
  }, [token]);

  // One unified report powers the website, the extension settings page, and the
  // toolbar popup, so every surface shows identical numbers.
  const unified = useMemo(
    () =>
      buildUnifiedStatsReport({
        cacheList: [],
        notebookLmStats: showSample ? sampleDataset.notebookLm : notebookLmStats,
        cloudStats: showSample ? sampleDataset : liveStats,
      }),
    [liveStats, notebookLmStats, sampleDataset, showSample]
  );

  const hasLiveVideos = Boolean(unified?.totals?.videosCaptioned > 0);
  const activeStats = unified;
  const totals = unified.totals;
  const notebookLm = unified.notebookLm;

  const dailySeries = unified.dailySeries;

  const maxDailyVideos = Math.max(
    1,
    ...dailySeries.map((d) => Number(d.videos) || 0)
  );

  return (
    <Tooltip.Provider delayDuration={150}>
      <div className="page-wrap">
        <section className="section-block">
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
              <h1 className="section-heading" style={{ marginBottom: "8px" }}>
                Statistics and metrics
              </h1>
              <p className="section-prose" style={{ marginBottom: 0 }}>
                {user
                  ? `Real transcription telemetry for ${maskEmail(user.email) || "your account"}, aggregated from your synced NotebookLM Video Overviews.`
                  : "Sign in to view your real transcription volume, provider latency, and bandwidth savings across devices."}
              </p>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
              <div style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
                <label
                  htmlFor="sample-stats-toggle"
                  style={{ fontSize: "13.5px", fontWeight: 500, cursor: "pointer" }}
                >
                  Preview sample dataset
                </label>
                <Switch.Root
                  id="sample-stats-toggle"
                  className="radix-switch-root"
                  checked={showSample}
                  onCheckedChange={setShowSample}
                >
                  <Switch.Thumb className="radix-switch-thumb" />
                </Switch.Root>
              </div>

              {token ? (
                <button
                  type="button"
                  className="btn btn-sm"
                  onClick={loadStats}
                  disabled={loading}
                >
                  {loading ? "Refreshing…" : "Refresh"}
                </button>
              ) : (
                <button
                  type="button"
                  className="btn btn-sm btn-primary"
                  onClick={onOpenSignIn}
                >
                  Sign in
                </button>
              )}
            </div>
          </div>

          {showSample ? (
            <div
              className="notice-banner"
              data-tone="sample"
              role="status"
              style={{ marginTop: "20px", marginBottom: 0 }}
            >
              Showing clearly labeled <strong>illustrative sample data</strong> (25 example Video Overviews) so you can inspect the layout. Switch off “Preview sample dataset” at any time to view your live database numbers.
            </div>
          ) : !token ? (
            <div className="notice-banner" style={{ marginTop: "20px", marginBottom: 0 }}>
              You are currently signed out, so live counters read zero. Sign in with Google, GitHub, or email, or toggle “Preview sample dataset” to inspect an example report.
            </div>
          ) : !loading && !hasLiveVideos ? (
            <div className="notice-banner" style={{ marginTop: "20px", marginBottom: 0 }}>
              Your account has 0 synced transcriptions so far. Caption a Video Overview in Google NotebookLM with transcription sync enabled, or toggle “Preview sample dataset” to inspect an example report.
            </div>
          ) : null}

          {error ? (
            <div className="field-error" role="alert" style={{ marginTop: "12px" }}>
              {error}
            </div>
          ) : null}

          {/* Unboxed 4-cell KPI Strip */}
          <div className="kpi-strip">
            <div className="kpi-cell">
              <div className="kpi-value">
                {numFmt.format(totals.videosCaptioned || 0)}
              </div>
              <div className="kpi-label">Videos captioned</div>
              <div className="kpi-sub">
                {numFmt.format(totals.spokenMinutes || 0)} min spoken audio indexed
              </div>
            </div>

            <div className="kpi-cell">
              <div className="kpi-value">
                {numFmt.format(totals.totalCues || 0)}
              </div>
              <div className="kpi-label">Caption cues</div>
              <div className="kpi-sub">
                {numFmt.format(totals.cloudHitCount || 0)} cross-device cache{" "}
                {Number(totals.cloudHitCount) === 1 ? "hit" : "hits"}
              </div>
            </div>

            <div className="kpi-cell">
              <div className="kpi-value">
                {formatMegabytes(totals.bandwidthSavedBytes || 0)}
              </div>
              <div className="kpi-label">Video upload avoided</div>
              <div className="kpi-sub">
                Audio-only stream extraction
              </div>
            </div>

            <div className="kpi-cell">
              <div className="kpi-value">
                {totals.medianLatencyMs
                  ? `${(totals.medianLatencyMs / 1000).toFixed(1)}s`
                  : "n/a"}
              </div>
              <div className="kpi-label">Median speed</div>
              <div className="kpi-sub">
                {numFmt.format(totals.failoverCount || 0)} rate-limit{" "}
                {Number(totals.failoverCount) === 1 ? "failover" : "failovers"},{" "}
                {numFmt.format(totals.exportCount || 0)}{" "}
                {Number(totals.exportCount) === 1 ? "export" : "exports"}
              </div>
            </div>
          </div>

          {/* 14-Day Daily Activity + Provider Breakdown */}
          <div className="split-section">
            <div>
              <h2 className="section-heading" style={{ fontSize: "1.35rem" }}>
                14-day transcription volume
              </h2>
              <p className="section-prose" style={{ fontSize: "14.5px" }}>
                Daily Video Overviews captioned over the past two weeks (UTC). Hover or focus any bar for exact cue and byte counts.
              </p>

              <div className="chart-scroll">
                <div
                  className="chart-bars"
                  role="list"
                  aria-label="14-day transcription counts"
                >
                {dailySeries.map((day) => {
                  const pct =
                    day.videos > 0
                      ? Math.max(12, Math.round((day.videos / maxDailyVideos) * 100))
                      : 3;
                  const shortDate = day.date.slice(5);
                  return (
                    <Tooltip.Root key={day.date}>
                      <Tooltip.Trigger asChild>
                        <button
                          type="button"
                          role="listitem"
                          className="chart-col"
                          style={{
                            appearance: "none",
                            border: 0,
                            background: "transparent",
                            padding: 0,
                            cursor: "pointer",
                          }}
                          aria-label={`${day.date}: ${day.videos} videos, ${day.cues} cues`}
                        >
                          <div
                            className="chart-bar"
                            data-zero={day.videos === 0 ? "true" : "false"}
                            style={{ height: `${pct}%` }}
                          />
                          <span className="chart-day">{shortDate}</span>
                        </button>
                      </Tooltip.Trigger>
                      <Tooltip.Portal>
                        <Tooltip.Content
                          className="radix-tooltip-content"
                          sideOffset={6}
                        >
                          {day.date}: {day.videos} video(s), {day.cues} cues,{" "}
                          {formatMegabytes(day.savedBytes)} saved
                        </Tooltip.Content>
                      </Tooltip.Portal>
                    </Tooltip.Root>
                  );
                })}
                </div>
              </div>
            </div>

            <div>
              <h2 className="section-heading" style={{ fontSize: "1.35rem" }}>
                Speech-to-text provider share
              </h2>
              <p className="section-prose" style={{ fontSize: "14.5px" }}>
                Distribution of completed transcriptions and mean response latency per provider.
              </p>

              {(activeStats?.byProvider?.length || 0) === 0 ? (
                <p style={{ fontSize: "14px", color: "var(--ink-tertiary)" }}>
                  No provider runs recorded yet.
                </p>
              ) : (
                <div className="data-table-wrap">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Provider</th>
                        <th data-num="true">Videos</th>
                        <th data-num="true">Share</th>
                        <th data-num="true">Avg speed</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activeStats.byProvider.map((p) => (
                        <tr key={p.provider}>
                          <td style={{ fontWeight: 600 }}>{p.provider}</td>
                          <td data-num="true">{numFmt.format(p.videos)}</td>
                          <td data-num="true">{p.sharePct}%</td>
                          <td data-num="true">
                            {p.avgLatencyMs
                              ? `${(p.avgLatencyMs / 1000).toFixed(2)}s`
                              : "n/a"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Google NotebookLM Workspace & Study Statistics (same as the extension) */}
        <section className="section-block">
          <h2 className="section-heading" style={{ fontSize: "1.35rem" }}>
            Your Google NotebookLM workspace
          </h2>
          <p className="section-prose" style={{ fontSize: "14.5px" }}>
            Study and workspace telemetry beyond captioning, reported with the exact same numbers as the LM Subs extension settings page and toolbar popup.
          </p>

          <div className="kpi-strip">
            <div className="kpi-cell">
              <div className="kpi-value">{numFmt.format(notebookLm.notebooksCount || 0)}</div>
              <div className="kpi-label">Notebooks used</div>
              <div className="kpi-sub">
                {numFmt.format(notebookLm.sourcesIndexed || 0)} sources indexed
              </div>
            </div>

            <div className="kpi-cell">
              <div className="kpi-value">
                {formatMinutesLabel((notebookLm.activeStudyMinutes || 0) * 60)}
              </div>
              <div className="kpi-label">Time watched and listened</div>
              <div className="kpi-sub">
                {formatMinutesLabel((notebookLm.speedSavedMinutes || 0) * 60)} saved by playback speed
              </div>
            </div>

            <div className="kpi-cell">
              <div className="kpi-value">
                {numFmt.format(notebookLm.studioArtifactsCount || 0)}
              </div>
              <div className="kpi-label">Studio artifacts</div>
              <div className="kpi-sub">
                {numFmt.format(notebookLm.videoOverviewsCount || 0)} video, {" "}
                {numFmt.format(notebookLm.audioOverviewsCount || 0)} audio
              </div>
            </div>

            <div className="kpi-cell">
              <div className="kpi-value">
                {numFmt.format(notebookLm.citationsCount || 0)}
              </div>
              <div className="kpi-label">Citations sent to chat</div>
              <div className="kpi-sub">
                {numFmt.format(notebookLm.bookmarksCount || 0)} bookmarked moments
              </div>
            </div>
          </div>

          {(notebookLm.notebooks?.length || 0) > 0 ? (
            <div className="data-table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Notebook</th>
                    <th data-num="true">Sources</th>
                    <th data-num="true">Video</th>
                    <th data-num="true">Audio</th>
                    <th data-num="true">Study time</th>
                  </tr>
                </thead>
                <tbody>
                  {notebookLm.notebooks.map((nb) => (
                    <tr key={nb.notebookId}>
                      <td style={{ fontWeight: 600 }}>{nb.title}</td>
                      <td data-num="true">{numFmt.format(nb.sourceCount || 0)}</td>
                      <td data-num="true">{numFmt.format(nb.videoCount || 0)}</td>
                      <td data-num="true">{numFmt.format(nb.audioCount || 0)}</td>
                      <td data-num="true">
                        {formatMinutesLabel(
                          (Number(nb.watchSeconds) || 0) +
                            (Number(nb.listenSeconds) || 0)
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p style={{ fontSize: "14px", color: "var(--ink-tertiary)" }}>
              Open a notebook with LM Subs installed and this table fills with real per-notebook study time and Studio artifact counts.
            </p>
          )}
        </section>

        {/* Recent Captioned Videos Log */}
        <section className="section-block">
          <h2 className="section-heading" style={{ fontSize: "1.35rem" }}>
            Recent captioned videos
          </h2>
          {(activeStats?.recentVideos?.length || 0) === 0 ? (
            <p style={{ fontSize: "14px", color: "var(--ink-tertiary)" }}>
              Completed Video Overview runs will appear here once synced.
            </p>
          ) : (
            <div className="data-table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Video Overview</th>
                    <th>Language</th>
                    <th>Provider</th>
                    <th data-num="true">Cues</th>
                    <th data-num="true">Audio size</th>
                    <th data-num="true">Latency</th>
                  </tr>
                </thead>
                <tbody>
                  {activeStats.recentVideos.map((item) => (
                    <tr key={item.cacheKey || item.title}>
                      <td style={{ fontWeight: 500 }}>{item.title}</td>
                      <td>{item.language || "en"}</td>
                      <td>
                        {item.provider || "manual"}
                        {item.failoverUsed ? " (failover)" : ""}
                      </td>
                      <td data-num="true">{numFmt.format(item.cueCount || 0)}</td>
                      <td data-num="true">
                        {item.extractedBytes
                          ? formatMegabytes(item.extractedBytes)
                          : "n/a"}
                      </td>
                      <td data-num="true">
                        {item.latencyMs
                          ? `${(item.latencyMs / 1000).toFixed(2)}s`
                          : "n/a"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </Tooltip.Provider>
  );
}
