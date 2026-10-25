import React from "react";

export function PrivacyView({ onNavigate }) {
  return (
    <div className="page-wrap">
      <article className="legal-article">
        <h1>Privacy policy</h1>
        <p>Last updated: October 25, 2026</p>

        <div className="draft-callout">
          <strong>Draft notice for operator review:</strong> Before commercial or Chrome Web Store publication, replace the bracketed operator entity name, postal address, and dedicated privacy contact address below with your final legal details.
        </div>

        <h2>1. Scope and operator</h2>
        <p>
          This Privacy Policy describes how LM Subs (operated by{" "}
          <code>[Draft: Operator Legal Name / Maintainer]</code>,{" "}
          <code>[Draft: Registered Address]</code>, contact:{" "}
          <code>[Draft: privacy@yourdomain.example]</code>) handles data across the LM Subs Chrome extension and the hosted LM Subs web service.
        </p>

        <h2>2. Local-only mode vs optional cloud account</h2>
        <p>
          You can use the LM Subs Chrome extension without creating an account. When signed out, your speech-to-text API keys, generated caption cues, and display settings remain in Chrome local storage (<code>chrome.storage.local</code>) on your device.
        </p>
        <p>
          When generating captions on <code>notebooklm.google.com</code> or <code>notebook.google.com</code>, the extension extracts compact audio in your browser and sends that audio directly from your browser to the speech-to-text provider you selected (such as Groq, Mistral, Google Gemini, Deepgram, or OpenAI). Raw audio files are never uploaded to LM Subs servers.
        </p>

        <h2>3. Account sign-in (Google, GitHub, or email code)</h2>
        <p>
          If you choose to sign in to the hosted LM Subs cloud library, you may authenticate with Google OAuth, GitHub OAuth, or a 6-digit one-time verification code sent to your email address. We store your account identifier, email address, display name, optional profile image URL, and SHA-256-hashed session tokens in Neon Postgres.
        </p>

        <h2>4. Granular opt-in sync and encryption</h2>
        <p>
          Signed-in users control three independent sync switches in both the web library and Chrome extension settings:
        </p>
        <ul>
          <li>
            <strong>Sync API keys:</strong> When enabled, your speech-to-text API keys are encrypted per user with HKDF-SHA256 and AES-256-GCM before storage in Postgres. Turning this switch off lets you immediately purge stored encrypted keys from our database.
          </li>
          <li>
            <strong>Sync transcriptions:</strong> When enabled, generated caption cues, titles, language tags, byte-saving telemetry, and provider latency are stored under your account so other browsers load captions immediately and populate your Statistics view.
          </li>
          <li>
            <strong>Sync preferences:</strong> When enabled, your provider failover queue order, language hint, and caption display size synchronize across browsers.
          </li>
        </ul>

        <h2>5. Data retention and deletion</h2>
        <p>
          You can delete individual transcripts, remove stored API keys, or purge entire sync categories at any time from the{" "}
          <button
            type="button"
            className="link"
            style={{ background: "none", border: 0, padding: 0, cursor: "pointer", font: "inherit" }}
            onClick={() => onNavigate("library")}
          >
            Cloud library
          </button>
          . Session tokens expire automatically after 90 days or immediately when you sign out.
        </p>

        <h2>6. Subprocessors and third-party services</h2>
        <ul>
          <li>
            <strong>Neon (Postgres database hosting):</strong> Stores account records and opted-in encrypted keys, transcripts, and usage metrics.
          </li>
          <li>
            <strong>Vercel (application hosting):</strong> Serves the web application and stateless API routes over HTTPS.
          </li>
          <li>
            <strong>Your chosen speech-to-text provider(s):</strong> Receives extracted NotebookLM audio directly from your browser under your own API key and that provider’s privacy terms.
          </li>
        </ul>
      </article>
    </div>
  );
}

export function TermsView({ onNavigate }) {
  return (
    <div className="page-wrap">
      <article className="legal-article">
        <h1>Terms of service</h1>
        <p>Last updated: October 25, 2026</p>

        <div className="draft-callout">
          <strong>Draft notice for operator review:</strong> Confirm governing law, venue, and operator contact details in brackets below with legal counsel before commercial launch.
        </div>

        <h2>1. Acceptance of terms</h2>
        <p>
          By installing the LM Subs Chrome extension or signing in to the hosted LM Subs web application operated by{" "}
          <code>[Draft: Operator Legal Name / Maintainer]</code>, you agree to these Terms of Service and our{" "}
          <button
            type="button"
            className="link"
            style={{ background: "none", border: 0, padding: 0, cursor: "pointer", font: "inherit" }}
            onClick={() => onNavigate("privacy")}
          >
            Privacy Policy
          </button>
          .
        </p>

        <h2>2. Description of the service</h2>
        <p>
          LM Subs is an independent open-source browser extension and optional cloud sync companion that generates synchronized captions and portable subtitle files for Google NotebookLM Video Overviews. LM Subs is unaffiliated with Google LLC.
        </p>

        <h2>3. Bring-your-own-key responsibilities</h2>
        <p>
          Transcription requests execute using speech-to-text API keys supplied by you. You are responsible for complying with the acceptable-use rules, billing limits, and rate limits of any third-party speech-to-text provider whose key you configure, and for ensuring you have permission to transcribe the content in your notebooks.
        </p>

        <h2>4. Hosted cloud accounts and acceptable use</h2>
        <p>
          You must not attempt to probe, overload, or bypass authentication on the LM Subs API, access another user’s rows, or store unlawful material in the cloud transcript library. We may suspend accounts that abuse service stability.
        </p>

        <h2>5. Open-source software and warranty disclaimer</h2>
        <p>
          LM Subs is provided on an “as is” and “as available” basis under the MIT License without warranties of uninterrupted availability, transcription accuracy, or fitness for a particular purpose. Google may modify NotebookLM interfaces at any time.
        </p>

        <h2>6. Limitation of liability and governing law</h2>
        <p>
          To the maximum extent permitted by applicable law in{" "}
          <code>[Draft: Governing Jurisdiction, e.g., Germany / European Union]</code>, the maintainers of LM Subs shall not be liable for indirect, incidental, or consequential damages arising from third-party API charges or service interruptions.
        </p>
      </article>
    </div>
  );
}
