import React, { useEffect, useMemo, useState } from "react";
import {
  buildContributionCalendar,
  contributionLevel,
  weeklyFromCommits,
} from "../lib/public-project-metrics.js";
import { trackDownload } from "../lib/downloads.js";

const API = "https://api.github.com/repos/sarang-cmd/lm-subs";
const REPO_URL = "https://github.com/sarang-cmd/lm-subs";
const CACHE_KEY = "lm-subs-public-project-metrics-v1";
const CACHE_TTL = 60 * 60 * 1000;
const number = new Intl.NumberFormat("en-US");
const dateLabel = new Intl.DateTimeFormat("en", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

async function getJson(url) {
  const response = await fetch(url, {
    headers: { Accept: "application/vnd.github+json" },
  });
  if (!response.ok) throw new Error(`GitHub returned ${response.status}`);
  return response.json();
}

async function getCommitHistory(since) {
  const commits = [];
  for (let page = 1; page <= 10; page += 1) {
    const rows = await getJson(
      `${API}/commits?since=${encodeURIComponent(since)}&per_page=100&page=${page}`,
    );
    if (!Array.isArray(rows)) break;
    commits.push(...rows);
    if (rows.length < 100) return { commits, truncated: false };
  }
  return { commits, truncated: commits.length === 1000 };
}

async function fetchProjectMetrics() {
  const cutoff = new Date();
  cutoff.setUTCFullYear(cutoff.getUTCFullYear() - 1);
  const since = cutoff.toISOString();
  const [repoResult, weeklyResult, contributorResult, commitResult] = await Promise.allSettled([
    getJson(API),
    getJson(`${API}/stats/commit_activity`),
    getJson(`${API}/contributors?per_page=100`),
    getCommitHistory(since),
  ]);
  if (repoResult.status === "rejected") throw repoResult.reason;
  const repo = repoResult.value;
  const contributors = contributorResult.status === "fulfilled" && Array.isArray(contributorResult.value)
    ? contributorResult.value
    : [];
  const commitHistory = commitResult.status === "fulfilled"
    ? commitResult.value
    : { commits: [], truncated: false };
  const commits = commitHistory.commits;
  const weekly = weeklyResult.status === "fulfilled" && Array.isArray(weeklyResult.value)
    ? weeklyResult.value
    : weeklyFromCommits(commits);
  return {
    repo,
    weekly,
    contributors,
    commits,
    commitsTruncated: commitHistory.truncated,
    fetchedAt: Date.now(),
  };
}

function readCache() {
  try {
    const value = JSON.parse(window.localStorage.getItem(CACHE_KEY) || "null");
    return value && Date.now() - value.fetchedAt < CACHE_TTL ? value : null;
  } catch {
    return null;
  }
}

function Heatmap({ commits, truncated }) {
  const weeks = useMemo(() => buildContributionCalendar(commits), [commits]);
  const counts = weeks.flatMap((week) => week.map((day) => day.count));
  const maximum = Math.max(...counts, 0);
  const total = counts.reduce((sum, count) => sum + count, 0);
  const monthLabels = weeks.map((week, index) => {
    const first = week[0];
    if (!first) return "";
    const current = new Date(`${first.date}T00:00:00Z`);
    const previous = index ? new Date(`${weeks[index - 1]?.[0]?.date}T00:00:00Z`) : null;
    return !previous || current.getUTCMonth() !== previous.getUTCMonth()
      ? new Intl.DateTimeFormat("en", { month: "short", timeZone: "UTC" }).format(current)
      : "";
  });

  return (
    <section className="project-metric-section" aria-labelledby="contribution-title">
      <div className="project-metric-heading">
        <div>
          <h2 id="contribution-title" className="section-heading">Contribution activity</h2>
          <p className="section-prose">{number.format(total)} public commits in the last 12 months</p>
        </div>
        <div className="contribution-legend" aria-label="Less to more activity">
          <span>Less</span>
          {[0, 1, 2, 3, 4].map((level) => <i key={level} data-level={level} aria-hidden="true" />)}
          <span>More</span>
        </div>
      </div>
      <div className="contribution-scroll" role="img" aria-label={`Contribution activity calendar with ${number.format(total)} public commits across the last 12 months`}>
        <div className="contribution-months" aria-hidden="true">
          {monthLabels.map((label, index) => <span key={index}>{label}</span>)}
        </div>
        <div className="contribution-calendar">
          {weeks.map((week, weekIndex) => (
            <div className="contribution-week" key={weekIndex}>
              {week.map((day) => (
                <span
                  className="contribution-day"
                  data-level={contributionLevel(day.count, maximum)}
                  key={day.date}
                  title={`${number.format(day.count)} ${day.count === 1 ? "commit" : "commits"} on ${dateLabel.format(new Date(`${day.date}T00:00:00Z`))}`}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
      <p className="project-metric-footnote">Counts reflect commits visible in the public repository. GitHub may attribute commits differently from contributor profile activity.{truncated ? " The calendar reaches its 1,000-commit display limit. See the full graph on GitHub." : ""}</p>
    </section>
  );
}

function WeeklyChart({ weeks }) {
  const recent = weeks.slice(-52);
  const peak = Math.max(...recent.map((week) => week.total || 0), 1);
  return (
    <section className="project-metric-section" aria-labelledby="weekly-title">
      <div className="project-metric-heading">
        <div>
          <h2 id="weekly-title" className="section-heading">Commits by week</h2>
          <p className="section-prose">A year of repository activity, grouped into weeks</p>
        </div>
      </div>
      <div className="project-weekly-chart" role="img" aria-label="Bar chart of public repository commits by week over the past year">
        {recent.map((week) => {
          const value = week.total || 0;
          const date = new Date(week.week * 1000);
          const height = value ? Math.max(4, (value / peak) * 100) : 2;
          return (
            <span
              className="project-weekly-bar"
              key={week.week}
              style={{ height: `${height}%` }}
              title={`${number.format(value)} ${value === 1 ? "commit" : "commits"} in week of ${dateLabel.format(date)}`}
            />
          );
        })}
      </div>
      <div className="project-chart-axis" aria-hidden="true"><span>12 months ago</span><span>6 months ago</span><span>This week</span></div>
    </section>
  );
}

const DOWNLOAD_CACHE_KEY = "lm-subs-public-download-metrics-v1";
const DOWNLOAD_CACHE_TTL = 5 * 60 * 1000;
const PIE_COLORS = ["#0055d4", "#2f81f7", "#40a75a", "#d29922", "#8250df", "#bf3989"];
const countryNames = typeof Intl.DisplayNames === "function"
  ? new Intl.DisplayNames(["en"], { type: "region" })
  : null;

function readDownloadCache() {
  try {
    const value = JSON.parse(window.localStorage.getItem(DOWNLOAD_CACHE_KEY) || "null");
    return value && Date.now() - value.fetchedAt < DOWNLOAD_CACHE_TTL ? value : null;
  } catch {
    return null;
  }
}

function countryName(code) {
  try {
    return countryNames?.of(code) || code;
  } catch {
    return code;
  }
}

function pieSlicePath(startAngle, endAngle, radius = 92) {
  const center = 110;
  const point = (angle) => {
    const radians = ((angle - 90) * Math.PI) / 180;
    return [center + radius * Math.cos(radians), center + radius * Math.sin(radians)];
  };
  const start = point(startAngle);
  const end = point(endAngle);
  const largeArc = endAngle - startAngle > 180 ? 1 : 0;
  return `M ${center} ${center} L ${start[0]} ${start[1]} A ${radius} ${radius} 0 ${largeArc} 1 ${end[0]} ${end[1]} Z`;
}

function DownloadsByCountry() {
  const [data, setData] = useState(() => readDownloadCache());
  const [loading, setLoading] = useState(() => !readDownloadCache());
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const response = await fetch("/api/public/metrics/downloads", {
          headers: { Accept: "application/json" },
        });
        if (!response.ok) throw new Error("Could not load download metrics.");
        const fresh = await response.json();
        if (!fresh?.ok) throw new Error("Could not load download metrics.");
        fresh.fetchedAt = Date.now();
        if (cancelled) return;
        setData(fresh);
        setError("");
        try {
          window.localStorage.setItem(DOWNLOAD_CACHE_KEY, JSON.stringify(fresh));
        } catch {
          // Aggregate metrics remain available without browser storage.
        }
      } catch {
        if (!cancelled) setError("Download metrics are temporarily unavailable.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  const slices = useMemo(() => {
    const countries = Array.isArray(data?.countries) ? data.countries : [];
    if (countries.length <= 6) return countries.map((row) => ({ ...row, label: countryName(row.code) }));
    const top = countries.slice(0, 5).map((row) => ({ ...row, label: countryName(row.code) }));
    const other = countries.slice(5).reduce((sum, row) => sum + (Number(row.count) || 0), 0);
    return [...top, { code: "OTHER", label: "Other countries", count: other }];
  }, [data?.countries]);
  const knownTotal = slices.reduce((sum, row) => sum + (Number(row.count) || 0), 0);
  const totalDownloads = Number(data?.total) || 0;
  let angle = 0;

  return (
    <section className="project-metric-section" aria-labelledby="download-title">
      <div className="project-metric-heading">
        <div>
          <h2 id="download-title" className="section-heading">Downloads by country</h2>
          <p className="section-prose">{number.format(totalDownloads)} tracked download requests total, {number.format(Number(data?.last30) || 0)} in the last 30 days</p>
        </div>
        <a className="link" href="/releases/lm-subs-latest.zip" download onClick={() => trackDownload({ source: "metrics" })}>Get LM Subs</a>
      </div>
      {loading && !data ? <p className="project-metrics-loading" role="status">Loading download metrics…</p> : null}
      {error ? <p className="project-metric-footnote" role="status">{error}</p> : null}
      {data && knownTotal > 0 ? (
        <div className="project-country-layout">
          <div className="project-country-pie-wrap">
            <svg className="project-country-pie" viewBox="0 0 220 220" role="img" aria-label={`Pie chart showing ${number.format(knownTotal)} tracked download requests from ${slices.length} country groups`}>
              {slices.map((slice, index) => {
                const portion = (Number(slice.count) || 0) / knownTotal;
                const nextAngle = angle + portion * 360;
                const path = pieSlicePath(angle, nextAngle);
                angle = nextAngle;
                return slices.length === 1 ? (
                  <circle key={slice.code} cx="110" cy="110" r="92" fill={PIE_COLORS[index % PIE_COLORS.length]}>
                    <title>{slice.label}: {number.format(slice.count)} requests, 100%</title>
                  </circle>
                ) : (
                  <path key={slice.code} d={path} fill={PIE_COLORS[index % PIE_COLORS.length]} stroke="var(--bg-canvas)" strokeWidth="2">
                    <title>{slice.label}: {number.format(slice.count)} requests, {Math.round(portion * 100)}%</title>
                  </path>
                );
              })}
              <circle cx="110" cy="110" r="48" fill="var(--bg-canvas)" />
              <text x="110" y="106" textAnchor="middle" className="project-country-pie-total">{number.format(knownTotal)}</text>
              <text x="110" y="124" textAnchor="middle" className="project-country-pie-label">located requests</text>
            </svg>
          </div>
          <ul className="project-country-legend" aria-label="Downloads by country">
            {slices.map((slice, index) => (
              <li key={slice.code}>
                <span className="project-country-swatch" style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }} aria-hidden="true" />
                <span className="project-country-name">{slice.label}</span>
                <span className="project-country-value">{number.format(slice.count)} <small>{knownTotal ? `${Math.round((slice.count / knownTotal) * 100)}%` : ""}</small></span>
              </li>
            ))}
          </ul>
        </div>
      ) : data ? <p className="project-metrics-loading">Country distribution will appear as download requests arrive with an available country estimate.</p> : null}
      <p className="project-metric-footnote">Counts are anonymous download requests, not verified completed transfers. Country comes from Vercel's coarse edge estimate; requests without a country estimate are included in the total but not in the pie chart. No IP address or account identifier is stored.</p>
    </section>
  );
}

function ContributorList({ contributors }) {
  const people = contributors.filter((person) => person?.login && Number.isFinite(person.contributions)).slice(0, 8);
  const maximum = Math.max(...people.map((person) => person.contributions), 1);
  return (
    <section className="project-metric-section" aria-labelledby="contributors-title">
      <div className="project-metric-heading">
        <div>
          <h2 id="contributors-title" className="section-heading">Contributors</h2>
          <p className="section-prose">People and tools with commits in this public repository</p>
        </div>
        <a className="link" href={`${REPO_URL}/graphs/contributors`} target="_blank" rel="noopener noreferrer">Full graph</a>
      </div>
      <ol className="project-contributor-list">
        {people.map((person) => (
          <li key={person.login}>
            <a href={`https://github.com/${encodeURIComponent(person.login)}`} target="_blank" rel="noopener noreferrer">
              <img src={person.avatar_url} alt="" width="30" height="30" loading="lazy" decoding="async" />
              <span className="project-contributor-name">{person.login}</span>
            </a>
            <span className="project-contributor-meter" aria-hidden="true"><i style={{ width: `${Math.max(2, (person.contributions / maximum) * 100)}%` }} /></span>
            <span className="project-contributor-count">{number.format(person.contributions)}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}

export function ProjectMetricsView() {
  const [data, setData] = useState(() => readCache());
  const [loading, setLoading] = useState(() => !readCache());
  const [error, setError] = useState("");

  async function refresh() {
    setLoading(true);
    setError("");
    try {
      const fresh = await fetchProjectMetrics();
      setData(fresh);
      try {
        window.localStorage.setItem(CACHE_KEY, JSON.stringify(fresh));
      } catch {
        // The page still works when browser storage is unavailable.
      }
    } catch {
      setError("GitHub's public API is temporarily unavailable. Try again in a little while.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!readCache()) refresh();
  }, []);

  const weeklyTotal = data?.weekly?.reduce((sum, week) => sum + (week.total || 0), 0) || 0;
  const contributorCount = data?.contributors?.length || 0;
  const lastUpdated = data?.fetchedAt ? new Date(data.fetchedAt) : null;

  return (
    <div className="page-wrap project-metrics-page">
      <section className="section-block">
        <p className="project-metrics-kicker">Open source, in the open</p>
        <h1 className="section-heading project-metrics-title">LM Subs project metrics</h1>
        <p className="section-prose project-metrics-intro">A live view of the public repository: stars, commit activity, and the people building LM Subs. Download totals and country breakdowns are anonymous aggregates from download requests to this site. This page does not show private extension usage or personal account statistics.</p>
        <p className="project-metrics-source"><span className="project-metrics-live" aria-hidden="true" /> Repository data from <a className="link" href={REPO_URL} target="_blank" rel="noopener noreferrer">GitHub</a>{lastUpdated ? `, updated ${dateLabel.format(lastUpdated)}` : ""}</p>

        {error ? <div className="project-metrics-error" role="status">{error} <button className="btn btn-sm" type="button" onClick={refresh}>Retry</button></div> : null}
        {loading && !data ? <p className="project-metrics-loading" role="status">Loading public repository metrics…</p> : null}
        <DownloadsByCountry />
        {data?.repo ? (
          <>
            <div className="project-metrics-kpis" aria-label="Repository summary">
              <div><strong>{number.format(data.repo.stargazers_count || 0)}</strong><span>Stars</span></div>
              <div><strong>{number.format(data.repo.forks_count || 0)}</strong><span>Forks</span></div>
              <div><strong>{number.format(weeklyTotal)}</strong><span>Commits this year</span></div>
              <div><strong>{number.format(contributorCount)}</strong><span>Contributors</span></div>
            </div>
            <Heatmap commits={data.commits} truncated={data.commitsTruncated} />
            <WeeklyChart weeks={data.weekly} />
            <ContributorList contributors={data.contributors} />
          </>
        ) : null}
        {!loading && !data && !error ? <p className="project-metrics-loading">Metrics are not available right now.</p> : null}
        <div className="project-metrics-actions">
          {data?.repo?.html_url ? <a className="btn btn-ink" href={`${REPO_URL}/graphs`} target="_blank" rel="noopener noreferrer">Explore all GitHub graphs</a> : null}
          <a className="btn" href={`${REPO_URL}/issues`} target="_blank" rel="noopener noreferrer">Browse issues and ideas</a>
        </div>
      </section>
    </div>
  );
}
