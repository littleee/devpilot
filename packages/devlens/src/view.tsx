import React, { useEffect, useMemo, useRef, useState } from "react";

import {
  createDevLensExportPayload,
  formatDevLensExportMarkdown,
  getAnnotationKind,
} from "./output";
import {
  loadAnnotations,
  loadFloatingPosition,
  saveAnnotations,
  saveFloatingPosition,
} from "./storage";
import type {
  DevLensAnnotation,
  DevLensAnnotationStatus,
  DevLensMode,
  DevLensMountOptions,
  DevLensRect,
  DevLensSelection,
} from "./types";
import {
  isClosedDevLensAnnotationStatus,
  isOpenDevLensAnnotationStatus,
} from "./types";

const ROOT_ATTR = "data-devlens-root";
const HOST_ATTR = "data-devlens-host";
const AREA_MATCH_SELECTOR = [
  "button",
  "a",
  "input",
  "select",
  "textarea",
  "img",
  "p",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "li",
  "label",
  "td",
  "th",
  "[role='button']",
  "[role='link']",
  "[role='tab']",
  "[role='checkbox']",
  "[role='radio']",
  "[role='option']",
  "[role='switch']",
  "[role='combobox']",
  "[role='cell']",
  "[role='row']",
].join(", ");
const AREA_PREVIEW_SELECTOR = [
  "button",
  "a",
  "input",
  "select",
  "textarea",
  "img",
  "p",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "li",
  "label",
  "td",
  "th",
  "div",
  "span",
  "section",
  "article",
  "aside",
  "nav",
  "[role='button']",
  "[role='link']",
  "[role='tab']",
  "[role='checkbox']",
  "[role='radio']",
  "[role='option']",
  "[role='switch']",
  "[role='combobox']",
].join(", ");
const AREA_NESTED_CONTENT_SELECTOR = [
  "p",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "button",
  "a",
  "input",
  "select",
  "textarea",
  "label",
  "td",
  "th",
  "[role='button']",
  "[role='link']",
  "[role='tab']",
  "[role='checkbox']",
  "[role='radio']",
  "[role='option']",
  "[role='switch']",
  "[role='combobox']",
].join(", ");
const AREA_PREVIEW_MEANINGFUL_TAGS = new Set([
  "button",
  "a",
  "input",
  "select",
  "textarea",
  "img",
  "p",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "li",
  "label",
  "td",
  "th",
  "section",
  "article",
  "aside",
  "nav",
]);
const AREA_INTERACTIVE_ROLES = new Set([
  "button",
  "link",
  "tab",
  "checkbox",
  "radio",
  "option",
  "switch",
  "combobox",
  "cell",
  "row",
]);
const AREA_SEMANTIC_TAGS = new Set([
  "button",
  "input",
  "select",
  "textarea",
  "label",
  "a",
  "img",
  "td",
  "th",
  "li",
]);

const styles = `
  :host, * {
    box-sizing: border-box;
  }

  .dl-root {
    position: fixed;
    inset: 0;
    z-index: 2147483600;
    pointer-events: none;
    font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "PingFang SC", "Segoe UI", sans-serif;
    color: #0f172a;
  }

  .dl-toolbar {
    position: fixed;
    display: flex;
    align-items: center;
    gap: 4px;
    height: 44px;
    padding: 4px;
    border-radius: 22px;
    background: rgba(22, 22, 22, 0.96);
    border: 1px solid rgba(255, 255, 255, 0.08);
    box-shadow:
      0 8px 28px rgba(15, 23, 42, 0.28),
      0 2px 8px rgba(15, 23, 42, 0.2);
    backdrop-filter: blur(14px);
    pointer-events: auto;
    cursor: default;
    user-select: none;
    animation: dl-toolbar-enter 180ms cubic-bezier(0.22, 1, 0.36, 1);
  }

  .dl-launcher {
    position: fixed;
    display: inline-grid;
    place-items: center;
    width: 44px;
    height: 44px;
    border: 0;
    border-radius: 22px;
    background: rgba(22, 22, 22, 0.96);
    color: #ffffff;
    cursor: pointer;
    border: 1px solid rgba(255, 255, 255, 0.08);
    box-shadow:
      0 8px 28px rgba(15, 23, 42, 0.28),
      0 2px 8px rgba(15, 23, 42, 0.2);
    backdrop-filter: blur(14px);
    pointer-events: auto;
    user-select: none;
    animation: dl-launcher-enter 180ms cubic-bezier(0.22, 1, 0.36, 1);
  }

  .dl-launcher:hover,
  .dl-toolbar-button:hover,
  .dl-toolbar-icon-button:hover {
    transform: translateY(-1px);
  }

  .dl-launcher-glyph {
    width: 18px;
    height: 18px;
    color: rgba(255, 255, 255, 0.96);
  }

  .dl-launcher-badge {
    position: absolute;
    top: -3px;
    right: -3px;
    min-width: 18px;
    height: 18px;
    padding: 0 5px;
    border-radius: 999px;
    background: #3b82f6;
    color: #ffffff;
    font-size: 10px;
    font-weight: 800;
    line-height: 18px;
    box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.92);
  }

  .dl-toolbar-divider {
    width: 1px;
    height: 18px;
    margin: 0 2px;
    background: rgba(255, 255, 255, 0.08);
  }

  .dl-toolbar-status {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    height: 24px;
    margin-right: 4px;
    padding: 0 8px;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.06);
    color: rgba(255, 255, 255, 0.58);
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.01em;
  }

  .dl-toolbar-status-dot {
    width: 7px;
    height: 7px;
    border-radius: 999px;
    background: #22c55e;
    box-shadow: 0 0 0 4px rgba(34, 197, 94, 0.16);
    flex: 0 0 auto;
  }

  .dl-drag-handle {
    display: inline-grid;
    place-items: center;
    width: 36px;
    height: 36px;
    margin-right: 2px;
    border-radius: 18px;
    color: rgba(255, 255, 255, 0.66);
    cursor: grab;
  }

  .dl-drag-handle:active,
  .dl-launcher:active {
    cursor: grabbing;
  }

  .dl-drag-handle .dl-launcher-glyph {
    width: 15px;
    height: 15px;
  }

  .dl-toolbar-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    min-width: 0;
    height: 36px;
    padding: 0 12px;
    border: 0;
    border-radius: 18px;
    background: transparent;
    color: rgba(255, 255, 255, 0.82);
    font-size: 12px;
    font-weight: 700;
    cursor: pointer;
    transition:
      background 120ms ease,
      color 120ms ease,
      transform 120ms ease,
      box-shadow 120ms ease,
      opacity 120ms ease;
    position: relative;
    overflow: hidden;
  }

  .dl-toolbar-button:hover {
    background: rgba(255, 255, 255, 0.08);
  }

  .dl-toolbar-button[data-active="true"] {
    background: #2f6fed;
    color: #ffffff;
    box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.06);
  }

  .dl-toolbar-button[data-active="true"]::after {
    content: "";
    position: absolute;
    inset: 1px;
    border-radius: 17px;
    background: linear-gradient(180deg, rgba(255, 255, 255, 0.16), rgba(255, 255, 255, 0));
    pointer-events: none;
  }

  .dl-toolbar-button[data-kind="secondary"] {
    background: transparent;
    color: rgba(255, 255, 255, 0.68);
  }

  .dl-toolbar-count {
    min-width: 16px;
    height: 16px;
    padding: 0 5px;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.12);
    color: #ffffff;
    font-size: 10px;
    line-height: 16px;
  }

  .dl-toolbar-button[data-active="true"] .dl-toolbar-count {
    background: rgba(255, 255, 255, 0.18);
  }

  .dl-toolbar-icon {
    width: 14px;
    height: 14px;
    flex: 0 0 auto;
  }

  .dl-toolbar-label {
    line-height: 1;
    letter-spacing: 0.01em;
  }

  .dl-toolbar-icon-button {
    display: inline-grid;
    place-items: center;
    width: 36px;
    height: 36px;
    border: 0;
    border-radius: 18px;
    background: transparent;
    color: rgba(255, 255, 255, 0.72);
    cursor: pointer;
    transition: background 120ms ease, color 120ms ease, transform 120ms ease;
  }

  .dl-toolbar-icon-button:hover {
    background: rgba(255, 255, 255, 0.08);
    color: rgba(255, 255, 255, 0.92);
  }

  .dl-highlight {
    position: fixed;
    border: 2px solid #2563eb;
    background: rgba(37, 99, 235, 0.08);
    border-radius: 6px;
    pointer-events: none;
    transition: all 60ms linear;
    animation: dl-highlight-enter 90ms ease-out;
  }

  .dl-area-draft {
    position: fixed;
    border: 2px dashed rgba(34, 197, 94, 0.9);
    background: rgba(34, 197, 94, 0.02);
    border-radius: 4px;
    box-shadow: 0 0 0 1px rgba(34, 197, 94, 0.08);
    pointer-events: none;
    animation: dl-highlight-enter 90ms ease-out;
  }

  .dl-area-match {
    position: fixed;
    border: 2px solid rgba(34, 197, 94, 0.52);
    background: rgba(34, 197, 94, 0.05);
    border-radius: 4px;
    box-shadow: none;
    pointer-events: none;
    animation: dl-highlight-enter 90ms ease-out;
  }

  .dl-area-selection-focus {
    position: fixed;
    border: 2px dashed rgba(34, 197, 94, 0.9);
    border-radius: 4px;
    background: rgba(34, 197, 94, 0.02);
    box-shadow: 0 0 0 1px rgba(34, 197, 94, 0.08);
    pointer-events: none;
    animation: dl-highlight-enter 120ms ease-out;
  }

  .dl-active-focus {
    position: fixed;
    border: 1px solid rgba(47, 111, 237, 0.86);
    background: rgba(47, 111, 237, 0.08);
    border-radius: 4px;
    box-shadow:
      0 0 0 4px rgba(47, 111, 237, 0.16),
      0 10px 24px rgba(37, 99, 235, 0.18);
    pointer-events: none;
    animation: dl-highlight-enter 120ms ease-out;
  }

  .dl-active-focus[data-kind="area"] {
    border: 2px dashed rgba(34, 197, 94, 0.92);
    background: rgba(34, 197, 94, 0.02);
    box-shadow: 0 0 0 1px rgba(34, 197, 94, 0.12);
  }

  .dl-active-focus-label {
    position: fixed;
    display: inline-flex;
    align-items: center;
    height: 26px;
    padding: 0 10px;
    border-radius: 10px;
    background: rgba(15, 23, 42, 0.94);
    color: #ffffff;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.01em;
    pointer-events: none;
    box-shadow:
      0 10px 24px rgba(15, 23, 42, 0.24),
      0 0 0 1px rgba(255, 255, 255, 0.08);
  }

  .dl-active-focus-label[data-kind="area"] {
    background: rgba(21, 128, 61, 0.94);
    box-shadow:
      0 10px 24px rgba(21, 128, 61, 0.24),
      0 0 0 1px rgba(187, 247, 208, 0.18);
  }

  .dl-area-draft-size {
    position: fixed;
    display: inline-flex;
    align-items: center;
    height: 28px;
    padding: 0 10px;
    border-radius: 10px;
    background: rgba(17, 24, 39, 0.94);
    color: #ffffff;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.01em;
    box-shadow:
      0 10px 24px rgba(15, 23, 42, 0.24),
      0 0 0 1px rgba(255, 255, 255, 0.08);
    pointer-events: none;
  }

  .dl-marker {
    position: fixed;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 24px;
    height: 24px;
    padding: 0 8px;
    border: 2px solid #ffffff;
    border-radius: 10px;
    background: #2563eb;
    color: #ffffff;
    font-size: 12px;
    font-weight: 700;
    box-shadow: 0 8px 20px rgba(37, 99, 235, 0.28);
    cursor: pointer;
    pointer-events: auto;
    transition:
      transform 120ms ease,
      box-shadow 120ms ease,
      background 120ms ease,
      opacity 120ms ease;
    animation: dl-marker-enter 160ms cubic-bezier(0.22, 1, 0.36, 1);
  }

  .dl-marker[data-status="resolved"] {
    background: #10b981;
    box-shadow: 0 8px 20px rgba(16, 185, 129, 0.28);
  }

  .dl-marker[data-status="acknowledged"] {
    background: #d97706;
    box-shadow: 0 8px 20px rgba(217, 119, 6, 0.28);
  }

  .dl-marker[data-kind="area"] {
    min-width: 34px;
    height: 28px;
    gap: 6px;
    padding: 0 10px;
    border-radius: 10px;
  }

  .dl-marker[data-pending="true"] {
    background: #16a34a;
    box-shadow:
      0 0 0 4px rgba(34, 197, 94, 0.18),
      0 10px 24px rgba(22, 163, 74, 0.28);
    animation: dl-marker-enter 140ms cubic-bezier(0.22, 1, 0.36, 1);
  }

  .dl-marker[data-pending="true"][data-kind="element"],
  .dl-marker[data-pending="true"][data-kind="text"] {
    min-width: 28px;
    width: 28px;
    height: 28px;
    padding: 0;
    font-size: 18px;
    line-height: 1;
  }

  .dl-marker-icon {
    width: 12px;
    height: 12px;
    color: currentColor;
    flex: 0 0 auto;
  }

  .dl-marker-label {
    line-height: 1;
  }

  .dl-marker[data-active="true"] {
    transform: scale(1.08);
    box-shadow:
      0 0 0 4px rgba(37, 99, 235, 0.18),
      0 10px 24px rgba(37, 99, 235, 0.3);
  }

  .dl-marker:hover {
    transform: translateY(-1px) scale(1.04);
  }

  .dl-popup {
    position: fixed;
    width: 286px;
    padding: 12px 14px 14px;
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 12px;
    background: rgba(26, 26, 26, 0.98);
    box-shadow:
      0 18px 44px rgba(15, 23, 42, 0.32),
      0 0 0 1px rgba(255, 255, 255, 0.04);
    pointer-events: auto;
    animation: dl-panel-enter 180ms cubic-bezier(0.22, 1, 0.36, 1);
  }

  .dl-popup-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    margin-bottom: 8px;
  }

  .dl-popup-title {
    margin: 0;
    font-size: 13px;
    font-weight: 800;
    color: #ffffff;
  }

  .dl-popup-hint {
    display: inline-flex;
    align-items: center;
    height: 20px;
    padding: 0 8px;
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.06);
    color: rgba(255, 255, 255, 0.46);
    font-size: 10px;
    line-height: 1;
    white-space: nowrap;
  }

  .dl-popup-section-label {
    display: block;
    margin-bottom: 4px;
    color: rgba(255, 255, 255, 0.42);
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }

  .dl-popup-meta {
    margin: 0;
    font-size: 12px;
    line-height: 1.45;
    color: rgba(255, 255, 255, 0.62);
    word-break: break-word;
  }

  .dl-popup-quote {
    margin: 10px 0 0;
    padding: 8px 10px;
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.05);
    color: rgba(255, 255, 255, 0.68);
    font-size: 12px;
    line-height: 1.5;
  }

  .dl-popup-textarea {
    width: 100%;
    min-height: 96px;
    margin-top: 10px;
    padding: 10px 12px;
    border: 1px solid rgba(255, 255, 255, 0.14);
    border-radius: 8px;
    outline: none;
    resize: vertical;
    font: inherit;
    color: #ffffff;
    background: rgba(255, 255, 255, 0.05);
  }

  .dl-popup-textarea:focus {
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.16);
  }

  .dl-popup-textarea::placeholder {
    color: rgba(255, 255, 255, 0.32);
  }

  .dl-popup-actions {
    display: flex;
    justify-content: space-between;
    gap: 8px;
    margin-top: 12px;
  }

  .dl-popup-actions-left,
  .dl-popup-actions-right {
    display: inline-flex;
    gap: 8px;
  }

  .dl-popup-action {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    height: 34px;
    padding: 0 12px;
    border: 0;
    border-radius: 8px;
    font-size: 12px;
    font-weight: 700;
    cursor: pointer;
    white-space: nowrap;
  }

  .dl-popup-action[data-kind="ghost"] {
    background: rgba(255, 255, 255, 0.06);
    color: rgba(255, 255, 255, 0.82);
  }

  .dl-popup-action[data-kind="danger"] {
    background: rgba(255, 255, 255, 0.06);
    color: #f87171;
  }

  .dl-popup-action[data-kind="primary"] {
    background: #2f6fed;
    color: #ffffff;
  }

  .dl-popup-action:disabled {
    opacity: 0.42;
    cursor: not-allowed;
  }

  .dl-session-panel {
    position: fixed;
    width: min(392px, calc(100vw - 32px));
    max-height: min(68vh, 640px);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 16px;
    background: rgba(22, 22, 22, 0.98);
    box-shadow:
      0 24px 60px rgba(15, 23, 42, 0.34),
      0 0 0 1px rgba(255, 255, 255, 0.03);
    overflow: hidden;
    backdrop-filter: blur(18px);
    pointer-events: auto;
    animation: dl-panel-enter 180ms cubic-bezier(0.22, 1, 0.36, 1);
  }

  .dl-session-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 16px 18px 14px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  }

  .dl-session-header-actions {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    flex: 0 0 auto;
  }

  .dl-session-title {
    margin: 0;
    font-size: 15px;
    font-weight: 800;
    color: #ffffff;
  }

  .dl-session-subtitle {
    margin: 4px 0 0;
    font-size: 12px;
    line-height: 1.5;
    color: rgba(255, 255, 255, 0.56);
  }

  .dl-summary-grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 10px;
    padding: 14px 18px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  }

  .dl-summary-card {
    padding: 12px;
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: 10px;
    background: rgba(255, 255, 255, 0.04);
  }

  .dl-summary-label {
    display: block;
    margin-bottom: 6px;
    font-size: 12px;
    color: rgba(255, 255, 255, 0.52);
  }

  .dl-summary-value {
    display: block;
    font-size: 20px;
    font-weight: 800;
    color: #ffffff;
  }

  .dl-session-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 14px 18px;
    overflow: auto;
  }

  .dl-session-body {
    display: flex;
    flex-direction: column;
    min-height: 260px;
    max-height: calc(min(68vh, 640px) - 146px);
  }

  .dl-session-section {
    display: flex;
    flex-direction: column;
  }

  .dl-session-section + .dl-session-section {
    border-top: 1px solid rgba(255, 255, 255, 0.08);
  }

  .dl-session-section-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    padding: 14px 18px 0;
  }

  .dl-session-section-title {
    margin: 0;
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.01em;
    color: rgba(255, 255, 255, 0.56);
    text-transform: uppercase;
  }

  .dl-session-section-count {
    min-width: 18px;
    height: 18px;
    padding: 0 6px;
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.08);
    color: rgba(255, 255, 255, 0.7);
    font-size: 11px;
    font-weight: 700;
    line-height: 18px;
    text-align: center;
  }

  .dl-session-detail {
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 14px 18px 18px;
    overflow: auto;
  }

  .dl-session-empty {
    padding: 14px;
    border-radius: 10px;
    background: rgba(255, 255, 255, 0.04);
    color: rgba(255, 255, 255, 0.62);
    font-size: 13px;
    line-height: 1.6;
  }

  .dl-annotation-card {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 10px;
    padding: 12px 14px;
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 10px;
    background: rgba(255, 255, 255, 0.03);
    cursor: pointer;
    transition:
      background 120ms ease,
      border-color 120ms ease,
      transform 120ms ease,
      box-shadow 120ms ease;
  }

  .dl-annotation-card[data-selected="true"] {
    border-color: rgba(59, 130, 246, 0.56);
    background: rgba(47, 111, 237, 0.12);
    box-shadow: 0 0 0 1px rgba(59, 130, 246, 0.22);
  }

  .dl-annotation-card[data-status="resolved"],
  .dl-annotation-card[data-status="dismissed"] {
    background: rgba(255, 255, 255, 0.02);
  }

  .dl-annotation-card:hover {
    background: rgba(255, 255, 255, 0.05);
    transform: translateY(-1px);
  }

  .dl-annotation-main {
    min-width: 0;
  }

  .dl-annotation-top {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .dl-status-pill {
    display: inline-flex;
    align-items: center;
    height: 24px;
    padding: 0 10px;
    border-radius: 8px;
    background: rgba(47, 111, 237, 0.2);
    color: #8ab4ff;
    font-size: 12px;
    font-weight: 700;
  }

  .dl-status-pill[data-status="resolved"] {
    background: rgba(16, 185, 129, 0.18);
    color: #6ee7b7;
  }

  .dl-status-pill[data-status="acknowledged"] {
    background: rgba(217, 119, 6, 0.18);
    color: #fbbf24;
  }

  .dl-status-pill[data-status="dismissed"] {
    background: rgba(107, 114, 128, 0.2);
    color: #d1d5db;
  }

  .dl-annotation-time {
    font-size: 12px;
    color: rgba(255, 255, 255, 0.44);
  }

  .dl-annotation-side {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    justify-content: space-between;
    gap: 8px;
    min-width: 64px;
  }

  .dl-annotation-chevron {
    color: rgba(255, 255, 255, 0.26);
    font-size: 16px;
    line-height: 1;
  }

  .dl-annotation-comment {
    margin: 8px 0 6px;
    font-size: 13px;
    line-height: 1.65;
    color: rgba(255, 255, 255, 0.92);
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    word-break: break-word;
    overflow: hidden;
  }

  .dl-annotation-meta {
    font-size: 12px;
    line-height: 1.6;
    color: rgba(255, 255, 255, 0.48);
    word-break: break-word;
  }

  .dl-session-footer {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    padding-top: 10px;
  }

  .dl-detail-card {
    padding: 13px 14px;
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 10px;
    background: rgba(255, 255, 255, 0.03);
  }

  .dl-detail-title {
    margin: 0 0 8px;
    font-size: 13px;
    font-weight: 800;
    color: #ffffff;
  }

  .dl-detail-body {
    font-size: 13px;
    line-height: 1.7;
    color: rgba(255, 255, 255, 0.82);
    white-space: pre-wrap;
    word-break: break-word;
  }

  .dl-detail-meta {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px 16px;
    font-size: 12px;
    line-height: 1.6;
    color: rgba(255, 255, 255, 0.5);
  }

  .dl-detail-kv strong {
    display: block;
    margin-bottom: 4px;
    color: rgba(255, 255, 255, 0.88);
    font-size: 12px;
  }

  .dl-detail-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .dl-section-note {
    color: rgba(255, 255, 255, 0.42);
    font-size: 11px;
    line-height: 1.5;
  }

  .dl-detail-quote {
    margin-top: 10px;
    padding: 10px 12px;
    border-radius: 8px;
    background: rgba(47, 111, 237, 0.12);
    font-size: 12px;
    line-height: 1.6;
    color: #8ab4ff;
  }

  .dl-detail-chip-list {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: 10px;
  }

  .dl-detail-chip {
    display: inline-flex;
    align-items: center;
    min-height: 28px;
    padding: 0 10px;
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.06);
    color: rgba(255, 255, 255, 0.78);
    font-size: 12px;
    line-height: 1.4;
  }

  .dl-detail-empty {
    padding: 18px;
    border-radius: 10px;
    background: rgba(255, 255, 255, 0.04);
    color: rgba(255, 255, 255, 0.56);
    font-size: 13px;
    line-height: 1.6;
  }

  .dl-state-panel {
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 14px 18px 18px;
  }

  .dl-state-empty {
    padding: 14px;
    border-radius: 10px;
    border: 1px solid rgba(255, 255, 255, 0.08);
    background: rgba(255, 255, 255, 0.03);
    color: rgba(255, 255, 255, 0.7);
    font-size: 13px;
    line-height: 1.6;
  }

  .dl-state-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .dl-state-item {
    display: grid;
    grid-template-columns: 10px minmax(0, 1fr);
    gap: 10px;
    padding: 12px 14px;
    border-radius: 10px;
    border: 1px solid rgba(255, 255, 255, 0.08);
    background: rgba(255, 255, 255, 0.03);
  }

  .dl-state-dot {
    width: 8px;
    height: 8px;
    margin-top: 6px;
    border-radius: 999px;
    background: #3b82f6;
    box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.16);
  }

  .dl-state-title {
    margin: 0 0 4px;
    font-size: 13px;
    font-weight: 700;
    color: #ffffff;
  }

  .dl-state-desc {
    margin: 0;
    font-size: 12px;
    line-height: 1.55;
    color: rgba(255, 255, 255, 0.58);
  }

  @keyframes dl-toolbar-enter {
    from {
      opacity: 0;
      transform: scale(0.92) translateY(6px);
    }
    to {
      opacity: 1;
      transform: scale(1) translateY(0);
    }
  }

  @keyframes dl-launcher-enter {
    from {
      opacity: 0;
      transform: scale(0.82);
    }
    to {
      opacity: 1;
      transform: scale(1);
    }
  }

  @keyframes dl-panel-enter {
    from {
      opacity: 0;
      transform: translateY(6px) scale(0.97);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }

  @keyframes dl-marker-enter {
    from {
      opacity: 0;
      transform: scale(0.7);
    }
    to {
      opacity: 1;
      transform: scale(1);
    }
  }

  @keyframes dl-highlight-enter {
    from {
      opacity: 0;
      transform: scale(0.985);
    }
    to {
      opacity: 1;
      transform: scale(1);
    }
  }

  @media (max-width: 960px) {
    .dl-session-panel {
      width: min(392px, calc(100vw - 32px));
      right: 16px;
      bottom: 76px;
    }

    .dl-detail-meta {
      grid-template-columns: 1fr;
    }
  }
`;

function ensureWithinViewport(rect: DevLensRect, width: number, height: number): { left: number; top: number } {
  const margin = 16;
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  let left = rect.left;
  let top = rect.top + rect.height + 12;

  if (left + width + margin > viewportWidth) {
    left = viewportWidth - width - margin;
  }
  if (left < margin) {
    left = margin;
  }

  if (top + height + margin > viewportHeight) {
    top = rect.top - height - 12;
  }
  if (top < margin) {
    top = Math.min(viewportHeight - height - margin, margin);
  }

  return { left, top };
}

function ensurePopupPositionFromPoint(pageX: number, pageY: number, width: number, height: number): { left: number; top: number } {
  const anchorRect: DevLensRect = {
    left: pageX - window.scrollX - 14,
    top: pageY - window.scrollY - 14,
    width: 28,
    height: 28,
  };

  return ensureWithinViewport(anchorRect, width, height);
}

function toRect(rect: DOMRect): DevLensRect {
  return {
    left: rect.left,
    top: rect.top,
    width: rect.width,
    height: rect.height,
  };
}

function normalizeRect(startX: number, startY: number, endX: number, endY: number): DevLensRect {
  const left = Math.min(startX, endX);
  const top = Math.min(startY, endY);

  return {
    left,
    top,
    width: Math.abs(endX - startX),
    height: Math.abs(endY - startY),
  };
}

function rectsIntersect(a: DevLensRect, b: DevLensRect): boolean {
  return !(
    a.left + a.width < b.left ||
    b.left + b.width < a.left ||
    a.top + a.height < b.top ||
    b.top + b.height < a.top
  );
}

function getRectArea(rect: DevLensRect): number {
  return Math.max(0, rect.width) * Math.max(0, rect.height);
}

function getRectCenter(rect: DevLensRect): { x: number; y: number } {
  return {
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2,
  };
}

function isPointInsideRect(point: { x: number; y: number }, rect: DevLensRect): boolean {
  return (
    point.x >= rect.left &&
    point.x <= rect.left + rect.width &&
    point.y >= rect.top &&
    point.y <= rect.top + rect.height
  );
}

function getOverlapArea(a: DevLensRect, b: DevLensRect): number {
  const overlapX = Math.min(a.left + a.width, b.left + b.width) - Math.max(a.left, b.left);
  const overlapY = Math.min(a.top + a.height, b.top + b.height) - Math.max(a.top, b.top);

  if (overlapX <= 0 || overlapY <= 0) {
    return 0;
  }

  return overlapX * overlapY;
}

function isWithinDevLensTarget(target: EventTarget | null): boolean {
  return (
    target instanceof Element &&
    Boolean(
      target.closest(`[${ROOT_ATTR}]`) ||
        target.closest(`[${HOST_ATTR}]`),
    )
  );
}

function isWithinDevLensEvent(event: Event): boolean {
  if (typeof event.composedPath === "function") {
    return event.composedPath().some((node) =>
      node instanceof Element &&
      (node.hasAttribute(ROOT_ATTR) || node.hasAttribute(HOST_ATTR)),
    );
  }

  return isWithinDevLensTarget(event.target);
}

function describeElement(element: HTMLElement): { elementName: string; elementPath: string; nearbyText?: string } {
  const tagName = element.tagName.toLowerCase();
  const role = element.getAttribute("role");
  const text = (element.textContent || "").trim().replace(/\s+/g, " ");
  const label = [tagName, role ? `(${role})` : "", text ? ` ${text.slice(0, 36)}` : ""].join("").trim();

  const path = [];
  let current: HTMLElement | null = element;
  let depth = 0;
  while (current && depth < 5) {
    const part = current.tagName.toLowerCase();
    const id = current.id ? `#${current.id}` : "";
    const className = current.classList.length > 0 ? `.${Array.from(current.classList).slice(0, 2).join(".")}` : "";
    path.unshift(`${part}${id}${className}`);
    current = current.parentElement;
    depth += 1;
  }

  return {
    elementName: label || tagName,
    elementPath: path.join(" > "),
    nearbyText: text || undefined,
  };
}

function getNormalizedElementText(element: HTMLElement): string {
  return (element.textContent || "").trim().replace(/\s+/g, " ");
}

function containsRect(outer: DevLensRect, inner: DevLensRect): boolean {
  return (
    outer.left <= inner.left &&
    outer.top <= inner.top &&
    outer.left + outer.width >= inner.left + inner.width &&
    outer.top + outer.height >= inner.top + inner.height
  );
}

function buildAreaPreviewPoints(rect: DevLensRect): Array<[number, number]> {
  const left = rect.left;
  const top = rect.top;
  const right = rect.left + rect.width;
  const bottom = rect.top + rect.height;
  const midX = (left + right) / 2;
  const midY = (top + bottom) / 2;

  return [
    [left, top],
    [right, top],
    [left, bottom],
    [right, bottom],
    [midX, midY],
    [midX, top],
    [midX, bottom],
    [left, midY],
    [right, midY],
  ].map(([x, y]) => [
    Math.max(0, Math.min(window.innerWidth - 1, x)),
    Math.max(0, Math.min(window.innerHeight - 1, y)),
  ]);
}

function isAreaInteractiveLikeElement(element: HTMLElement): boolean {
  const role = element.getAttribute("role");
  const tabIndex = element.getAttribute("tabindex");
  const className = typeof element.className === "string" ? element.className : "";

  return (
    Boolean(role && AREA_INTERACTIVE_ROLES.has(role)) ||
    element.onclick !== null ||
    element.hasAttribute("data-clickable") ||
    (tabIndex !== null && tabIndex !== "-1") ||
    /(?:^|[\s:_-])(btn|button|switch|toggle|tab|menu-item|clickable)(?:$|[\s:_-])/i.test(className)
  );
}

function hasNestedAreaContent(element: HTMLElement): boolean {
  return Boolean(element.querySelector(AREA_NESTED_CONTENT_SELECTOR));
}

function countMeaningfulAreaChildren(element: HTMLElement): number {
  return Array.from(element.children).filter((child) => {
    if (!(child instanceof HTMLElement)) {
      return false;
    }

    const tagName = child.tagName.toLowerCase();
    const text = getNormalizedElementText(child);
    return (
      AREA_PREVIEW_MEANINGFUL_TAGS.has(tagName) ||
      Boolean(text) ||
      Boolean(child.querySelector(AREA_MATCH_SELECTOR)) ||
      isAreaInteractiveLikeElement(child)
    );
  }).length;
}

function isAreaStructuredContainer(
  element: HTMLElement,
  elementRect: DevLensRect,
  selectionRect: DevLensRect,
): boolean {
  const tagName = element.tagName.toLowerCase();

  if (!["div", "section", "article", "aside", "nav", "form"].includes(tagName)) {
    return false;
  }

  if (elementRect.width < 120 || elementRect.height < 44) {
    return false;
  }

  if (
    elementRect.width > window.innerWidth * 0.96 ||
    elementRect.height > window.innerHeight * 0.82
  ) {
    return false;
  }

  if (getRectArea(elementRect) >= getRectArea(selectionRect) * 0.98) {
    return false;
  }

  const meaningfulChildren = countMeaningfulAreaChildren(element);
  const descendantCount = element.querySelectorAll(AREA_MATCH_SELECTOR).length;
  const hasTableLikeDescendant = Boolean(
    element.querySelector("table, thead, tbody, tr"),
  );

  return (
    meaningfulChildren >= 2 &&
    (descendantCount >= 2 || hasTableLikeDescendant)
  );
}

function shouldIncludeAreaPreviewElement(
  element: HTMLElement,
  elementRect: DevLensRect,
  selectionRect: DevLensRect,
): boolean {
  const tagName = element.tagName.toLowerCase();
  const text = getNormalizedElementText(element);
  const isInteractive = isAreaInteractiveLikeElement(element);

  if (AREA_PREVIEW_MEANINGFUL_TAGS.has(tagName)) {
    return true;
  }

  if (tagName === "div" || tagName === "span") {
    if ((Boolean(text) || isInteractive) && !hasNestedAreaContent(element)) {
      return true;
    }

    return isAreaStructuredContainer(element, elementRect, selectionRect);
  }

  return isAreaStructuredContainer(element, elementRect, selectionRect);
}

function shouldIncludeCommittedAreaElement(element: HTMLElement): boolean {
  const tagName = element.tagName.toLowerCase();
  const role = element.getAttribute("role");
  const text = getNormalizedElementText(element);

  if (AREA_SEMANTIC_TAGS.has(tagName) || (role && AREA_INTERACTIVE_ROLES.has(role))) {
    return true;
  }

  if (tagName === "div" || tagName === "span") {
    return (Boolean(text) || isAreaInteractiveLikeElement(element)) && !hasNestedAreaContent(element);
  }

  return false;
}

function collectAreaPreviewRects(rect: DevLensRect): DevLensRect[] {
  const left = rect.left;
  const top = rect.top;
  const right = rect.left + rect.width;
  const bottom = rect.top + rect.height;
  const candidateElements = new Set<HTMLElement>();
  const samplePoints = buildAreaPreviewPoints(rect);

  samplePoints.forEach(([x, y]) => {
    document.elementsFromPoint(x, y).forEach((element) => {
      if (!(element instanceof HTMLElement)) {
        return;
      }
      candidateElements.add(element);
    });
  });

  document.querySelectorAll<HTMLElement>(AREA_PREVIEW_SELECTOR).forEach((element) => {
    const elementRect = toRect(element.getBoundingClientRect());
    const center = getRectCenter(elementRect);
    const overlapArea = getOverlapArea(rect, elementRect);
    const overlapRatio = overlapArea / Math.max(1, getRectArea(elementRect));

    if (isPointInsideRect(center, rect) || overlapRatio > 0.5) {
      candidateElements.add(element);
    }
  });

  const allMatching: DevLensRect[] = [];

  candidateElements.forEach((element) => {
    if (element.closest(`[${ROOT_ATTR}]`) || element.closest(`[${HOST_ATTR}]`)) {
      return;
    }

    const elementRect = toRect(element.getBoundingClientRect());
    if (
      elementRect.width > window.innerWidth * 0.8 &&
      elementRect.height > window.innerHeight * 0.5
    ) {
      return;
    }
    if (elementRect.width < 10 || elementRect.height < 10) {
      return;
    }
    if (!rectsIntersect(rect, elementRect)) {
      return;
    }
    if (!shouldIncludeAreaPreviewElement(element, elementRect, rect)) {
      return;
    }

    const dominated = allMatching.some((existingRect) =>
      containsRect(existingRect, elementRect),
    );

    if (!dominated) {
      allMatching.push(elementRect);
    }
  });

  return allMatching
    .sort((a, b) => {
      if (Math.abs(a.top - b.top) > 8) {
        return a.top - b.top;
      }

      if (Math.abs(a.left - b.left) > 8) {
        return a.left - b.left;
      }

      return getRectArea(a) - getRectArea(b);
    });
}

function collectAreaMatches(
  rect: DevLensRect,
): Array<{ element: HTMLElement; rect: DevLensRect }> {
  const allMatching: Array<{ element: HTMLElement; rect: DevLensRect }> = [];
  const selector = `${AREA_MATCH_SELECTOR}, div, span`;

  document.querySelectorAll<HTMLElement>(selector).forEach((element) => {
    if (element.closest(`[${ROOT_ATTR}]`) || element.closest(`[${HOST_ATTR}]`)) {
      return;
    }

    const elementRect = toRect(element.getBoundingClientRect());
    if (
      elementRect.width > window.innerWidth * 0.8 &&
      elementRect.height > window.innerHeight * 0.5
    ) {
      return;
    }
    if (elementRect.width < 10 || elementRect.height < 10) {
      return;
    }
    if (!rectsIntersect(rect, elementRect)) {
      return;
    }
    if (!shouldIncludeCommittedAreaElement(element)) {
      return;
    }

    allMatching.push({ element, rect: elementRect });
  });

  return allMatching
    .filter(
      ({ element }) =>
        !allMatching.some(
          ({ element: other }) => other !== element && element.contains(other),
        ),
    )
    .sort((a, b) => {
      if (Math.abs(a.rect.top - b.rect.top) > 8) {
        return a.rect.top - b.rect.top;
      }

      if (Math.abs(a.rect.left - b.rect.left) > 8) {
        return a.rect.left - b.rect.left;
      }

      return getRectArea(a.rect) - getRectArea(b.rect);
    });
}

function getUnionRect(rects: DevLensRect[]): DevLensRect | null {
  if (rects.length === 0) {
    return null;
  }

  const left = Math.min(...rects.map((item) => item.left));
  const top = Math.min(...rects.map((item) => item.top));
  const right = Math.max(...rects.map((item) => item.left + item.width));
  const bottom = Math.max(...rects.map((item) => item.top + item.height));

  return {
    left,
    top,
    width: right - left,
    height: bottom - top,
  };
}

function describeAreaDraftPreview(rect: DevLensRect): {
  matchRects: DevLensRect[];
  matchCount: number;
} {
  const matchRects = collectAreaPreviewRects(rect);

  return {
    matchRects,
    matchCount: matchRects.length,
  };
}

function describeCommittedAreaSelection(rect: DevLensRect): {
  rect: DevLensRect;
  elementName: string;
  elementPath: string;
  nearbyText?: string;
  relatedElements?: string[];
  matchRects: DevLensRect[];
  matchCount: number;
} {
  const matches = collectAreaMatches(rect);
  const snappedRect = getUnionRect(matches.map((item) => item.rect)) || rect;

  const relatedElements = Array.from(
    new Set(
      matches
        .map(({ element }) => describeElement(element).elementName)
        .filter(Boolean),
    ),
  ).slice(0, 6);

  const kindCounter = new Map<string, number>();
  matches.forEach(({ element }) => {
    const tagName = element.tagName.toLowerCase();
    const role = element.getAttribute("role");
    const token = role ? `${tagName}(${role})` : tagName;
    kindCounter.set(token, (kindCounter.get(token) || 0) + 1);
  });

  const groupedKinds = Array.from(kindCounter.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([token, count]) => `${token} ×${count}`);

  const nearbyText = Array.from(
    new Set(
      matches
        .map(({ element }) => (element.textContent || "").trim().replace(/\s+/g, " "))
        .filter((value) => value.length > 0),
    ),
  )
    .slice(0, 3)
    .join(" · ");

  return {
    rect: snappedRect,
    elementName: matches.length > 0 ? `区域标注 · ${matches.length} 个元素` : "区域标注",
    elementPath:
      groupedKinds.length > 0
        ? groupedKinds.join(" · ")
        : `区域 ${Math.round(snappedRect.width)}×${Math.round(snappedRect.height)}`,
    nearbyText: nearbyText || undefined,
    relatedElements,
    matchRects: matches.map((item) => item.rect).slice(0, 24),
    matchCount: matches.length,
  };
}

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function createId(): string {
  return `ann_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function getAnnotationStatusLabel(status: DevLensAnnotationStatus): string {
  switch (status) {
    case "acknowledged":
      return "处理中";
    case "resolved":
      return "已解决";
    case "dismissed":
      return "已忽略";
    default:
      return "待处理";
  }
}

function stopEditableEventPropagation(event: React.SyntheticEvent<HTMLElement>): void {
  // Keep host-page global shortcuts from stealing keystrokes out of DevLens inputs.
  event.stopPropagation();
}

async function copyTextToClipboard(text: string): Promise<boolean> {
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fall back to a legacy copy path below.
    }
  }

  if (typeof document === "undefined") {
    return false;
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "true");
  textarea.style.position = "fixed";
  textarea.style.left = "-9999px";
  textarea.style.top = "0";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();
  textarea.setSelectionRange(0, textarea.value.length);

  try {
    return document.execCommand("copy");
  } catch {
    return false;
  } finally {
    textarea.remove();
  }
}

function getDefaultFloatingPosition() {
  const margin = 24;
  const size = 44;
  return {
    left: Math.max(margin, window.innerWidth - margin - size),
    top: Math.max(margin, window.innerHeight - margin - size),
  };
}

function clampFloatingPosition(position: { left: number; top: number }, width: number, height: number) {
  const margin = 16;
  const maxLeft = Math.max(margin, window.innerWidth - width - margin);
  const maxTop = Math.max(margin, window.innerHeight - height - margin);

  return {
    left: Math.min(Math.max(position.left, margin), maxLeft),
    top: Math.min(Math.max(position.top, margin), maxTop),
  };
}

function DevLensGlyph() {
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

function AnnotateIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" className="dl-toolbar-icon">
      <path
        d="M3 11.9l.5-2.3L9.9 3.2a1.1 1.1 0 0 1 1.6 0l1.3 1.3a1.1 1.1 0 0 1 0 1.6L6.4 12.4 4 13z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <path d="M8.7 4.4l2.9 2.9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

function StabilityIcon() {
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
      <rect x="2.3" y="2.3" width="11.4" height="11.4" rx="3" stroke="currentColor" strokeWidth="1.2" fill="none" opacity="0.6" />
    </svg>
  );
}

function SessionIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" className="dl-toolbar-icon">
      <rect x="2.4" y="2.8" width="11.2" height="8.4" rx="2" fill="none" stroke="currentColor" strokeWidth="1.3" />
      <path d="M5 13.2l2-2h4" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CollapseIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" className="dl-toolbar-icon">
      <path d="M4 4l8 8M12 4L4 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function useScrollTick(): number {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const onScroll = () => setTick((value) => value + 1);
    const onResize = () => setTick((value) => value + 1);

    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return tick;
}

function DevLensApp({ defaultOpen = false }: DevLensMountOptions) {
  const pathname = window.location.pathname || "/";
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [mode, setMode] = useState<DevLensMode>("annotate");
  const [annotations, setAnnotations] = useState<DevLensAnnotation[]>(() => loadAnnotations(pathname));
  const [floatingPosition, setFloatingPosition] = useState(() => loadFloatingPosition() || getDefaultFloatingPosition());
  const [selection, setSelection] = useState<DevLensSelection | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [hoverRect, setHoverRect] = useState<DevLensRect | null>(null);
  const [areaDraftRect, setAreaDraftRect] = useState<DevLensRect | null>(null);
  const [activeAnnotationId, setActiveAnnotationId] = useState<string | null>(null);
  const [isTextSelectionPending, setIsTextSelectionPending] = useState(false);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");
  const scrollTick = useScrollTick();
  const openAnnotations = useMemo(
    () => annotations.filter((item) => isOpenDevLensAnnotationStatus(item.status)),
    [annotations],
  );
  const closedAnnotations = useMemo(
    () => annotations.filter((item) => isClosedDevLensAnnotationStatus(item.status)),
    [annotations],
  );
  const activeAnnotation = useMemo(
    () => annotations.find((item) => item.id === activeAnnotationId) || null,
    [annotations, activeAnnotationId],
  );
  const popupRef = useRef<HTMLTextAreaElement | null>(null);
  const toolbarRef = useRef<HTMLDivElement | HTMLButtonElement | null>(null);
  const dragRef = useRef<{
    pointerId: number;
    offsetX: number;
    offsetY: number;
    width: number;
    height: number;
    moved: boolean;
  } | null>(null);
  const suppressLauncherClickRef = useRef(false);
  const suppressSelectionClickRef = useRef(false);
  const areaSelectionRef = useRef<{
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
    dragging: boolean;
  } | null>(null);

  useEffect(() => {
    saveAnnotations(pathname, annotations);
  }, [annotations, pathname]);

  useEffect(() => {
    saveFloatingPosition(floatingPosition);
  }, [floatingPosition]);

  useEffect(() => {
    const syncPosition = () => {
      const node = toolbarRef.current;
      if (!node) {
        return;
      }
      const rect = node.getBoundingClientRect();
      setFloatingPosition((current) => clampFloatingPosition(current, rect.width, rect.height));
    };

    syncPosition();
    window.addEventListener("resize", syncPosition);
    return () => window.removeEventListener("resize", syncPosition);
  }, [isOpen]);

  useEffect(() => {
    if (mode !== "session") {
      return;
    }

    const preferredAnnotations =
      openAnnotations.length > 0 ? openAnnotations : annotations;

    if (preferredAnnotations.length === 0) {
      if (activeAnnotationId) {
        setActiveAnnotationId(null);
      }
      return;
    }

    if (!activeAnnotationId || !annotations.some((item) => item.id === activeAnnotationId)) {
      setActiveAnnotationId(preferredAnnotations[0].id);
    }
  }, [activeAnnotationId, annotations, mode, openAnnotations]);

  useEffect(() => {
    if (!isOpen || mode !== "annotate") {
      setHoverRect(null);
      setAreaDraftRect(null);
      areaSelectionRef.current = null;
      document.body.style.userSelect = "";
      document.body.style.webkitUserSelect = "";
      document.documentElement.style.userSelect = "";
      document.body.style.cursor = "";
      return undefined;
    }

    const resetAreaInteractionState = () => {
      areaSelectionRef.current = null;
      setAreaDraftRect(null);
      document.body.style.userSelect = "";
      document.body.style.webkitUserSelect = "";
      document.documentElement.style.userSelect = "";
      document.body.style.cursor = "";
    };

    const onMouseDown = (event: MouseEvent) => {
      if (selection) {
        return;
      }

      if (!event.shiftKey || event.button !== 0 || isWithinDevLensEvent(event)) {
        return;
      }

      areaSelectionRef.current = {
        startX: event.clientX,
        startY: event.clientY,
        currentX: event.clientX,
        currentY: event.clientY,
        dragging: false,
      };
      event.preventDefault();
      event.stopPropagation();
      document.body.style.userSelect = "none";
      document.body.style.webkitUserSelect = "none";
      document.documentElement.style.userSelect = "none";
      document.body.style.cursor = "crosshair";
      setHoverRect(null);
      setIsTextSelectionPending(false);
    };

    const onMouseMove = (event: MouseEvent) => {
      if (selection) {
        return;
      }

      const areaSelection = areaSelectionRef.current;
      if (areaSelection) {
        areaSelection.currentX = event.clientX;
        areaSelection.currentY = event.clientY;

        const nextRect = normalizeRect(
          areaSelection.startX,
          areaSelection.startY,
          event.clientX,
          event.clientY,
        );

        if (nextRect.width > 6 || nextRect.height > 6) {
          areaSelection.dragging = true;
          setAreaDraftRect(nextRect);
        }
        event.preventDefault();
        event.stopPropagation();
        setHoverRect(null);
        return;
      }

      if (event.shiftKey) {
        setHoverRect(null);
        return;
      }

      if (isWithinDevLensEvent(event)) {
        setHoverRect(null);
        return;
      }

      const target = event.target;
      if (!(target instanceof HTMLElement)) {
        setHoverRect(null);
        return;
      }

      const rect = target.getBoundingClientRect();
      if (!rect.width || !rect.height) {
        return;
      }

      setHoverRect(toRect(rect));
    };

    const onMouseUp = (event: MouseEvent) => {
      const areaSelection = areaSelectionRef.current;
      if (areaSelection) {
        const finalRect = normalizeRect(
          areaSelection.startX,
          areaSelection.startY,
          areaSelection.currentX,
          areaSelection.currentY,
        );

        areaSelectionRef.current = null;
        resetAreaInteractionState();

        if (areaSelection.dragging && finalRect.width >= 20 && finalRect.height >= 20) {
          const detail = describeCommittedAreaSelection(finalRect);
          setSelection({
            kind: "area",
            elementName: detail.elementName,
            elementPath: detail.elementPath,
            rect: detail.rect,
            pageX: detail.rect.left + window.scrollX,
            pageY: detail.rect.top + window.scrollY,
            matchCount: detail.matchCount,
            nearbyText: detail.nearbyText,
            relatedElements: detail.relatedElements,
          });
          setDraft("");
          setEditingId(null);
          setActiveAnnotationId(null);
          setHoverRect(null);
          setIsTextSelectionPending(false);
          suppressSelectionClickRef.current = true;
          event.preventDefault();
          event.stopPropagation();
        }
        return;
      }

      if (selection) {
        return;
      }

      const selectedText = window.getSelection()?.toString().trim();
      if (!selectedText) {
        document.body.style.userSelect = "";
        return;
      }

      const range = window.getSelection()?.rangeCount ? window.getSelection()?.getRangeAt(0) : null;
      const rect = range?.getBoundingClientRect();
      const anchorNode = window.getSelection()?.anchorNode;
      const element =
        anchorNode instanceof HTMLElement
          ? anchorNode
          : anchorNode?.parentElement instanceof HTMLElement
            ? anchorNode.parentElement
            : null;

      if (!rect || !element) {
        return;
      }

      const detail = describeElement(element);
      setSelection({
        kind: "text",
        elementName: detail.elementName,
        elementPath: detail.elementPath,
        rect: toRect(rect),
        pageX: rect.left + window.scrollX,
        pageY: rect.top + window.scrollY,
        matchCount: 1,
        selectedText,
        nearbyText: detail.nearbyText,
      });
      setDraft("");
      setEditingId(null);
      setIsTextSelectionPending(true);
    };

    const onClick = (event: MouseEvent) => {
      if (isWithinDevLensEvent(event)) {
        return;
      }

      if (suppressSelectionClickRef.current) {
        suppressSelectionClickRef.current = false;
        return;
      }

      if (isTextSelectionPending) {
        setIsTextSelectionPending(false);
        return;
      }

      if (event.shiftKey) {
        setHoverRect(null);
        return;
      }

      const target = event.target;
      if (!(target instanceof HTMLElement)) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      const rect = target.getBoundingClientRect();
      if (!rect.width || !rect.height) {
        return;
      }

      const detail = describeElement(target);
      setSelection({
        kind: "element",
        elementName: detail.elementName,
        elementPath: detail.elementPath,
        rect: toRect(rect),
        pageX: event.clientX + window.scrollX,
        pageY: event.clientY + window.scrollY,
        matchCount: 1,
        nearbyText: detail.nearbyText,
      });
      setDraft("");
      setEditingId(null);
      setActiveAnnotationId(null);
    };

    const preventNativeDrag = (event: Event) => {
      if (!areaSelectionRef.current) {
        return;
      }

      event.preventDefault();
    };

    document.addEventListener("mousedown", onMouseDown, true);
    document.addEventListener("mousemove", onMouseMove, true);
    document.addEventListener("mouseup", onMouseUp, true);
    document.addEventListener("click", onClick, true);
    document.addEventListener("dragstart", preventNativeDrag, true);
    document.addEventListener("selectstart", preventNativeDrag, true);

    return () => {
      resetAreaInteractionState();
      document.removeEventListener("mousedown", onMouseDown, true);
      document.removeEventListener("mousemove", onMouseMove, true);
      document.removeEventListener("mouseup", onMouseUp, true);
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("dragstart", preventNativeDrag, true);
      document.removeEventListener("selectstart", preventNativeDrag, true);
    };
  }, [isOpen, isTextSelectionPending, mode, selection]);

  useEffect(() => {
    if (!isOpen || mode !== "annotate" || !areaDraftRect) {
      return undefined;
    }

    const preventScroll = (event: Event) => {
      event.preventDefault();
    };

    window.addEventListener("wheel", preventScroll, { passive: false, capture: true });
    window.addEventListener("touchmove", preventScroll, { passive: false, capture: true });

    return () => {
      window.removeEventListener("wheel", preventScroll, true);
      window.removeEventListener("touchmove", preventScroll, true);
    };
  }, [areaDraftRect, isOpen, mode]);

  useEffect(() => {
    if (selection && popupRef.current) {
      popupRef.current.focus();
    }
  }, [selection]);

  useEffect(() => {
    if (copyState === "idle") {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setCopyState("idle");
    }, 1800);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [copyState]);

  useEffect(() => {
    const onPointerMove = (event: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag || event.pointerId !== drag.pointerId) {
        return;
      }

      const nextPosition = clampFloatingPosition(
        {
          left: event.clientX - drag.offsetX,
          top: event.clientY - drag.offsetY,
        },
        drag.width,
        drag.height,
      );

      if (!drag.moved && (Math.abs(event.movementX) > 0 || Math.abs(event.movementY) > 0)) {
        drag.moved = true;
      }

      setFloatingPosition(nextPosition);
      setHoverRect(null);
    };

    const onPointerUp = (event: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag || event.pointerId !== drag.pointerId) {
        return;
      }

      if (drag.moved) {
        suppressLauncherClickRef.current = true;
      }
      dragRef.current = null;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };

    window.addEventListener("pointermove", onPointerMove, true);
    window.addEventListener("pointerup", onPointerUp, true);
    return () => {
      window.removeEventListener("pointermove", onPointerMove, true);
      window.removeEventListener("pointerup", onPointerUp, true);
    };
  }, []);

  const summary = useMemo(() => {
    return {
      open: openAnnotations.length,
      pending: annotations.filter((item) => item.status === "pending").length,
      acknowledged: annotations.filter((item) => item.status === "acknowledged").length,
      resolved: annotations.filter((item) => item.status === "resolved").length,
      dismissed: annotations.filter((item) => item.status === "dismissed").length,
      total: annotations.length,
    };
  }, [annotations, openAnnotations]);

  const areaDraftPreview = useMemo(
    () => (areaDraftRect ? describeAreaDraftPreview(areaDraftRect) : null),
    [areaDraftRect],
  );

  const markerStyle = (annotation: DevLensAnnotation) => ({
    left: Math.max(12, annotation.pageX - window.scrollX),
    top: Math.max(12, annotation.pageY - window.scrollY - 14),
  });

  const editAnnotation = (annotation: DevLensAnnotation) => {
    setSelection({
      kind: annotation.selectedText ? "text" : annotation.relatedElements?.length ? "area" : "element",
      elementName: annotation.elementName,
      elementPath: annotation.elementPath,
      rect: annotation.rect,
      pageX: annotation.pageX,
      pageY: annotation.pageY,
      matchCount: annotation.matchCount,
      selectedText: annotation.selectedText,
      nearbyText: annotation.nearbyText,
      relatedElements: annotation.relatedElements,
    });
    setDraft(annotation.comment);
    setEditingId(annotation.id);
    setActiveAnnotationId(annotation.id);
  };

  const openAnnotationEditor = (annotation: DevLensAnnotation) => {
    setIsOpen(true);
    setMode("annotate");
    editAnnotation(annotation);
  };

  const setAnnotationStatus = (
    annotationId: string,
    nextStatus: DevLensAnnotationStatus,
  ) => {
    setAnnotations((current) =>
      current.map((item) =>
        item.id === annotationId
          ? {
              ...item,
              status: nextStatus,
              updatedAt: Date.now(),
            }
          : item,
      ),
    );
    setActiveAnnotationId(annotationId);
  };

  const handleCopyAnnotations = async () => {
    const payload = createDevLensExportPayload({
      annotations: openAnnotations,
      pathname,
      title: document.title || "Untitled Page",
      url: window.location.href,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight,
      },
    });
    const text = formatDevLensExportMarkdown(payload);
    const didCopy = await copyTextToClipboard(text);
    setCopyState(didCopy ? "copied" : "failed");
  };

  const handleSave = () => {
    if (!selection || !draft.trim()) {
      return;
    }

    const now = Date.now();
    if (editingId) {
      setAnnotations((current) =>
        current.map((item) =>
          item.id === editingId
            ? {
                ...item,
                kind: selection.kind,
                comment: draft.trim(),
                updatedAt: now,
                elementName: selection.elementName,
                elementPath: selection.elementPath,
                matchCount: selection.matchCount,
                selectedText: selection.selectedText,
                nearbyText: selection.nearbyText,
                relatedElements: selection.relatedElements,
                pageX: selection.pageX,
                pageY: selection.pageY,
                rect: selection.rect,
              }
            : item,
        ),
      );
      setActiveAnnotationId(editingId);
    } else {
      const annotation: DevLensAnnotation = {
        id: createId(),
        pathname,
        createdAt: now,
        updatedAt: now,
        kind: selection.kind,
        status: "pending",
        comment: draft.trim(),
        elementName: selection.elementName,
        elementPath: selection.elementPath,
        matchCount: selection.matchCount,
        selectedText: selection.selectedText,
        nearbyText: selection.nearbyText,
        relatedElements: selection.relatedElements,
        pageX: selection.pageX,
        pageY: selection.pageY,
        rect: selection.rect,
      };
      setAnnotations((current) => [annotation, ...current]);
      setActiveAnnotationId(annotation.id);
    }

    setSelection(null);
    setEditingId(null);
    setDraft("");
  };

  const handleDelete = () => {
    if (!editingId) {
      setSelection(null);
      setDraft("");
      return;
    }

    setAnnotations((current) => current.filter((item) => item.id !== editingId));
    if (activeAnnotationId === editingId) {
      setActiveAnnotationId(null);
    }
    setSelection(null);
    setEditingId(null);
    setDraft("");
  };

  const pendingMarkerStyle = selection
    ? {
        left: Math.max(12, selection.pageX - window.scrollX),
        top: Math.max(12, selection.pageY - window.scrollY - 14),
      }
    : null;
  const popupPosition = selection ? ensurePopupPositionFromPoint(selection.pageX, selection.pageY, 320, 280) : null;
  const activeFocusAnnotation = !selection && isOpen && mode === "session" ? activeAnnotation : null;
  const togglePanelMode = (nextMode: DevLensMode) => {
    setMode((current) => (current === nextMode ? "annotate" : nextMode));
  };
  const startDragging = (event: React.PointerEvent<HTMLElement>) => {
    const node = toolbarRef.current;
    if (!node) {
      return;
    }

    const rect = node.getBoundingClientRect();
    dragRef.current = {
      pointerId: event.pointerId,
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
      width: rect.width,
      height: rect.height,
      moved: false,
    };
    document.body.style.cursor = "grabbing";
    document.body.style.userSelect = "none";
    setHoverRect(null);
    event.preventDefault();
    event.stopPropagation();
  };
  const toolbarRect = toolbarRef.current?.getBoundingClientRect();
  const panelWidth = 392;
  const panelLeft = clampFloatingPosition(
    {
      left: (toolbarRect?.left || floatingPosition.left) + (toolbarRect?.width || 44) - panelWidth,
      top: floatingPosition.top,
    },
    panelWidth,
    0,
  ).left;
  const panelBottom = Math.max(16, window.innerHeight - floatingPosition.top + 12);

  return (
    <div className="dl-root" data-devlens-root="">
      {isOpen && mode === "annotate" && hoverRect ? (
        <div
          className="dl-highlight"
          style={{
            left: hoverRect.left,
            top: hoverRect.top,
            width: hoverRect.width,
            height: hoverRect.height,
          }}
        />
      ) : null}

      {isOpen && mode === "annotate" && areaDraftRect ? (
        <>
          {areaDraftPreview?.matchRects.map((matchRect, index) => (
            <div
              key={`area-match-${index}`}
              className="dl-area-match"
              style={{
                left: matchRect.left,
                top: matchRect.top,
                width: matchRect.width,
                height: matchRect.height,
              }}
            />
          ))}
          <div
            className="dl-area-draft"
            style={{
              left: areaDraftRect.left,
              top: areaDraftRect.top,
              width: areaDraftRect.width,
              height: areaDraftRect.height,
            }}
          />
          <div
            className="dl-area-draft-size"
            style={{
              left: Math.max(12, areaDraftRect.left),
              top: Math.max(12, areaDraftRect.top - 34),
            }}
          >
            {Math.round(areaDraftRect.width)}×{Math.round(areaDraftRect.height)}
            {areaDraftPreview?.matchCount ? ` · ${areaDraftPreview.matchCount} 个元素` : ""}
          </div>
        </>
      ) : null}

      {selection?.kind === "area" ? (
        <div
          className="dl-area-selection-focus"
          style={{
            left: selection.rect.left,
            top: selection.rect.top,
            width: selection.rect.width,
            height: selection.rect.height,
          }}
        />
      ) : null}

      {activeFocusAnnotation ? (
        <>
          <div
            className="dl-active-focus"
            data-kind={getAnnotationKind(activeFocusAnnotation)}
            style={{
              left: activeFocusAnnotation.rect.left,
              top: activeFocusAnnotation.rect.top,
              width: activeFocusAnnotation.rect.width,
              height: activeFocusAnnotation.rect.height,
            }}
          />
          <div
            className="dl-active-focus-label"
            data-kind={getAnnotationKind(activeFocusAnnotation)}
            style={{
              left: Math.max(12, activeFocusAnnotation.rect.left),
              top: Math.max(12, activeFocusAnnotation.rect.top - 32),
            }}
          >
            {getAnnotationKind(activeFocusAnnotation) === "area"
              ? `${activeFocusAnnotation.matchCount || activeFocusAnnotation.relatedElements?.length || 0} 个元素`
              : activeFocusAnnotation.elementName}
          </div>
        </>
      ) : null}

      {openAnnotations.map((annotation, index) => (
        <button
          key={annotation.id}
          className="dl-marker"
          data-kind={getAnnotationKind(annotation)}
          data-status={annotation.status}
          data-active={annotation.id === activeAnnotationId && mode === "session"}
          style={markerStyle(annotation)}
          onClick={() => openAnnotationEditor(annotation)}
          title={annotation.comment}
        >
          {getAnnotationKind(annotation) === "area" ? (
            <>
              <svg viewBox="0 0 12 12" aria-hidden="true" className="dl-marker-icon">
                <rect x="1.25" y="1.25" width="9.5" height="9.5" rx="2" fill="none" stroke="currentColor" strokeWidth="1.5" />
                <path d="M3 3h2M7 3h2M3 6h6M3 9h2M7 9h2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
              </svg>
              <span className="dl-marker-label">{annotation.matchCount || annotation.relatedElements?.length || index + 1}</span>
            </>
          ) : (
            index + 1
          )}
        </button>
      ))}

      {selection && pendingMarkerStyle ? (
        <button
          className="dl-marker"
          data-kind={selection.kind}
          data-pending="true"
          style={pendingMarkerStyle}
          title={selection.kind === "area" ? "待提交区域标注" : "待提交标注"}
        >
          {selection.kind === "area" ? (
            <>
              <svg viewBox="0 0 12 12" aria-hidden="true" className="dl-marker-icon">
                <rect x="1.25" y="1.25" width="9.5" height="9.5" rx="2" fill="none" stroke="currentColor" strokeWidth="1.5" />
                <path d="M3 3h2M7 3h2M3 6h6M3 9h2M7 9h2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
              </svg>
              <span className="dl-marker-label">{selection.matchCount || selection.relatedElements?.length || 1}</span>
            </>
          ) : (
            "+"
          )}
        </button>
      ) : null}

      {selection && popupPosition ? (
        <div
          className="dl-popup"
          style={{ left: popupPosition.left, top: popupPosition.top }}
        >
          <div className="dl-popup-header">
            <h3 className="dl-popup-title">
              {editingId ? "编辑标注" : selection.kind === "area" ? "添加区域标注" : "添加标注"}
            </h3>
            <span className="dl-popup-hint">Cmd/Ctrl + Enter</span>
          </div>
          <span className="dl-popup-section-label">
            {selection.kind === "area"
              ? `选中区域 · ${selection.matchCount || selection.relatedElements?.length || 0} 个元素`
              : "当前元素"}
          </span>
          <p className="dl-popup-meta">
            {selection.elementName}
            <br />
            {selection.elementPath}
          </p>
          {selection.selectedText ? <div className="dl-popup-quote">{selection.selectedText}</div> : null}
          {selection.kind === "area" && selection.relatedElements?.length ? (
            <div className="dl-detail-chip-list">
              {selection.relatedElements.map((item) => (
                <span key={item} className="dl-detail-chip">
                  {item}
                </span>
              ))}
            </div>
          ) : null}
          <textarea
            ref={popupRef}
            className="dl-popup-textarea"
            placeholder={selection.kind === "area" ? "描述这个区域或多个组件需要修改什么" : "描述这个页面元素需要修改什么"}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onBeforeInput={stopEditableEventPropagation}
            onCompositionStart={stopEditableEventPropagation}
            onCompositionUpdate={stopEditableEventPropagation}
            onCompositionEnd={stopEditableEventPropagation}
            onKeyDown={(event) => {
              event.stopPropagation();
              if (event.key === "Escape") {
                setSelection(null);
                setEditingId(null);
                setDraft("");
              }
              if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
                event.preventDefault();
                handleSave();
              }
            }}
            onKeyUp={stopEditableEventPropagation}
            onPaste={stopEditableEventPropagation}
          />
          <div className="dl-popup-actions">
            <div className="dl-popup-actions-left">
              <button className="dl-popup-action" data-kind="ghost" onClick={() => {
                setSelection(null);
                setEditingId(null);
                setDraft("");
              }}>
                取消
              </button>
              {editingId ? (
                <button className="dl-popup-action" data-kind="danger" onClick={handleDelete}>
                  删除
                </button>
              ) : null}
            </div>
            <div className="dl-popup-actions-right">
              <button className="dl-popup-action" data-kind="primary" onClick={handleSave}>
                {editingId ? "保存" : "添加"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {isOpen && mode === "session" ? (
        <section
          className="dl-session-panel"
          style={{ left: panelLeft, bottom: panelBottom }}
        >
          <div className="dl-session-header">
            <div>
              <h3 className="dl-session-title">本页标注</h3>
              <p className="dl-session-subtitle">
                这里先只展示 annotation，会话、稳定性和 MCP 同步后续再逐步接进来。
              </p>
            </div>
            <div className="dl-session-header-actions">
              <button
                className="dl-popup-action"
                data-kind={copyState === "failed" ? "danger" : copyState === "copied" ? "primary" : "ghost"}
                disabled={openAnnotations.length === 0}
                onClick={() => {
                  void handleCopyAnnotations();
                }}
                title="复制本页仍需处理的标注信息"
              >
                {copyState === "copied" ? "已复制当前标注" : copyState === "failed" ? "复制失败" : "复制当前标注"}
              </button>
              <button className="dl-toolbar-icon-button" data-kind="secondary" onClick={() => setMode("annotate")} title="关闭会话面板">
                <CollapseIcon />
              </button>
            </div>
          </div>
          <div className="dl-summary-grid">
            <div className="dl-summary-card">
              <span className="dl-summary-label">未完成</span>
              <span className="dl-summary-value">{summary.open}</span>
            </div>
            <div className="dl-summary-card">
              <span className="dl-summary-label">处理中</span>
              <span className="dl-summary-value">{summary.acknowledged}</span>
            </div>
            <div className="dl-summary-card">
              <span className="dl-summary-label">已解决</span>
              <span className="dl-summary-value">{summary.resolved}</span>
            </div>
            <div className="dl-summary-card">
              <span className="dl-summary-label">已忽略</span>
              <span className="dl-summary-value">{summary.dismissed}</span>
            </div>
          </div>
          <div className="dl-session-body">
            <div className="dl-session-section">
              <div className="dl-session-section-header">
                <h4 className="dl-session-section-title">当前待处理</h4>
                <span className="dl-session-section-count">{openAnnotations.length}</span>
              </div>
              <div className="dl-session-list">
                {openAnnotations.length === 0 ? (
                  <div className="dl-session-empty">
                    {annotations.length === 0
                      ? "还没有本页标注。进入“标注模式”后点击页面元素，即可就地创建 annotation。"
                      : "当前没有未完成标注。已解决和已忽略的项目会保留在下面的历史区。"}
                  </div>
                ) : (
                  openAnnotations.map((annotation) => (
                    <article
                      key={annotation.id}
                      className="dl-annotation-card"
                      data-status={annotation.status}
                      data-selected={annotation.id === activeAnnotationId}
                      onClick={() => setActiveAnnotationId(annotation.id)}
                    >
                      <div className="dl-annotation-main">
                        <div className="dl-annotation-top">
                          <span className="dl-status-pill" data-status={annotation.status}>
                            {getAnnotationStatusLabel(annotation.status)}
                          </span>
                        </div>
                        <div className="dl-annotation-comment">{annotation.comment}</div>
                        <div className="dl-annotation-meta">
                          {annotation.elementName}
                          <br />
                          {annotation.elementPath}
                        </div>
                      </div>
                      <div className="dl-annotation-side">
                        <span className="dl-annotation-time">{formatTime(annotation.updatedAt)}</span>
                        <span className="dl-annotation-chevron">›</span>
                      </div>
                    </article>
                  ))
                )}
              </div>
            </div>

            {closedAnnotations.length > 0 ? (
              <div className="dl-session-section">
                <div className="dl-session-section-header">
                  <h4 className="dl-session-section-title">已完成历史</h4>
                  <span className="dl-session-section-count">{closedAnnotations.length}</span>
                </div>
                <div className="dl-session-list">
                  {closedAnnotations.map((annotation) => (
                    <article
                      key={annotation.id}
                      className="dl-annotation-card"
                      data-status={annotation.status}
                      data-selected={annotation.id === activeAnnotationId}
                      onClick={() => setActiveAnnotationId(annotation.id)}
                    >
                      <div className="dl-annotation-main">
                        <div className="dl-annotation-top">
                          <span className="dl-status-pill" data-status={annotation.status}>
                            {getAnnotationStatusLabel(annotation.status)}
                          </span>
                        </div>
                        <div className="dl-annotation-comment">{annotation.comment}</div>
                        <div className="dl-annotation-meta">
                          {annotation.elementName}
                          <br />
                          {annotation.elementPath}
                        </div>
                      </div>
                      <div className="dl-annotation-side">
                        <span className="dl-annotation-time">{formatTime(annotation.updatedAt)}</span>
                        <span className="dl-annotation-chevron">›</span>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="dl-session-section">
              <div className="dl-session-section-header">
                <h4 className="dl-session-section-title">当前详情</h4>
                <span className="dl-section-note">Claude / Cursor 回复后也会在这里继续展开</span>
              </div>
              <div className="dl-session-detail">
              {activeAnnotation ? (
                <>
                  <div className="dl-detail-card">
                    <h4 className="dl-detail-title">当前标注</h4>
                    <div className="dl-detail-body">{activeAnnotation.comment}</div>
                    {activeAnnotation.selectedText ? (
                      <div className="dl-detail-quote">{activeAnnotation.selectedText}</div>
                    ) : null}
                  </div>

                  <div className="dl-detail-card">
                    <h4 className="dl-detail-title">元素上下文</h4>
                    <div className="dl-detail-meta">
                      <div className="dl-detail-kv">
                        <strong>元素摘要</strong>
                        <span>{activeAnnotation.elementName}</span>
                      </div>
                      <div className="dl-detail-kv">
                        <strong>状态</strong>
                        <span>{getAnnotationStatusLabel(activeAnnotation.status)}</span>
                      </div>
                      <div className="dl-detail-kv" style={{ gridColumn: "1 / -1" }}>
                        <strong>元素路径</strong>
                        <span>{activeAnnotation.elementPath}</span>
                      </div>
                      {activeAnnotation.nearbyText ? (
                        <div className="dl-detail-kv" style={{ gridColumn: "1 / -1" }}>
                          <strong>附近文本</strong>
                          <span>{activeAnnotation.nearbyText}</span>
                        </div>
                      ) : null}
                      {activeAnnotation.relatedElements?.length ? (
                        <div className="dl-detail-kv" style={{ gridColumn: "1 / -1" }}>
                          <strong>命中元素</strong>
                          <div className="dl-detail-chip-list">
                            {activeAnnotation.relatedElements.map((item) => (
                              <span key={item} className="dl-detail-chip">
                                {item}
                              </span>
                            ))}
                          </div>
                        </div>
                      ) : null}
                      <div className="dl-detail-kv">
                        <strong>创建时间</strong>
                        <span>{formatTime(activeAnnotation.createdAt)}</span>
                      </div>
                      <div className="dl-detail-kv">
                        <strong>最后更新</strong>
                        <span>{formatTime(activeAnnotation.updatedAt)}</span>
                      </div>
                      {getAnnotationKind(activeAnnotation) === "area" ? (
                        <div className="dl-detail-kv">
                          <strong>区域尺寸</strong>
                          <span>
                            {Math.round(activeAnnotation.rect.width)} × {Math.round(activeAnnotation.rect.height)}
                          </span>
                        </div>
                      ) : null}
                      {getAnnotationKind(activeAnnotation) === "area" ? (
                        <div className="dl-detail-kv">
                          <strong>命中数量</strong>
                          <span>{activeAnnotation.matchCount || activeAnnotation.relatedElements?.length || 0} 个元素</span>
                        </div>
                      ) : null}
                    </div>
                  </div>

                  <div className="dl-detail-card">
                    <h4 className="dl-detail-title">动作</h4>
                    <div className="dl-detail-actions">
                      <button
                        className="dl-popup-action"
                        data-kind="primary"
                        onClick={() => openAnnotationEditor(activeAnnotation)}
                      >
                        编辑标注
                      </button>
                      {activeAnnotation.status === "pending" ? (
                        <button
                          className="dl-popup-action"
                          data-kind="ghost"
                          onClick={() => setAnnotationStatus(activeAnnotation.id, "acknowledged")}
                        >
                          标记处理中
                        </button>
                      ) : null}
                      {activeAnnotation.status === "acknowledged" ? (
                        <button
                          className="dl-popup-action"
                          data-kind="ghost"
                          onClick={() => setAnnotationStatus(activeAnnotation.id, "pending")}
                        >
                          重新设为待处理
                        </button>
                      ) : null}
                      {isClosedDevLensAnnotationStatus(activeAnnotation.status) ? (
                        <button
                          className="dl-popup-action"
                          data-kind="ghost"
                          onClick={() => setAnnotationStatus(activeAnnotation.id, "pending")}
                        >
                          重新打开
                        </button>
                      ) : (
                        <>
                          <button
                            className="dl-popup-action"
                            data-kind="primary"
                            onClick={() => setAnnotationStatus(activeAnnotation.id, "resolved")}
                          >
                            标记已解决
                          </button>
                          <button
                            className="dl-popup-action"
                            data-kind="danger"
                            onClick={() => setAnnotationStatus(activeAnnotation.id, "dismissed")}
                          >
                            忽略此项
                          </button>
                        </>
                      )}
                      <button
                        className="dl-popup-action"
                        data-kind="danger"
                        onClick={() => {
                          setAnnotations((current) =>
                            current.filter((item) => item.id !== activeAnnotation.id),
                          );
                          setActiveAnnotationId(null);
                        }}
                      >
                        删除标注
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="dl-detail-empty">
                  先从左侧列表里选择一条标注。后续这里会继续接 Claude / Cursor 的回复、状态流转和源码命中信息。
                </div>
              )}
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {isOpen ? (
        <div
          ref={(node) => {
            toolbarRef.current = node;
          }}
          className="dl-toolbar"
          style={{ left: floatingPosition.left, top: floatingPosition.top }}
        >
          <span
            className="dl-drag-handle"
            onPointerDown={startDragging}
            title="拖拽工具条"
          >
            <DevLensGlyph />
          </span>
          <span className="dl-toolbar-status" title="当前为本地标注模式">
            <span className="dl-toolbar-status-dot" />
            本地
          </span>
          <button
            className="dl-toolbar-button"
            data-active={mode === "annotate"}
            onClick={() => setMode("annotate")}
          >
            <AnnotateIcon />
            <span className="dl-toolbar-label">标注</span>
            {summary.open > 0 ? <span className="dl-toolbar-count">{summary.open}</span> : null}
          </button>
          <button
            className="dl-toolbar-button"
            data-active={mode === "stability"}
            onClick={() => togglePanelMode("stability")}
          >
            <StabilityIcon />
            <span className="dl-toolbar-label">稳定性</span>
          </button>
          <button
            className="dl-toolbar-button"
            data-active={mode === "session"}
            onClick={() => togglePanelMode("session")}
          >
            <SessionIcon />
            <span className="dl-toolbar-label">会话</span>
          </button>
          <div className="dl-toolbar-divider" />
          <button
            className="dl-toolbar-icon-button"
            data-kind="secondary"
            onClick={() => setIsOpen(false)}
            title="收起"
          >
            <CollapseIcon />
          </button>
        </div>
      ) : (
        <button
          ref={(node) => {
            toolbarRef.current = node;
          }}
          className="dl-launcher"
          style={{ left: floatingPosition.left, top: floatingPosition.top }}
          onClick={() => {
            if (suppressLauncherClickRef.current) {
              suppressLauncherClickRef.current = false;
              return;
            }
            setIsOpen(true);
          }}
          onPointerDown={startDragging}
          title="打开 DevLens"
        >
          <DevLensGlyph />
          {summary.open > 0 ? <span className="dl-launcher-badge">{summary.open}</span> : null}
        </button>
      )}

      {isOpen && mode === "stability" ? (
        <section
          className="dl-session-panel"
          style={{ left: panelLeft, bottom: panelBottom }}
        >
          <div className="dl-session-header">
            <div>
              <h3 className="dl-session-title">稳定性模式</h3>
              <p className="dl-session-subtitle">
                这一层会在 v0.4 接入自动 incident observation；当前 v0.2 先完成 annotation 主交互。
              </p>
            </div>
            <button
              className="dl-toolbar-icon-button"
              data-kind="secondary"
              onClick={() => setMode("annotate")}
              title="关闭稳定性面板"
            >
              <CollapseIcon />
            </button>
          </div>
          <div className="dl-state-panel">
            <div className="dl-state-empty">
              稳定性模式会在后续阶段接入自动 incident observation。这里不会和页面标注混在一起，而是独立维护异常采集、诊断和跟进状态。
            </div>
            <div className="dl-state-list">
              <div className="dl-state-item">
                <span className="dl-state-dot" />
                <div>
                  <h4 className="dl-state-title">JavaScript 异常</h4>
                  <p className="dl-state-desc">自动采集运行时错误、Promise rejection，并附带 route、last action 与堆栈摘要。</p>
                </div>
              </div>
              <div className="dl-state-item">
                <span className="dl-state-dot" />
                <div>
                  <h4 className="dl-state-title">接口与业务错误</h4>
                  <p className="dl-state-desc">采集 API 异常、业务上报错误码和失败请求上下文，形成独立 incident 列表。</p>
                </div>
              </div>
              <div className="dl-state-item">
                <span className="dl-state-dot" />
                <div>
                  <h4 className="dl-state-title">源码与工作区关联</h4>
                  <p className="dl-state-desc">结合 workspace 绑定和堆栈信息命中本地源码位置，为 Claude / Cursor 提供后续排查入口。</p>
                </div>
              </div>
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}

export function createDevLensStyleElement(): HTMLStyleElement {
  const style = document.createElement("style");
  style.textContent = styles;
  return style;
}

export function DevLensShell(props: DevLensMountOptions) {
  return <DevLensApp {...props} />;
}
