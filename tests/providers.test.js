import assert from "node:assert/strict";
import test from "node:test";
import {
  listProviderSpecs,
  redactSecrets,
  transcribeSingleChunk,
  transcribeWithQueue,
} from "../src/lib/providers/index.js";

const DUMMY_AUDIO = new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7]);

function jsonResponse(body, status = 200, headers = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...headers },
  });
}

test("Registry exposes all 12 BYOK providers with Groq and Mistral prioritized first", () => {
  const specs = listProviderSpecs();
  assert.equal(specs.length, 12);
  assert.equal(specs[0].id, "groq");
  assert.equal(specs[1].id, "mistral");
});

test("Mistral adapter sends segment granularity and falls back from voxtral-mini-transcribe-3 to voxtral-mini-latest if 404", async () => {
  const modelsAttempted = [];
  const mockFetch = async (_url, init) => {
    const model = init.body.get("model");
    modelsAttempted.push(model);
    assert.equal(init.body.get("timestamp_granularities"), "segment");
    if (model === "voxtral-mini-transcribe-3") {
      return jsonResponse({ message: "Unknown model voxtral-mini-transcribe-3" }, 404);
    }
    return jsonResponse({
      text: "Voxtral fallback succeeded.",
      segments: [{ start: 0.4, end: 2.8, text: "Voxtral fallback succeeded." }],
    });
  };

  const cues = await transcribeSingleChunk({
    providerId: "mistral",
    model: "voxtral-mini-transcribe-3",
    apiKey: "mistral-secret-key-12345",
    audioBytes: DUMMY_AUDIO,
    fetchImpl: mockFetch,
  });

  assert.deepEqual(modelsAttempted, ["voxtral-mini-transcribe-3", "voxtral-mini-latest"]);
  assert.equal(cues.length, 1);
  assert.equal(cues[0].text, "Voxtral fallback succeeded.");
});

test("Gemini, Deepgram, ElevenLabs, Cloudflare, and HuggingFace adapters parse native timestamps", async () => {
  // 1. Gemini (`x-goog-api-key` header, never URL query string)
  const geminiCues = await transcribeSingleChunk({
    providerId: "gemini",
    apiKey: "AIzaSecretGeminiKey999",
    audioBytes: DUMMY_AUDIO,
    translateTo: "German",
    fetchImpl: async (url, init) => {
      assert.ok(!url.includes("AIzaSecretGeminiKey999"));
      assert.equal(init.headers["x-goog-api-key"], "AIzaSecretGeminiKey999");
      return jsonResponse({
        candidates: [
          {
            content: {
              parts: [
                {
                  text: "1\n00:00:00,500 --> 00:00:03,000\nWillkommen zur Zusammenfassung.\n",
                },
              ],
            },
          },
        ],
      });
    },
  });
  assert.equal(geminiCues[0].text, "Willkommen zur Zusammenfassung.");

  // 2. Deepgram (`Authorization: Token ...`)
  const dgCues = await transcribeSingleChunk({
    providerId: "deepgram",
    apiKey: "dg_secret_token",
    audioBytes: DUMMY_AUDIO,
    fetchImpl: async (_url, init) => {
      assert.equal(init.headers.Authorization, "Token dg_secret_token");
      return jsonResponse({
        results: {
          channels: [
            {
              alternatives: [
                {
                  words: [
                    { punctuated_word: "Deepgram", start: 0.1, end: 0.6 },
                    { punctuated_word: "works.", start: 0.65, end: 1.1 },
                  ],
                },
              ],
            },
          ],
        },
      });
    },
  });
  assert.equal(dgCues[0].text, "Deepgram works.");

  // 3. ElevenLabs (`scribe_v2` + `xi-api-key`)
  const elCues = await transcribeSingleChunk({
    providerId: "elevenlabs",
    apiKey: "sk_eleven_secret",
    audioBytes: DUMMY_AUDIO,
    fetchImpl: async (_url, init) => {
      assert.equal(init.headers["xi-api-key"], "sk_eleven_secret");
      assert.equal(init.body.get("model_id"), "scribe_v2");
      return jsonResponse({
        words: [
          { text: "Scribe", start: 0.2, end: 0.7, type: "word" },
          { text: "v2.", start: 0.75, end: 1.2, type: "word" },
        ],
      });
    },
  });
  assert.equal(elCues[0].text, "Scribe v2.");

  // 4. Cloudflare (`account_id:api_token`)
  const cfCues = await transcribeSingleChunk({
    providerId: "cloudflare",
    apiKey: "acc12345:cf_secret_tok999",
    audioBytes: DUMMY_AUDIO,
    fetchImpl: async (url, init) => {
      assert.ok(url.includes("/accounts/acc12345/ai/run/"));
      assert.equal(init.headers.Authorization, "Bearer cf_secret_tok999");
      return jsonResponse({
        result: {
          vtt: "WEBVTT\n\n00:00.100 --> 00:02.000\nWorkers AI ready.\n",
        },
      });
    },
  });
  assert.equal(cfCues[0].text, "Workers AI ready.");

  // 5. Hugging Face (`chunks[]`)
  const hfCues = await transcribeSingleChunk({
    providerId: "huggingface",
    apiKey: "hf_secret_token_abc",
    audioBytes: DUMMY_AUDIO,
    fetchImpl: async () =>
      jsonResponse({
        chunks: [{ timestamp: [0.0, 2.4], text: "Hugging Face chunk." }],
      }),
  });
  assert.equal(hfCues[0].text, "Hugging Face chunk.");

  // 6. AssemblyAI (`upload -> transcript -> poll`)
  let aaiStep = 0;
  const aaiCues = await transcribeSingleChunk({
    providerId: "assemblyai",
    apiKey: "aai_secret_key",
    audioBytes: DUMMY_AUDIO,
    fetchImpl: async () => {
      aaiStep++;
      if (aaiStep === 1) return jsonResponse({ upload_url: "https://cdn.assemblyai.com/u/1" });
      if (aaiStep === 2) return jsonResponse({ id: "tx_99" });
      return jsonResponse({
        status: "completed",
        words: [{ text: "AssemblyAI.", start: 200, end: 900 }],
      });
    },
  });
  assert.equal(aaiCues[0].text, "AssemblyAI.");

  // 7. Gladia (`upload -> pre-recorded -> poll`)
  let gladiaStep = 0;
  const gladiaCues = await transcribeSingleChunk({
    providerId: "gladia",
    apiKey: "gladia_secret_key",
    audioBytes: DUMMY_AUDIO,
    fetchImpl: async () => {
      gladiaStep++;
      if (gladiaStep === 1) return jsonResponse({ audio_url: "https://api.gladia.io/a/1" });
      if (gladiaStep === 2) return jsonResponse({ result_url: "https://api.gladia.io/v2/pre-recorded/1" });
      return jsonResponse({
        status: "done",
        result: {
          transcription: {
            subtitles: [{ format: "srt", subtitles: "1\n00:00:00,200 --> 00:00:01,500\nGladia Solaria.\n" }],
          },
        },
      });
    },
  });
  assert.equal(gladiaCues[0].text, "Gladia Solaria.");

  // 8. Local / Custom Whisper (`requiresKey === false`)
  const localCues = await transcribeSingleChunk({
    providerId: "custom",
    apiKey: "",
    customBaseUrl: "http://localhost:8000/v1",
    audioBytes: DUMMY_AUDIO,
    fetchImpl: async (url) => {
      assert.equal(url, "http://localhost:8000/v1/audio/transcriptions");
      return jsonResponse({
        segments: [{ start: 0.1, end: 1.9, text: "Local faster-whisper." }],
      });
    },
  });
  assert.equal(localCues[0].text, "Local faster-whisper.");
});

test("transcribeWithQueue automatically fails over from Groq (HTTP 429) to Mistral (#2) and redacts keys", async () => {
  const groqKey = "gsk_super_secret_groq_key_12345";
  const mistralKey = "mst_super_secret_mistral_key_67890";

  const mockFetch = async (url) => {
    if (String(url).includes("api.groq.com")) {
      return jsonResponse(
        { error: { message: `Rate limit reached for key ${groqKey}` } },
        429,
        { "retry-after": "12" }
      );
    }
    if (String(url).includes("api.mistral.ai")) {
      return jsonResponse({
        segments: [
          { start: 0.0, end: 2.5, text: "First chunk from Mistral." },
        ],
      });
    }
    throw new Error(`Unexpected URL: ${url}`);
  };

  const result = await transcribeWithQueue({
    chunks: [
      { bytes: DUMMY_AUDIO, mimeType: "audio/mp4", fileName: "part1.m4a", startOffsetSec: 0 },
      { bytes: DUMMY_AUDIO, mimeType: "audio/mp4", fileName: "part2.m4a", startOffsetSec: 10 },
    ],
    candidates: [
      { providerId: "groq", apiKey: groqKey },
      { providerId: "mistral", apiKey: mistralKey },
    ],
    fetchImpl: mockFetch,
  });

  assert.equal(result.provider, "mistral");
  assert.equal(result.failoverUsed, true);
  assert.equal(result.cues.length, 2);
  assert.equal(result.cues[0].startSec, 0);
  assert.equal(result.cues[1].startSec, 10);
  // Ensure secret key was scrubbed from recorded attempt error
  assert.ok(!JSON.stringify(result.attempts).includes(groqKey));
  assert.equal(redactSecrets(`Failed with ${mistralKey}`, [mistralKey]), "Failed with [REDACTED]");
});
