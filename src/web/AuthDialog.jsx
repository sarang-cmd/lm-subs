import React, { useRef, useState } from "react";
import { Dialog } from "radix-ui";

export function AuthCard({
  onAuthenticated,
  oauthNotice = "",
  redirectAfter = "/library",
}) {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [codeSentNotice, setCodeSentNotice] = useState("");
  const [previewCode, setPreviewCode] = useState("");
  const [copiedPreview, setCopiedPreview] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [verifyingCode, setVerifyingCode] = useState(false);
  const [error, setError] = useState("");

  const emailRef = useRef(null);
  const codeRef = useRef(null);

  async function handleSendCode(e) {
    e.preventDefault();
    setError("");
    setCodeSentNotice("");
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError("Enter a valid email address, such as alex@university.edu.");
      emailRef.current?.focus();
      return;
    }

    setSendingCode(true);
    try {
      const res = await fetch("/api/auth/email/send-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed }),
      });
      const data = await res.json();
      if (!res.ok || !data?.ok) {
        setError(data?.error || "Could not send a verification code.");
        emailRef.current?.focus();
        return;
      }
      if (data.delivery === "preview" && data.previewCode) {
        setPreviewCode(data.previewCode);
        setCode(data.previewCode);
        setCodeSentNotice("");
      } else {
        setPreviewCode("");
        setCodeSentNotice(`Sent a 6-digit code to ${trimmed}. Enter it in the open box below.`);
      }
      window.setTimeout(() => codeRef.current?.focus(), 30);
    } catch {
      setError("Network error while contacting the sign-in service.");
    } finally {
      setSendingCode(false);
    }
  }

  async function handleVerifyCode(e) {
    e.preventDefault();
    setError("");
    const trimmedRaw = code.trim();

    // Direct local session code (`lms_...`) support in the same always-open box
    if (trimmedRaw.startsWith("lms_")) {
      setVerifyingCode(true);
      try {
        const res = await fetch("/api/sync/state", {
          headers: { Authorization: `Bearer ${trimmedRaw}` },
        });
        const data = await res.json();
        if (!res.ok || !data?.ok || !data?.user) {
          setError(data?.error || "Invalid or expired local code.");
          codeRef.current?.focus();
          return;
        }
        onAuthenticated({
          token: trimmedRaw,
          user: data.user,
          summary: data.summary || null,
        });
      } catch {
        setError("Network error while verifying local code.");
      } finally {
        setVerifyingCode(false);
      }
      return;
    }

    const cleanCode = trimmedRaw.replace(/\s+/g, "");
    if (!/^\d{6}$/.test(cleanCode)) {
      setError("Enter a 6-digit verification code or paste an lms_ local code.");
      codeRef.current?.focus();
      return;
    }
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setError("Enter the email address above that matches your 6-digit code.");
      emailRef.current?.focus();
      return;
    }

    setVerifyingCode(true);
    try {
      const res = await fetch("/api/auth/email/verify-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: cleanEmail,
          code: cleanCode,
          deviceLabel: "web",
        }),
      });
      const data = await res.json();
      if (!res.ok || !data?.ok) {
        setError(data?.error || "Incorrect or expired verification code.");
        codeRef.current?.focus();
        return;
      }
      onAuthenticated({
        token: data.token,
        user: data.user,
        summary: data.summary,
      });
    } catch {
      setError("Network error while verifying code.");
    } finally {
      setVerifyingCode(false);
    }
  }

  async function handleCopyPreviewCode() {
    if (!previewCode) return;
    try {
      await navigator.clipboard.writeText(previewCode);
      setCopiedPreview(true);
      window.setTimeout(() => setCopiedPreview(false), 1800);
    } catch {
      // Ignore clipboard failure
    }
  }

  const encodedNext = encodeURIComponent(redirectAfter);

  return (
    <div>
      {oauthNotice ? (
        <div className="notice-banner" data-tone="sample" role="status">
          {oauthNotice === "google" ? "Google" : "GitHub"} OAuth client credentials are not configured on this environment yet. Use the email or local code sign-in below, or add{" "}
          <code>
            {oauthNotice === "google" ? "GOOGLE_CLIENT_ID" : "GITHUB_CLIENT_ID"}
          </code>{" "}
          in Vercel environment settings.
        </div>
      ) : null}

      <div style={{ display: "grid", gap: "10px", marginBottom: "18px" }}>
        <a
          className="btn"
          href={`/api/auth/oauth/google?next=${encodedNext}`}
          style={{ width: "100%", justifyContent: "center" }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
            <path
              fill="#4285F4"
              d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v2.98h3.86c2.26-2.09 3.56-5.17 3.56-8.8Z"
            />
            <path
              fill="#34A853"
              d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-2.98c-1.08.72-2.45 1.16-4.07 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24Z"
            />
            <path
              fill="#FBBC05"
              d="M5.28 14.31A7.24 7.24 0 0 1 4.9 12c0-.8.14-1.58.38-2.31V6.6H1.29A11.99 11.99 0 0 0 0 12c0 1.92.46 3.74 1.29 5.4l3.99-3.09Z"
            />
            <path
              fill="#EA4335"
              d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.6l3.99 3.09c.95-2.85 3.6-4.94 6.72-4.94Z"
            />
          </svg>
          <span>Continue with Google</span>
        </a>

        <a
          className="btn"
          href={`/api/auth/oauth/github?next=${encodedNext}`}
          style={{ width: "100%", justifyContent: "center" }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M12 .5a12 12 0 0 0-3.79 23.39c.6.11.82-.26.82-.58v-2.04c-3.34.73-4.04-1.61-4.04-1.61-.55-1.39-1.34-1.76-1.34-1.76-1.09-.75.08-.73.08-.73 1.21.08 1.85 1.24 1.85 1.24 1.07 1.84 2.81 1.31 3.5 1 .11-.78.42-1.31.76-1.61-2.67-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.13-.3-.54-1.52.12-3.18 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 0 1 6.02 0c2.28-1.55 3.29-1.23 3.29-1.23.66 1.66.25 2.88.12 3.18.77.84 1.24 1.91 1.24 3.22 0 4.61-2.81 5.63-5.48 5.92.43.37.81 1.1.81 2.22v3.29c0 .32.21.7.82.58A12 12 0 0 0 12 .5Z" />
          </svg>
          <span>Continue with GitHub</span>
        </a>
      </div>

      <div
        style={{
          borderTop: "1px solid var(--border-hairline)",
          paddingTop: "16px",
        }}
      >
        <form onSubmit={handleSendCode} noValidate>
          <div className="form-field" style={{ marginBottom: "12px" }}>
            <label className="form-label" htmlFor="auth-email-input">
              Email address (sends a 6-digit code)
            </label>
            <div style={{ display: "flex", gap: "8px" }}>
              <input
                ref={emailRef}
                id="auth-email-input"
                name="email"
                type="email"
                className="form-input"
                style={{ flex: 1 }}
                placeholder="alex@university.edu"
                autoComplete="email"
                spellCheck={false}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <button
                type="submit"
                className="btn"
                disabled={sendingCode}
              >
                {sendingCode ? "Sending…" : "Send code"}
              </button>
            </div>
          </div>
        </form>

        {previewCode ? (
          <div className="local-code-callout" role="status">
            <div>
              <div className="local-code-label">Your local sign-in code</div>
              <div className="local-code-value">{previewCode}</div>
            </div>
            <button
              type="button"
              className="btn btn-sm"
              onClick={handleCopyPreviewCode}
            >
              {copiedPreview ? "Copied" : "Copy code"}
            </button>
          </div>
        ) : null}

        {codeSentNotice ? (
          <div
            className="notice-banner"
            data-tone="ok"
            role="status"
            style={{ marginBottom: "12px" }}
          >
            {codeSentNotice}
          </div>
        ) : null}

        {/* Always-open local / verification code box */}
        <form onSubmit={handleVerifyCode} noValidate>
          <div className="form-field" style={{ marginBottom: 0 }}>
            <label className="form-label" htmlFor="auth-code-input">
              Local code (enter 6-digit code or paste lms_ code)
            </label>
            <div style={{ display: "flex", gap: "8px" }}>
              <input
                ref={codeRef}
                id="auth-code-input"
                name="code"
                type="text"
                className="form-input form-input-mono"
                style={{ flex: 1 }}
                placeholder="123456 or lms_..."
                autoComplete="one-time-code"
                spellCheck={false}
                value={code}
                onChange={(e) => setCode(e.target.value)}
                aria-invalid={error ? "true" : "false"}
              />
              <button
                type="submit"
                className="btn btn-primary"
                disabled={verifyingCode}
              >
                {verifyingCode ? "Verifying…" : "Verify code"}
              </button>
            </div>
            {error ? (
              <div className="field-error" role="alert">
                {error}
              </div>
            ) : null}
          </div>
        </form>
      </div>
    </div>
  );
}

export function AuthDialog({
  open,
  onOpenChange,
  onAuthenticated,
  oauthNotice = "",
  redirectAfter = "/library",
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="radix-dialog-overlay" />
        <Dialog.Content className="radix-dialog-content">
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "6px",
            }}
          >
            <Dialog.Title className="radix-dialog-title">
              Sign in to LM Subs
            </Dialog.Title>
            <Dialog.Close asChild>
              <button type="button" className="btn btn-sm" aria-label="Close sign-in dialog">
                Close
              </button>
            </Dialog.Close>
          </div>
          <Dialog.Description className="radix-dialog-desc">
            Access your synced NotebookLM transcripts, encrypted API keys, and usage metrics across browsers.
          </Dialog.Description>

          <AuthCard
            oauthNotice={oauthNotice}
            redirectAfter={redirectAfter}
            onAuthenticated={(payload) => {
              onAuthenticated(payload);
              onOpenChange(false);
            }}
          />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
