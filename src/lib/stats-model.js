/**
 * Canonical Unified Statistics Engine (`src/lib/stats-model.js`).
 *
 * Shared across the Web App (`StatsView.jsx`), Extension Settings (`options.js`),
 * and Extension Toolbar Popup (`popup.js`) so every surface displays the exact
 * same Captioning Telemetry AND Google NotebookLM Workspace & Study Statistics.
 */

import { resolveAvoidedVideoBytes } from "./audio-extract.js";

export function formatMegabytesValue(bytes) {
  const b = Math.max(0, Number(bytes) || 0);
  if (b >= 1073741824) {
    return `${(b / 1073741824).toFixed(2)} GB`;
  }
  return `${(b / 1048576).toFixed(1)} MB`;
}

export function formatMinutesLabel(totalSeconds) {
  const sec = Math.max(0, Number(totalSeconds) || 0);
  const mins = Math.round(sec / 60);
  if (mins >= 60) {
    const h = Math.floor(mins / 60);
    const rem = mins % 60;
    return rem > 0 ? `${h}h ${rem}m` : `${h}h`;
  }
  return `${mins} min`;
}

function buildLast14DayKeys(now = new Date()) {
  const keys = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 86400000);
    keys.push(d.toISOString().slice(0, 10));
  }
  return keys;
}

/**
 * Merges local extension cache/history + NotebookLM workspace stats + optional
 * cloud `/api/stats` payload into one unified report shape.
 */
export function buildUnifiedStatsReport({
  cacheList = [],
  historyList = [],
  notebookLmStats = null,
  cloudStats = null,
  now = new Date(),
} = {}) {
  const dayKeys = buildLast14DayKeys(now);
  const dailyMap = new Map(
    dayKeys.map((date) => [
      date,
      { date, videos: 0, cues: 0, savedBytes: 0, studyMinutes: 0 },
    ])
  );

  // Deduplicate local entries across cacheList and historyList
  const seenKeys = new Set();
  const localRecords = [];
  for (const item of [...(cacheList || []), ...(historyList || [])]) {
    if (!item) continue;
    const key =
      item.cacheKey ||
      item.artifactId ||
      `${item.title || "overview"}_${item.createdAt || ""}`;
    if (seenKeys.has(key)) continue;
    seenKeys.add(key);
    localRecords.push(item);
  }

  let localCues = 0;
  let localSavedBytes = 0;
  let localSpokenSec = 0;
  let localFailovers = 0;
  let localBookmarksInCues = 0;
  const latencies = [];
  const providerAgg = new Map();

  for (const rec of localRecords) {
    const cueCount = Number(rec.cueCount || rec.cues?.length || 0);
    localCues += cueCount;

    if (Array.isArray(rec.cues) && rec.cues.length > 0) {
      const lastCue = rec.cues[rec.cues.length - 1];
      localSpokenSec += Math.max(
        Number(rec.durationSeconds) || 0,
        Number(lastCue?.endSec) || 0
      );
      for (const c of rec.cues) {
        if (c?.bookmarked) localBookmarksInCues += 1;
      }
    } else if (Number(rec.durationSeconds) > 0) {
      localSpokenSec += Number(rec.durationSeconds);
    }

    const byteInfo = resolveAvoidedVideoBytes({
      originalBytes: rec.originalBytes,
      extractedBytes: rec.extractedBytes,
      durationSeconds: rec.durationSeconds,
      cues: rec.cues,
    });
    localSavedBytes += byteInfo.savedBytes;

    if (rec.failoverUsed) localFailovers += 1;
    if (Number(rec.latencyMs) > 0) latencies.push(Number(rec.latencyMs));

    const prov = String(rec.provider || "groq").toLowerCase();
    const prevProv = providerAgg.get(prov) || {
      provider: prov,
      videos: 0,
      totalLatencyMs: 0,
      latencySamples: 0,
    };
    prevProv.videos += 1;
    if (Number(rec.latencyMs) > 0) {
      prevProv.totalLatencyMs += Number(rec.latencyMs);
      prevProv.latencySamples += 1;
    }
    providerAgg.set(prov, prevProv);

    const createdDay = String(rec.updatedAt || rec.createdAt || "").slice(0, 10);
    if (dailyMap.has(createdDay)) {
      const slot = dailyMap.get(createdDay);
      slot.videos += 1;
      slot.cues += cueCount;
      slot.savedBytes += byteInfo.savedBytes;
    }
  }

  latencies.sort((a, b) => a - b);
  const localMedianLatencyMs =
    latencies.length > 0 ? latencies[Math.floor(latencies.length / 2)] : null;

  // NotebookLM Workspace & Study Telemetry
  const rawNotebooks =
    notebookLmStats?.notebooks && typeof notebookLmStats.notebooks === "object"
      ? notebookLmStats.notebooks
      : {};
  const nbMap = Array.isArray(rawNotebooks)
    ? Object.fromEntries(
        rawNotebooks.map((nb, idx) => [nb?.notebookId || `notebook_${idx}`, nb])
      )
    : rawNotebooks;
  const nbEntries = Object.values(nbMap).sort((a, b) =>
    String(b.lastSeenAt || "").localeCompare(String(a.lastSeenAt || ""))
  );

  let totalSourcesIndexed = 0;
  let totalVideosFound = 0;
  let totalAudiosFound = 0;
  let totalStudioArtifacts = 0;
  for (const nb of nbEntries) {
    totalSourcesIndexed += Math.max(0, Number(nb.sourceCount) || 0);
    totalVideosFound += Math.max(0, Number(nb.videoCount) || 0);
    totalAudiosFound += Math.max(0, Number(nb.audioCount) || 0);
    totalStudioArtifacts += Math.max(
      Number(nb.studioArtifactCount) || 0,
      (Number(nb.videoCount) || 0) +
        (Number(nb.audioCount) || 0) +
        (Number(nb.reportCount) || 0)
    );
  }

  const nbTotals = notebookLmStats?.totals || {};
  const watchSeconds = Math.max(0, Number(nbTotals.watchSeconds) || 0);
  const listenSeconds = Math.max(0, Number(nbTotals.listenSeconds) || 0);
  const activeStudySeconds = watchSeconds + listenSeconds;
  const speedSavedSeconds = Math.max(0, Number(nbTotals.speedSavedSeconds) || 0);

  if (notebookLmStats?.dailyStudy) {
    for (const [dayKey, ds] of Object.entries(notebookLmStats.dailyStudy)) {
      if (dailyMap.has(dayKey)) {
        dailyMap.get(dayKey).studyMinutes = Math.round(
          (Number(ds?.activeSeconds) || 0) / 60
        );
      }
    }
  }

  const cloudTotals = cloudStats?.totals || null;
  const videosCaptioned = Math.max(
    Number(cloudTotals?.videosCaptioned) || 0,
    localRecords.length
  );
  const totalCues = Math.max(Number(cloudTotals?.totalCues) || 0, localCues);
  const spokenMinutes = Math.max(
    Number(cloudTotals?.spokenMinutes) || 0,
    Math.round(localSpokenSec / 60)
  );
  const bandwidthSavedBytes = Math.max(
    Number(cloudTotals?.bandwidthSavedBytes) || 0,
    localSavedBytes
  );
  const medianLatencyMs =
    cloudTotals?.medianLatencyMs || localMedianLatencyMs || null;
  const failoverCount = Math.max(
    Number(cloudTotals?.failoverCount) || 0,
    localFailovers
  );
  const exportCount = Math.max(
    Number(cloudTotals?.exportCount) || 0,
    Number(nbTotals.exportsCount) || 0
  );
  const cloudHitCount = Number(cloudTotals?.cloudHitCount) || 0;

  // Merge daily series (prefer cloud series when cloud has higher counts on a day)
  const cloudSeriesByDate = new Map(
    (cloudStats?.dailySeries || []).map((d) => [d.date, d])
  );
  const dailySeries = dayKeys.map((date) => {
    const loc = dailyMap.get(date);
    const cld = cloudSeriesByDate.get(date);
    return {
      date,
      videos: Math.max(loc.videos, Number(cld?.videos) || 0),
      cues: Math.max(loc.cues, Number(cld?.cues) || 0),
      savedBytes: Math.max(loc.savedBytes, Number(cld?.savedBytes) || 0),
      studyMinutes: loc.studyMinutes || 0,
    };
  });

  // Provider breakdown
  let byProvider = [];
  if (Array.isArray(cloudStats?.byProvider) && cloudStats.byProvider.length > 0) {
    byProvider = cloudStats.byProvider;
  } else if (providerAgg.size > 0) {
    const totalProvVideos = Math.max(
      1,
      [...providerAgg.values()].reduce((acc, p) => acc + p.videos, 0)
    );
    byProvider = [...providerAgg.values()]
      .sort((a, b) => b.videos - a.videos)
      .map((p) => ({
        provider: p.provider,
        videos: p.videos,
        sharePct: Math.round((p.videos / totalProvVideos) * 100),
        avgLatencyMs:
          p.latencySamples > 0
            ? Math.round(p.totalLatencyMs / p.latencySamples)
            : null,
      }));
  }

  // Recent captioned overviews
  let recentVideos = [];
  if (Array.isArray(cloudStats?.recentVideos) && cloudStats.recentVideos.length > 0) {
    recentVideos = cloudStats.recentVideos;
  } else {
    recentVideos = localRecords.slice(0, 8).map((r) => {
      const byteInfo = resolveAvoidedVideoBytes({
        originalBytes: r.originalBytes,
        extractedBytes: r.extractedBytes,
        durationSeconds: r.durationSeconds,
        cues: r.cues,
      });
      return {
        cacheKey: r.cacheKey || "",
        title: r.title || "NotebookLM Overview",
        provider: r.provider || "groq",
        language: r.language || "en",
        cueCount: Number(r.cueCount || r.cues?.length || 0),
        savedBytes: byteInfo.savedBytes,
        latencyMs: r.latencyMs || null,
        updatedAt: r.updatedAt || r.createdAt || null,
      };
    });
  }

  const cloudNotebookLm = cloudStats?.notebookLm || null;
  const notebooksCount = Math.max(
    nbEntries.length,
    Number(cloudNotebookLm?.notebooksCount) || 0,
    videosCaptioned > 0 && nbEntries.length === 0 ? 1 : 0
  );

  return {
    totals: {
      videosCaptioned,
      totalCues,
      spokenMinutes,
      bandwidthSavedBytes,
      medianLatencyMs,
      failoverCount,
      exportCount,
      cloudHitCount,
    },
    notebookLm: {
      notebooksCount,
      sourcesIndexed: Math.max(
        totalSourcesIndexed,
        Number(cloudNotebookLm?.sourcesIndexed) || 0
      ),
      studioArtifactsCount: Math.max(
        totalStudioArtifacts,
        videosCaptioned,
        Number(cloudNotebookLm?.studioArtifactsCount) || 0
      ),
      videoOverviewsCount: Math.max(
        totalVideosFound,
        Number(cloudNotebookLm?.videoOverviewsCount) || 0
      ),
      audioOverviewsCount: Math.max(
        totalAudiosFound,
        Number(cloudNotebookLm?.audioOverviewsCount) || 0
      ),
      activeStudyMinutes: Math.max(
        Math.round(activeStudySeconds / 60),
        Number(cloudNotebookLm?.activeStudyMinutes) || 0
      ),
      watchSeconds,
      listenSeconds,
      speedSavedMinutes: Math.max(
        Math.round(speedSavedSeconds / 60),
        Number(cloudNotebookLm?.speedSavedMinutes) || 0
      ),
      bookmarksCount: Math.max(
        Number(nbTotals.bookmarksCount) || 0,
        localBookmarksInCues,
        Number(cloudNotebookLm?.bookmarksCount) || 0
      ),
      citationsCount: Math.max(
        Number(nbTotals.citationsCount) || 0,
        Number(cloudNotebookLm?.citationsCount) || 0
      ),
      loopsCount: Math.max(
        Number(nbTotals.loopsCount) || 0,
        Number(cloudNotebookLm?.loopsCount) || 0
      ),
      pipSessionsCount: Math.max(
        Number(nbTotals.pipSessionsCount) || 0,
        Number(cloudNotebookLm?.pipSessionsCount) || 0
      ),
      notebooks: nbEntries.slice(0, 8),
    },
    dailySeries,
    byProvider,
    recentVideos,
  };
}
