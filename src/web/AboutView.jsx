import React from "react";

export function AboutView({ onNavigate }) {
  return (
    <div className="page-wrap">
      <section className="section-block" style={{ paddingTop: 0 }}>
        <div className="split-section">
          <div>
            <h1
              className="hero-title"
              style={{ fontSize: "clamp(28px, 3.8vw, 42px)", textAlign: "left" }}
            >
              About LM Subs
            </h1>
            <p className="section-prose" style={{ fontSize: "16.5px", marginTop: "14px" }}>
              LM Subs is an open-source Chrome extension and cloud transcript library created by{" "}
              <strong>Sarang</strong> (
              <a
                className="link"
                href="https://github.com/sarang-cmd"
                target="_blank"
                rel="noopener noreferrer"
              >
                @sarang-cmd
              </a>
              ), a computer science student and agentic engineer based in Germany.
            </p>
            <p className="section-prose">
              Google NotebookLM turns dense papers, lecture slides, and technical documentation into spoken Video Overviews, yet the built-in player ships without closed captions or downloadable subtitle files. For students reviewing lectures in a library, researchers searching for a specific formula, or non-native speakers following technical terminology, missing captions turn a strong study tool into a black box.
            </p>
            <p className="section-prose">
              LM Subs bridges that gap without putting a paid SaaS middleman between your browser and speech-to-text models.
            </p>

            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginTop: "22px" }}>
              <a
                className="btn btn-ink"
                href="https://github.com/sarang-cmd"
                target="_blank"
                rel="noopener noreferrer"
              >
                Sarang on GitHub (@sarang-cmd)
              </a>
              <a
                className="btn"
                href="https://github.com/sarang-cmd/notebooklm-subtitles"
                target="_blank"
                rel="noopener noreferrer"
              >
                View source repository
              </a>
              <button
                type="button"
                className="btn"
                onClick={() => onNavigate("guide")}
              >
                Read setup guide
              </button>
            </div>
          </div>

          <div className="sheet" style={{ padding: "24px 26px" }}>
            <h2 style={{ margin: "0 0 14px", fontSize: "17px", fontWeight: 700, letterSpacing: "-0.015em" }}>
              Creator and project details
            </h2>
            <dl
              style={{
                margin: 0,
                display: "grid",
                gap: "12px",
                fontSize: "14px",
              }}
            >
              <div style={{ paddingBottom: "12px", borderBottom: "1px solid var(--border)" }}>
                <dt style={{ fontSize: "12px", color: "var(--ink-tertiary)", marginBottom: "2px" }}>
                  Creator
                </dt>
                <dd style={{ margin: 0, fontWeight: 600 }}>
                  Sarang (
                  <a
                    className="link"
                    href="https://github.com/sarang-cmd"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    github.com/sarang-cmd
                  </a>
                  )
                </dd>
              </div>

              <div style={{ paddingBottom: "12px", borderBottom: "1px solid var(--border)" }}>
                <dt style={{ fontSize: "12px", color: "var(--ink-tertiary)", marginBottom: "2px" }}>
                  Location and focus
                </dt>
                <dd style={{ margin: 0, color: "var(--ink-secondary)" }}>
                  Germany. Computer science student building practical browser extensions and agentic developer tools.
                </dd>
              </div>

              <div style={{ paddingBottom: "12px", borderBottom: "1px solid var(--border)" }}>
                <dt style={{ fontSize: "12px", color: "var(--ink-tertiary)", marginBottom: "2px" }}>
                  License
                </dt>
                <dd style={{ margin: 0, color: "var(--ink-secondary)" }}>
                  MIT License. Free to inspect, fork, audit, and modify.
                </dd>
              </div>

              <div>
                <dt style={{ fontSize: "12px", color: "var(--ink-tertiary)", marginBottom: "2px" }}>
                  Feedback and bug reports
                </dt>
                <dd style={{ margin: 0 }}>
                  <a
                    className="link"
                    href="https://github.com/sarang-cmd/notebooklm-subtitles/issues"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Open an issue on GitHub
                  </a>
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </section>

      <section className="section-block">
        <div style={{ maxWidth: "740px", marginBottom: "24px" }}>
          <h2 className="section-heading">How LM Subs is engineered</h2>
          <p className="section-prose">
            Every architectural decision in LM Subs prioritizes speed, low bandwidth, and strict credential isolation inside Chrome Manifest V3:
          </p>
          <ul style={{ margin: "12px 0 0", paddingLeft: "20px", display: "grid", gap: "10px", color: "var(--ink-secondary)", fontSize: "15px" }}>
            <li>
              <strong style={{ color: "var(--ink)" }}>Audio-only fast path:</strong> Instead of uploading a 50+ MB MP4 video file, LM Subs selects NotebookLM’s compact <code>=m140</code> AAC audio stream (~3.4 MB) or extracts audio byte ranges in memory before calling your chosen speech model.
            </li>
            <li>
              <strong style={{ color: "var(--ink)" }}>Isolated credential vault:</strong> Plaintext API keys live exclusively inside the background Service Worker (<code>src/lib/storage.js</code>) and never enter NotebookLM’s page context.
            </li>
            <li>
              <strong style={{ color: "var(--ink)" }}>Opt-in Neon Postgres cloud library:</strong> When you choose to sign in with Google, GitHub, or email, API keys are encrypted per user with <code>AES-256-GCM</code> before reaching Postgres, and you control separate switches for keys, transcripts, and settings.
            </li>
          </ul>
        </div>

        <figure className="product-figure">
          <img
            src="/assets/architecture.svg?v=3"
            alt="Four-plane architecture diagram of LM Subs showing Page Main World, Isolated Content Script, Service Worker, and Hosted Neon Postgres Cloud"
            width="1120"
            height="460"
            loading="lazy"
          />
          <figcaption>
            End-to-end data flow across NotebookLM’s page context, isolated Shadow DOM caption bar, background Service Worker, and opt-in Neon Postgres cloud storage.
          </figcaption>
        </figure>
      </section>
    </div>
  );
}
