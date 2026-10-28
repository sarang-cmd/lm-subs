import React from "react";
import { getAvatar } from "../lib/avatars.js";

/**
 * One illustrated account face (`src/web/AvatarFace.jsx`).
 *
 * Every face is drawn from the same geometry on a 64 by 64 grid, so the set
 * reads as one family of drawings at any size, from the 26px header chip to the
 * 34px picker. Flat fills only, no gradients, no filters, and no loaded images,
 * which keeps nine faces under a kilobyte each and crisp at any pixel ratio.
 *
 * The drawing is decorative: the button around it carries the accessible name,
 * so the svg is hidden from assistive technology.
 */

const INK = "#1b1f24";

function HairBack({ style, hair }) {
  if (style === "afro") {
    return (
      <>
        <circle cx="32" cy="27" r="21" fill={hair} />
        <circle cx="18" cy="21" r="5" fill={hair} />
        <circle cx="32" cy="15" r="5.5" fill={hair} />
        <circle cx="46" cy="21" r="5" fill={hair} />
      </>
    );
  }
  if (style === "long") {
    return (
      <>
        <path d="M14.5 30c-2.5 14-1.5 24 2.5 26 5-1 6-12 5-24z" fill={hair} />
        <path d="M49.5 30c2.5 14 1.5 24-2.5 26-5-1-6-12-5-24z" fill={hair} />
      </>
    );
  }
  if (style === "braids") {
    return (
      <>
        <path d="M15 30c-4 10-5.5 20-3.5 26 4.5-3 6.5-14 7.5-25z" fill={hair} />
        <path d="M49 30c4 10 5.5 20 3.5 26-4.5-3-6.5-14-7.5-25z" fill={hair} />
      </>
    );
  }
  return null;
}

function HairFront({ style, hair, accent }) {
  if (style === "curls") {
    return (
      <g fill={hair}>
        <circle cx="17" cy="29" r="6.5" />
        <circle cx="22" cy="22" r="7" />
        <circle cx="32" cy="19.5" r="7.5" />
        <circle cx="42" cy="22" r="7" />
        <circle cx="47" cy="29" r="6.5" />
        <circle cx="14.5" cy="37" r="4.5" />
        <circle cx="49.5" cy="37" r="4.5" />
      </g>
    );
  }
  if (style === "knot") {
    return (
      <g fill={hair}>
        <path d="M15 34c0-15 7-20 17-20s17 5 17 20c0-7-6-10-17-10s-17 3-17 10z" />
        <circle cx="32" cy="11.5" r="6.5" />
      </g>
    );
  }
  if (style === "cap") {
    return (
      <>
        <path d="M15.5 33c0-9 7-14 16.5-14s16.5 5 16.5 14c0-4-6-6-16.5-6s-16.5 2-16.5 6z" fill={hair} />
        <path d="M14.5 30c0-11 8-17 17.5-17s17.5 6 17.5 17z" fill={accent} />
        <rect x="30" y="26" width="22" height="5.5" rx="2.75" fill={accent} />
        <circle cx="32" cy="13.5" r="2.2" fill={accent} />
      </>
    );
  }
  if (style === "beanie") {
    return (
      <>
        <path d="M15.5 33c0-9 7-14 16.5-14s16.5 5 16.5 14c0-4-6-6-16.5-6s-16.5 2-16.5 6z" fill={hair} />
        <path d="M14.5 30c0-11 8-17 17.5-17s17.5 6 17.5 17z" fill={accent} />
        <rect x="13" y="27.5" width="38" height="8" rx="4" fill={accent} />
        <circle cx="32" cy="10" r="4.5" fill={accent} />
      </>
    );
  }
  // short, long, braids and the plain face share the same swept fringe
  return (
    <path
      d="M15 34c0-15 7-20 17-20s17 5 17 20c0-7-6-10-17-10s-17 3-17 10z"
      fill={hair}
    />
  );
}

function Accessory({ kind, accent }) {
  if (kind === "glasses") {
    return (
      <g fill="none" stroke={INK} strokeWidth="1.9" strokeLinecap="round">
        <circle cx="25.5" cy="34" r="5.6" fill="#fdfdfe" fillOpacity="0.4" />
        <circle cx="38.5" cy="34" r="5.6" fill="#fdfdfe" fillOpacity="0.4" />
        <path d="M31.1 34h1.8" />
        <path d="M19.9 33.2 14.6 31.6" />
        <path d="M44.1 33.2 49.4 31.6" />
      </g>
    );
  }
  if (kind === "phones") {
    return (
      <>
        <path
          d="M13.5 34c0-11.5 8.3-19 18.5-19s18.5 7.5 18.5 19"
          fill="none"
          stroke={INK}
          strokeWidth="3.2"
          strokeLinecap="round"
        />
        <rect
          x="8.5"
          y="31"
          width="9"
          height="15"
          rx="4.5"
          fill={accent}
          stroke={INK}
          strokeWidth="2"
        />
        <rect
          x="46.5"
          y="31"
          width="9"
          height="15"
          rx="4.5"
          fill={accent}
          stroke={INK}
          strokeWidth="2"
        />
      </>
    );
  }
  return null;
}

export function AvatarFace({ avatarId, size = 26, className = "" }) {
  const avatar = getAvatar(avatarId);
  return (
    <svg
      className={className ? `avatar-face ${className}` : "avatar-face"}
      width={size}
      height={size}
      viewBox="0 0 64 64"
      role="presentation"
      aria-hidden="true"
      focusable="false"
    >
      <circle cx="32" cy="32" r="31" fill={avatar.disc} />
      <path
        d="M5 64c0-9.5 6.5-14 13-16h28c6.5 2 13 6.5 13 16z"
        fill={avatar.accent}
      />
      <HairBack style={avatar.hairStyle} hair={avatar.hair} />
      <circle cx="16.6" cy="36" r="2.8" fill={avatar.skin} />
      <circle cx="47.4" cy="36" r="2.8" fill={avatar.skin} />
      <ellipse cx="32" cy="35" rx="15.5" ry="16.5" fill={avatar.skin} />
      <HairFront
        style={avatar.hairStyle}
        hair={avatar.hair}
        accent={avatar.accent}
      />
      <g fill={INK}>
        <circle cx="26" cy="34" r="2.1" />
        <circle cx="38" cy="34" r="2.1" />
      </g>
      <path
        d="M26.5 41.8q5.5 4.4 11 0"
        fill="none"
        stroke={INK}
        strokeWidth="2.1"
        strokeLinecap="round"
      />
      <Accessory kind={avatar.accessory} accent={avatar.accent} />
    </svg>
  );
}

export default AvatarFace;
