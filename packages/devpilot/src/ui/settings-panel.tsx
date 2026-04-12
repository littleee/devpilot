import React from "react";

import { CollapseIcon } from "./icons";

type SseStatus = "disabled" | "connecting" | "connected" | "reconnecting";

interface SettingsPanelProps {
  panelLeft: number;
  panelBottom: number;
  syncEndpoint?: string;
  sessionId: string | null;
  sseStatus: SseStatus;
  onClose: () => void;
}

function getSseLabel(status: SseStatus): string {
  switch (status) {
    case "connected":
      return "已连接";
    case "reconnecting":
      return "重连中";
    case "connecting":
      return "连接中";
    default:
      return "未启用";
  }
}

export function SettingsPanel({
  panelLeft,
  panelBottom,
  syncEndpoint,
  sessionId,
  sseStatus,
  onClose,
}: SettingsPanelProps) {
  const mcpStatus = syncEndpoint ? "connected" : "disabled";
  const mcpLabel = syncEndpoint ? "协作模式" : "本地模式";

  return (
    <section
      className="dl-session-panel dl-settings-panel"
      style={{ left: panelLeft, bottom: panelBottom }}
    >
      <div className="dl-session-header">
        <div className="dl-session-header-main">
          <h3 className="dl-session-title">设置</h3>
        </div>
        <button
          className="dl-toolbar-icon-button"
          data-kind="secondary"
          onClick={onClose}
          title="关闭设置"
        >
          <CollapseIcon />
        </button>
      </div>

      <div className="dl-session-body">
        <div className="dl-session-section">
          <div className="dl-session-section-header">
            <h4 className="dl-session-section-title">连接</h4>
          </div>
          <div className="dl-session-detail">
            <div className="dl-detail-card">
              <div className="dl-settings-row">
                <div className="dl-settings-main">
                  <span className="dl-settings-name">MCP</span>
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
                  <span className="dl-settings-name">SSE</span>
                  <span className="dl-settings-value">{getSseLabel(sseStatus)}</span>
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
                  <strong>Endpoint</strong>
                  <span>{syncEndpoint || "未配置"}</span>
                </div>
                <div className="dl-detail-kv" style={{ gridColumn: "1 / -1" }}>
                  <strong>Session</strong>
                  <span>{sessionId || "未建立"}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
