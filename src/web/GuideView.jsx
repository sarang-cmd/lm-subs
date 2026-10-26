import React, { useState } from "react";
import { Tabs } from "radix-ui";
import { ChromePuzzlePinDiagram } from "./WelcomeView.jsx";

export function GuideView({
  onNavigate,
  onStartDownloadSetup,
  onOpenSignIn,
  user,
}) {
  const [osTab, setOsTab] = useState("mac");
  const [copiedUrl, setCopiedUrl] = useState(false);

  async function handleCopyExtensionsUrl() {
    try {
      await navigator.clipboard.writeText("chrome://extensions");
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 1800);
    } catch {
      // Fallback ignored if clipboard blocked
    }
  }

  return (
    <div className="page-wrap">
      <section className="section-block" style={{ paddingTop: 0 }}>
        <div style={{ maxWidth: "740px" }}>
          <h1
            className="hero-title"
            style={{ fontSize: "clamp(28px, 3.8vw, 42px)", textAlign: "left" }}
          >
            Install LM Subs in four steps
          </h1>
          <p
            className="section-prose"
            style={{ fontSize: "17px", marginTop: "12px", maxWidth: "66ch" }}
          >
            You do not need coding tools, terminal commands, or a credit card. Follow the four steps below in Google Chrome, Brave, Microsoft Edge, or Arc.
          </p>
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginTop: "20px" }}>
            <a
              className="btn btn-primary"
              href="/releases/lm-subs-v0.2.6.zip"
              download
              onClick={onStartDownloadSetup}
            >
              Download Chrome extension (.zip)
            </a>
            <button
              type="button"
              className="btn btn-ink"
              onClick={() => onNavigate?.("welcome")}
            >
              Open interactive two-way setup
            </button>
            <a
              className="btn"
              href="https://console.groq.com/keys"
              target="_blank"
              rel="noopener noreferrer"
            >
              Open free Groq key page
            </a>
          </div>
        </div>
      </section>

      {/* Step 1 */}
      <section className="section-block">
        <div className="split-section">
          <div>
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "12px",
                fontWeight: 600,
                color: "var(--accent)",
                marginBottom: "8px",
              }}
            >
              Step 1 of 4
            </div>
            <h2 className="section-heading">
              Download and unzip the extension folder
            </h2>
            <p className="section-prose">
              Click the download button above to save <code>lm-subs-v0.2.6.zip</code> to your computer, then extract it into a regular folder. Keep that folder somewhere permanent such as your Documents folder so Chrome can load it whenever you open your browser.
            </p>
          </div>

          <div>
            <Tabs.Root value={osTab} onValueChange={setOsTab}>
              <Tabs.List className="radix-tabs-list" aria-label="Operating system instructions">
                <Tabs.Trigger className="radix-tabs-trigger" value="mac">
                  macOS
                </Tabs.Trigger>
                <Tabs.Trigger className="radix-tabs-trigger" value="windows">
                  Windows
                </Tabs.Trigger>
              </Tabs.List>

              <Tabs.Content value="mac" className="sheet" style={{ padding: "18px 20px", marginTop: "12px" }}>
                <ol style={{ margin: 0, paddingLeft: "20px", display: "grid", gap: "8px", color: "var(--ink-secondary)", fontSize: "14px" }}>
                  <li>Open your <strong style={{ color: "var(--ink)" }}>Downloads</strong> folder in Finder.</li>
                  <li>Double-click <code style={{ fontFamily: "var(--font-mono)" }}>lm-subs-v0.2.6.zip</code>. macOS creates an unzipped folder next to the zip file automatically.</li>
                  <li>Move that unzipped folder into <strong style={{ color: "var(--ink)" }}>Documents</strong> so you do not delete it later while cleaning Downloads.</li>
                </ol>
              </Tabs.Content>

              <Tabs.Content value="windows" className="sheet" style={{ padding: "18px 20px", marginTop: "12px" }}>
                <ol style={{ margin: 0, paddingLeft: "20px", display: "grid", gap: "8px", color: "var(--ink-secondary)", fontSize: "14px" }}>
                  <li>Open File Explorer and go to <strong style={{ color: "var(--ink)" }}>Downloads</strong>.</li>
                  <li>Right-click <code style={{ fontFamily: "var(--font-mono)" }}>lm-subs-v0.2.6.zip</code> and click <strong style={{ color: "var(--ink)" }}>Extract All...</strong>, then click <strong style={{ color: "var(--ink)" }}>Extract</strong>.</li>
                  <li>Notice that Windows now shows a regular folder without a zipper icon. Remember where that unzipped folder is saved.</li>
                </ol>
              </Tabs.Content>
            </Tabs.Root>
          </div>
        </div>
      </section>

      {/* Step 2 */}
      <section className="section-block">
        <div className="split-section">
          <div>
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "12px",
                fontWeight: 600,
                color: "var(--accent)",
                marginBottom: "8px",
              }}
            >
              Step 2 of 4
            </div>
            <h2 className="section-heading">
              Add the unzipped folder to Chrome
            </h2>
            <p className="section-prose">
              Chrome lets you load open-source extensions directly from a folder on your computer using Developer mode.
            </p>
            <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap", marginTop: "14px" }}>
              <button
                type="button"
                className="btn btn-sm btn-ink"
                onClick={handleCopyExtensionsUrl}
              >
                {copiedUrl ? "Copied chrome://extensions" : "Copy chrome://extensions"}
              </button>
              <span style={{ fontSize: "13px", color: "var(--ink-tertiary)" }}>
                Paste into a new browser tab address bar
              </span>
            </div>
          </div>

          <div className="sheet" style={{ padding: "20px 22px" }}>
            <ol style={{ margin: 0, paddingLeft: "20px", display: "grid", gap: "10px", color: "var(--ink-secondary)", fontSize: "14px" }}>
              <li>
                Open a new tab in Chrome, paste <code style={{ fontFamily: "var(--font-mono)", color: "var(--ink)" }}>chrome://extensions</code> into the address bar at the top, and press <strong style={{ color: "var(--ink)" }}>Enter</strong>. (In Brave use <code style={{ fontFamily: "var(--font-mono)" }}>brave://extensions</code>; in Edge use <code style={{ fontFamily: "var(--font-mono)" }}>edge://extensions</code>.)
              </li>
              <li>
                Flip on the <strong style={{ color: "var(--ink)" }}>Developer mode</strong> switch in the top-right corner of the page.
              </li>
              <li>
                Click the <strong style={{ color: "var(--ink)" }}>Load unpacked</strong> button that appears in the top-left corner, then select the unzipped <strong style={{ color: "var(--ink)" }}>lm-subs</strong> folder from Step 1.
              </li>
              <li>
                On the welcome page that opens automatically, click the puzzle-piece icon in Chrome’s top-right toolbar. <strong style={{ color: "var(--ink)" }}>LM Subs</strong> appears at the top under <strong style={{ color: "var(--ink)" }}>Access requested</strong> so you can pin it right away without scrolling past other extensions.
              </li>
            </ol>
            <div style={{ marginTop: "14px" }}>
              <ChromePuzzlePinDiagram verified={false} />
            </div>
          </div>
        </div>
      </section>

      {/* Step 3 */}
      <section className="section-block">
        <div className="split-section">
          <div>
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "12px",
                fontWeight: 600,
                color: "var(--accent)",
                marginBottom: "8px",
              }}
            >
              Step 3 of 4
            </div>
            <h2 className="section-heading">
              Paste one free Groq transcription key
            </h2>
            <p className="section-prose">
              LM Subs connects directly from your browser to a speech-to-text model so nobody charges you a subscription fee. Groq offers a free account with no credit card that transcribes up to 8 hours of audio per day.
            </p>
            <ol style={{ margin: "14px 0 0", paddingLeft: "20px", display: "grid", gap: "10px", color: "var(--ink-secondary)", fontSize: "14.5px" }}>
              <li>
                Visit{" "}
                <a
                  className="link"
                  href="https://console.groq.com/keys"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  console.groq.com/keys
                </a>{" "}
                and sign in with your Google or GitHub account.
              </li>
              <li>
                Click <strong style={{ color: "var(--ink)" }}>Create API Key</strong>, type <code style={{ fontFamily: "var(--font-mono)" }}>LM Subs</code> as the name, and copy the key starting with <code style={{ fontFamily: "var(--font-mono)" }}>gsk_</code>.
              </li>
              <li>
                Click the <strong style={{ color: "var(--ink)" }}>LM Subs</strong> icon in your Chrome toolbar, paste that key into the <strong style={{ color: "var(--ink)" }}>API key</strong> box, and click <strong style={{ color: "var(--ink)" }}>Save</strong>.
              </li>
            </ol>
          </div>

          <figure className="product-figure" style={{ marginTop: 0 }}>
            <img
              src="/assets/screenshots/03-toolbar-popup.png?v=8"
              alt="LM Subs Chrome toolbar popup showing where to paste and save your free Groq API key"
              width="1280"
              height="800"
              loading="lazy"
            />
            <figcaption>
              Paste your free <code>gsk_...</code> key into the LM Subs popup and click Save.
            </figcaption>
          </figure>

          <figure className="product-figure" style={{ marginTop: 0 }}>
            <img
              src="/assets/screenshots/06-api-key-guide.png?v=8"
              alt="LM Subs settings page showing a numbered step by step walkthrough for creating a Groq API key"
              width="1180"
              height="900"
              loading="lazy"
            />
            <figcaption>
              Every provider row in the settings page includes its own numbered walkthrough, from creating the account through copying the finished key.
            </figcaption>
          </figure>
        </div>
      </section>

      {/* Step 4 */}
      <section className="section-block">
        <div className="split-section">
          <div>
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "12px",
                fontWeight: 600,
                color: "var(--accent)",
                marginBottom: "8px",
              }}
            >
              Step 4 of 4
            </div>
            <h2 className="section-heading">
              Play any NotebookLM Video or Audio Overview with captions
            </h2>
            <p className="section-prose">
              Open{" "}
              <a
                className="link"
                href="https://notebooklm.google.com"
                target="_blank"
                rel="noopener noreferrer"
              >
                notebooklm.google.com
              </a>
              , open any notebook, and play a Video Overview or two-host Audio Overview podcast. Within about three seconds, synchronized closed captions appear automatically.
            </p>
            <p className="section-prose">
              Use the compact <strong>CC</strong>, <strong>Transcript</strong>, and <strong>Options</strong> controls docked in the bottom bar to toggle captions, adjust word-for-word highlight delay, customize styling, or download <code>.srt</code>, <code>.vtt</code>, <code>.txt</code>, <code>.md</code>, <code>.csv</code>, or <code>.json</code> transcripts.
            </p>
            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginTop: "18px" }}>
              <button
                type="button"
                className="btn btn-ink"
                onClick={() => (user ? onNavigate("library") : onOpenSignIn())}
              >
                {user ? "Open your cloud library" : "Optional: Sign in to sync across browsers"}
              </button>
              <button
                type="button"
                className="btn"
                onClick={() => onNavigate("overview")}
              >
                Back to overview
              </button>
            </div>
          </div>

          <figure className="product-figure" style={{ marginTop: 0 }}>
            <img
              src="/assets/screenshots/01-player-subtitles.png?v=8"
              alt="Highlighted spoken-word captions and bottom play-bar controls inside a NotebookLM Video Overview"
              width="1280"
              height="800"
              loading="lazy"
            />
            <figcaption>
              Highlighted spoken-word captions render inside inline playback, Fullscreen, and Picture-in-Picture with controls integrated in the bottom play bar.
            </figcaption>
          </figure>
        </div>
      </section>

      {/* Plain-language FAQ */}
      <section className="section-block">
        <h2 className="section-heading">Common questions</h2>
        <div style={{ display: "grid", gap: "18px", maxWidth: "780px", marginTop: "18px" }}>
          <div style={{ paddingBottom: "18px", borderBottom: "1px solid var(--border)" }}>
            <h3 style={{ margin: "0 0 6px", fontSize: "15.5px", fontWeight: 600 }}>
              Chrome asks whether to keep Developer mode extensions active. Is that normal?
            </h3>
            <p className="section-prose" style={{ marginBottom: 0 }}>
              Yes. Chrome shows that reminder whenever any extension is installed from a local folder instead of the Chrome Web Store. LM Subs is 100% open-source under the MIT License so every file in that folder can be inspected directly.
            </p>
          </div>

          <div style={{ paddingBottom: "18px", borderBottom: "1px solid var(--border)" }}>
            <h3 style={{ margin: "0 0 6px", fontSize: "15.5px", fontWeight: 600 }}>
              Does Groq or Mistral charge money if I use their free tier?
            </h3>
            <p className="section-prose" style={{ marginBottom: 0 }}>
              Groq’s free developer plan does not ask for a credit card. If you transcribe many hours back to back and hit the hourly rate limit, LM Subs pauses cleanly or switches automatically to a second backup key such as Mistral or Google Gemini.
            </p>
          </div>

          <div style={{ paddingBottom: "18px", borderBottom: "1px solid var(--border)" }}>
            <h3 style={{ margin: "0 0 6px", fontSize: "15.5px", fontWeight: 600 }}>
              Do I have to create an LM Subs cloud account?
            </h3>
            <p className="section-prose" style={{ marginBottom: 0 }}>
              No. Everything works locally inside Chrome out of the box. Signing in with Google, GitHub, or a 6-digit email code is optional if you want your encrypted API keys and saved transcripts available on another computer.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
