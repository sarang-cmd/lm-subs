import React from "react";
import { PROJECT_STATS } from "../lib/project-stats.js";

const fmtInt = new Intl.NumberFormat("en-US");

export function AboutView({ onNavigate }) {
  const s = PROJECT_STATS;

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
              Google NotebookLM turns dense papers, lecture slides, and technical documentation into spoken Video Overviews, yet the built-in player ships without closed captions, chapter navigation, or downloadable subtitle files. For students reviewing lectures in a library, researchers searching for a specific formula, or non-native speakers following technical terminology, missing captions turn a strong study tool into a black box.
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
                href="https://github.com/sarang-cmd/lm-subs"
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
              <div style={{ paddingBottom: "12px", borderBottom: "1px solid var(--border-hairline)" }}>
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

              <div style={{ paddingBottom: "12px", borderBottom: "1px solid var(--border-hairline)" }}>
                <dt style={{ fontSize: "12px", color: "var(--ink-tertiary)", marginBottom: "2px" }}>
                  Location and focus
                </dt>
                <dd style={{ margin: 0, color: "var(--ink-secondary)" }}>
                  Germany. Computer science student building practical browser extensions and agentic developer tools.
                </dd>
              </div>

              <div style={{ paddingBottom: "12px", borderBottom: "1px solid var(--border-hairline)" }}>
                <dt style={{ fontSize: "12px", color: "var(--ink-tertiary)", marginBottom: "2px" }}>
                  Current release
                </dt>
                <dd style={{ margin: 0, color: "var(--ink-secondary)" }}>
                  Version <code>v{s.version}</code> ({s.releasesPublished} public releases shipped since {s.firstCommitDate})
                </dd>
              </div>

              <div style={{ paddingBottom: "12px", borderBottom: "1px solid var(--border-hairline)" }}>
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
                    href="https://github.com/sarang-cmd/lm-subs/issues"
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

      {/* Real Machine-Counted Project & Engineering Statistics */}
      <section className="section-block" aria-labelledby="project-stats-heading">
        <div style={{ maxWidth: "760px" }}>
          <h2 id="project-stats-heading" className="section-heading">
            Project and codebase metrics
          </h2>
          <p className="section-prose">
            Every figure below is computed directly at build time from the hand-authored repository tree (excluding <code>node_modules</code>, lockfiles, and compiled output bundles) and verified Git history.
          </p>
        </div>

        <div className="kpi-strip">
          <div className="kpi-cell">
            <div className="kpi-value">{fmtInt.format(s.totalLoc)}</div>
            <div className="kpi-label">Hand-authored lines of code</div>
            <div className="kpi-sub">
              {fmtInt.format(s.nonBlankLoc)} non-blank lines across {s.sourceFiles} files
            </div>
          </div>

          <div className="kpi-cell">
            <div className="kpi-value">{s.engineeringHoursSpan} hrs</div>
            <div className="kpi-label">Active engineering span</div>
            <div className="kpi-sub">
              {s.commitsShipped}+ commits and {s.mergedPullRequests}+ PRs ({s.firstCommitDate} to {s.latestReleaseDate})
            </div>
          </div>

          <div className="kpi-cell">
            <div className="kpi-value">{s.automatedTests}</div>
            <div className="kpi-label">Automated tests passing</div>
            <div className="kpi-sub">
              Across {s.testSuites} E2E, SQL, crypto, updater, and UI test suites
            </div>
          </div>

          <div className="kpi-cell">
            <div className="kpi-value">{s.releaseZipKb} KB</div>
            <div className="kpi-label">Packaged extension archive</div>
            <div className="kpi-sub">
              {s.mv3RuntimeDependencies} external runtime dependencies inside NotebookLM
            </div>
          </div>
        </div>

        <h3
          style={{
            margin: "8px 0 12px",
            fontSize: "16px",
            fontWeight: 600,
            letterSpacing: "-0.015em",
          }}
        >
          Lines of code by architectural subsystem
        </h3>
        <div className="data-table-wrap" style={{ marginBottom: "36px" }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Subsystem</th>
                <th>Files</th>
                <th>Lines</th>
                <th>Share of codebase</th>
              </tr>
            </thead>
            <tbody>
              {s.subsystems.map((sub) => (
                <tr key={sub.id}>
                  <td>
                    <div style={{ fontWeight: 600, color: "var(--ink-primary)" }}>
                      {sub.label}
                    </div>
                    <div style={{ fontSize: "12.5px", color: "var(--ink-secondary)", marginTop: "2px" }}>
                      {sub.detail}
                    </div>
                  </td>
                  <td data-num="true" style={{ fontFamily: "var(--font-mono)", fontSize: "13px" }}>
                    {sub.files}
                  </td>
                  <td data-num="true" style={{ fontFamily: "var(--font-mono)", fontSize: "13px", fontWeight: 600 }}>
                    {fmtInt.format(sub.loc)}
                  </td>
                  <td style={{ minWidth: "170px" }}>
                    <div className="loc-bar-wrap">
                      <div className="loc-bar-track" aria-hidden="true">
                        <div
                          className="loc-bar-fill"
                          style={{ width: `${Math.max(4, sub.sharePct)}%` }}
                        />
                      </div>
                      <span
                        className="tabular"
                        style={{
                          fontFamily: "var(--font-mono)",
                          fontSize: "12.5px",
                          color: "var(--ink-secondary)",
                          width: "44px",
                          textAlign: "right",
                        }}
                      >
                        {sub.sharePct.toFixed(1)}%
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="split-section" style={{ alignItems: "start" }}>
          <div>
            <h3
              style={{
                margin: "0 0 12px",
                fontSize: "16px",
                fontWeight: 600,
                letterSpacing: "-0.015em",
              }}
            >
              Source distribution by language
            </h3>
            <div className="data-table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Language</th>
                    <th>Files</th>
                    <th>Lines</th>
                    <th>Share</th>
                  </tr>
                </thead>
                <tbody>
                  {s.languages.map((lang) => (
                    <tr key={lang.label}>
                      <td style={{ fontWeight: 500 }}>{lang.label}</td>
                      <td data-num="true" style={{ fontFamily: "var(--font-mono)", fontSize: "13px" }}>
                        {lang.files}
                      </td>
                      <td data-num="true" style={{ fontFamily: "var(--font-mono)", fontSize: "13px" }}>
                        {fmtInt.format(lang.loc)}
                      </td>
                      <td data-num="true" style={{ fontFamily: "var(--font-mono)", fontSize: "13px", color: "var(--ink-secondary)" }}>
                        {lang.sharePct.toFixed(1)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <h3
              style={{
                margin: "0 0 12px",
                fontSize: "16px",
                fontWeight: 600,
                letterSpacing: "-0.015em",
              }}
            >
              System capabilities and footprint
            </h3>
            <div className="spec-matrix" style={{ gridTemplateColumns: "1fr" }}>
              {[
                ["Speech-to-text providers", `${s.sttProviders} BYOK adapters with HTTP 429/5xx failover`],
                ["Export formats", `${s.exportFormats} (.SRT, .VTT, .TXT, .MD, .CSV, .JSON)`],
                ["Caption style permutations", `${fmtInt.format(s.stylePermutations)}+ combinations plus continuous opacity`],
                ["In-player keyboard shortcuts", `${s.keyboardShortcuts} single-key controls (loop, jump, bookmark, speed, PiP)`],
                ["Cloud API endpoints", `${s.apiEndpoints} Hono routes backed by ${s.postgresTables} Neon Postgres tables`],
                ["Key vault cryptography", "HKDF-SHA256 + AES-256-GCM per-user key isolation"],
                ["Auto-updater verification", "SHA-256 archive digest + per-file CRC-32 check"],
              ].map(([k, v]) => (
                <div
                  key={k}
                  className="spec-matrix-row"
                  style={{ borderRight: 0, paddingLeft: 0, paddingRight: 0 }}
                >
                  <span style={{ fontSize: "13.5px", color: "var(--ink-secondary)" }}>
                    {k}
                  </span>
                  <span
                    className="tabular"
                    style={{
                      fontSize: "13.5px",
                      fontWeight: 600,
                      color: "var(--ink-primary)",
                      textAlign: "right",
                    }}
                  >
                    {v}
                  </span>
                </div>
              ))}
            </div>
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
              <strong style={{ color: "var(--ink-primary)" }}>Audio-only fast path:</strong> Instead of uploading a 50+ MB MP4 video file, LM Subs selects NotebookLM’s compact <code>=m140</code> AAC audio stream (~3.4 MB) or extracts audio byte ranges in memory before calling your chosen speech model.
            </li>
            <li>
              <strong style={{ color: "var(--ink-primary)" }}>Isolated credential vault:</strong> Plaintext API keys live exclusively inside the background Service Worker (<code>src/lib/storage.js</code>) and never enter NotebookLM’s page context.
            </li>
            <li>
              <strong style={{ color: "var(--ink-primary)" }}>Opt-in Neon Postgres cloud library:</strong> When you choose to sign in with Google, GitHub, or email, API keys are encrypted per user with <code>AES-256-GCM</code> before reaching Postgres, and you control separate switches for keys, transcripts, and settings.
            </li>
          </ul>
        </div>

        <figure className="product-figure">
          <img
            src="/assets/architecture.svg?v=4"
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
