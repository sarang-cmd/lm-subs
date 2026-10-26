/**
 * Acoustic Completion & Notification Sound Engine (`src/lib/chime.js`).
 *
 * Solves Chromium/Brave MV3 autoplay and suspended-AudioContext issues via:
 * 1. User-gesture `AudioContext` pre-unlocking (`unlockChimeAudio`)
 * 2. Explicit `await ctx.resume()` + multi-preset harmonic synthesis at configurable gain
 * 3. Deterministic 16-bit 44.1 kHz RIFF WAV fallback (`data:audio/wav;base64,...`) via `HTMLAudioElement`
 */

export const SOUND_PRESETS = Object.freeze([
  {
    id: "chime",
    label: "Acoustic fifth chime (C5 to G5)",
    durationSec: 0.46,
    wave: "triangle",
    decayRate: 10.2,
    overtoneRatio: 2,
    overtoneGain: 0.24,
    notes: [
      { offset: 0.0, dur: 0.24, freq: 523.25 },
      { offset: 0.11, dur: 0.32, freq: 783.99 },
    ],
  },
  {
    id: "marimba",
    label: "Studio triad marimba (C5, E5, G5)",
    durationSec: 0.52,
    wave: "sine",
    decayRate: 14.5,
    overtoneRatio: 4,
    overtoneGain: 0.18,
    notes: [
      { offset: 0.0, dur: 0.18, freq: 523.25 },
      { offset: 0.085, dur: 0.19, freq: 659.25 },
      { offset: 0.17, dur: 0.31, freq: 783.99 },
    ],
  },
  {
    id: "bell",
    label: "Crystal desk bell (A5 shimmer)",
    durationSec: 0.56,
    wave: "sine",
    decayRate: 8.4,
    overtoneRatio: 2.756,
    overtoneGain: 0.2,
    notes: [
      { offset: 0.0, dur: 0.52, freq: 880.0 },
      { offset: 0.03, dur: 0.46, freq: 1318.51 },
    ],
  },
  {
    id: "pulse",
    label: "Crisp double pulse (F5 to A5)",
    durationSec: 0.38,
    wave: "triangle",
    decayRate: 16.0,
    overtoneRatio: 2,
    overtoneGain: 0.15,
    notes: [
      { offset: 0.0, dur: 0.12, freq: 698.46 },
      { offset: 0.11, dur: 0.22, freq: 880.0 },
    ],
  },
  {
    id: "soft-pop",
    label: "Warm acoustic pluck (D5 to A5)",
    durationSec: 0.34,
    wave: "sine",
    decayRate: 18.5,
    overtoneRatio: 3,
    overtoneGain: 0.14,
    notes: [
      { offset: 0.0, dur: 0.13, freq: 587.33 },
      { offset: 0.07, dur: 0.22, freq: 880.0 },
    ],
  },
  {
    id: "none",
    label: "Silent (visual alerts only)",
    durationSec: 0,
    wave: "sine",
    decayRate: 10,
    overtoneRatio: 2,
    overtoneGain: 0,
    notes: [],
  },
]);

export const SOUND_PRESET_IDS = Object.freeze(SOUND_PRESETS.map((p) => p.id));

let sharedCtx = null;
const cachedWavUris = new Map();
let lastChimeEpochMs = 0;

export function getSoundPresetSpec(presetId = "chime") {
  return SOUND_PRESETS.find((p) => p.id === presetId) || SOUND_PRESETS[0];
}

function bytesToBase64(bytes) {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(bytes).toString("base64");
  }
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return globalThis.btoa(binary);
}

/**
 * Synthesizes a clean 16-bit 44.1 kHz mono RIFF WAV buffer for any `SOUND_PRESETS` id.
 */
export function buildChimeWavBytes(sampleRate = 44100, presetId = "chime") {
  const spec =
    presetId === "none" ? SOUND_PRESETS[0] : getSoundPresetSpec(presetId);
  const durationSec = Math.max(0.28, spec.durationSec || 0.44);
  const numSamples = Math.floor(sampleRate * durationSec);
  const dataBytes = numSamples * 2;
  const buf = new ArrayBuffer(44 + dataBytes);
  const view = new DataView(buf);

  const writeAscii = (offset, str) => {
    for (let i = 0; i < str.length; i += 1) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  writeAscii(0, "RIFF");
  view.setUint32(4, 36 + dataBytes, true);
  writeAscii(8, "WAVE");
  writeAscii(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeAscii(36, "data");
  view.setUint32(40, dataBytes, true);

  for (let i = 0; i < numSamples; i += 1) {
    const t = i / sampleRate;
    let sample = 0;
    for (const note of spec.notes) {
      if (t >= note.offset && t <= note.offset + note.dur) {
        const lt = t - note.offset;
        const attack = Math.min(1, lt / 0.01);
        const decay = Math.exp(-lt * spec.decayRate);
        const env = attack * decay;
        const fundamental = Math.sin(2 * Math.PI * note.freq * lt);
        const harmonic =
          spec.overtoneGain *
          Math.sin(2 * Math.PI * note.freq * spec.overtoneRatio * lt);
        sample += env * (fundamental + harmonic) * 0.34;
      }
    }
    const clamped = Math.max(-0.95, Math.min(0.95, sample));
    view.setInt16(44 + i * 2, Math.round(clamped * 32767), true);
  }

  return new Uint8Array(buf);
}

export function getChimeWavDataUri(presetId = "chime") {
  const key = SOUND_PRESET_IDS.includes(presetId) && presetId !== "none" ? presetId : "chime";
  if (!cachedWavUris.has(key)) {
    const wavBytes = buildChimeWavBytes(44100, key);
    cachedWavUris.set(key, `data:audio/wav;base64,${bytesToBase64(wavBytes)}`);
  }
  return cachedWavUris.get(key);
}

function getOrCreateAudioContext(win = globalThis) {
  if (sharedCtx && sharedCtx.state !== "closed") {
    return sharedCtx;
  }
  const AudioCtx = win?.AudioContext || win?.webkitAudioContext;
  if (!AudioCtx) return null;
  try {
    sharedCtx = new AudioCtx();
    return sharedCtx;
  } catch {
    return null;
  }
}

/**
 * Call inside a user gesture (`pointerdown`, `keydown`, `click`, or `<video>` `play`)
 * so Chromium/Brave marks the shared `AudioContext` unlocked for async callbacks.
 */
export function unlockChimeAudio(win = globalThis) {
  try {
    const ctx = getOrCreateAudioContext(win);
    if (!ctx) return false;
    if (ctx.state === "suspended" && typeof ctx.resume === "function") {
      ctx.resume().catch(() => {});
    }
    const buf = ctx.createBuffer(1, 1, 22050);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.connect(ctx.destination);
    src.start(0);
    return true;
  } catch {
    return false;
  }
}

async function playWavElementFallback(win = globalThis, presetId = "chime", volumePct = 75) {
  try {
    const AudioCtor = win?.Audio || globalThis.Audio;
    if (typeof AudioCtor !== "function") return false;
    const audio = new AudioCtor(getChimeWavDataUri(presetId));
    audio.__lmSubsInternal = true;
    audio.volume = Math.max(0.05, Math.min(1, (Number(volumePct) || 75) / 100));
    const playPromise = audio.play();
    if (playPromise && typeof playPromise.then === "function") {
      await playPromise;
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Plays a clear acoustic completion or notification tone using the chosen `preset`
 * (`"chime"` | `"marimba"` | `"bell"` | `"pulse"` | `"soft-pop"`).
 */
export async function playCompletionChimeSound({
  win = globalThis,
  preset = "chime",
  volume = 75,
  force = false,
  dedupeMs = 1100,
} = {}) {
  if (preset === "none") return false;
  const spec = getSoundPresetSpec(preset);
  if (!spec.notes.length) return false;

  const nowMs = Date.now();
  if (!force && dedupeMs > 0 && nowMs - lastChimeEpochMs < dedupeMs) {
    return false;
  }
  lastChimeEpochMs = nowMs;

  const volScale = Math.max(0.08, Math.min(1, (Number(volume) || 75) / 100));
  const peakGain = 0.28 * volScale;

  try {
    const ctx = getOrCreateAudioContext(win);
    if (ctx) {
      if (ctx.state === "suspended" && typeof ctx.resume === "function") {
        await Promise.race([
          ctx.resume().catch(() => {}),
          new Promise((r) => setTimeout(r, 140)),
        ]);
      }
      if (ctx.state === "running") {
        const t0 = ctx.currentTime;
        for (const n of spec.notes) {
          const osc = ctx.createOscillator();
          const overtone = ctx.createOscillator();
          const gain = ctx.createGain();
          const overtoneGain = ctx.createGain();

          osc.type = spec.wave || "triangle";
          osc.frequency.setValueAtTime(n.freq, t0 + n.offset);

          overtone.type = "sine";
          overtone.frequency.setValueAtTime(
            n.freq * (spec.overtoneRatio || 2),
            t0 + n.offset
          );
          overtoneGain.gain.setValueAtTime(spec.overtoneGain || 0.2, t0 + n.offset);

          gain.gain.setValueAtTime(0.0001, t0 + n.offset);
          gain.gain.linearRampToValueAtTime(peakGain, t0 + n.offset + 0.012);
          gain.gain.exponentialRampToValueAtTime(0.0007, t0 + n.offset + n.dur);

          osc.connect(gain);
          overtone.connect(overtoneGain);
          overtoneGain.connect(gain);
          gain.connect(ctx.destination);

          osc.start(t0 + n.offset);
          overtone.start(t0 + n.offset);
          osc.stop(t0 + n.offset + n.dur + 0.02);
          overtone.stop(t0 + n.offset + n.dur + 0.02);
        }
        return true;
      }
    }
  } catch {
    // Fall through to WAV <audio> playback
  }

  return playWavElementFallback(win, spec.id, volume);
}

export async function playNotificationSound({
  win = globalThis,
  preset = "bell",
  volume = 70,
  force = false,
} = {}) {
  return playCompletionChimeSound({
    win,
    preset: preset === "none" ? "none" : preset || "bell",
    volume,
    force,
    dedupeMs: 900,
  });
}
