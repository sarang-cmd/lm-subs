/**
 * Sample NotebookLM Video Overview cues & clearly labeled illustrative dataset
 * for new/signed-out visitors previewing the Statistics view.
 */

export const SAMPLE_VIDEO_OVERVIEW = {
  title: "Cellular ATP Synthesis and Proton Gradients",
  durationSec: 34,
  language: "en",
  provider: "groq",
  model: "whisper-large-v3-turbo",
  originalBytes: 54525952, // 52.0 MB video stream
  extractedBytes: 3565158, // 3.4 MB m140 audio stream
  latencyMs: 2400,
  slides: [
    {
      untilSec: 11,
      topic: "NotebookLM Video Overview (Slide 1 of 3)",
      heading: "Electrochemical gradients across the inner membrane",
      points: [
        "Electron transport complexes pump protons into the intermembrane space",
        "Membrane potential stores energy before rotary catalysis begins",
      ],
    },
    {
      untilSec: 23,
      topic: "NotebookLM Video Overview (Slide 2 of 3)",
      heading: "F0-F1 rotary motion drives phosphorylation",
      points: [
        "Protons return through the F0 c-ring channel down their gradient",
        "Each 120-degree step releases newly synthesized ATP into the matrix",
      ],
    },
    {
      untilSec: 35,
      topic: "NotebookLM Video Overview (Slide 3 of 3)",
      heading: "Measuring oxygen consumption vs ATP yield",
      points: [
        "P/O ratio links NADH oxidation directly to proton stoichiometry",
        "Uncoupling proteins dissipate the gradient as regulated heat",
      ],
    },
  ],
  cues: [
    {
      startSec: 0.0,
      endSec: 5.4,
      text: "Welcome back. In this overview, we map how mitochondria turn a proton gradient into ATP.",
    },
    {
      startSec: 5.4,
      endSec: 11.2,
      text: "Four respiratory complexes move electrons from NADH to oxygen across the inner membrane.",
    },
    {
      startSec: 11.2,
      endSec: 17.0,
      text: "As electrons pass each complex, protons accumulate inside the narrow intermembrane space.",
    },
    {
      startSec: 17.0,
      endSec: 22.8,
      text: "That concentration difference drives protons back through the F0 rotor of ATP synthase.",
    },
    {
      startSec: 22.8,
      endSec: 28.6,
      text: "Every full rotation reshapes three catalytic beta subunits to bind ADP and phosphate.",
    },
    {
      startSec: 28.6,
      endSec: 34.0,
      text: "Export these synchronized captions as SRT, WebVTT, Markdown, CSV, plain text, or JSON.",
    },
  ],
};

export const SAMPLE_AUDIO_OVERVIEW = {
  title: "Deep Dive Podcast: Attention Is All You Need",
  durationSec: 34,
  language: "en",
  provider: "groq",
  model: "whisper-large-v3-turbo",
  originalBytes: 3145728, // 3.0 MB audio stream
  extractedBytes: 3145728,
  latencyMs: 1900,
  cues: [
    {
      startSec: 0.0,
      endSec: 5.6,
      speaker: "Host 1",
      text: "[Host 1] Today we are unpacking why Transformers replaced recurrent networks in sequence modeling.",
    },
    {
      startSec: 5.6,
      endSec: 11.4,
      speaker: "Host 2",
      text: "[Host 2] Instead of stepping token by token, self-attention compares every position in parallel.",
    },
    {
      startSec: 11.4,
      endSec: 17.2,
      speaker: "Host 1",
      text: "[Host 1] Multi-head projections let one head track syntax while another links distant pronouns.",
    },
    {
      startSec: 17.2,
      endSec: 23.0,
      speaker: "Host 2",
      text: "[Host 2] Positional encodings preserve token order without slowing down matrix multiplication.",
    },
    {
      startSec: 23.0,
      endSec: 28.8,
      speaker: "Host 1",
      text: "[Host 1] That parallel training speed cut machine translation compute time by an order of magnitude.",
    },
    {
      startSec: 28.8,
      endSec: 34.0,
      speaker: "Host 2",
      text: "[Host 2] Click any podcast line in the transcript drawer to jump directly to that spoken moment.",
    },
  ],
};

/**
 * Clearly labeled illustrative dataset ONLY shown when a user explicitly enables
 * the "Preview with sample dataset" switch on an empty Statistics page.
 */
export function buildSampleStatsDataset() {
  const days = [];
  const counts = [1, 0, 2, 1, 3, 0, 2, 4, 1, 2, 3, 1, 2, 3];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
    const videos = counts[13 - i] || 0;
    days.push({
      date: d,
      videos,
      cues: videos * 68,
      savedBytes: videos * 48234496,
    });
  }

  return {
    isSample: true,
    totals: {
      videosCaptioned: 25,
      totalCues: 1710,
      spokenSeconds: 11880,
      spokenMinutes: 198.0,
      originalMediaBytes: 1310720000,
      extractedAudioBytes: 89128960,
      bandwidthSavedBytes: 1221591040,
      medianLatencyMs: 2600,
      avgLatencyMs: 2850,
      failoverCount: 3,
      exportCount: 14,
      cloudHitCount: 19,
      encryptedKeyCount: 2,
    },
    byProvider: [
      { provider: "groq", videos: 19, cues: 1298, sharePct: 76, avgLatencyMs: 2450 },
      { provider: "mistral", videos: 4, cues: 274, sharePct: 16, avgLatencyMs: 3100 },
      { provider: "gemini", videos: 2, cues: 138, sharePct: 8, avgLatencyMs: 4200 },
    ],
    byLanguage: [
      { language: "en", videos: 18 },
      { language: "de", videos: 5 },
      { language: "ja", videos: 2 },
    ],
    dailySeries: days,
    recentTranscripts: [
      {
        cacheKey: "sample-atp",
        title: "Cellular ATP Synthesis and Proton Gradients",
        language: "en",
        provider: "groq",
        model: "whisper-large-v3-turbo",
        cueCount: 74,
        spokenSeconds: 485,
        originalBytes: 54525952,
        extractedBytes: 3565158,
        latencyMs: 2400,
        failoverUsed: false,
        savedAt: new Date(Date.now() - 3600000).toISOString(),
      },
      {
        cacheKey: "sample-eu-ai",
        title: " Comparative Constitutional Review Lecture Notes",
        language: "de",
        provider: "mistral",
        model: "voxtral-mini-latest",
        cueCount: 82,
        spokenSeconds: 540,
        originalBytes: 61865984,
        extractedBytes: 4089446,
        latencyMs: 3100,
        failoverUsed: true,
        savedAt: new Date(Date.now() - 86400000).toISOString(),
      },
      {
        cacheKey: "sample-distributed",
        title: "Consensus Protocols: Raft Log Replication",
        language: "en",
        provider: "groq",
        model: "whisper-large-v3-turbo",
        cueCount: 64,
        spokenSeconds: 412,
        originalBytes: 47185920,
        extractedBytes: 3145728,
        latencyMs: 2250,
        failoverUsed: false,
        savedAt: new Date(Date.now() - 172800000).toISOString(),
      },
    ],
  };
}
