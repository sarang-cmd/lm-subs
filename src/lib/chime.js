/**
 * Acoustic Two-Note Completion Chime (`src/lib/chime.js`).
 *
 * Solves Chromium/Brave MV3 autoplay and suspended-AudioContext issues via:
 * 1. User-gesture `AudioContext` pre-unlocking (`unlockChimeAudio`)
 * 2. Explicit `await ctx.resume()` + warm harmonic C5 -> G5 acoustic chime at audible gain
 * 3. Deterministic 16-bit 44.1 kHz RIFF WAV fallback (`data:audio/wav;base64,...`) via `HTMLAudioElement`
 */

let sharedCtx = null;
let cachedWavDataUri = null;
let lastChimeEpochMs = 0;

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
 * Synthesizes a clean 16-bit 44.1 kHz mono RIFF WAV buffer containing a warm
 * two-note fifth chime (C5 523.25 Hz -> G5 783.99 Hz, ~0.42s total).
 */
export function buildChimeWavBytes(sampleRate = 44100) {
  const durationSec = 0.44;
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
  view.setUint32(16, 16, true); // PCM chunk size
  view.setUint16(20, 1, true); // PCM format = 1
  view.setUint16(22, 1, true); // Mono = 1 channel
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); // Byte rate
  view.setUint16(32, 2, true); // Block align
  view.setUint16(34, 16, true); // Bits per sample
  writeAscii(36, "data");
  view.setUint32(40, dataBytes, true);

  const notes = [
    { start: 0.0, dur: 0.24, freq: 523.25 },
    { start: 0.11, dur: 0.31, freq: 783.99 },
  ];

  for (let i = 0; i < numSamples; i += 1) {
    const t = i / sampleRate;
    let sample = 0;
    for (const note of notes) {
      if (t >= note.start && t <= note.start + note.dur) {
        const lt = t - note.start;
        const attack = Math.min(1, lt / 0.012);
        const decay = Math.exp(-lt * 10.5);
        const env = attack * decay;
        const fundamental = Math.sin(2 * Math.PI * note.freq * lt);
        const harmonic = 0.28 * Math.sin(2 * Math.PI * note.freq * 2 * lt);
        sample += env * (fundamental + harmonic) * 0.34;
      }
    }
    const clamped = Math.max(-0.95, Math.min(0.95, sample));
    view.setInt16(44 + i * 2, Math.round(clamped * 32767), true);
  }

  return new Uint8Array(buf);
}

export function getChimeWavDataUri() {
  if (!cachedWavDataUri) {
    const wavBytes = buildChimeWavBytes(44100);
    cachedWavDataUri = `data:audio/wav;base64,${bytesToBase64(wavBytes)}`;
  }
  return cachedWavDataUri;
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

async function playWavElementFallback(win = globalThis) {
  try {
    const AudioCtor = win?.Audio || globalThis.Audio;
    if (typeof AudioCtor !== "function") return false;
    const audio = new AudioCtor(getChimeWavDataUri());
    audio.volume = 0.72;
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
 * Plays a clear, warm two-note C5 -> G5 acoustic completion chime.
 * Deduplicates rapid calls within `dedupeMs` unless `force: true` is passed.
 */
export async function playCompletionChimeSound({
  win = globalThis,
  force = false,
  dedupeMs = 1200,
} = {}) {
  const nowMs = Date.now();
  if (!force && dedupeMs > 0 && nowMs - lastChimeEpochMs < dedupeMs) {
    return false;
  }
  lastChimeEpochMs = nowMs;

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
        const notes = [
          { offset: 0.0, dur: 0.24, freq: 523.25 },
          { offset: 0.11, dur: 0.31, freq: 783.99 },
        ];
        for (const n of notes) {
          const osc = ctx.createOscillator();
          const overtone = ctx.createOscillator();
          const gain = ctx.createGain();
          const overtoneGain = ctx.createGain();

          osc.type = "triangle";
          osc.frequency.setValueAtTime(n.freq, t0 + n.offset);

          overtone.type = "sine";
          overtone.frequency.setValueAtTime(n.freq * 2, t0 + n.offset);
          overtoneGain.gain.setValueAtTime(0.22, t0 + n.offset);

          gain.gain.setValueAtTime(0.0001, t0 + n.offset);
          gain.gain.linearRampToValueAtTime(0.24, t0 + n.offset + 0.014);
          gain.gain.exponentialRampToValueAtTime(0.0008, t0 + n.offset + n.dur);

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

  return playWavElementFallback(win);
}
