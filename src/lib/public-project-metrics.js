export function weeklyFromCommits(commits, now = new Date()) {
  const totals = new Map();
  for (const item of commits) {
    const value = item?.commit?.author?.date || item?.commit?.committer?.date;
    if (!value) continue;
    const week = new Date(value);
    if (Number.isNaN(week.getTime())) continue;
    week.setUTCHours(0, 0, 0, 0);
    week.setUTCDate(week.getUTCDate() - ((week.getUTCDay() + 6) % 7));
    const key = Math.floor(week.getTime() / 1000);
    totals.set(key, (totals.get(key) || 0) + 1);
  }

  const finalWeek = new Date(now);
  finalWeek.setUTCHours(0, 0, 0, 0);
  finalWeek.setUTCDate(finalWeek.getUTCDate() - ((finalWeek.getUTCDay() + 6) % 7));
  const firstWeek = new Date(finalWeek);
  firstWeek.setUTCDate(firstWeek.getUTCDate() - 51 * 7);
  return Array.from({ length: 52 }, (_, index) => {
    const week = new Date(firstWeek);
    week.setUTCDate(week.getUTCDate() + index * 7);
    const timestamp = Math.floor(week.getTime() / 1000);
    return { week: timestamp, total: totals.get(timestamp) || 0 };
  });
}

function dateKey(date) {
  return date.toISOString().slice(0, 10);
}

function getCommitDate(item) {
  const value = item?.commit?.author?.date || item?.commit?.committer?.date;
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function buildContributionCalendar(commits, now = new Date()) {
  const counts = new Map();
  for (const commit of commits) {
    const date = getCommitDate(commit);
    if (!date) continue;
    const key = dateKey(date);
    counts.set(key, (counts.get(key) || 0) + 1);
  }

  const end = new Date(now);
  end.setUTCHours(0, 0, 0, 0);
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - 364);
  start.setUTCDate(start.getUTCDate() - ((start.getUTCDay() + 6) % 7));

  const weeks = [];
  for (let cursor = new Date(start); cursor <= end; cursor.setUTCDate(cursor.getUTCDate() + 7)) {
    const days = [];
    for (let offset = 0; offset < 7; offset += 1) {
      const day = new Date(cursor);
      day.setUTCDate(day.getUTCDate() + offset);
      if (day > end) break;
      const key = dateKey(day);
      days.push({ date: key, count: counts.get(key) || 0 });
    }
    weeks.push(days);
  }
  return weeks;
}

export function contributionLevel(count, maximum) {
  if (!count) return 0;
  const intensity = count / Math.max(maximum, 1);
  if (intensity < 0.25) return 1;
  if (intensity < 0.5) return 2;
  if (intensity < 0.75) return 3;
  return 4;
}
