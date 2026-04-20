import React, { useState, useRef, useEffect } from "react";

import { useI18n } from "../i18n";
import type { DevPilotLocale } from "../i18n/dict";
import { CollapseIcon } from "./icons";

type SseStatus = "disabled" | "connecting" | "connected" | "reconnecting";

interface SettingsPanelProps {
  panelLeft: number;
  panelBottom: number;
  syncEndpoint?: string;
  sessionId: string | null;
  sseStatus: SseStatus;
  stabilityCopilotEnabled: boolean;
  onToggleStabilityCopilot: () => void;
  onClose: () => void;
}

export function SettingsPanel({
  panelLeft,
  panelBottom,
  syncEndpoint,
  sessionId,
  sseStatus,
  stabilityCopilotEnabled,
  onToggleStabilityCopilot,
  onClose,
}: SettingsPanelProps) {
  const { t, locale, setLocale } = useI18n();
  const [languageOpen, setLanguageOpen] = useState(false);
  const languageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const path = event.composedPath();
      if (languageRef.current && !path.includes(languageRef.current)) {
        setLanguageOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const mcpStatus = syncEndpoint ? "connected" : "disabled";
  const mcpLabel = syncEndpoint ? t("settings.collabMode") : t("settings.localMode");

  const languageOptions: { value: DevPilotLocale; label: string }[] = [
    { value: "zh-CN", label: t("settings.language.zhCN") },
    { value: "en-US", label: t("settings.language.enUS") },
  ];

  return (
    <section
      className="dl-session-panel dl-settings-panel"
      style={{ left: panelLeft, bottom: panelBottom }}
    >
      <div className="dl-session-header">
        <div className="dl-session-header-main">
          <h3 className="dl-session-title">{t("settings.title")}</h3>
        </div>
        <button
          className="dl-toolbar-icon-button"
          data-kind="secondary"
          onClick={onClose}
          title={t("settings.close")}
        >
          <CollapseIcon />
        </button>
      </div>

      <div className="dl-session-body">
        <div className="dl-session-section">
          <div className="dl-session-section-header">
            <h4 className="dl-session-section-title">{t("settings.preferences")}</h4>
          </div>
          <div className="dl-session-detail">
            <div className="dl-detail-card">
              <div className="dl-settings-row">
                <span className="dl-settings-name">{t("settings.language")}</span>
                <div className="dl-language-select" ref={languageRef}>
                  <button
                    className="dl-language-select-trigger"
                    onClick={() => setLanguageOpen((prev) => !prev)}
                  >
                    {languageOptions.find((opt) => opt.value === locale)?.label ?? locale}
                    <svg width="10" height="6" viewBox="0 0 10 6" fill="none">
                      <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                  {languageOpen ? (
                    <div className="dl-language-select-dropdown">
                      {languageOptions.map((option) => (
                        <button
                          key={option.value}
                          className={`dl-language-select-option${option.value === locale ? " dl-language-select-option-active" : ""}`}
                          onClick={() => {
                            setLocale(option.value);
                            setLanguageOpen(false);
                          }}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="dl-session-section">
          <div className="dl-session-section-header">
            <h4 className="dl-session-section-title">{t("settings.features")}</h4>
          </div>
          <div className="dl-session-detail">
            <div className="dl-detail-card">
              <label className="dl-settings-row dl-settings-switch-row" title={t("settings.stabilityTooltip")}>
                <span className="dl-settings-name">{t("settings.stabilityCopilot")}</span>
                <span className="dl-switch">
                  <input
                    type="checkbox"
                    checked={stabilityCopilotEnabled}
                    onChange={onToggleStabilityCopilot}
                  />
                  <span className="dl-switch-track" aria-hidden="true">
                    <span className="dl-switch-thumb" aria-hidden="true" />
                  </span>
                </span>
              </label>
            </div>
          </div>
        </div>

        <div className="dl-session-section">
          <div className="dl-session-section-header">
            <h4 className="dl-session-section-title">{t("settings.connection")}</h4>
          </div>
          <div className="dl-session-detail">
            <div className="dl-detail-card">
              <div className="dl-settings-row">
                <div className="dl-settings-main">
                  <span className="dl-settings-name">{t("settings.mcp")}</span>
                  <span className="dl-settings-value">{mcpLabel}</span>
                </div>
                <span
                  className="dl-settings-indicator"
                  data-status={mcpStatus}
                  aria-hidden="true"
                />
              </div>
              <div className="dl-settings-row">
                <div className="dl-settings-main">
                  <span className="dl-settings-name">{t("settings.sse")}</span>
                  <span className="dl-settings-value">
                    {sseStatus === "connected"
                      ? t("settings.sseConnected")
                      : sseStatus === "reconnecting"
                        ? t("settings.sseReconnecting")
                        : sseStatus === "connecting"
                          ? t("settings.sseConnecting")
                          : t("settings.sseDisabled")}
                  </span>
                </div>
                <span
                  className="dl-settings-indicator"
                  data-status={sseStatus}
                  aria-hidden="true"
                />
              </div>
            </div>

            <div className="dl-detail-card">
              <div className="dl-detail-meta">
                <div className="dl-detail-kv" style={{ gridColumn: "1 / -1" }}>
                  <strong>{t("settings.endpoint")}</strong>
                  <span>{syncEndpoint || t("settings.notConfigured")}</span>
                </div>
                <div className="dl-detail-kv" style={{ gridColumn: "1 / -1" }}>
                  <strong>{t("settings.session")}</strong>
                  <span>{sessionId || t("settings.notEstablished")}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
