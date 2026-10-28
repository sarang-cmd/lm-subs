import React, { useCallback, useEffect, useMemo, useState } from "react";
import { maskEmail } from "../lib/avatars.js";

/**
 * Admin download dashboard (`src/web/AdminView.jsx`).
 *
 * Only reachable by accounts listed in the LM_SUBS_ADMIN_EMAILS environment
 * variable, which the API checks on every request. The view itself is not a
 * gate: it renders sign-in or refusal states and lets the server decide.
 */

const RANGES = [7, 30, 90];

const numberFormat = new Intl.NumberFormat("en-US");
const dayFormat = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
});
const timeFormat = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

function formatCount(value) {
  return numberFormat.format(Number(value) || 0);
}

function formatDayLabel(iso) {
  const parsed = new Date(`${String(iso).slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return String(iso).slice(5);
  return dayFormat.format(parsed);
}

function formatStamp(stamp) {
  if (!stamp) return "";
  const parsed = new Date(stamp);
  if (Number.isNaN(parsed.getTime())) return "";
  return timeFormat.format(parsed);
}

function BreakdownTable({ heading, note, rows, empty }) {
  const list = Array.isArray(rows) ? rows : [];
  return (
    <div>
      <h3 className="section-heading" style={{ fontSize: "1.1rem" }}>
        {heading}
      </h3>
      <p className="section-prose" style={{ fontSize: "14px" }}>
        {note}
      </p>
      {list.length === 0 ? (
        <p style={{ fontSize: "14px", color: "var(--ink-tertiary)" }}>
          {empty}
        </p>
      ) : (
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th scope="col">Label</th>
                <th scope="col">Downloads</th>
                <th scope="col">Share</th>
              </tr>
            </thead>
            <tbody>
              {list.map((row) => {
                const total = list.reduce(
                  (sum, item) => sum + (Number(item.count) || 0),
                  0
                );
                const share =
                  total > 0
                    ? `${Math.round(((Number(row.count) || 0) / total) * 100)}%`
                    : "0%";
                return (
                  <tr key={`${heading}-${row.label}`}>
                    <td>{row.label || "unknown"}</td>
                    <td style={{ fontVariantNumeric: "tabular-nums" }}>
                      {formatCount(row.count)}
                    </td>
                    <td
                      style={{
                        fontVariantNumeric: "tabular-nums",
                        color: "var(--ink-tertiary)",
                      }}
                    >
                      {share}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export function AdminView({ token, user, onOpenSignIn }) {
  const [days, setDays] = useState(30);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(Boolean(token));
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!token) {
      setData(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/downloads?days=${days}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) {
        setData(null);
        setError(
          res.status === 403
            ? "This account is not on the admin list. Ask the site owner to add it to LM_SUBS_ADMIN_EMAILS."
            : res.status === 401
              ? "That session expired. Sign in again to see the dashboard."
              : "The dashboard could not be loaded."
        );
        return;
      }
      setData(json);
    } catch {
      setData(null);
      setError("The dashboard could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, [token, days]);

  useEffect(() => {
    load();
  }, [load]);

  const daily = data?.daily || [];
  const peak = useMemo(
    () => daily.reduce((max, day) => Math.max(max, Number(day.count) || 0), 0),
    [daily]
  );
  const totals = data?.totals || {};
  const accounts = data?.accounts || {};

  return (
    <div className="page-wrap">
      <header style={{ marginBottom: "28px" }}>
        <p
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "11.5px",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "var(--ink-tertiary)",
            margin: "0 0 10px",
          }}
        >
          Admin
        </p>
        <h1 className="section-heading" style={{ fontSize: "2rem" }}>
          Download dashboard
        </h1>
        <p className="section-prose">
          How often visitors take the extension, and where they come from. These
          counts are anonymous: the beacon records the version, the channel and
          the page, and the server keeps no IP address, no account and no user
          agent string.
        </p>
      </header>

      {!token ? (
        <div className="notice-banner">
          <p style={{ margin: 0 }}>
            Sign in with the admin account to see download counts.
          </p>
          {typeof onOpenSignIn === "function" ? (
            <button
              type="button"
              className="btn btn-primary"
              onClick={onOpenSignIn}
              style={{ marginTop: "12px" }}
            >
              Sign in
            </button>
          ) : null}
        </div>
      ) : null}

      {error ? (
        <div className="notice-banner" role="alert">
          <p style={{ margin: 0 }}>{error}</p>
        </div>
      ) : null}

      {token && !error ? (
        <>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              margin: "0 0 22px",
            }}
          >
            <span
              style={{
                fontSize: "13px",
                color: "var(--ink-tertiary)",
                marginRight: "4px",
              }}
            >
              Range
            </span>
            {RANGES.map((value) => (
              <button
                key={value}
                type="button"
                className={`btn btn-sm${days === value ? " btn-primary" : ""}`}
                onClick={() => setDays(value)}
                aria-pressed={days === value}
              >
                {value} days
              </button>
            ))}
          </div>

          {loading && !data ? (
            <p style={{ fontSize: "14px", color: "var(--ink-tertiary)" }}>
              Loading download counts.
            </p>
          ) : null}

          {data ? (
            <>
              <div className="kpi-strip">
                <div className="kpi-cell">
                  <div className="kpi-value">
                    {formatCount(totals.total)}
                  </div>
                  <div className="kpi-label">Downloads all time</div>
                  <div className="kpi-sub">
                    {totals.firstAt
                      ? `First recorded ${formatStamp(totals.firstAt)}`
                      : "No downloads recorded yet"}
                  </div>
                </div>

                <div className="kpi-cell">
                  <div className="kpi-value">{formatCount(totals.today)}</div>
                  <div className="kpi-label">Today</div>
                  <div className="kpi-sub">
                    {formatCount(totals.last7)} in the last 7 days
                  </div>
                </div>

                <div className="kpi-cell">
                  <div className="kpi-value">{formatCount(totals.last7)}</div>
                  <div className="kpi-label">Last 7 days</div>
                  <div className="kpi-sub">
                    {peak > 0 ? `Best day in range: ${formatCount(peak)}` : "No daily data"}
                  </div>
                </div>

                <div className="kpi-cell">
                  <div className="kpi-value">{formatCount(totals.last30)}</div>
                  <div className="kpi-label">Last 30 days</div>
                  <div className="kpi-sub">
                    {formatCount(accounts.transcripts)} transcripts synced
                  </div>
                </div>
              </div>

              <section className="section-block">
                <h2 className="section-heading" style={{ fontSize: "1.35rem" }}>
                  Downloads per day
                </h2>
                <p className="section-prose" style={{ fontSize: "14.5px" }}>
                  Daily totals for the last {days} days, UTC.
                </p>
                {peak === 0 ? (
                  <p style={{ fontSize: "14px", color: "var(--ink-tertiary)" }}>
                    Nothing recorded in this range yet.
                  </p>
                ) : (
                  <div className="chart-scroll">
                    <div
                      className="chart-bars"
                      role="list"
                      aria-label={`Downloads per day over the last ${days} days`}
                    >
                      {daily.map((day) => {
                        const count = Number(day.count) || 0;
                        const pct =
                          count > 0
                            ? Math.max(8, Math.round((count / peak) * 100))
                            : 3;
                        return (
                          <div
                            key={day.date}
                            role="listitem"
                            className="chart-col"
                            aria-label={`${day.date}: ${count} download${count === 1 ? "" : "s"}`}
                          >
                            <div
                              className="chart-bar"
                              data-zero={count === 0 ? "true" : "false"}
                              style={{ height: `${pct}%` }}
                            />
                            <span className="chart-day">
                              {formatDayLabel(day.date)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </section>

              <section className="section-block">
                <h2 className="section-heading" style={{ fontSize: "1.35rem" }}>
                  Where the downloads came from
                </h2>
                <div className="split-section" style={{ marginTop: "18px" }}>
                  <BreakdownTable
                    heading="By version"
                    note="Which release visitors are taking."
                    rows={data.byVersion}
                    empty="No version recorded yet."
                  />
                  <BreakdownTable
                    heading="By page"
                    note="The surface that offered the download."
                    rows={data.bySource}
                    empty="No source recorded yet."
                  />
                </div>
                <div className="split-section" style={{ marginTop: "26px" }}>
                  <BreakdownTable
                    heading="By country"
                    note="Resolved from the edge request, never from a stored IP."
                    rows={data.byCountry}
                    empty="No country data yet."
                  />
                  <BreakdownTable
                    heading="By browser"
                    note="Coarse family only, no user agent strings stored."
                    rows={data.byBrowser}
                    empty="No browser data yet."
                  />
                </div>
              </section>

              <section className="section-block">
                <h2 className="section-heading" style={{ fontSize: "1.35rem" }}>
                  Accounts and transcripts
                </h2>
                <p className="section-prose" style={{ fontSize: "14.5px" }}>
                  Counts only. No email address or transcript content is ever
                  returned to this page.
                </p>
                <div className="data-table-wrap">
                  <table className="data-table">
                    <tbody>
                      <tr>
                        <th scope="row">Accounts</th>
                        <td style={{ fontVariantNumeric: "tabular-nums" }}>
                          {formatCount(accounts.total)}
                        </td>
                      </tr>
                      <tr>
                        <th scope="row">New accounts, last 30 days</th>
                        <td style={{ fontVariantNumeric: "tabular-nums" }}>
                          {formatCount(accounts.new30)}
                        </td>
                      </tr>
                      <tr>
                        <th scope="row">Accounts with a synced transcript</th>
                        <td style={{ fontVariantNumeric: "tabular-nums" }}>
                          {formatCount(accounts.active)}
                        </td>
                      </tr>
                      <tr>
                        <th scope="row">Transcripts stored</th>
                        <td style={{ fontVariantNumeric: "tabular-nums" }}>
                          {formatCount(accounts.transcripts)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </section>

              <section className="section-block">
                <h2 className="section-heading" style={{ fontSize: "1.35rem" }}>
                  Most recent downloads
                </h2>
                <div className="data-table-wrap">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th scope="col">When</th>
                        <th scope="col">Version</th>
                        <th scope="col">Channel</th>
                        <th scope="col">Page</th>
                        <th scope="col">Browser</th>
                        <th scope="col">Country</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(data.recent || []).length === 0 ? (
                        <tr>
                          <td colSpan={6}>No downloads recorded yet.</td>
                        </tr>
                      ) : (
                        data.recent.map((row, index) => (
                          <tr key={`${row.at}-${index}`}>
                            <td>{formatStamp(row.at)}</td>
                            <td>{row.version || "unknown"}</td>
                            <td>{row.channel || "site"}</td>
                            <td>{row.source || "direct"}</td>
                            <td>{row.browser || "other"}</td>
                            <td>{row.country || "unknown"}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            </>
          ) : null}

          <p
            style={{
              fontSize: "13px",
              color: "var(--ink-tertiary)",
              marginTop: "26px",
            }}
          >
            Signed in as {maskEmail(user?.email) || "the admin account"}. Refresh the page
            after changing the admin list in Vercel.
          </p>
        </>
      ) : null}
    </div>
  );
}
