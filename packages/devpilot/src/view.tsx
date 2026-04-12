import React, { useEffect, useMemo, useRef, useState } from "react";

import {
  collectAreaMatches,
  describeAreaDraftPreview,
  describeCommittedAreaSelection,
  describeElement,
  HOST_ATTR,
  isPointInsideRect,
  isWithinDevPilotEvent,
  isWithinDevPilotTarget,
  normalizeRect,
  ROOT_ATTR,
  toRect,
} from "./annotation/area-selection";
import {
  mergeRemoteAnnotations,
  sortAnnotationsByUpdatedAt,
} from "./annotation/state";
import { startAutoObservation } from "./observation/collectors";
import {
  createDevPilotExportPayload,
  formatDevPilotExportMarkdown,
  getAnnotationKind,
} from "./output";
import {
  mergeRemoteRepairRequests,
  sortRepairRequestsByUpdatedAt,
} from "./repair/state";
import { useRemoteSessionSync } from "./hooks/remote-session-sync";
import { useScrollTick } from "./shared/hooks";
import {
  clampFloatingPosition,
  copyTextToClipboard,
  createId,
  createScopedId,
  ensurePopupPositionFromPoint,
  formatTime,
  getDefaultFloatingPosition,
  trimObservationText,
} from "./shared/runtime";
import {
  AnnotateIcon,
  CollapseIcon,
  DevPilotGlyph,
  SettingsIcon,
  SessionIcon,
  StabilityIcon,
} from "./ui/icons";
import { SettingsPanel } from "./ui/settings-panel";
import { SessionPanel } from "./ui/session-panel";
import { StabilityPanel } from "./ui/stability-panel";
import {
  createDevPilotStabilityExportPayload,
  formatDevPilotStabilityExportMarkdown,
  createDevPilotStabilityRepairPayload,
  formatDevPilotStabilityRepairMarkdown,
} from "./stability-output";
import {
  DevPilotStabilityDraft,
  getDefaultStabilityDraft,
  mergeRemoteStabilityItems,
  sortStabilityItemsByUpdatedAt,
} from "./stability/state";
import {
  loadAnnotations,
  loadFloatingPosition,
  loadObservationEnabled,
  loadStabilityItems,
  saveAnnotations,
  saveFloatingPosition,
  saveObservationEnabled,
  saveStabilityItems,
} from "./storage";
import {
  createRemoteRepairRequest,
  deleteRemoteStabilityItem,
  deleteRemoteAnnotation,
  syncRemoteStabilityItem,
  syncRemoteAnnotation,
  updateRemoteStabilityItem,
  updateRemoteAnnotation,
} from "./sync";
import type {
  DevPilotAnnotation,
  DevPilotAnnotationStatus,
  DevPilotRepairRequestRecord,
  DevPilotRepairRequestStatus,
  DevPilotStabilityItem,
  DevPilotStabilitySeverity,
  DevPilotStabilityStatus,
  DevPilotMode,
  DevPilotMountOptions,
  DevPilotRepairRequest,
  DevPilotRect,
  DevPilotSelection,
} from "./types";
import {
  isDevPilotStabilitySeverity,
  isOpenDevPilotAnnotationStatus,
  resolveDevPilotFeatures,
} from "./types";

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
    width: 16px;
    height: 16px;
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
    position: relative;
    overflow: hidden;
    transition:
      background 120ms ease,
      color 120ms ease,
      transform 120ms ease,
      box-shadow 120ms ease;
  }

  .dl-toolbar-icon-button:hover {
    background: rgba(255, 255, 255, 0.08);
    color: rgba(255, 255, 255, 0.92);
  }

  .dl-toolbar-icon-button[data-active="true"] {
    background: #2f6fed;
    color: #ffffff;
    box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.06);
  }

  .dl-toolbar-icon-button[data-active="true"]::after {
    content: "";
    position: absolute;
    inset: 1px;
    border-radius: 17px;
    background: linear-gradient(180deg, rgba(255, 255, 255, 0.16), rgba(255, 255, 255, 0));
    pointer-events: none;
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
    display: flex;
    flex-direction: column;
    width: min(392px, calc(100vw - 32px));
    max-height: min(72vh, 680px);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 16px;
    background: rgba(22, 22, 22, 0.98);
    box-shadow:
      0 24px 60px rgba(15, 23, 42, 0.34),
      0 0 0 1px rgba(255, 255, 255, 0.03);
    overflow-x: hidden;
    overflow-y: auto;
    overscroll-behavior: contain;
    scrollbar-gutter: stable;
    backdrop-filter: blur(18px);
    pointer-events: auto;
    animation: dl-panel-enter 180ms cubic-bezier(0.22, 1, 0.36, 1);
  }

  .dl-session-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
    padding: 16px 18px 14px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  }

  .dl-session-header-main {
    flex: 1 1 180px;
    min-width: 0;
  }

  .dl-session-header-actions {
    display: flex;
    align-items: flex-start;
    justify-content: flex-end;
    gap: 8px;
    flex: 0 0 auto;
    flex-wrap: wrap;
    max-width: min(100%, 260px);
  }

  .dl-session-title {
    margin: 0;
    font-size: 15px;
    font-weight: 800;
    line-height: 1.35;
    color: #ffffff;
    word-break: break-word;
  }

  .dl-session-subtitle {
    margin: 4px 0 0;
    font-size: 12px;
    line-height: 1.5;
    color: rgba(255, 255, 255, 0.56);
    word-break: break-word;
  }

  .dl-stability-panel {
    max-height: min(78vh, 760px);
  }

  .dl-stability-panel .dl-session-header {
    border-bottom: 0;
    padding-bottom: 12px;
  }

  .dl-stability-panel-header {
    align-items: center;
  }

  .dl-stability-panel-close {
    flex: 0 0 auto;
  }

  .dl-stability-header-actions {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
    padding: 0 18px 14px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  }

  .dl-stability-header-actions .dl-popup-action {
    width: 100%;
    min-width: 0;
    min-height: 34px;
    height: auto;
    padding: 8px 10px;
    line-height: 1.35;
    white-space: normal;
    text-align: center;
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

  .dl-stability-summary-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .dl-stability-summary-grid .dl-summary-card {
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    min-height: 76px;
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
  }

  .dl-stability-panel .dl-session-list {
    padding-top: 12px;
  }

  .dl-session-body {
    display: flex;
    flex-direction: column;
    flex: 0 0 auto;
    min-height: auto;
    overflow: visible;
  }

  .dl-stability-panel-body {
    padding-bottom: 10px;
  }

  .dl-session-section {
    display: flex;
    flex-direction: column;
    min-height: 0;
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
  }

  .dl-stability-panel .dl-session-detail {
    padding-top: 12px;
    padding-bottom: 22px;
  }

  .dl-settings-panel {
    width: min(360px, calc(100vw - 32px));
    max-height: min(62vh, 520px);
  }

  .dl-settings-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }

  .dl-settings-row + .dl-settings-row {
    margin-top: 12px;
    padding-top: 12px;
    border-top: 1px solid rgba(255, 255, 255, 0.08);
  }

  .dl-settings-main {
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-width: 0;
  }

  .dl-settings-name {
    font-size: 12px;
    font-weight: 700;
    color: rgba(255, 255, 255, 0.92);
  }

  .dl-settings-value {
    font-size: 12px;
    line-height: 1.5;
    color: rgba(255, 255, 255, 0.58);
    word-break: break-word;
  }

  .dl-settings-indicator {
    width: 10px;
    height: 10px;
    border-radius: 999px;
    background: #6b7280;
    box-shadow: 0 0 0 4px rgba(107, 114, 128, 0.14);
    flex: 0 0 auto;
  }

  .dl-settings-indicator[data-status="connected"] {
    background: #22c55e;
    box-shadow: 0 0 0 4px rgba(34, 197, 94, 0.16);
  }

  .dl-settings-indicator[data-status="disabled"] {
    background: #ef4444;
    box-shadow: 0 0 0 4px rgba(239, 68, 68, 0.16);
  }

  .dl-settings-indicator[data-status="connecting"],
  .dl-settings-indicator[data-status="reconnecting"] {
    background: #f59e0b;
    box-shadow: 0 0 0 4px rgba(245, 158, 11, 0.16);
  }

  .dl-session-panel,
  .dl-state-panel {
    scrollbar-width: thin;
    scrollbar-color: rgba(255, 255, 255, 0.2) transparent;
  }

  .dl-session-panel::-webkit-scrollbar,
  .dl-state-panel::-webkit-scrollbar {
    width: 10px;
  }

  .dl-session-panel::-webkit-scrollbar-track,
  .dl-state-panel::-webkit-scrollbar-track {
    background: transparent;
  }

  .dl-session-panel::-webkit-scrollbar-thumb,
  .dl-state-panel::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.18);
    border: 2px solid transparent;
    border-radius: 999px;
    background-clip: padding-box;
  }

  .dl-session-panel::-webkit-scrollbar-thumb:hover,
  .dl-state-panel::-webkit-scrollbar-thumb:hover {
    background: rgba(255, 255, 255, 0.28);
    background-clip: padding-box;
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

  .dl-status-pill[data-status="diagnosing"] {
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

  .dl-stability-panel .dl-detail-actions {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .dl-stability-panel .dl-detail-actions .dl-popup-action {
    width: 100%;
    min-width: 0;
    min-height: 34px;
    height: auto;
    padding: 8px 10px;
    line-height: 1.35;
    white-space: normal;
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

  .dl-severity-pill {
    display: inline-flex;
    align-items: center;
    height: 24px;
    padding: 0 10px;
    border-radius: 8px;
    background: rgba(245, 158, 11, 0.18);
    color: #fbbf24;
    font-size: 12px;
    font-weight: 700;
    text-transform: uppercase;
  }

  .dl-severity-pill[data-severity="low"] {
    background: rgba(59, 130, 246, 0.18);
    color: #93c5fd;
  }

  .dl-severity-pill[data-severity="medium"] {
    background: rgba(245, 158, 11, 0.18);
    color: #fbbf24;
  }

  .dl-severity-pill[data-severity="high"] {
    background: rgba(249, 115, 22, 0.18);
    color: #fdba74;
  }

  .dl-severity-pill[data-severity="critical"] {
    background: rgba(239, 68, 68, 0.18);
    color: #fca5a5;
  }

  .dl-stability-form {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .dl-stability-grid {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 132px;
    gap: 10px;
  }

  .dl-stability-field {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .dl-stability-label {
    font-size: 12px;
    font-weight: 700;
    color: rgba(255, 255, 255, 0.72);
  }

  .dl-stability-input,
  .dl-stability-select,
  .dl-stability-textarea {
    width: 100%;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 10px;
    background: rgba(255, 255, 255, 0.04);
    color: #ffffff;
    font: inherit;
    outline: none;
    transition:
      border-color 120ms ease,
      box-shadow 120ms ease,
      background 120ms ease;
  }

  .dl-stability-input,
  .dl-stability-select {
    height: 40px;
    padding: 0 12px;
  }

  .dl-stability-textarea {
    min-height: 82px;
    padding: 10px 12px;
    resize: vertical;
    line-height: 1.6;
  }

  .dl-stability-input::placeholder,
  .dl-stability-textarea::placeholder {
    color: rgba(255, 255, 255, 0.34);
  }

  .dl-stability-input:focus,
  .dl-stability-select:focus,
  .dl-stability-textarea:focus {
    border-color: rgba(59, 130, 246, 0.72);
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.18);
    background: rgba(255, 255, 255, 0.06);
  }

  .dl-stability-form-actions {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    flex-wrap: wrap;
  }

  .dl-stability-form-actions-left,
  .dl-stability-form-actions-right {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }

  .dl-stability-panel .dl-stability-form-actions-right {
    margin-left: auto;
  }

  .dl-stability-subgrid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
  }

  .dl-stability-context-note {
    margin: 0;
    font-size: 12px;
    line-height: 1.6;
    color: rgba(255, 255, 255, 0.54);
  }

  .dl-stability-title {
    margin: 8px 0 4px;
    font-size: 13px;
    font-weight: 700;
    line-height: 1.5;
    color: rgba(255, 255, 255, 0.92);
    word-break: break-word;
  }

  .dl-stability-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-bottom: 6px;
  }

  .dl-stability-summary {
    margin: 0;
    font-size: 12px;
    line-height: 1.65;
    color: rgba(255, 255, 255, 0.58);
    white-space: pre-wrap;
    word-break: break-word;
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

    .dl-stability-grid,
    .dl-stability-subgrid {
      grid-template-columns: 1fr;
    }

    .dl-stability-summary-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  @media (max-width: 720px) {
    .dl-session-header {
      flex-direction: column;
      align-items: stretch;
    }

    .dl-session-header-actions {
      max-width: none;
      justify-content: flex-start;
    }

    .dl-stability-header-actions {
      grid-template-columns: 1fr;
    }

    .dl-stability-panel-header {
      flex-direction: row;
      align-items: center;
    }

    .dl-stability-panel .dl-detail-actions {
      grid-template-columns: 1fr;
    }
  }
`;

const AUTO_OBSERVATION_DEDUPE_MS = 30_000;

function stopEditableEventPropagation(event: React.SyntheticEvent<HTMLElement>): void {
  // Keep host-page global shortcuts from stealing keystrokes out of DevPilot inputs.
  event.stopPropagation();
}

function DevPilotApp({
  defaultOpen = false,
  endpoint,
  features,
  onRepairRequest,
}: DevPilotMountOptions) {
  const pathname = window.location.pathname || "/";
  const resolvedFeatures = useMemo(
    () => resolveDevPilotFeatures(features, endpoint),
    [endpoint, features?.mcp, features?.stability],
  );
  const stabilityEnabled = resolvedFeatures.stability;
  const syncEndpoint = resolvedFeatures.mcp ? endpoint : undefined;
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [mode, setMode] = useState<DevPilotMode>("annotate");
  const [annotations, setAnnotations] = useState<DevPilotAnnotation[]>(() => loadAnnotations(pathname));
  const [stabilityItems, setStabilityItems] = useState<DevPilotStabilityItem[]>(
    () => (stabilityEnabled ? loadStabilityItems(pathname) : []),
  );
  const [floatingPosition, setFloatingPosition] = useState(() => loadFloatingPosition() || getDefaultFloatingPosition());
  const [selection, setSelection] = useState<DevPilotSelection | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [stabilityEditingId, setStabilityEditingId] = useState<string | null>(null);
  const [stabilityActiveId, setStabilityActiveId] = useState<string | null>(null);
  const [stabilityDraft, setStabilityDraft] = useState<DevPilotStabilityDraft>(
    getDefaultStabilityDraft,
  );
  const [isStabilityComposerOpen, setIsStabilityComposerOpen] = useState(false);
  const [hoverRect, setHoverRect] = useState<DevPilotRect | null>(null);
  const [areaDraftRect, setAreaDraftRect] = useState<DevPilotRect | null>(null);
  const [activeAnnotationId, setActiveAnnotationId] = useState<string | null>(null);
  const [isTextSelectionPending, setIsTextSelectionPending] = useState(false);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");
  const [stabilityCopyState, setStabilityCopyState] = useState<"idle" | "copied" | "failed">("idle");
  const [repairRequests, setRepairRequests] = useState<DevPilotRepairRequestRecord[]>([]);
  const [repairTargetId, setRepairTargetId] = useState<string | null>(null);
  const [repairState, setRepairState] = useState<"idle" | "requested" | "failed">("idle");
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [autoObservationEnabled, setAutoObservationEnabled] = useState(() =>
    stabilityEnabled ? loadObservationEnabled(pathname) : false,
  );
  const scrollTick = useScrollTick();
  const openAnnotations = useMemo(
    () => annotations.filter((item) => isOpenDevPilotAnnotationStatus(item.status)),
    [annotations],
  );
  const activeAnnotation = useMemo(
    () => annotations.find((item) => item.id === activeAnnotationId) || null,
    [annotations, activeAnnotationId],
  );
  const openStabilityItems = useMemo(
    () => stabilityItems.filter((item) => item.status !== "resolved"),
    [stabilityItems],
  );
  const resolvedStabilityItems = useMemo(
    () => stabilityItems.filter((item) => item.status === "resolved"),
    [stabilityItems],
  );
  const activeStabilityItem = useMemo(
    () => stabilityItems.find((item) => item.id === stabilityActiveId) || null,
    [stabilityItems, stabilityActiveId],
  );
  const activeRepairRequests = useMemo(() => {
    if (!activeStabilityItem) {
      return [];
    }

    return sortRepairRequestsByUpdatedAt(
      repairRequests.filter((request) => request.stabilityItemId === activeStabilityItem.id),
    );
  }, [activeStabilityItem, repairRequests]);
  const latestActiveRepairRequest = activeRepairRequests[0] || null;
  const observationFingerprintRef = useRef<Map<string, number>>(new Map());
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
  const pendingDeletedAnnotationIdsRef = useRef<Set<string>>(new Set());
  const areaSelectionRef = useRef<{
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
    dragging: boolean;
  } | null>(null);
  const {
    annotationsRef,
    currentSessionId,
    currentSessionIdRef,
    sseStatus,
  } = useRemoteSessionSync({
    pathname,
    syncEndpoint,
    stabilityEnabled,
    annotations,
    stabilityItems,
    pendingDeletedAnnotationIdsRef,
    setAnnotations,
    setStabilityItems,
    setRepairRequests,
  });

  useEffect(() => {
    saveAnnotations(pathname, annotations);
  }, [annotations, pathname]);

  useEffect(() => {
    if (!stabilityEnabled) {
      return;
    }
    saveStabilityItems(pathname, stabilityItems);
  }, [pathname, stabilityEnabled, stabilityItems]);

  useEffect(() => {
    if (!stabilityEnabled) {
      return;
    }

    saveObservationEnabled(pathname, autoObservationEnabled);
  }, [autoObservationEnabled, pathname, stabilityEnabled]);

  useEffect(() => {
    if (!stabilityEnabled) {
      setAutoObservationEnabled(false);
      setRepairRequests([]);
      return;
    }

    setStabilityItems(loadStabilityItems(pathname));
    setAutoObservationEnabled(loadObservationEnabled(pathname));
    setRepairRequests([]);
  }, [pathname, stabilityEnabled]);

  useEffect(() => {
    if (!stabilityEnabled && mode === "stability") {
      setMode("annotate");
    }
  }, [mode, stabilityEnabled]);

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
    if (mode !== "stability") {
      return;
    }

    const preferredItems =
      openStabilityItems.length > 0 ? openStabilityItems : stabilityItems;

    if (preferredItems.length === 0) {
      if (stabilityActiveId) {
        setStabilityActiveId(null);
      }
      return;
    }

    if (
      !stabilityActiveId ||
      !stabilityItems.some((item) => item.id === stabilityActiveId)
    ) {
      setStabilityActiveId(preferredItems[0].id);
    }
  }, [mode, openStabilityItems, stabilityActiveId, stabilityItems]);

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

      if (!event.shiftKey || event.button !== 0 || isWithinDevPilotEvent(event)) {
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

      if (isWithinDevPilotEvent(event)) {
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

      const selectionRect = toRect(rect);
      const pointerReleasedInsideSelection = isPointInsideRect(
        { x: event.clientX, y: event.clientY },
        selectionRect,
      );

      if (!pointerReleasedInsideSelection) {
        document.body.style.userSelect = "";
        return;
      }

      const detail = describeElement(element);
      setSelection({
        kind: "text",
        elementName: detail.elementName,
        elementPath: detail.elementPath,
        rect: selectionRect,
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
      if (isWithinDevPilotEvent(event)) {
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
    if (stabilityCopyState === "idle") {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setStabilityCopyState("idle");
    }, 1800);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [stabilityCopyState]);

  useEffect(() => {
    if (repairState === "idle") {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setRepairState("idle");
      setRepairTargetId(null);
    }, 1800);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [repairState]);

  useEffect(() => {
    if (!stabilityEnabled || !autoObservationEnabled) {
      return undefined;
    }
    return startAutoObservation({
      isWithinDevPilotTarget,
      recordObservedStabilityItem,
    });
  }, [autoObservationEnabled, pathname, stabilityEnabled, syncEndpoint]);

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
      acknowledged: annotations.filter((item) => item.status === "acknowledged").length,
      total: annotations.length,
    };
  }, [annotations, openAnnotations]);

  const stabilitySummary = useMemo(() => {
    return {
      open: stabilityItems.filter((item) => item.status === "open").length,
      diagnosing: stabilityItems.filter((item) => item.status === "diagnosing").length,
      resolved: stabilityItems.filter((item) => item.status === "resolved").length,
      critical: stabilityItems.filter((item) => item.severity === "critical").length,
      total: stabilityItems.length,
    };
  }, [stabilityItems]);

  const areaDraftPreview = useMemo(
    () => (areaDraftRect ? describeAreaDraftPreview(areaDraftRect) : null),
    [areaDraftRect],
  );

  const resolveLiveAnnotationRect = (annotation: DevPilotAnnotation): DevPilotRect => {
    if (annotation.kind !== "area") {
      try {
        const liveElement = document.querySelector(annotation.elementPath);
        if (
          liveElement instanceof HTMLElement &&
          !liveElement.closest(`[${ROOT_ATTR}]`) &&
          !liveElement.closest(`[${HOST_ATTR}]`)
        ) {
          const liveRect = toRect(liveElement.getBoundingClientRect());
          if (liveRect.width > 0 && liveRect.height > 0) {
            return liveRect;
          }
        }
      } catch {
        // Ignore selector resolution issues and fall back to stored coordinates.
      }
    }

    return {
      left: annotation.pageX - window.scrollX,
      top: annotation.pageY - window.scrollY,
      width: annotation.rect.width,
      height: annotation.rect.height,
    };
  };

  const annotationViewportRects = useMemo(
    () =>
      new Map(
        annotations.map((annotation) => [annotation.id, resolveLiveAnnotationRect(annotation)]),
      ),
    [annotations, scrollTick],
  );

  const getMarkerAnchor = (
    rect: DevPilotRect,
    pageX: number,
    pageY: number,
  ): { left: number; top: number } => {
    const anchoredLeft = rect.left + Math.min(Math.max(rect.width * 0.18, 12), 28);
    const anchoredTop = rect.top - 14;

    return {
      left: Math.max(12, Number.isFinite(rect.left) ? anchoredLeft : pageX - window.scrollX),
      top: Math.max(12, Number.isFinite(rect.top) ? anchoredTop : pageY - window.scrollY - 14),
    };
  };

  const markerStyle = (annotation: DevPilotAnnotation) =>
    getMarkerAnchor(
      annotationViewportRects.get(annotation.id) || annotation.rect,
      annotation.pageX,
      annotation.pageY,
    );

  const editAnnotation = (annotation: DevPilotAnnotation) => {
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

  const openAnnotationEditor = (annotation: DevPilotAnnotation) => {
    setIsOpen(true);
    setMode("annotate");
    editAnnotation(annotation);
  };

  const setAnnotationStatus = (
    annotationId: string,
    nextStatus: DevPilotAnnotationStatus,
  ) => {
    if (!isOpenDevPilotAnnotationStatus(nextStatus)) {
      pendingDeletedAnnotationIdsRef.current.add(annotationId);
      annotationsRef.current = annotationsRef.current.filter(
        (item) => item.id !== annotationId,
      );
      setAnnotations((current) =>
        current.filter((item) => item.id !== annotationId),
      );
      if (activeAnnotationId === annotationId) {
        setActiveAnnotationId(null);
      }
      if (editingId === annotationId) {
        setSelection(null);
        setEditingId(null);
        setDraft("");
      }

      if (syncEndpoint) {
        deleteRemoteAnnotation(syncEndpoint, annotationId).catch((error) => {
          pendingDeletedAnnotationIdsRef.current.delete(annotationId);
          console.warn("[DevPilot] Failed to delete resolved annotation:", error);
        });
      }
      return;
    }

    const nextUpdatedAt = Date.now();
    setAnnotations((current) =>
      current.map((item) =>
        item.id === annotationId
          ? {
              ...item,
              status: nextStatus,
              updatedAt: nextUpdatedAt,
            }
          : item,
      ),
    );
    setActiveAnnotationId(annotationId);

    if (syncEndpoint) {
      updateRemoteAnnotation(syncEndpoint, annotationId, {
        status: nextStatus,
        updatedAt: nextUpdatedAt,
      }).catch((error) => {
        console.warn("[DevPilot] Failed to update annotation status:", error);
      });
    }
  };

  const removeAnnotationRecord = (annotationId: string) => {
    pendingDeletedAnnotationIdsRef.current.add(annotationId);
    annotationsRef.current = annotationsRef.current.filter(
      (item) => item.id !== annotationId,
    );
    setAnnotations((current) =>
      current.filter((item) => item.id !== annotationId),
    );

    if (activeAnnotationId === annotationId) {
      setActiveAnnotationId(null);
    }

    if (editingId === annotationId) {
      setSelection(null);
      setEditingId(null);
      setDraft("");
    }

    if (syncEndpoint) {
      deleteRemoteAnnotation(syncEndpoint, annotationId).catch((error) => {
        pendingDeletedAnnotationIdsRef.current.delete(annotationId);
        console.warn("[DevPilot] Failed to delete annotation:", error);
      });
    }
  };

  const handleCopyAnnotations = async () => {
    const payload = createDevPilotExportPayload({
      annotations: openAnnotations,
      pathname,
      title: document.title || "Untitled Page",
      url: window.location.href,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight,
      },
    });
    const text = formatDevPilotExportMarkdown(payload);
    const didCopy = await copyTextToClipboard(text);
    setCopyState(didCopy ? "copied" : "failed");
  };

  const resetStabilityComposer = () => {
    setStabilityDraft(getDefaultStabilityDraft());
    setStabilityEditingId(null);
    setIsStabilityComposerOpen(false);
  };

  const openStabilityComposer = (item?: DevPilotStabilityItem) => {
    if (!item) {
      setStabilityDraft(getDefaultStabilityDraft());
      setStabilityEditingId(null);
      setIsStabilityComposerOpen(true);
      return;
    }

    setStabilityDraft({
      title: item.title,
      severity: item.severity,
      symptom: item.symptom,
      reproSteps: item.reproSteps || "",
      impact: item.impact || "",
      signals: item.signals || "",
      fixGoal: item.fixGoal || "",
    });
    setStabilityEditingId(item.id);
    setStabilityActiveId(item.id);
    setIsStabilityComposerOpen(true);
  };

  const buildStabilityContext = () => ({
    capturedAt: Date.now(),
    title: document.title || pathname,
    url: window.location.href,
    pathname,
    viewport: {
      width: window.innerWidth,
      height: window.innerHeight,
    },
    sessionId: currentSessionId || undefined,
    userAgent: typeof navigator === "undefined" ? undefined : navigator.userAgent,
    openAnnotationCount: openAnnotations.length,
    openAnnotationComments: openAnnotations.slice(0, 5).map((annotation) => {
      return `${annotation.elementName}: ${annotation.comment}`;
    }),
  });

  const buildObservationContext = () => {
    const currentOpenAnnotations = annotationsRef.current.filter((annotation) =>
      isOpenDevPilotAnnotationStatus(annotation.status),
    );

    return {
      capturedAt: Date.now(),
      title: document.title || pathname,
      url: window.location.href,
      pathname,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight,
      },
      sessionId: currentSessionIdRef.current || undefined,
      userAgent: typeof navigator === "undefined" ? undefined : navigator.userAgent,
      openAnnotationCount: currentOpenAnnotations.length,
      openAnnotationComments: currentOpenAnnotations.slice(0, 5).map((annotation) => {
        return `${annotation.elementName}: ${annotation.comment}`;
      }),
    };
  };

  const recordObservedStabilityItem = (input: {
    fingerprint: string;
    title: string;
    severity: DevPilotStabilitySeverity;
    symptom: string;
    signals?: string;
    impact?: string;
    reproSteps?: string;
    fixGoal?: string;
  }) => {
    if (!stabilityEnabled || !autoObservationEnabled) {
      return;
    }

    const now = Date.now();
    const fingerprints = observationFingerprintRef.current;
    for (const [key, timestamp] of fingerprints.entries()) {
      if (now - timestamp > AUTO_OBSERVATION_DEDUPE_MS) {
        fingerprints.delete(key);
      }
    }

    const existingTimestamp = fingerprints.get(input.fingerprint);
    if (existingTimestamp && now - existingTimestamp < AUTO_OBSERVATION_DEDUPE_MS) {
      return;
    }

    fingerprints.set(input.fingerprint, now);

    const nextItem: DevPilotStabilityItem = {
      id: createScopedId("sti_obs"),
      sessionId: currentSessionIdRef.current || undefined,
      pathname,
      createdAt: now,
      updatedAt: now,
      status: "open",
      severity: input.severity,
      title: input.title,
      symptom: trimObservationText(input.symptom, 360),
      reproSteps: input.reproSteps,
      impact: input.impact,
      signals: input.signals,
      fixGoal: input.fixGoal,
      context: buildObservationContext(),
    };

    setStabilityItems((current) => {
      return sortStabilityItemsByUpdatedAt([nextItem, ...current]);
    });

    const sessionId = currentSessionIdRef.current;
    if (syncEndpoint && sessionId) {
      syncRemoteStabilityItem(syncEndpoint, sessionId, nextItem).catch((error) => {
        console.warn("[DevPilot] Failed to sync observed stability item:", error);
      });
    }
  };

  const handleCopyStabilityItems = async (
    items: DevPilotStabilityItem[],
  ) => {
    const payload = createDevPilotStabilityExportPayload({
      items,
      pathname,
      title: document.title || "Untitled Page",
      url: window.location.href,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight,
      },
    });
    const text = formatDevPilotStabilityExportMarkdown(payload);
    const didCopy = await copyTextToClipboard(text);
    setStabilityCopyState(didCopy ? "copied" : "failed");
  };

  const handleRequestStabilityRepair = async (
    item: DevPilotStabilityItem,
  ) => {
    const payload = createDevPilotStabilityRepairPayload({
      item,
      pathname,
      title: document.title || "Untitled Page",
      url: window.location.href,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight,
      },
      relatedAnnotations: item.context.openAnnotationComments,
    });
    const prompt = formatDevPilotStabilityRepairMarkdown(payload);
    const requestId = createScopedId("req");
    const requestedAt = Date.now();
    const localRequest: DevPilotRepairRequestRecord = {
      id: requestId,
      sessionId: currentSessionId || undefined,
      stabilityItemId: item.id,
      pathname,
      createdAt: requestedAt,
      updatedAt: requestedAt,
      status: "requested",
      title: item.title,
      severity: item.severity,
      prompt,
      requestedBy: "human",
    };
    let succeeded = false;

    try {
      if (onRepairRequest) {
        const request: DevPilotRepairRequest = {
          item,
          prompt,
          endpoint: syncEndpoint,
          sessionId: currentSessionId || undefined,
        };
        await onRepairRequest(request);
        setRepairRequests((current) =>
          mergeRemoteRepairRequests(current, [localRequest]),
        );
        succeeded = true;
      } else if (syncEndpoint && currentSessionId) {
        const remoteRequest = await createRemoteRepairRequest(syncEndpoint, currentSessionId, {
          id: requestId,
          stabilityItemId: item.id,
          pathname,
          title: item.title,
          severity: item.severity,
          prompt,
          requestedBy: "human",
        });
        setRepairRequests((current) =>
          mergeRemoteRepairRequests(current, [remoteRequest]),
        );
        succeeded = true;
      } else {
        setRepairRequests((current) =>
          mergeRemoteRepairRequests(current, [localRequest]),
        );
        succeeded = await copyTextToClipboard(prompt);
      }
    } catch (error) {
      console.warn("[DevPilot] Failed to trigger repair request:", error);
      succeeded = false;
    }

    setRepairTargetId(item.id);
    setRepairState(succeeded ? "requested" : "failed");

    if (succeeded && item.status === "open") {
      setStabilityItemStatus(item.id, "diagnosing");
    }
  };

  const setStabilityItemStatus = (
    itemId: string,
    nextStatus: DevPilotStabilityStatus,
  ) => {
    const nextUpdatedAt = Date.now();
    setStabilityItems((current) =>
      sortStabilityItemsByUpdatedAt(
        current.map((item) =>
          item.id === itemId
            ? {
                ...item,
                status: nextStatus,
                updatedAt: nextUpdatedAt,
              }
            : item,
        ),
      ),
    );
    setStabilityActiveId(itemId);

    if (syncEndpoint) {
      updateRemoteStabilityItem(syncEndpoint, itemId, {
        status: nextStatus,
        updatedAt: nextUpdatedAt,
      }).catch((error) => {
        console.warn("[DevPilot] Failed to update stability status:", error);
      });
    }
  };

  const handleSaveStabilityItem = () => {
    if (!stabilityDraft.title.trim() || !stabilityDraft.symptom.trim()) {
      return;
    }

    const now = Date.now();
    const existing = stabilityEditingId
      ? stabilityItems.find((item) => item.id === stabilityEditingId)
      : null;
    const nextItem: DevPilotStabilityItem = {
      id: stabilityEditingId || `sti_${createId()}`,
      sessionId: existing?.sessionId || currentSessionId || undefined,
      pathname,
      createdAt: existing?.createdAt || now,
      updatedAt: now,
      status: existing?.status || "open",
      severity: isDevPilotStabilitySeverity(stabilityDraft.severity)
        ? stabilityDraft.severity
        : "high",
      title: stabilityDraft.title.trim(),
      symptom: stabilityDraft.symptom.trim(),
      reproSteps: stabilityDraft.reproSteps.trim() || undefined,
      impact: stabilityDraft.impact.trim() || undefined,
      signals: stabilityDraft.signals.trim() || undefined,
      fixGoal: stabilityDraft.fixGoal.trim() || undefined,
      context: buildStabilityContext(),
    };

    setStabilityItems((current) => {
      const next = stabilityEditingId
        ? current.map((item) => (item.id === stabilityEditingId ? nextItem : item))
        : [nextItem, ...current];
      return sortStabilityItemsByUpdatedAt(next);
    });
    setStabilityActiveId(nextItem.id);

    if (syncEndpoint && currentSessionId) {
      const syncPromise = stabilityEditingId
        ? updateRemoteStabilityItem(syncEndpoint, nextItem.id, nextItem)
        : syncRemoteStabilityItem(syncEndpoint, currentSessionId, nextItem);
      syncPromise.catch((error) => {
        console.warn("[DevPilot] Failed to sync stability item:", error);
      });
    }

    resetStabilityComposer();
  };

  const handleDeleteStabilityItem = () => {
    if (!stabilityEditingId) {
      resetStabilityComposer();
      return;
    }

    setStabilityItems((current) =>
      current.filter((item) => item.id !== stabilityEditingId),
    );

    if (stabilityActiveId === stabilityEditingId) {
      setStabilityActiveId(null);
    }

    if (syncEndpoint) {
      deleteRemoteStabilityItem(syncEndpoint, stabilityEditingId).catch((error) => {
        console.warn("[DevPilot] Failed to delete stability item:", error);
      });
    }

    resetStabilityComposer();
  };

  const handleSave = () => {
    if (!selection || !draft.trim()) {
      return;
    }

    const now = Date.now();
    if (editingId) {
      const existing = annotations.find((item) => item.id === editingId);
      const updatedAnnotation: DevPilotAnnotation = {
        id: editingId,
        pathname,
        createdAt: existing?.createdAt || now,
        updatedAt: now,
        kind: selection.kind,
        status: existing?.status || "pending",
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

      setAnnotations((current) =>
        current.map((item) =>
          item.id === editingId
            ? updatedAnnotation
            : item,
        ),
      );
      setActiveAnnotationId(editingId);

      if (syncEndpoint) {
        updateRemoteAnnotation(syncEndpoint, editingId, updatedAnnotation).catch((error) => {
          console.warn("[DevPilot] Failed to update annotation:", error);
        });
      }
    } else {
      const annotation: DevPilotAnnotation = {
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
      setAnnotations((current) => sortAnnotationsByUpdatedAt([annotation, ...current]));
      setActiveAnnotationId(annotation.id);

      if (syncEndpoint && currentSessionId) {
        syncRemoteAnnotation(syncEndpoint, currentSessionId, annotation).catch((error) => {
          console.warn("[DevPilot] Failed to create remote annotation:", error);
        });
      }
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

    removeAnnotationRecord(editingId);
    setSelection(null);
    setEditingId(null);
    setDraft("");
  };

  const handleDeleteAnnotationRecord = (annotation: DevPilotAnnotation) => {
    removeAnnotationRecord(annotation.id);
  };

  const handleDeleteStabilityItemRecord = (item: DevPilotStabilityItem) => {
    setStabilityItems((current) => current.filter((entry) => entry.id !== item.id));
    if (stabilityActiveId === item.id) {
      setStabilityActiveId(null);
    }
    if (stabilityEditingId === item.id) {
      resetStabilityComposer();
    }
    if (syncEndpoint) {
      deleteRemoteStabilityItem(syncEndpoint, item.id).catch((error) => {
        console.warn("[DevPilot] Failed to delete stability item:", error);
      });
    }
  };

  const handleStabilityDraftChange = (
    field: keyof DevPilotStabilityDraft,
    value: string | DevPilotStabilitySeverity,
  ) => {
    setStabilityDraft((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const pendingMarkerStyle = selection
    ? getMarkerAnchor(selection.rect, selection.pageX, selection.pageY)
    : null;
  const popupPosition = selection ? ensurePopupPositionFromPoint(selection.pageX, selection.pageY, 320, 280) : null;
  const activeFocusAnnotation = !selection && isOpen && mode === "session" ? activeAnnotation : null;
  const activeFocusRect =
    activeFocusAnnotation &&
    (annotationViewportRects.get(activeFocusAnnotation.id) || activeFocusAnnotation.rect);
  const togglePanelMode = (nextMode: DevPilotMode) => {
    setIsSettingsOpen(false);
    if (nextMode === "stability" && !stabilityEnabled) {
      setMode("annotate");
      return;
    }
    setMode((current) => (current === nextMode ? "annotate" : nextMode));
  };
  const toggleSettingsPanel = () => {
    setIsSettingsOpen((current) => !current);
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
    <div className="dl-root" data-devpilot-root="">
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
              left: activeFocusRect?.left,
              top: activeFocusRect?.top,
              width: activeFocusRect?.width,
              height: activeFocusRect?.height,
            }}
          />
          <div
            className="dl-active-focus-label"
            data-kind={getAnnotationKind(activeFocusAnnotation)}
            style={{
              left: Math.max(12, activeFocusRect?.left || activeFocusAnnotation.rect.left),
              top: Math.max(12, (activeFocusRect?.top || activeFocusAnnotation.rect.top) - 32),
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

      {isOpen && !isSettingsOpen && mode === "session" ? (
        <SessionPanel
          panelLeft={panelLeft}
          panelBottom={panelBottom}
          copyState={copyState}
          summary={summary}
          annotations={annotations}
          openAnnotations={openAnnotations}
          activeAnnotationId={activeAnnotationId}
          activeAnnotation={activeAnnotation}
          onCopy={() => {
            void handleCopyAnnotations();
          }}
          onClose={() => setMode("annotate")}
          onSelectAnnotation={setActiveAnnotationId}
          onOpenAnnotationEditor={openAnnotationEditor}
          onSetAnnotationStatus={setAnnotationStatus}
          onDeleteAnnotation={handleDeleteAnnotationRecord}
        />
      ) : null}

      {isOpen && isSettingsOpen ? (
        <SettingsPanel
          panelLeft={panelLeft}
          panelBottom={panelBottom}
          syncEndpoint={syncEndpoint}
          sessionId={currentSessionId}
          sseStatus={sseStatus}
          onClose={() => setIsSettingsOpen(false)}
        />
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
            <DevPilotGlyph />
          </span>
          <button
            className="dl-toolbar-button"
            data-active={!isSettingsOpen && mode === "annotate"}
            onClick={() => {
              setIsSettingsOpen(false);
              setMode("annotate");
            }}
          >
            <AnnotateIcon />
            <span className="dl-toolbar-label">标注</span>
            {summary.open > 0 ? <span className="dl-toolbar-count">{summary.open}</span> : null}
          </button>
          {stabilityEnabled ? (
          <button
            className="dl-toolbar-button"
            data-active={!isSettingsOpen && mode === "stability"}
            onClick={() => togglePanelMode("stability")}
          >
            <StabilityIcon />
            <span className="dl-toolbar-label">稳定性</span>
            {openStabilityItems.length > 0 ? <span className="dl-toolbar-count">{openStabilityItems.length}</span> : null}
            </button>
          ) : null}
          <button
            className="dl-toolbar-button"
            data-active={!isSettingsOpen && mode === "session"}
            onClick={() => togglePanelMode("session")}
          >
            <SessionIcon />
            <span className="dl-toolbar-label">会话</span>
          </button>
          <button
            className="dl-toolbar-icon-button"
            data-kind="secondary"
            data-active={isSettingsOpen}
            onClick={toggleSettingsPanel}
            title="设置"
          >
            <SettingsIcon />
          </button>
          <div className="dl-toolbar-divider" />
          <button
            className="dl-toolbar-icon-button"
            data-kind="secondary"
            onClick={() => {
              setIsSettingsOpen(false);
              setIsOpen(false);
            }}
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
          title="打开 DevPilot"
        >
          <DevPilotGlyph />
          {summary.open > 0 ? <span className="dl-launcher-badge">{summary.open}</span> : null}
        </button>
      )}

      {stabilityEnabled && isOpen && !isSettingsOpen && mode === "stability" ? (
        <StabilityPanel
          panelLeft={panelLeft}
          panelBottom={panelBottom}
          autoObservationEnabled={autoObservationEnabled}
          stabilityCopyState={stabilityCopyState}
          openStabilityItems={openStabilityItems}
          resolvedStabilityItems={resolvedStabilityItems}
          stabilitySummary={stabilitySummary}
          isStabilityComposerOpen={isStabilityComposerOpen}
          stabilityEditingId={stabilityEditingId}
          stabilityDraft={stabilityDraft}
          stabilityActiveId={stabilityActiveId}
          activeStabilityItem={activeStabilityItem}
          latestActiveRepairRequest={latestActiveRepairRequest}
          repairTargetId={repairTargetId}
          repairState={repairState}
          onToggleObservation={() =>
            setAutoObservationEnabled((current) => !current)
          }
          onCopyOpenItems={() => {
            void handleCopyStabilityItems(openStabilityItems);
          }}
          onOpenComposer={openStabilityComposer}
          onClose={() => setMode("annotate")}
          onDraftChange={handleStabilityDraftChange}
          onResetComposer={resetStabilityComposer}
          onDeleteComposerItem={handleDeleteStabilityItem}
          onSaveStabilityItem={handleSaveStabilityItem}
          onSelectStabilityItem={setStabilityActiveId}
          onCopyStabilityItem={(item) => {
            void handleCopyStabilityItems([item]);
          }}
          onRequestRepair={(item) => {
            void handleRequestStabilityRepair(item);
          }}
          onSetStabilityItemStatus={setStabilityItemStatus}
          onDeleteStabilityItem={handleDeleteStabilityItemRecord}
        />
      ) : null}
    </div>
  );
}

export function createDevPilotStyleElement(): HTMLStyleElement {
  const style = document.createElement("style");
  style.textContent = styles;
  return style;
}

export function DevPilotShell(props: DevPilotMountOptions) {
  return <DevPilotApp {...props} />;
}
