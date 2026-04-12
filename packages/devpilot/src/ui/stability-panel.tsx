import React from "react";

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

interface StabilitySummary {
  diagnosing: number;
  resolved: number;
  critical: number;
  total: number;
}

interface StabilityPanelProps {
  panelLeft: number;
  panelBottom: number;
  autoObservationEnabled: boolean;
  stabilityCopyState: CopyState;
  openStabilityItems: DevPilotStabilityItem[];
  resolvedStabilityItems: DevPilotStabilityItem[];
  stabilitySummary: StabilitySummary;
  isStabilityComposerOpen: boolean;
  stabilityEditingId: string | null;
  stabilityDraft: DevPilotStabilityDraft;
  stabilityActiveId: string | null;
  activeStabilityItem: DevPilotStabilityItem | null;
  latestActiveRepairRequest: DevPilotRepairRequestRecord | null;
  repairTargetId: string | null;
  repairState: RepairState;
  onToggleObservation: () => void;
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

export function StabilityPanel({
  panelLeft,
  panelBottom,
  autoObservationEnabled,
  stabilityCopyState,
  openStabilityItems,
  resolvedStabilityItems,
  stabilitySummary,
  isStabilityComposerOpen,
  stabilityEditingId,
  stabilityDraft,
  stabilityActiveId,
  activeStabilityItem,
  latestActiveRepairRequest,
  repairTargetId,
  repairState,
  onToggleObservation,
  onCopyOpenItems,
  onOpenComposer,
  onClose,
  onDraftChange,
  onResetComposer,
  onDeleteComposerItem,
  onSaveStabilityItem,
  onSelectStabilityItem,
  onCopyStabilityItem,
  onRequestRepair,
  onSetStabilityItemStatus,
  onDeleteStabilityItem,
}: StabilityPanelProps) {
  return (
    <section
      className="dl-session-panel dl-stability-panel"
      style={{ left: panelLeft, bottom: panelBottom }}
    >
      <div className="dl-session-header dl-stability-panel-header">
        <div className="dl-session-header-main">
          <h3 className="dl-session-title">稳定性副驾</h3>
        </div>
        <button
          className="dl-toolbar-icon-button dl-stability-panel-close"
          data-kind="secondary"
          onClick={onClose}
          title="关闭稳定性面板"
        >
          <CollapseIcon />
        </button>
      </div>
      <div className="dl-stability-header-actions">
        <button
          className="dl-popup-action"
          data-kind={autoObservationEnabled ? "primary" : "ghost"}
          onClick={onToggleObservation}
          title="开启后将自动记录 JS 异常、Promise 拒绝和接口失败"
        >
          {autoObservationEnabled ? "关闭自动观察" : "开启自动观察"}
        </button>
        <button
          className="dl-popup-action"
          data-kind={
            stabilityCopyState === "failed"
              ? "danger"
              : stabilityCopyState === "copied"
                ? "primary"
                : "ghost"
          }
          disabled={openStabilityItems.length === 0}
          onClick={onCopyOpenItems}
          title="复制当前仍需处理的稳定性问题"
        >
          {stabilityCopyState === "copied"
            ? "已复制稳定性问题"
            : stabilityCopyState === "failed"
              ? "复制失败"
              : "复制稳定性问题"}
        </button>
        <button
          className="dl-popup-action"
          data-kind="primary"
          onClick={() => onOpenComposer()}
        >
          新建问题
        </button>
      </div>
      <div className="dl-summary-grid dl-stability-summary-grid">
        <div className="dl-summary-card">
          <span className="dl-summary-label">未解决</span>
          <span className="dl-summary-value">{openStabilityItems.length}</span>
        </div>
        <div className="dl-summary-card">
          <span className="dl-summary-label">排查中</span>
          <span className="dl-summary-value">{stabilitySummary.diagnosing}</span>
        </div>
        <div className="dl-summary-card">
          <span className="dl-summary-label">已解决</span>
          <span className="dl-summary-value">{stabilitySummary.resolved}</span>
        </div>
        <div className="dl-summary-card">
          <span className="dl-summary-label">紧急</span>
          <span className="dl-summary-value">{stabilitySummary.critical}</span>
        </div>
        <div className="dl-summary-card">
          <span className="dl-summary-label">自动观察</span>
          <span className="dl-summary-value">
            {autoObservationEnabled ? "开" : "关"}
          </span>
        </div>
      </div>
      <div className="dl-session-body dl-stability-panel-body">
        <div className="dl-session-section">
          <div className="dl-session-section-header">
            <h4 className="dl-session-section-title">
              {isStabilityComposerOpen
                ? stabilityEditingId
                  ? "编辑问题"
                  : "记录问题"
                : "快速记录"}
            </h4>
          </div>
          <div className="dl-session-detail">
            <div className="dl-detail-card">
              <div className="dl-stability-form">
                {isStabilityComposerOpen ? (
                  <>
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
                  </>
                ) : (
                  <div className="dl-stability-form-actions">
                    <div className="dl-stability-form-actions-right">
                      <button
                        className="dl-popup-action"
                        data-kind="primary"
                        onClick={() => onOpenComposer()}
                      >
                        新建问题
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="dl-session-section">
          <div className="dl-session-section-header">
            <h4 className="dl-session-section-title">当前待处理</h4>
            <span className="dl-session-section-count">{openStabilityItems.length}</span>
          </div>
          <div className="dl-session-list">
            {openStabilityItems.length === 0 ? (
              <div className="dl-session-empty">
                还没有未解决的稳定性问题。可以先记录一条问题，再把它复制给 AI 做诊断。
              </div>
            ) : (
              openStabilityItems.map((item) => (
                <article
                  key={item.id}
                  className="dl-annotation-card"
                  data-status={item.status}
                  data-selected={item.id === stabilityActiveId}
                  onClick={() => onSelectStabilityItem(item.id)}
                >
                  <div className="dl-annotation-main">
                    <div className="dl-annotation-top">
                      <span className="dl-status-pill" data-status={item.status}>
                        {getStabilityStatusLabel(item.status)}
                      </span>
                      <span className="dl-severity-pill" data-severity={item.severity}>
                        {getStabilitySeverityLabel(item.severity)}
                      </span>
                    </div>
                    <h4 className="dl-stability-title">{item.title}</h4>
                    <p className="dl-stability-summary">{item.symptom}</p>
                  </div>
                  <div className="dl-annotation-side">
                    <span className="dl-annotation-time">{formatTime(item.updatedAt)}</span>
                    <span className="dl-annotation-chevron">›</span>
                  </div>
                </article>
              ))
            )}
          </div>
        </div>

        {resolvedStabilityItems.length > 0 ? (
          <div className="dl-session-section">
            <div className="dl-session-section-header">
              <h4 className="dl-session-section-title">已解决历史</h4>
              <span className="dl-session-section-count">{resolvedStabilityItems.length}</span>
            </div>
            <div className="dl-session-list">
              {resolvedStabilityItems.map((item) => (
                <article
                  key={item.id}
                  className="dl-annotation-card"
                  data-status={item.status}
                  data-selected={item.id === stabilityActiveId}
                  onClick={() => onSelectStabilityItem(item.id)}
                >
                  <div className="dl-annotation-main">
                    <div className="dl-annotation-top">
                      <span className="dl-status-pill" data-status={item.status}>
                        {getStabilityStatusLabel(item.status)}
                      </span>
                      <span className="dl-severity-pill" data-severity={item.severity}>
                        {getStabilitySeverityLabel(item.severity)}
                      </span>
                    </div>
                    <h4 className="dl-stability-title">{item.title}</h4>
                    <p className="dl-stability-summary">{item.symptom}</p>
                  </div>
                  <div className="dl-annotation-side">
                    <span className="dl-annotation-time">{formatTime(item.updatedAt)}</span>
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
          </div>
          <div className="dl-session-detail">
            {activeStabilityItem ? (
              <>
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
                  <div className="dl-detail-body">{activeStabilityItem.symptom}</div>
                </div>

                <div className="dl-detail-card">
                  <h4 className="dl-detail-title">问题上下文</h4>
                  <div className="dl-detail-meta">
                    {activeStabilityItem.reproSteps ? (
                      <div className="dl-detail-kv" style={{ gridColumn: "1 / -1" }}>
                        <strong>复现步骤</strong>
                        <span>{activeStabilityItem.reproSteps}</span>
                      </div>
                    ) : null}
                    {activeStabilityItem.impact ? (
                      <div className="dl-detail-kv" style={{ gridColumn: "1 / -1" }}>
                        <strong>影响范围</strong>
                        <span>{activeStabilityItem.impact}</span>
                      </div>
                    ) : null}
                    {activeStabilityItem.signals ? (
                      <div className="dl-detail-kv" style={{ gridColumn: "1 / -1" }}>
                        <strong>技术线索</strong>
                        <span>{activeStabilityItem.signals}</span>
                      </div>
                    ) : null}
                    {activeStabilityItem.fixGoal ? (
                      <div className="dl-detail-kv" style={{ gridColumn: "1 / -1" }}>
                        <strong>修复目标</strong>
                        <span>{activeStabilityItem.fixGoal}</span>
                      </div>
                    ) : null}
                    <div className="dl-detail-kv">
                      <strong>页面标题</strong>
                      <span>{activeStabilityItem.context.title}</span>
                    </div>
                    <div className="dl-detail-kv">
                      <strong>路径</strong>
                      <span>{activeStabilityItem.context.pathname}</span>
                    </div>
                    <div className="dl-detail-kv" style={{ gridColumn: "1 / -1" }}>
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
                      <strong>未完成标注</strong>
                      <span>{activeStabilityItem.context.openAnnotationCount}</span>
                    </div>
                    {activeStabilityItem.context.sessionId ? (
                      <div className="dl-detail-kv" style={{ gridColumn: "1 / -1" }}>
                        <strong>Session</strong>
                        <span>{activeStabilityItem.context.sessionId}</span>
                      </div>
                    ) : null}
                    {activeStabilityItem.context.openAnnotationComments.length > 0 ? (
                      <div className="dl-detail-kv" style={{ gridColumn: "1 / -1" }}>
                        <strong>关联标注</strong>
                        <div className="dl-detail-chip-list">
                          {activeStabilityItem.context.openAnnotationComments.map((entry) => (
                            <span key={entry} className="dl-detail-chip">
                              {entry}
                            </span>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="dl-detail-card">
                  <h4 className="dl-detail-title">动作</h4>
                  <div className="dl-detail-actions">
                    <button
                      className="dl-popup-action"
                      data-kind="ghost"
                      onClick={() => onCopyStabilityItem(activeStabilityItem)}
                    >
                      复制给 AI
                    </button>
                    <button
                      className="dl-popup-action"
                      data-kind="primary"
                      disabled={
                        latestActiveRepairRequest?.status === "requested" ||
                        latestActiveRepairRequest?.status === "accepted"
                      }
                      onClick={() => onRequestRepair(activeStabilityItem)}
                    >
                      {latestActiveRepairRequest
                        ? latestActiveRepairRequest.status === "requested"
                          ? "已请求修复"
                          : latestActiveRepairRequest.status === "accepted"
                            ? "修复处理中"
                            : latestActiveRepairRequest.status === "completed"
                              ? "再次发起修复"
                              : "重新请求修复"
                        : repairTargetId === activeStabilityItem.id
                          ? repairState === "requested"
                            ? "已生成修复请求"
                            : repairState === "failed"
                              ? "修复请求失败"
                              : "修复"
                          : "修复"}
                    </button>
                    <button
                      className="dl-popup-action"
                      data-kind="ghost"
                      onClick={() => onOpenComposer(activeStabilityItem)}
                    >
                      编辑问题
                    </button>
                    {activeStabilityItem.status === "open" ? (
                      <button
                        className="dl-popup-action"
                        data-kind="ghost"
                        onClick={() =>
                          onSetStabilityItemStatus(
                            activeStabilityItem.id,
                            "diagnosing",
                          )
                        }
                      >
                        标记排查中
                      </button>
                    ) : null}
                    {activeStabilityItem.status === "diagnosing" ? (
                      <button
                        className="dl-popup-action"
                        data-kind="ghost"
                        onClick={() =>
                          onSetStabilityItemStatus(activeStabilityItem.id, "open")
                        }
                      >
                        重新设为待处理
                      </button>
                    ) : null}
                    {activeStabilityItem.status === "resolved" ? (
                      <button
                        className="dl-popup-action"
                        data-kind="ghost"
                        onClick={() =>
                          onSetStabilityItemStatus(activeStabilityItem.id, "open")
                        }
                      >
                        重新打开
                      </button>
                    ) : (
                      <button
                        className="dl-popup-action"
                        data-kind="primary"
                        onClick={() =>
                          onSetStabilityItemStatus(
                            activeStabilityItem.id,
                            "resolved",
                          )
                        }
                      >
                        标记已解决
                      </button>
                    )}
                    <button
                      className="dl-popup-action"
                      data-kind="danger"
                      onClick={() => onDeleteStabilityItem(activeStabilityItem)}
                    >
                      删除问题
                    </button>
                  </div>
                </div>

                <div className="dl-detail-card">
                  <h4 className="dl-detail-title">修复请求</h4>
                  {latestActiveRepairRequest ? (
                    <div className="dl-detail-meta">
                      <div className="dl-detail-kv">
                        <strong>状态</strong>
                        <span>
                          {getRepairRequestStatusLabel(
                            latestActiveRepairRequest.status,
                          )}
                        </span>
                      </div>
                      <div className="dl-detail-kv">
                        <strong>请求时间</strong>
                        <span>{formatTime(latestActiveRepairRequest.createdAt)}</span>
                      </div>
                      <div className="dl-detail-kv">
                        <strong>请求方</strong>
                        <span>
                          {latestActiveRepairRequest.requestedBy === "human"
                            ? "人工触发"
                            : "Agent"}
                        </span>
                      </div>
                      {latestActiveRepairRequest.completedAt ? (
                        <div className="dl-detail-kv">
                          <strong>完成时间</strong>
                          <span>
                            {formatTime(latestActiveRepairRequest.completedAt)}
                          </span>
                        </div>
                      ) : null}
                      {latestActiveRepairRequest.resultSummary ? (
                        <div className="dl-detail-kv" style={{ gridColumn: "1 / -1" }}>
                          <strong>处理结果</strong>
                          <span>{latestActiveRepairRequest.resultSummary}</span>
                        </div>
                      ) : null}
                    </div>
                  ) : (
                    <div className="dl-detail-empty">
                      还没有修复请求。点击上面的“修复”后，Claude
                      会只处理这类显式请求。
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="dl-detail-empty">
                先从上面的列表里选择一条稳定性问题，或者直接创建一条新问题。
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
