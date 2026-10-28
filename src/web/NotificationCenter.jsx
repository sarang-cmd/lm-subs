import React, { useCallback, useEffect, useRef, useState } from "react";
import { Dialog } from "radix-ui";

function formatRelativeTime(iso) {
  if (!iso) return "";
  const diffSec = Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 1000));
  if (diffSec < 45) return "moments ago";
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
  }).format(new Date(iso));
}

function kindBadgeLabel(kind) {
  if (kind === "ready") return "Ready";
  if (kind === "failover") return "Failover";
  if (kind === "edit") return "Edited";
  if (kind === "sync") return "Synced";
  if (kind === "error") return "Error";
  return "Update";
}

export function NotificationCenter({
  token,
  localNotifications = [],
  onClearLocalNotifications,
  onMarkLocalNotificationsRead,
  onSelectTranscript,
  onOpenSignIn,
}) {
  const [open, setOpen] = useState(false);
  const [cloudItems, setCloudItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [browserPerm, setBrowserPerm] = useState(() => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      return "unsupported";
    }
    return window.Notification.permission;
  });
  const seenIdsRef = useRef(new Set());
  const hydratedOnceRef = useRef(false);

  const fetchNotifications = useCallback(
    async (silent = true) => {
      if (!token) {
        setCloudItems([]);
        return;
      }
      if (!silent) setLoading(true);
      try {
        const res = await fetch("/api/notifications", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (!res.ok || !data?.ok || !Array.isArray(data.notifications)) return;

        // Fire browser desktop notification if a new ready transcript arrived after initial load
        if (
          hydratedOnceRef.current &&
          typeof window !== "undefined" &&
          "Notification" in window &&
          window.Notification.permission === "granted"
        ) {
          for (const item of data.notifications) {
            if (!seenIdsRef.current.has(item.id) && !item.read && item.kind === "ready") {
              try {
                new window.Notification(item.title, {
                  body: item.body,
                  icon: "/assets/icon-128.png",
                  badge: "/favicon.png",
                });
              } catch {
                // Ignore browser restrictions
              }
            }
          }
        }

        for (const item of data.notifications) {
          seenIdsRef.current.add(item.id);
        }
        hydratedOnceRef.current = true;
        setCloudItems(data.notifications);
      } catch {
        // Keep last state offline
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [token]
  );

  useEffect(() => {
    hydratedOnceRef.current = false;
    seenIdsRef.current.clear();
    fetchNotifications(false);
  }, [fetchNotifications]);

  useEffect(() => {
    if (!token) return undefined;
    function onVisChange() {
      if (!document.hidden) {
        fetchNotifications(true);
      }
    }
    document.addEventListener("visibilitychange", onVisChange);
    const interval = window.setInterval(() => {
      if (!document.hidden) fetchNotifications(true);
    }, 30000);
    return () => {
      document.removeEventListener("visibilitychange", onVisChange);
      window.clearInterval(interval);
    };
  }, [token, fetchNotifications]);

  const combined = token
    ? [...localNotifications, ...cloudItems].sort(
        (a, b) => Date.parse(b.createdAt || 0) - Date.parse(a.createdAt || 0)
      )
    : localNotifications;

  const unreadCount = combined.filter((n) => !n.read).length;

  async function handleEnableBrowserAlerts() {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    try {
      const result = await window.Notification.requestPermission();
      setBrowserPerm(result);
      if (result === "granted") {
        new window.Notification("LM Subs alerts enabled", {
          body: "You will be notified when new Video Overview captions sync to your library.",
          icon: "/assets/icon-128.png",
          badge: "/favicon.png",
        });
      }
    } catch {
      // Ignore permission rejection
    }
  }

  async function handleMarkAllRead() {
    onMarkLocalNotificationsRead?.();
    setCloudItems((prev) => prev.map((n) => ({ ...n, read: true })));
    if (token) {
      await fetch("/api/notifications/read", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ all: true }),
      }).catch(() => {});
    }
  }

  async function handleClearAll() {
    onClearLocalNotifications?.();
    setCloudItems([]);
    if (token) {
      await fetch("/api/notifications", {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {});
    }
  }

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (nextOpen && token) {
          fetchNotifications(true);
        }
      }}
    >
      <Dialog.Trigger asChild>
        <button
          type="button"
          className="btn btn-sm notif-bell-btn"
          aria-label={
            unreadCount > 0
              ? `Notifications (${unreadCount} unread)`
              : "Notifications"
          }
        >
          <svg
            width="15"
            height="15"
            viewBox="0 0 20 20"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M10 2.5C7.1 2.5 5 4.7 5 7.7V11.2L3.4 13.3C3 13.8 3.3 14.5 4 14.5H16C16.7 14.5 17 13.8 16.6 13.3L15 11.2V7.7C15 4.7 12.9 2.5 10 2.5Z"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinejoin="round"
            />
            <path
              d="M8.1 16.2C8.5 17 9.2 17.5 10 17.5C10.8 17.5 11.5 17 11.9 16.2"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
          </svg>
          <span className="nav-hide-sm">Alerts</span>
          {unreadCount > 0 ? (
            <span className="notif-count-pill">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          ) : null}
        </button>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="radix-dialog-overlay" />
        <Dialog.Content className="radix-dialog-content notif-dialog-content">
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "12px",
              marginBottom: "8px",
            }}
          >
            <Dialog.Title
              className="radix-dialog-title"
              style={{
                margin: 0,
                display: "inline-flex",
                alignItems: "center",
                gap: "9px",
              }}
            >
              <img
                src="/assets/logo.svg"
                alt=""
                width="24"
                height="24"
                className="notif-brand-logo"
              />
              <span>Notifications</span>
            </Dialog.Title>
            <div style={{ display: "flex", gap: "6px" }}>
              {combined.length > 0 ? (
                <>
                  <button
                    type="button"
                    className="btn btn-sm"
                    onClick={handleMarkAllRead}
                  >
                    Mark read
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm btn-danger"
                    onClick={handleClearAll}
                  >
                    Clear
                  </button>
                </>
              ) : null}
              <Dialog.Close asChild>
                <button type="button" className="btn btn-sm">
                  Close
                </button>
              </Dialog.Close>
            </div>
          </div>

          <Dialog.Description className="radix-dialog-desc">
            Activity across synced transcriptions, provider failovers, and caption edits.
          </Dialog.Description>

          {browserPerm === "default" ? (
            <div className="notif-perm-bar">
              <span>Receive desktop alerts when new captions sync</span>
              <button
                type="button"
                className="btn btn-sm btn-primary"
                onClick={handleEnableBrowserAlerts}
              >
                Enable alerts
              </button>
            </div>
          ) : browserPerm === "granted" ? (
            <div className="notif-perm-bar" data-granted="true">
              <span>Browser desktop alerts are active</span>
              <span className="status-tag" data-tone="ok">
                Active
              </span>
            </div>
          ) : null}

          <div className="notif-feed-list">
            {loading && combined.length === 0 ? (
              <div style={{ padding: "18px 0", fontSize: "13.5px", color: "var(--ink-secondary)" }}>
                Loading notifications…
              </div>
            ) : combined.length === 0 ? (
              <div className="notif-empty-state">
                <img
                  src="/assets/logo.svg"
                  alt=""
                  width="32"
                  height="32"
                  className="notif-brand-logo"
                  style={{ marginBottom: "10px" }}
                />
                <p style={{ margin: "0 0 8px", fontWeight: 600, color: "var(--ink-primary)" }}>
                  No notifications yet
                </p>
                <p style={{ margin: 0 }}>
                  {token
                    ? "New Video Overview captions, rate-limit failovers, and cue edits will appear here."
                    : "Sign in to receive cross-device caption alerts, or generate captions in Chrome."}
                </p>
                {!token && onOpenSignIn ? (
                  <button
                    type="button"
                    className="btn btn-sm btn-primary"
                    style={{ marginTop: "12px" }}
                    onClick={() => {
                      setOpen(false);
                      onOpenSignIn();
                    }}
                  >
                    Sign in
                  </button>
                ) : null}
              </div>
            ) : (
              combined.map((item) => (
                <div
                  key={item.id}
                  className="notif-feed-row"
                  data-unread={item.read ? "false" : "true"}
                >
                  <img
                    src="/assets/logo.svg"
                    alt=""
                    width="24"
                    height="24"
                    className="notif-row-logo"
                  />
                  <div className="notif-feed-content">
                    <div className="notif-feed-row-top">
                      <span
                        className="status-tag"
                        data-tone={
                          item.kind === "ready"
                            ? "ok"
                            : item.kind === "error"
                              ? "err"
                              : "neutral"
                        }
                      >
                        {kindBadgeLabel(item.kind)}
                      </span>
                      <span className="notif-time">
                        {formatRelativeTime(item.createdAt)}
                      </span>
                    </div>
                    <div className="notif-feed-title">{item.title}</div>
                    {item.body ? (
                      <div className="notif-feed-body">{item.body}</div>
                    ) : null}
                    {item.cacheKey && onSelectTranscript ? (
                      <button
                        type="button"
                        className="btn btn-sm"
                        style={{ marginTop: "8px" }}
                        onClick={() => {
                          setOpen(false);
                          onSelectTranscript(item.cacheKey);
                        }}
                      >
                        Open in library
                      </button>
                    ) : null}
                  </div>
                </div>
              ))
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
