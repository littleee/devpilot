import React from "react";

export function DevPilotGlyph() {
  return (
    <svg viewBox="0 0 18 18" aria-hidden="true" className="dl-launcher-glyph">
      <circle cx="9" cy="9" r="8" fill="currentColor" opacity="0.16" />
      <circle cx="9" cy="9" r="4" fill="currentColor" />
      <path
        d="M13.9 4.4L15.8 2.5M13.9 13.6l1.9 1.9M4.1 4.4L2.2 2.5"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function AnnotateIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" className="dl-toolbar-icon">
      <path
        d="M3 11.9l.5-2.3L9.9 3.2a1.1 1.1 0 0 1 1.6 0l1.3 1.3a1.1 1.1 0 0 1 0 1.6L6.4 12.4 4 13z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <path
        d="M8.7 4.4l2.9 2.9"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function StabilityIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" className="dl-toolbar-icon">
      <path
        d="M3 8h2.1l1.2-2.4L8.7 11l1.3-3h3"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <rect
        x="2.3"
        y="2.3"
        width="11.4"
        height="11.4"
        rx="3"
        stroke="currentColor"
        strokeWidth="1.2"
        fill="none"
        opacity="0.6"
      />
    </svg>
  );
}

export function SessionIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" className="dl-toolbar-icon">
      <rect
        x="2.4"
        y="2.8"
        width="11.2"
        height="8.4"
        rx="2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.3"
      />
      <path
        d="M5 13.2l2-2h4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function CollapseIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" className="dl-toolbar-icon">
      <path
        d="M4 4l8 8M12 4L4 12"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function SettingsIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" className="dl-toolbar-icon">
      <path
        d="M2.5 4.2h4.2M9.6 4.2h3.9M2.5 8h7.1M12.5 8h1M2.5 11.8h1.8M8.1 11.8h5.4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <circle
        cx="8.1"
        cy="4.2"
        r="1.7"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <circle
        cx="10.8"
        cy="8"
        r="1.7"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <circle
        cx="5.8"
        cy="11.8"
        r="1.7"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
      />
    </svg>
  );
}
