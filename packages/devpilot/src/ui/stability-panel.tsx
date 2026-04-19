import React, { useState } from "react";

import { getRepairRequestStatusLabel } from "../repair/state";
import { formatTime } from "../shared/runtime";
import {
  DevPilotStabilityDraft,
  getStabilitySeverityLabel,
  getStabilityStatusLabel,
} from "../stability/state";
import type {
  DevPilotRepairRequestRecord,
  DevPilotStabilityItem,
  DevPilotStabilitySeverity,
  DevPilotStabilityStatus,
} from "../types";
import { CollapseIcon } from "./icons";

type CopyState = "idle" | "copied" | "failed";
type RepairState = "idle" | "requested" | "failed";

interface StabilityPanelProps {
  panelLeft: number;
  panelBottom: number;
  stabilityCopyState: CopyState;
  openStabilityItems: DevPilotStabilityItem[];
  resolvedStabilityItems: DevPilotStabilityItem[];
  stabilitySummary: {
    diagnosing: number;
    resolved: number;
    critical: number;
    total: number;
  };
  isStabilityComposerOpen: boolean;
  stabilityEditingId: string | null;
  stabilityDraft: DevPilotStabilityDraft;
  stabilityActiveId: string | null;
  activeStabilityItem: DevPilotStabilityItem | null;
  latestActiveRepairRequest: DevPilotRepairRequestRecord | null;
  repairTargetId: string | null;
  repairState: RepairState;
  onCopyOpenItems: () => void;
  onOpenComposer: (item?: DevPilotStabilityItem) => void;
  onClose: () => void;
  onDraftChange: (
    field: keyof DevPilotStabilityDraft,
    value: string | DevPilotStabilitySeverity,
  ) => void;
  onResetComposer: () => void;
  onDeleteComposerItem: () => void;
  onSaveStabilityItem: () => void;
  onSelectStabilityItem: (itemId: string) => void;
  onCopyStabilityItem: (item: DevPilotStabilityItem) => void;
  onRequestRepair: (item: DevPilotStabilityItem) => void;
  onSetStabilityItemStatus: (
    itemId: string,
    nextStatus: DevPilotStabilityStatus,
  ) => void;
  onDeleteStabilityItem: (item: DevPilotStabilityItem) => void;
}

function inferIssueType(item: DevPilotStabilityItem): string {
  const symptom = item.symptom.toLowerCase();
  const signals = (item.signals || "").toLowerCase();
  const combined = `${symptom} ${signals}`;

  if (
    combined.includes("typeerror") ||
    combined.includes("referenceerror") ||
    combined.includes("uncaught")
  ) {
    return "Error";
  }
  if (
    combined.includes("fetch") ||
    combined.includes("request") ||
    combined.includes("network") ||
    combined.includes("http")
  ) {
    return "Fetch";
  }
  if (combined.includes("promise") || combined.includes("unhandledrejection")) {
    return "Promise";
  }
  if (item.id.startsWith("sti_obs")) {
    return "Runtime";
  }
  return "Issue";
}

function formatRelativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);

  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function isNewItem(item: DevPilotStabilityItem): boolean {
  return Date.now() - item.createdAt < 5 * 60 * 1000;
}

export function StabilityPanel({
  panelLeft,
  panelBottom,
  openStabilityItems,
  resolvedStabilityItems,
  isStabilityComposerOpen,
  stabilityEditingId,
  stabilityDraft,
  stabilityActiveId,
  activeStabilityItem,
  latestActiveRepairRequest,
  repairTargetId,
  repairState,
  onOpenComposer,
  onClose,
  onDraftChange,
  onResetComposer,
  onDeleteComposerItem,
  onSaveStabilityItem,
  onSelectStabilityItem,
  onRequestRepair,
  onSetStabilityItemStatus,
  onDeleteStabilityItem,
}: StabilityPanelProps) {
  const [showArchived, setShowArchived] = useState(false);

  const lastCaptureTime =
    openStabilityItems[0]?.updatedAt ||
    resolvedStabilityItems[0]?.updatedAt ||
    null;

  const getPrimaryActionLabel = (item: DevPilotStabilityItem): string => {
    if (latestActiveRepairRequest) {
      if (latestActiveRepairRequest.status === "requested") return "诊断请求已发送";
      if (latestActiveRepairRequest.status === "accepted") return "诊断处理中";
      if (latestActiveRepairRequest.status === "completed") return "再次请求 AI 诊断";
      return "重新请求 AI 诊断";
    }
    if (repairTargetId === item.id) {
      if (repairState === "requested") return "已生成诊断请求";
      if (repairState === "failed") return "诊断请求失败";
    }
    return "Send to AI";
  };

  const isPrimaryActionDisabled = (item: DevPilotStabilityItem): boolean => {
    if (!latestActiveRepairRequest) return false;
    return (
      latestActiveRepairRequest.status === "requested" ||
      latestActiveRepairRequest.status === "accepted"
    );
  };

  return (
    <section
      className="dl-session-panel dl-stability-panel"
      style={{ left: panelLeft, bottom: panelBottom }}
    >
      {/* Header */}
      <div className="dl-session-header dl-stability-panel-header">
        <div className="dl-session-header-main">
          <h3 className="dl-session-title">Stability Copilot</h3>
        </div>
        <button
          className="dl-toolbar-icon-button dl-stability-panel-close"
          data-kind="secondary"
          onClick={onClose}
          title="Close"
        >
          <CollapseIcon />
        </button>
      </div>

      {/* Section 1: Observation Status */}
      <div className="dl-stability-status-bar">
        <span className="dl-stability-status-dot" data-on />
        <span className="dl-stability-status-text">
          Watching for runtime issues
        </span>
        {lastCaptureTime ? (
          <span className="dl-stability-status-meta">
            Last captured {formatRelativeTime(lastCaptureTime)}
          </span>
        ) : null}
        <span className="dl-stability-status-meta">
          {openStabilityItems.length} open{" "}
          {openStabilityItems.length === 1 ? "issue" : "issues"}
        </span>
      </div>

      {/* Section 2: Issue Inbox */}
      <div className="dl-stability-inbox">
        {openStabilityItems.length === 0 ? (
          <div className="dl-stability-empty">
            <div className="dl-stability-empty-title">
              No issues captured yet
            </div>
            <div className="dl-stability-empty-body">
              Stability Copilot is watching for JS errors, promise rejections,
              and failed requests.
            </div>
          </div>
        ) : (
          <>
            <div className="dl-stability-inbox-header">
              <span className="dl-stability-inbox-title">Open Issues</span>
            </div>
            {openStabilityItems.map((item) => (
              <div
                key={item.id}
                className={`dl-stability-inbox-item ${
                  item.id === stabilityActiveId
                    ? "dl-stability-inbox-item-active"
                    : ""
                } ${isNewItem(item) ? "dl-stability-inbox-item-new" : ""}`}
                onClick={() => onSelectStabilityItem(item.id)}
              >
                <div className="dl-stability-inbox-item-main">
                  <span className="dl-stability-inbox-item-type">
                    {inferIssueType(item)}
                  </span>
                  <span className="dl-stability-inbox-item-title">
                    {item.title}
                  </span>
                  {isNewItem(item) ? (
                    <span className="dl-stability-inbox-item-new-badge">
                      New
                    </span>
                  ) : null}
                </div>
                <div className="dl-stability-inbox-item-meta">
                  <span>{formatTime(item.updatedAt)}</span>
                  <span>{item.pathname}</span>
                  <span
                    className="dl-severity-pill"
                    data-severity={item.severity}
                  >
                    {getStabilitySeverityLabel(item.severity)}
                  </span>
                </div>
              </div>
            ))}
          </>
        )}

        {/* Manual record trigger */}
        {!isStabilityComposerOpen ? (
          <button
            className="dl-stability-composer-trigger"
            onClick={() => onOpenComposer()}
          >
            + 手动记录问题
          </button>
        ) : null}
      </div>

      {/* Inline composer */}
      {isStabilityComposerOpen ? (
        <div className="dl-stability-composer">
          <div className="dl-stability-composer-header">
            <h4 className="dl-session-section-title">
              {stabilityEditingId ? "编辑问题" : "手动记录问题"}
            </h4>
          </div>
          <div className="dl-stability-form">
            <div className="dl-stability-grid">
              <label className="dl-stability-field">
                <span className="dl-stability-label">问题标题</span>
                <input
                  className="dl-stability-input"
                  value={stabilityDraft.title}
                  onChange={(event) =>
                    onDraftChange("title", event.target.value)
                  }
                  placeholder="例如：筛选页接口失败后按钮一直 loading"
                />
              </label>
              <label className="dl-stability-field">
                <span className="dl-stability-label">严重程度</span>
                <select
                  className="dl-stability-select"
                  value={stabilityDraft.severity}
                  onChange={(event) =>
                    onDraftChange("severity", event.target.value)
                  }
                >
                  <option value="low">低</option>
                  <option value="medium">中</option>
                  <option value="high">高</option>
                  <option value="critical">紧急</option>
                </select>
              </label>
            </div>
            <label className="dl-stability-field">
              <span className="dl-stability-label">异常现象</span>
              <textarea
                className="dl-stability-textarea"
                value={stabilityDraft.symptom}
                onChange={(event) =>
                  onDraftChange("symptom", event.target.value)
                }
                placeholder="描述用户看到的现象、报错提示或流程中断点"
              />
            </label>
            <div className="dl-stability-subgrid">
              <label className="dl-stability-field">
                <span className="dl-stability-label">复现步骤</span>
                <textarea
                  className="dl-stability-textarea"
                  value={stabilityDraft.reproSteps}
                  onChange={(event) =>
                    onDraftChange("reproSteps", event.target.value)
                  }
                  placeholder="1. 进入页面 2. 点击查询 3. 出现异常"
                />
              </label>
              <label className="dl-stability-field">
                <span className="dl-stability-label">影响范围</span>
                <textarea
                  className="dl-stability-textarea"
                  value={stabilityDraft.impact}
                  onChange={(event) =>
                    onDraftChange("impact", event.target.value)
                  }
                  placeholder="影响哪些角色、流程或数据正确性"
                />
              </label>
            </div>
            <div className="dl-stability-subgrid">
              <label className="dl-stability-field">
                <span className="dl-stability-label">技术线索</span>
                <textarea
                  className="dl-stability-textarea"
                  value={stabilityDraft.signals}
                  onChange={(event) =>
                    onDraftChange("signals", event.target.value)
                  }
                  placeholder="接口名、错误码、日志关键词、埋点异常、控制台报错"
                />
              </label>
              <label className="dl-stability-field">
                <span className="dl-stability-label">修复目标</span>
                <textarea
                  className="dl-stability-textarea"
                  value={stabilityDraft.fixGoal}
                  onChange={(event) =>
                    onDraftChange("fixGoal", event.target.value)
                  }
                  placeholder="希望 AI 先定位原因、补防御、优化交互或补监控"
                />
              </label>
            </div>
            <div className="dl-stability-form-actions">
              <div className="dl-stability-form-actions-left">
                <button
                  className="dl-popup-action"
                  data-kind="ghost"
                  onClick={onResetComposer}
                >
                  取消
                </button>
                {stabilityEditingId ? (
                  <button
                    className="dl-popup-action"
                    data-kind="danger"
                    onClick={onDeleteComposerItem}
                  >
                    删除
                  </button>
                ) : null}
              </div>
              <div className="dl-stability-form-actions-right">
                <button
                  className="dl-popup-action"
                  data-kind="primary"
                  disabled={
                    !stabilityDraft.title.trim() ||
                    !stabilityDraft.symptom.trim()
                  }
                  onClick={onSaveStabilityItem}
                >
                  {stabilityEditingId ? "保存问题" : "记录问题"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* Section 3 & 4: Selected Issue Detail + Primary Actions */}
      {activeStabilityItem ? (
        <div className="dl-stability-detail">
          <div className="dl-detail-card">
            <div className="dl-stability-meta">
              <span
                className="dl-status-pill"
                data-status={activeStabilityItem.status}
              >
                {getStabilityStatusLabel(activeStabilityItem.status)}
              </span>
              <span
                className="dl-severity-pill"
                data-severity={activeStabilityItem.severity}
              >
                {getStabilitySeverityLabel(activeStabilityItem.severity)}
              </span>
            </div>
            <h4 className="dl-detail-title">{activeStabilityItem.title}</h4>
            <div className="dl-detail-body">
              {activeStabilityItem.symptom}
            </div>
          </div>

          {/* Context */}
          <div className="dl-detail-card">
            <h4 className="dl-detail-title">Context</h4>
            <div className="dl-detail-meta">
              {activeStabilityItem.signals ? (
                <div
                  className="dl-detail-kv"
                  style={{ gridColumn: "1 / -1" }}
                >
                  <strong>Signals</strong>
                  <span>{activeStabilityItem.signals}</span>
                </div>
              ) : null}
              <div className="dl-detail-kv">
                <strong>Page</strong>
                <span>{activeStabilityItem.context.title}</span>
              </div>
              <div className="dl-detail-kv">
                <strong>Path</strong>
                <span>{activeStabilityItem.context.pathname}</span>
              </div>
              <div
                className="dl-detail-kv"
                style={{ gridColumn: "1 / -1" }}
              >
                <strong>URL</strong>
                <span>{activeStabilityItem.context.url}</span>
              </div>
              <div className="dl-detail-kv">
                <strong>Viewport</strong>
                <span>
                  {activeStabilityItem.context.viewport.width} ×{" "}
                  {activeStabilityItem.context.viewport.height}
                </span>
              </div>
              <div className="dl-detail-kv">
                <strong>Captured</strong>
                <span>{formatTime(activeStabilityItem.createdAt)}</span>
              </div>
            </div>
          </div>

          {/* Primary Action Area */}
          <div className="dl-detail-card">
            <div className="dl-stability-detail-actions">
              <button
                className="dl-popup-action dl-stability-primary-action"
                data-kind="primary"
                disabled={isPrimaryActionDisabled(activeStabilityItem)}
                onClick={() => onRequestRepair(activeStabilityItem)}
              >
                {getPrimaryActionLabel(activeStabilityItem)}
              </button>
              <button
                className="dl-popup-action"
                data-kind="ghost"
                onClick={() => onDeleteStabilityItem(activeStabilityItem)}
              >
                Dismiss
              </button>
              {activeStabilityItem.status !== "resolved" ? (
                <button
                  className="dl-popup-action"
                  data-kind="ghost"
                  onClick={() =>
                    onSetStabilityItemStatus(
                      activeStabilityItem.id,
                      "resolved",
                    )
                  }
                >
                  Mark resolved
                </button>
              ) : (
                <button
                  className="dl-popup-action"
                  data-kind="ghost"
                  onClick={() =>
                    onSetStabilityItemStatus(
                      activeStabilityItem.id,
                      "open",
                    )
                  }
                >
                  Reopen
                </button>
              )}
            </div>
          </div>

          {/* Repair request status */}
          {latestActiveRepairRequest ? (
            <div className="dl-detail-card">
              <h4 className="dl-detail-title">Repair request</h4>
              <div className="dl-detail-meta">
                <div className="dl-detail-kv">
                  <strong>Status</strong>
                  <span>
                    {getRepairRequestStatusLabel(
                      latestActiveRepairRequest.status,
                    )}
                  </span>
                </div>
                <div className="dl-detail-kv">
                  <strong>Requested</strong>
                  <span>
                    {formatTime(latestActiveRepairRequest.createdAt)}
                  </span>
                </div>
                <div className="dl-detail-kv">
                  <strong>By</strong>
                  <span>
                    {latestActiveRepairRequest.requestedBy === "human"
                      ? "Human"
                      : "Agent"}
                  </span>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {/* Archived items */}
      {resolvedStabilityItems.length > 0 ? (
        <div className="dl-stability-archived">
          <button
            className="dl-stability-archived-toggle"
            onClick={() => setShowArchived((s) => !s)}
          >
            {showArchived ? "▼" : "▶"} Resolved ({resolvedStabilityItems.length})
          </button>
          {showArchived ? (
            <div className="dl-stability-archived-list">
              {resolvedStabilityItems.map((item) => (
                <div
                  key={item.id}
                  className={`dl-stability-inbox-item dl-stability-inbox-item-resolved ${
                    item.id === stabilityActiveId
                      ? "dl-stability-inbox-item-active"
                      : ""
                  }`}
                  onClick={() => onSelectStabilityItem(item.id)}
                >
                  <div className="dl-stability-inbox-item-main">
                    <span className="dl-stability-inbox-item-type">
                      {inferIssueType(item)}
                    </span>
                    <span className="dl-stability-inbox-item-title">
                      {item.title}
                    </span>
                  </div>
                  <div className="dl-stability-inbox-item-meta">
                    <span>{formatTime(item.updatedAt)}</span>
                    <span>{item.pathname}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
