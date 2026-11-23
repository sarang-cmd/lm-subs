import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildContributionCalendar,
  contributionLevel,
  weeklyFromCommits,
} from "../src/lib/public-project-metrics.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");
const commit = (date) => ({ commit: { author: { date } } });

test("public contribution calendar groups commits by UTC day across a year", () => {
  const commits = [
    commit("2026-10-23T08:00:00Z"),
    commit("2026-10-23T20:00:00Z"),
    commit("2026-10-24T01:00:00Z"),
    commit("2025-10-19T23:59:00Z"),
    commit("not a date"),
  ];
  const weeks = buildContributionCalendar(commits, new Date("2026-10-24T12:00:00Z"));
  const days = weeks.flat();
  assert.ok(weeks.length >= 52 && weeks.length <= 53);
  assert.equal(days[0].date, "2025-10-20");
  assert.equal(days.at(-1).date, "2026-10-24");
  assert.equal(days.reduce((sum, day) => sum + day.count, 0), 3);
  assert.equal(days.find((day) => day.date === "2026-10-23").count, 2);
});

test("fallback weekly activity groups commits into Monday UTC weeks", () => {
  const weeks = weeklyFromCommits([
    commit("2026-06-10T16:00:00Z"),
    commit("2026-06-14T18:00:00Z"),
    commit("2026-06-15T00:05:00Z"),
  ], new Date("2026-06-15T12:00:00Z"));
  assert.equal(weeks.length, 52);
  assert.deepEqual(weeks.slice(-2), [
    { week: Date.parse("2026-06-08T00:00:00Z") / 1000, total: 2 },
    { week: Date.parse("2026-06-15T00:00:00Z") / 1000, total: 1 },
  ]);
});

test("contribution levels scale from no activity to the busiest day", () => {
  assert.deepEqual(
    [0, 1, 2, 4, 6, 8].map((count) => contributionLevel(count, 8)),
    [0, 1, 2, 3, 4, 4],
  );
});

test("public metrics route uses public repository data, not private account telemetry", () => {
  const app = read("src/web/App.jsx");
  const view = read("src/web/ProjectMetricsView.jsx");
  const shell = read("docs/metrics.html");
  const sitemap = read("docs/sitemap.xml");
  const readme = read("README.md");
  const server = read("server/app.js");
  const privacy = read("src/web/LegalViews.jsx");
  assert.ok(app.includes('path === "/metrics"'));
  assert.ok(app.includes('view === "metrics" ? <ProjectMetricsView /> : null'));
  assert.match(view, /https:\/\/api\.github\.com\/repos\/sarang-cmd\/lm-subs/);
  assert.match(view, /Contribution activity/);
  assert.match(view, /Commits by week/);
  assert.match(view, /Contributors/);
  assert.doesNotMatch(view, /\/api\/stats|Authorization:/);
  assert.match(shell, /canonical" href="https:\/\/lm-subs\.vercel\.app\/metrics/);
  assert.match(shell, /Anonymous download requests/);
  assert.match(server, /\/api\/public\/metrics\/downloads\/badge/);
  assert.match(sitemap, /<loc>https:\/\/lm-subs\.vercel\.app\/metrics<\/loc>/);
  assert.match(readme, /img\.shields\.io\/endpoint/);
  assert.match(privacy, /country estimate supplied by Vercel/);
});
