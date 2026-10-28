import React from "react";
import { Popover } from "radix-ui";
import {
  AVATARS,
  accountProviderLabel,
  maskEmail,
} from "../lib/avatars.js";
import { AvatarFace } from "./AvatarFace.jsx";

/**
 * The account chip in the top bar (`src/web/ProfileMenu.jsx`).
 *
 * It replaces the button that used to print the signed-in address in full. The
 * bar now carries only the chosen face, and the address appears masked inside
 * the menu, so walking past a screen no longer reveals the account.
 *
 * Built on Radix Popover, which brings the outside-click dismissal, the escape
 * key, focus return to the trigger, and the relationship between trigger and
 * panel that a hand-rolled dropdown usually gets wrong.
 */
export function ProfileMenu({
  user,
  avatarId,
  onSelectAvatar,
  onSignOut,
  onOpenLibrary,
  syncsToAccount = false,
  syncing = false,
}) {
  const [open, setOpen] = React.useState(false);
  const masked = maskEmail(user?.email);

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          type="button"
          className="account-btn"
          aria-label="Account menu"
          aria-haspopup="dialog"
          aria-expanded={open}
        >
          <AvatarFace avatarId={avatarId} size={26} />
          <svg
            className="account-caret"
            width="10"
            height="10"
            viewBox="0 0 10 10"
            role="presentation"
            aria-hidden="true"
            focusable="false"
          >
            <path
              d="M2 3.75 5 6.75 8 3.75"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          className="account-popover"
          sideOffset={10}
          align="end"
          collisionPadding={12}
        >
          <div className="account-head">
            <AvatarFace avatarId={avatarId} size={44} />
            <div className="account-ident">
              <p className="account-email">
                {masked || "Signed in"}
              </p>
              <p className="account-provider">
                {accountProviderLabel(user?.authProvider)}
              </p>
            </div>
          </div>

          <p className="account-section-label" id="avatar-grid-label">
            Choose an avatar
          </p>
          <div
            className="avatar-grid"
            role="group"
            aria-labelledby="avatar-grid-label"
          >
            {AVATARS.map((avatar) => {
              const selected = avatar.id === avatarId;
              return (
                <button
                  key={avatar.id}
                  type="button"
                  className="avatar-option"
                  data-selected={selected ? "true" : "false"}
                  aria-pressed={selected}
                  onClick={() => onSelectAvatar?.(avatar.id)}
                >
                  <AvatarFace avatarId={avatar.id} size={36} />
                  <span className="avatar-option-label">{avatar.label}</span>
                </button>
              );
            })}
          </div>
          <p className="account-note">
            {syncsToAccount
              ? syncing
                ? "Saving to your account."
                : "Saved to your account, so it follows you to every browser."
              : "Saved on this browser. Turn on preference sync in Library and sync for it to travel with you."}
          </p>

          <div className="account-actions">
            <button
              type="button"
              className="btn btn-sm"
              onClick={() => {
                setOpen(false);
                onOpenLibrary?.();
              }}
            >
              Library and sync
            </button>
            <button
              type="button"
              className="btn btn-sm btn-danger"
              onClick={() => {
                setOpen(false);
                onSignOut?.();
              }}
            >
              Sign out
            </button>
          </div>

          <Popover.Arrow className="account-popover-arrow" width={14} height={7} />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

export default ProfileMenu;
