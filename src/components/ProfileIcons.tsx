import type { ReactElement } from "react";
import type { Profile } from "../context/AccessibilityContext";

/**
 * Modern-filled profile icons (deep-blue fill + green accent) matching the
 * approved icon sheet. Decorative only — each card's accessible name comes from
 * its text, and the wrapping <span> is aria-hidden.
 */
export const PROFILE_ICONS: Record<Profile, ReactElement> = {
  // Standard — document with a green check
  standard: (
    <svg viewBox="0 0 48 48" fill="none" role="img" aria-hidden="true">
      <path
        d="M11 6h15l9 9v25a3 3 0 0 1-3 3H11a3 3 0 0 1-3-3V9a3 3 0 0 1 3-3Z"
        fill="#12508c"
      />
      <path d="M26 6l9 9h-7a2 2 0 0 1-2-2V6Z" fill="#0c3a68" />
      <rect x="14" y="18" width="15" height="2.6" rx="1.3" fill="#fff" />
      <rect x="14" y="24" width="15" height="2.6" rx="1.3" fill="#fff" />
      <rect x="14" y="30" width="9" height="2.6" rx="1.3" fill="#fff" />
      <circle cx="34" cy="34" r="8.5" fill="#0a6b4b" />
      <path
        d="M30.4 34.2l2.7 2.6 4.6-5.3"
        stroke="#fff"
        strokeWidth="2.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),

  // Blind / low vision — eye with sound waves (screen reader + read-aloud)
  blind: (
    <svg viewBox="0 0 48 48" fill="none" role="img" aria-hidden="true">
      <path d="M4 23c5-8.5 17-8.5 22 0-5 8.5-17 8.5-22 0Z" fill="#12508c" />
      <circle cx="15" cy="23" r="5.2" fill="#fff" />
      <circle cx="15" cy="23" r="2.6" fill="#12508c" />
      <path d="M32 17a9 9 0 0 1 0 12" stroke="#12508c" strokeWidth="2.6" strokeLinecap="round" />
      <path d="M37 13a15 15 0 0 1 0 20" stroke="#12508c" strokeWidth="2.6" strokeLinecap="round" />
    </svg>
  ),

  // Motor impairment — click target with a cursor
  motor: (
    <svg viewBox="0 0 48 48" fill="none" role="img" aria-hidden="true">
      <circle cx="19" cy="19" r="14" fill="#cfe0f0" />
      <circle cx="19" cy="19" r="8.5" fill="#7ba7d6" />
      <circle cx="19" cy="19" r="3.5" fill="#12508c" />
      <path
        d="M33 11l3-3M38 15l4-1M35 21l4 2"
        stroke="#12508c"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <path
        d="M21 25l16 6-6.6 1.9L28.6 40 21 25Z"
        fill="#12508c"
        stroke="#fff"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  ),

  // Easy language — speech bubbles with "Aa"
  cognitive: (
    <svg viewBox="0 0 48 48" fill="none" role="img" aria-hidden="true">
      <path
        d="M9 9h22a5 5 0 0 1 5 5v9a5 5 0 0 1-5 5H19l-7 6v-6h-3a5 5 0 0 1-5-5v-9a5 5 0 0 1 5-5Z"
        fill="#12508c"
      />
      <text
        x="20"
        y="24.5"
        fontSize="13"
        fontWeight="800"
        fill="#fff"
        textAnchor="middle"
        fontFamily="Inter, system-ui, sans-serif"
      >
        Aa
      </text>
      <path
        d="M33 27h7a3 3 0 0 1 3 3v5a3 3 0 0 1-3 3h-1v4l-5-4h-1a3 3 0 0 1-3-3v-5a3 3 0 0 1 3-3Z"
        fill="#cfe0f0"
      />
      <rect x="34.5" y="31.4" width="7" height="1.6" rx="0.8" fill="#12508c" />
      <rect x="34.5" y="34.6" width="5" height="1.6" rx="0.8" fill="#12508c" />
    </svg>
  ),

  // Large view — magnifier with "A+"
  senior: (
    <svg viewBox="0 0 48 48" fill="none" role="img" aria-hidden="true">
      <circle cx="20" cy="20" r="15" fill="#fff" stroke="#12508c" strokeWidth="3.2" />
      <text
        x="20"
        y="26"
        fontSize="16"
        fontWeight="800"
        fill="#12508c"
        textAnchor="middle"
        fontFamily="Inter, system-ui, sans-serif"
      >
        A+
      </text>
      <line x1="31" y1="31" x2="42" y2="42" stroke="#12508c" strokeWidth="4.5" strokeLinecap="round" />
    </svg>
  ),
};
