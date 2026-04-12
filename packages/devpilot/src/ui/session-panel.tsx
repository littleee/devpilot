import React from "react";

import { getAnnotationKind } from "../output";
import { getAnnotationStatusLabel } from "../annotation/state";
import { formatTime } from "../shared/runtime";
import type {
  DevPilotAnnotation,
  DevPilotAnnotationStatus,
} from "../types";
import { CollapseIcon } from "./icons";

type CopyState = "idle" | "copied" | "failed";

interface AnnotationSummary {
  open: number;
  acknowledged: number;
  total: number;
}

interface SessionPanelProps {
  panelLeft: number;
  panelBottom: number;
  copyState: CopyState;
  summary: AnnotationSummary;
  annotations: DevPilotAnnotation[];
  openAnnotations: DevPilotAnnotation[];
  activeAnnotationId: string | null;
  activeAnnotation: DevPilotAnnotation | null;
  onCopy: () => void;
  onClose: () => void;
  onSelectAnnotation: (annotationId: string) => void;
  onOpenAnnotationEditor: (annotation: DevPilotAnnotation) => void;
  onSetAnnotationStatus: (
    annotationId: string,
    nextStatus: DevPilotAnnotationStatus,
  ) => void;
  onDeleteAnnotation: (annotation: DevPilotAnnotation) => void;
}

export function SessionPanel({
  panelLeft,
  panelBottom,
  copyState,
  summary,
  annotations,
  openAnnotations,
  activeAnnotationId,
  activeAnnotation,
  onCopy,
  onClose,
  onSelectAnnotation,
  onOpenAnnotationEditor,
  onSetAnnotationStatus,
  onDeleteAnnotation,
}: SessionPanelProps) {
  return (
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
            data-kind={
              copyState === "failed"
                ? "danger"
                : copyState === "copied"
                  ? "primary"
                  : "ghost"
            }
            disabled={openAnnotations.length === 0}
            onClick={onCopy}
            title="复制本页仍需处理的标注信息"
          >
            {copyState === "copied"
              ? "已复制当前标注"
              : copyState === "failed"
                ? "复制失败"
                : "复制当前标注"}
          </button>
          <button
            className="dl-toolbar-icon-button"
            data-kind="secondary"
            onClick={onClose}
            title="关闭会话面板"
          >
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
          <span className="dl-summary-label">当前总数</span>
          <span className="dl-summary-value">{summary.total}</span>
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
                  : "当前没有未完成标注。解决或忽略后的项目会直接从本页移除。"}
              </div>
            ) : (
              openAnnotations.map((annotation) => (
                <article
                  key={annotation.id}
                  className="dl-annotation-card"
                  data-status={annotation.status}
                  data-selected={annotation.id === activeAnnotationId}
                  onClick={() => onSelectAnnotation(annotation.id)}
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
                    <span className="dl-annotation-time">
                      {formatTime(annotation.updatedAt)}
                    </span>
                    <span className="dl-annotation-chevron">›</span>
                  </div>
                </article>
              ))
            )}
          </div>
        </div>

        <div className="dl-session-section">
          <div className="dl-session-section-header">
            <h4 className="dl-session-section-title">当前详情</h4>
            <span className="dl-section-note">
              Claude / Cursor 回复后也会在这里继续展开
            </span>
          </div>
          <div className="dl-session-detail">
            {activeAnnotation ? (
              <>
                <div className="dl-detail-card">
                  <h4 className="dl-detail-title">当前标注</h4>
                  <div className="dl-detail-body">{activeAnnotation.comment}</div>
                  {getAnnotationKind(activeAnnotation) === "text" &&
                  activeAnnotation.selectedText ? (
                    <>
                      <div className="dl-section-note">选中文本</div>
                      <div className="dl-detail-quote">
                        {activeAnnotation.selectedText}
                      </div>
                    </>
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
                          {Math.round(activeAnnotation.rect.width)} ×{" "}
                          {Math.round(activeAnnotation.rect.height)}
                        </span>
                      </div>
                    ) : null}
                    {getAnnotationKind(activeAnnotation) === "area" ? (
                      <div className="dl-detail-kv">
                        <strong>命中数量</strong>
                        <span>
                          {activeAnnotation.matchCount ||
                            activeAnnotation.relatedElements?.length ||
                            0}{" "}
                          个元素
                        </span>
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
                      onClick={() => onOpenAnnotationEditor(activeAnnotation)}
                    >
                      编辑标注
                    </button>
                    {activeAnnotation.status === "pending" ? (
                      <button
                        className="dl-popup-action"
                        data-kind="ghost"
                        onClick={() =>
                          onSetAnnotationStatus(activeAnnotation.id, "acknowledged")
                        }
                      >
                        标记处理中
                      </button>
                    ) : null}
                    {activeAnnotation.status === "acknowledged" ? (
                      <button
                        className="dl-popup-action"
                        data-kind="ghost"
                        onClick={() =>
                          onSetAnnotationStatus(activeAnnotation.id, "pending")
                        }
                      >
                        重新设为待处理
                      </button>
                    ) : null}
                    <button
                      className="dl-popup-action"
                      data-kind="primary"
                      onClick={() =>
                        onSetAnnotationStatus(activeAnnotation.id, "resolved")
                      }
                    >
                      解决并移除
                    </button>
                    <button
                      className="dl-popup-action"
                      data-kind="danger"
                      onClick={() =>
                        onSetAnnotationStatus(activeAnnotation.id, "dismissed")
                      }
                    >
                      忽略并移除
                    </button>
                    <button
                      className="dl-popup-action"
                      data-kind="danger"
                      onClick={() => onDeleteAnnotation(activeAnnotation)}
                    >
                      删除标注
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="dl-detail-empty">
                先从左侧列表里选择一条标注。后续这里会继续接 Claude /
                Cursor 的回复、状态流转和源码命中信息。
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
