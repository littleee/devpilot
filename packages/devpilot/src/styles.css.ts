export const styles = `
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
    min-width: 16px;
    height: 16px;
    padding: 0 5px;
    border-radius: 50%;
    background: #3b82f6;
    color: #ffffff;
    font-size: 10px;
    font-weight: 800;
    line-height: 16px;
    box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.92);
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
    width: 44px;
    height: 44px;
    margin-right: 2px;
    border-radius: 22px;
    color: rgba(255, 255, 255, 0.66);
    cursor: grab;
  }

  .dl-drag-handle:active,
  .dl-launcher:active {
    cursor: grabbing;
  }

  .dl-drag-handle .dl-launcher-glyph {
    width: 18px;
    height: 18px;
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
    position: absolute;
    top: -2px;
    right: -2px;
    min-width: 16px;
    height: 16px;
    padding: 0 5px;
    border-radius: 999px;
    background: #3b82f6;
    color: #ffffff;
    font-size: 10px;
    font-weight: 800;
    line-height: 16px;
    box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.92);
  }

  .dl-toolbar-button[data-active="true"] .dl-toolbar-count {
    background: #60a5fa;
  }

  .dl-toolbar-dot {
    position: absolute;
    top: 2px;
    right: 2px;
    width: 8px;
    height: 8px;
    border-radius: 999px;
    background: #ef4444;
    box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.92);
  }

  .dl-toolbar-icon {
    width: 20px;
    height: 20px;
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
    overflow: visible;
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
    background: #60a5fa;
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

  .dl-toolbar-icon-button[data-copied="true"] {
    color: #4ade80;
  }

  .dl-toolbar-icon-button:disabled {
    opacity: 0.35;
    cursor: not-allowed;
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

  .dl-text-selection-focus {
    position: fixed;
    border: 2px solid #3b82f6;
    border-radius: 4px;
    background: rgba(59, 130, 246, 0.35);
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.22);
    pointer-events: none;
    animation: dl-highlight-enter 120ms ease-out;
    z-index: 2147483601;
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
    min-width: 16px;
    width: 16px;
    height: 16px;
    padding: 0;
    border: 0;
    border-radius: 50%;
    background: #2563eb;
    color: #ffffff;
    font-size: 10px;
    font-weight: 800;
    line-height: 16px;
    box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.92);
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
  }

  .dl-marker[data-status="acknowledged"] {
    background: #d97706;
  }

  .dl-marker[data-kind="area"] {
    min-width: 16px;
    height: 16px;
    gap: 4px;
    padding: 0 4px;
    border-radius: 10px;
  }

  .dl-marker[data-pending="true"] {
    background: #16a34a;
    box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.92);
    animation: dl-marker-enter 140ms cubic-bezier(0.22, 1, 0.36, 1);
  }

  .dl-marker[data-pending="true"][data-kind="element"],
  .dl-marker[data-pending="true"][data-kind="text"] {
    min-width: 16px;
    width: 16px;
    height: 16px;
    padding: 0;
    font-size: 10px;
    line-height: 16px;
  }

  .dl-marker-icon {
    width: 8px;
    height: 8px;
    color: currentColor;
    flex: 0 0 auto;
  }

  .dl-marker-label {
    line-height: 16px;
  }

  .dl-marker[data-active="true"] {
    transform: scale(1.08);
    box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.92);
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

  .dl-settings-switch-row {
    cursor: pointer;
  }

  .dl-switch {
    display: inline-flex;
    align-items: center;
    position: relative;
    flex: 0 0 auto;
  }

  .dl-switch input {
    position: absolute;
    opacity: 0;
    width: 0;
    height: 0;
  }

  .dl-switch-track {
    display: block;
    width: 36px;
    height: 20px;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.22);
    transition: background 160ms ease;
    position: relative;
    cursor: pointer;
  }

  .dl-switch input:checked + .dl-switch-track {
    background: #3b82f6;
  }

  .dl-switch input:focus-visible + .dl-switch-track {
    outline: 2px solid #60a5fa;
    outline-offset: 2px;
  }

  .dl-switch-thumb {
    position: absolute;
    top: 2px;
    left: 2px;
    width: 16px;
    height: 16px;
    border-radius: 999px;
    background: #ffffff;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
    transition: transform 160ms ease;
    pointer-events: none;
  }

  .dl-switch input:checked + .dl-switch-track .dl-switch-thumb {
    transform: translateX(16px);
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

  /* Stability Panel Redesign */

  .dl-stability-status-bar {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 18px 14px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    font-size: 12px;
    color: rgba(255, 255, 255, 0.58);
  }

  .dl-stability-status-dot {
    width: 8px;
    height: 8px;
    border-radius: 999px;
    background: #6b7280;
    flex-shrink: 0;
  }

  .dl-stability-status-dot[data-on] {
    background: #34d399;
    box-shadow: 0 0 0 3px rgba(52, 211, 153, 0.2);
  }

  .dl-stability-status-text {
    color: rgba(255, 255, 255, 0.88);
    font-weight: 600;
  }

  .dl-stability-status-meta {
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }

  .dl-stability-status-meta::before {
    content: "·";
    color: rgba(255, 255, 255, 0.3);
  }

  .dl-stability-inbox {
    display: flex;
    flex-direction: column;
    padding: 12px 0;
  }

  .dl-stability-inbox-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 18px 10px;
  }

  .dl-stability-inbox-title {
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.01em;
    color: rgba(255, 255, 255, 0.56);
    text-transform: uppercase;
  }

  .dl-stability-inbox-item {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 12px 18px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.04);
    cursor: pointer;
    transition: background 120ms ease;
  }

  .dl-stability-inbox-item:hover {
    background: rgba(255, 255, 255, 0.03);
  }

  .dl-stability-inbox-item-active {
    background: rgba(83, 182, 255, 0.08);
    border-left: 3px solid #53b6ff;
    padding-left: 15px;
  }

  .dl-stability-inbox-item-active:hover {
    background: rgba(83, 182, 255, 0.12);
  }

  .dl-stability-inbox-item-new {
    background: rgba(52, 211, 153, 0.06);
  }

  .dl-stability-inbox-item-new:hover {
    background: rgba(52, 211, 153, 0.1);
  }

  .dl-stability-inbox-item-main {
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
  }

  .dl-stability-inbox-item-type {
    flex-shrink: 0;
    padding: 2px 8px;
    border-radius: 6px;
    background: rgba(255, 255, 255, 0.08);
    color: rgba(255, 255, 255, 0.72);
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.02em;
  }

  .dl-stability-inbox-item-title {
    flex: 1 1 auto;
    min-width: 0;
    font-size: 13px;
    font-weight: 600;
    color: rgba(255, 255, 255, 0.92);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .dl-stability-inbox-item-new-badge {
    flex-shrink: 0;
    padding: 1px 6px;
    border-radius: 999px;
    background: rgba(52, 211, 153, 0.18);
    color: #34d399;
    font-size: 10px;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .dl-stability-inbox-item-meta {
    display: flex;
    align-items: center;
    gap: 8px;
    padding-left: 4px;
    font-size: 11px;
    color: rgba(255, 255, 255, 0.48);
  }

  .dl-stability-inbox-item-meta .dl-severity-pill {
    margin-left: auto;
  }

  .dl-stability-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 10px;
    padding: 32px 24px;
    text-align: center;
  }

  .dl-stability-empty-title {
    font-size: 14px;
    font-weight: 700;
    color: rgba(255, 255, 255, 0.72);
  }

  .dl-stability-empty-body {
    font-size: 12px;
    line-height: 1.65;
    color: rgba(255, 255, 255, 0.48);
    max-width: 280px;
  }

  .dl-stability-composer-trigger {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    margin: 10px 18px 0;
    padding: 10px 14px;
    border-radius: 10px;
    border: 1px dashed rgba(255, 255, 255, 0.12);
    background: transparent;
    color: rgba(255, 255, 255, 0.58);
    font-size: 13px;
    font-weight: 600;
    font-family: inherit;
    cursor: pointer;
    transition: 160ms ease;
  }

  .dl-stability-composer-trigger:hover {
    border-color: rgba(255, 255, 255, 0.2);
    color: rgba(255, 255, 255, 0.8);
    background: rgba(255, 255, 255, 0.02);
  }

  .dl-stability-composer {
    padding: 14px 18px;
    border-top: 1px solid rgba(255, 255, 255, 0.08);
  }

  .dl-stability-composer-header {
    margin-bottom: 12px;
  }

  .dl-stability-detail {
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 14px 18px 18px;
    border-top: 1px solid rgba(255, 255, 255, 0.08);
  }

  .dl-stability-detail-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    align-items: center;
  }

  .dl-stability-primary-action {
    min-height: 36px;
    padding: 8px 16px;
    font-weight: 700;
  }

  .dl-stability-archived {
    padding: 10px 18px;
    border-top: 1px solid rgba(255, 255, 255, 0.08);
  }

  .dl-stability-archived-toggle {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    padding: 8px 0;
    background: transparent;
    border: none;
    color: rgba(255, 255, 255, 0.48);
    font-size: 12px;
    font-weight: 600;
    font-family: inherit;
    cursor: pointer;
    transition: color 120ms ease;
  }

  .dl-stability-archived-toggle:hover {
    color: rgba(255, 255, 255, 0.72);
  }

  .dl-stability-archived-list {
    display: flex;
    flex-direction: column;
    padding-top: 6px;
  }

  .dl-stability-inbox-item-resolved {
    opacity: 0.55;
  }

  .dl-stability-inbox-item-resolved:hover {
    opacity: 0.75;
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

  .dl-network-toast {
    display: inline-flex;
    align-items: center;
    height: 28px;
    padding: 0 12px;
    border-radius: 8px;
    background: rgba(239, 68, 68, 0.96);
    color: #ffffff;
    font-size: 12px;
    font-weight: 700;
    box-shadow: 0 8px 24px rgba(239, 68, 68, 0.28);
    pointer-events: none;
    animation: dl-panel-enter 180ms cubic-bezier(0.22, 1, 0.36, 1);
    max-width: min(320px, calc(100vw - 32px));
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
`;
