import { CopilotState, IncidentRecord } from '../../sdk-core/src'

export interface WidgetUiState {
  activeTab: 'overview' | 'chat'
  contextCollapsed: boolean
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function roleLabel(role: 'system' | 'user' | 'assistant'): string {
  if (role === 'user') {
    return '你'
  }
  if (role === 'assistant') {
    return '副驾'
  }
  return '系统'
}

function selectedIncident(
  state: CopilotState
): IncidentRecord | undefined {
  return (
    state.incidents.find(
      (incident) => incident.event.id === state.selectedIncidentId
    ) || state.incidents[0]
  )
}

function compactJson(value: unknown): string {
  return escapeHtml(JSON.stringify(value, null, 2))
}

function tryParseJson(
  value?: string
): Record<string, unknown> | null {
  if (!value) {
    return null
  }
  try {
    const parsed = JSON.parse(value) as Record<string, unknown>
    return parsed && typeof parsed === 'object' ? parsed : null
  } catch {
    return null
  }
}

function renderDataList(
  items: string[],
  emptyText: string
): string {
  return items.length
    ? `<ul>${items
        .map((item) => `<li>${escapeHtml(item)}</li>`)
        .join('')}</ul>`
    : `<div class="scp-card-empty">${emptyText}</div>`
}

function renderExecutionTrace(
  current: IncidentRecord
): string {
  const stepMarkup = current.analysis.steps.length
    ? current.analysis.steps
        .map(
          (step) => `
            <div class="scp-trace-row">
              <div class="scp-trace-main">
                <strong>${escapeHtml(step.stepName)}</strong>
                <span>${step.status === 'done' ? '已完成' : '进行中'}</span>
              </div>
            </div>
          `
        )
        .join('')
    : '<div class="scp-card-empty">当前还没有 step 轨迹。</div>'

  const toolMarkup = current.analysis.tools.length
    ? current.analysis.tools
        .map(
          (tool) => `
            <div class="scp-trace-row">
              <div class="scp-trace-main">
                <strong>${escapeHtml(tool.toolCallName)}</strong>
                <span>${tool.status === 'done' ? '已完成' : '进行中'}</span>
              </div>
              ${
                tool.argsText
                  ? `<div class="scp-trace-detail"><span>参数</span><pre>${escapeHtml(tool.argsText)}</pre></div>`
                  : ''
              }
              ${
                tool.resultText
                  ? `<div class="scp-trace-detail"><span>结果</span><pre>${escapeHtml(tool.resultText)}</pre></div>`
                  : ''
              }
            </div>
          `
        )
        .join('')
    : '<div class="scp-card-empty">当前还没有 tool 调用。</div>'

  return `
    <div class="scp-execution-grid">
      <div>
        <h5>Step</h5>
        <div class="scp-trace-list">${stepMarkup}</div>
      </div>
      <div>
        <h5>Tool</h5>
        <div class="scp-trace-list">${toolMarkup}</div>
      </div>
    </div>
  `
}

function renderCodeFixSummary(
  current: IncidentRecord
): string {
  const fixTool = [...current.analysis.tools]
    .reverse()
    .find((tool) => tool.toolCallName === 'local_code_fix')

  if (!fixTool?.resultText) {
    return ''
  }

  const result = tryParseJson(fixTool.resultText)
  if (!result) {
    return ''
  }

  const file = typeof result.file === 'string' ? result.file : ''
  const line =
    typeof result.line === 'number'
      ? String(result.line)
      : typeof result.line === 'string'
        ? result.line
        : ''
  const applied = result.applied === true
  const before =
    typeof result.before === 'string'
      ? result.before
      : typeof result.beforeLineText === 'string'
        ? result.beforeLineText
        : ''
  const after =
    typeof result.after === 'string'
      ? result.after
      : typeof result.afterLineText === 'string'
        ? result.afterLineText
        : ''
  const reason =
    typeof result.reason === 'string' ? result.reason : ''

  return `
    <div class="scp-analysis-card scp-analysis-card-summary">
      <h4>修复结果</h4>
      <div class="scp-fix-summary">
        <div class="scp-fix-meta">
          <span class="scp-fix-badge ${applied ? 'is-success' : 'is-pending'}">${applied ? '已修改代码' : '未自动修改'}</span>
          ${file ? `<span>${escapeHtml(file)}${line ? `:${escapeHtml(line)}` : ''}</span>` : ''}
        </div>
        ${
          applied && (before || after)
            ? `<div class="scp-fix-diff">
                ${before ? `<div class="scp-fix-line is-before">- ${escapeHtml(before)}</div>` : ''}
                ${after ? `<div class="scp-fix-line is-after">+ ${escapeHtml(after)}</div>` : ''}
              </div>`
            : ''
        }
        ${
          !applied && reason
            ? `<div class="scp-card-empty">${escapeHtml(reason)}</div>`
            : ''
        }
      </div>
    </div>
  `
}

function normalizeStatus(status: string): string {
  const map = {
    idle: '等待分析',
    loading: '分析中',
    done: '已完成',
    error: '分析失败',
  } as const
  return map[status as keyof typeof map] || status
}

export function renderCopilotMarkup(
  state: CopilotState,
  uiState: WidgetUiState = {
    activeTab: 'overview',
    contextCollapsed: false,
  }
): string {
  const current = selectedIncident(state)
  const incidentsMarkup = state.incidents.length
    ? state.incidents
        .map((incident) => {
          const active =
            incident.event.id === current?.event.id
              ? 'is-active'
              : ''
          return `
            <button class="scp-incident ${active}" data-action="select-incident" data-incident-id="${incident.event.id}">
              <div class="scp-incident-title">${escapeHtml(incident.event.title)}</div>
              <div class="scp-incident-meta">${incident.event.kind} · ${incident.event.route}</div>
              <div class="scp-incident-meta">${new Date(incident.event.timestamp).toLocaleTimeString()} · x${incident.event.count}</div>
            </button>
          `
        })
        .join('')
    : '<div class="scp-empty">还没有捕获到异常。</div>'

  const conversationMarkup = current
    ? current.conversation.length
      ? current.conversation
          .map(
            (turn) => `
              <div class="scp-message scp-message-${turn.role}">
                <div class="scp-message-role">${roleLabel(turn.role)}</div>
                <div class="scp-message-content">${escapeHtml(turn.content)}</div>
              </div>
            `
          )
          .join('')
      : '<div class="scp-empty">等待首条分析结果。</div>'
    : '<div class="scp-empty">请选择一个异常进行查看。</div>'

  const analysisMarkup = current
    ? (() => {
        const sourceLabel = current.analysis.source?.includes('llm')
          ? '模型分析'
          : current.analysis.source?.includes('heuristic')
            ? '规则回退'
            : ''
        const statusChips = [
          `状态：${normalizeStatus(current.status)}`,
          sourceLabel ? `来源：${sourceLabel}` : '',
        ]
          .filter(Boolean)
          .map(
            (item) =>
              `<span class="scp-status-chip">${escapeHtml(item)}</span>`
          )
          .join('')

        return `
          <section class="scp-overview">
            <div class="scp-overview-header">
              <div class="scp-panel-title">
                <h4>诊断概览</h4>
                <p class="scp-panel-desc">结构化诊断常驻展示，便于一眼扫清问题要点。</p>
              </div>
              <div class="scp-status-chips">${statusChips}</div>
            </div>
            <div class="scp-overview-grid">
              ${renderCodeFixSummary(current)}
              <div class="scp-analysis-card scp-analysis-card-summary">
                <h4>结论摘要</h4>
                <p>${escapeHtml(current.analysis.summary || '暂时还没有分析摘要。')}${current.error ? `<br/><span class="scp-card-error">${escapeHtml(current.error)}</span>` : ''}</p>
              </div>
              <div class="scp-analysis-card">
                <h4>可能原因</h4>
                <div class="scp-card-scroll">${renderDataList(current.analysis.possibleCauses, '暂时还没有内容。')}</div>
              </div>
              <div class="scp-analysis-card">
                <h4>诊断依据</h4>
                <div class="scp-card-scroll">${renderDataList(current.analysis.evidence, '暂时还没有内容。')}</div>
              </div>
              <div class="scp-analysis-card">
                <h4>建议排查步骤</h4>
                <div class="scp-card-scroll">${renderDataList(current.analysis.nextSteps, '暂时还没有内容。')}</div>
              </div>
              <div class="scp-analysis-card">
                <h4>缺失上下文</h4>
                <div class="scp-card-scroll">${renderDataList(current.analysis.missingContext, '当前没有额外缺失项。')}</div>
              </div>
              <div class="scp-analysis-card scp-analysis-card-summary">
                <h4>执行过程</h4>
                <div class="scp-card-scroll">${renderExecutionTrace(current)}</div>
              </div>
            </div>
          </section>
        `
      })()
    : '<div class="scp-empty">当前还没有选中的分析结果。</div>'

  const contextMarkup = compactJson({
    route: state.route,
    query: state.query,
    title: state.title,
    lastAction: state.lastAction,
    selectedIncident: current?.event,
  })

  const tabMarkup = `
    <div class="scp-tabbar">
      <button class="scp-tab ${uiState.activeTab === 'overview' ? 'is-active' : ''}" data-action="switch-tab" data-tab="overview">诊断概览</button>
      <button class="scp-tab ${uiState.activeTab === 'chat' ? 'is-active' : ''}" data-action="switch-tab" data-tab="chat">分析对话</button>
    </div>
  `

  return `
    <button class="scp-fab" data-action="toggle-fab">
      稳定性副驾${state.unreadCount ? ` (${state.unreadCount})` : ''}
    </button>
    <section class="scp-drawer ${state.isOpen ? 'is-open' : ''}">
      <header class="scp-header">
        <div>
          <h3>稳定性副驾</h3>
          <p>自动分析异常，并支持继续追问排查建议。</p>
        </div>
        <button class="scp-close" data-action="toggle-close">关闭</button>
      </header>
      <div class="scp-grid ${uiState.contextCollapsed ? 'is-context-collapsed' : ''}">
        <aside class="scp-panel">
          <div class="scp-panel-title">
            <h4>异常列表</h4>
            <p class="scp-panel-desc">按时间倒序查看最近异常，可随时切换调查对象。</p>
          </div>
          <div class="scp-scroll">${incidentsMarkup}</div>
        </aside>
        <main class="scp-panel scp-panel-main">
          ${tabMarkup}
          <div class="scp-main-shell">
            <section class="scp-tabpanel ${uiState.activeTab === 'overview' ? 'is-active' : ''}">
              ${analysisMarkup}
            </section>
            <section class="scp-tabpanel ${uiState.activeTab === 'chat' ? 'is-active' : ''}">
              <div class="scp-chat-section">
                <div class="scp-panel-title">
                  <h4>分析对话</h4>
                  <p class="scp-panel-desc">这里展示你和副驾的自然对话，不重复展示结构化摘要。</p>
                </div>
                <div class="scp-scroll scp-conversation">${conversationMarkup}</div>
              </div>
            </section>
          </div>
          ${
            uiState.activeTab === 'chat'
              ? `<form class="scp-ask-form" data-action="ask">
                  <textarea name="question" rows="3" placeholder="继续追问：为什么会发生，下一步该怎么排查？" ${current ? '' : 'disabled'}></textarea>
                  <button type="submit" ${current ? '' : 'disabled'}>发送</button>
                </form>`
              : ''
          }
        </main>
        <aside class="scp-panel scp-panel-context">
          <div class="scp-context-header">
            <div class="scp-panel-title">
              <h4>上下文</h4>
              <p class="scp-panel-desc">只保留原始 JSON，需要时再展开查看。</p>
            </div>
            <button class="scp-context-toggle" data-action="toggle-context">
              ${uiState.contextCollapsed ? '展开' : '收起'}
            </button>
          </div>
          <div class="scp-scroll scp-context-scroll">
            <pre>${contextMarkup}</pre>
          </div>
        </aside>
      </div>
    </section>
  `
}

export const widgetStyles = `
  :host {
    all: initial;
    position: fixed;
    inset: 0;
    pointer-events: none;
    font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
    z-index: 2147483646;
  }
  .scp-fab,
  .scp-drawer,
  .scp-drawer * {
    box-sizing: border-box;
  }
  .scp-fab {
    pointer-events: auto;
    position: fixed;
    right: 24px;
    bottom: 24px;
    border: 0;
    border-radius: 999px;
    padding: 12px 18px;
    background: #102542;
    color: #f8fafc;
    font-weight: 700;
    cursor: pointer;
    box-shadow: 0 14px 32px rgba(16, 37, 66, 0.28);
  }
  .scp-drawer {
    pointer-events: auto;
    position: fixed;
    right: 16px;
    top: 16px;
    bottom: 72px;
    width: min(1380px, calc(100vw - 32px));
    display: none;
    flex-direction: column;
    background: #f8fafc;
    border-radius: 24px;
    box-shadow: 0 24px 60px rgba(15, 23, 42, 0.24);
    border: 1px solid rgba(148, 163, 184, 0.35);
    overflow: hidden;
  }
  .scp-drawer.is-open {
    display: flex;
  }
  .scp-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 20px 24px;
    border-bottom: 1px solid #dbe4f0;
    background: linear-gradient(135deg, #102542 0%, #1f4e79 100%);
    color: #f8fafc;
  }
  .scp-header h3,
  .scp-header p,
  .scp-panel h4 {
    margin: 0;
  }
  .scp-header p {
    margin-top: 6px;
    font-size: 12px;
    opacity: 0.85;
  }
  .scp-close {
    border: 0;
    border-radius: 999px;
    padding: 8px 14px;
    background: rgba(248, 250, 252, 0.16);
    color: #f8fafc;
    cursor: pointer;
  }
  .scp-grid {
    display: grid;
    grid-template-columns: 260px minmax(560px, 1fr) 360px;
    gap: 0;
    height: 100%;
    min-height: 0;
  }
  .scp-grid.is-context-collapsed {
    grid-template-columns: 260px minmax(640px, 1fr) 68px;
  }
  .scp-panel {
    display: flex;
    flex-direction: column;
    min-height: 0;
    padding: 20px;
    border-right: 1px solid #dbe4f0;
    background: #f8fafc;
    overflow: hidden;
  }
  .scp-panel-main {
    background: #fff;
  }
  .scp-panel-context {
    background: #f8fafc;
  }
  .scp-grid.is-context-collapsed .scp-panel-context {
    padding-left: 12px;
    padding-right: 12px;
  }
  .scp-grid.is-context-collapsed .scp-context-scroll,
  .scp-grid.is-context-collapsed .scp-panel-context .scp-panel-desc,
  .scp-grid.is-context-collapsed .scp-panel-context pre {
    display: none;
  }
  .scp-panel:last-child {
    border-right: 0;
  }
  .scp-context-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 8px;
  }
  .scp-context-toggle {
    border: 0;
    border-radius: 999px;
    padding: 8px 12px;
    background: #e2ecf8;
    color: #1f4e79;
    cursor: pointer;
    font-size: 12px;
    font-weight: 700;
  }
  .scp-panel-title {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .scp-panel-desc {
    margin: 0;
    font-size: 12px;
    line-height: 1.5;
    color: #64748b;
  }
  .scp-scroll {
    overflow: auto;
    min-height: 0;
    flex: 1 1 auto;
    margin-top: 16px;
    padding-right: 6px;
  }
  .scp-main-shell {
    flex: 1 1 auto;
    min-height: 0;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
  .scp-tabbar {
    display: flex;
    gap: 10px;
    padding-bottom: 12px;
    border-bottom: 1px solid #dbe4f0;
    margin-bottom: 12px;
  }
  .scp-tab {
    border: 0;
    border-radius: 999px;
    padding: 10px 16px;
    background: #e2e8f0;
    color: #334155;
    font-weight: 700;
    cursor: pointer;
  }
  .scp-tab.is-active {
    background: #1f4e79;
    color: #fff;
  }
  .scp-tabpanel {
    display: none;
    min-height: 0;
    flex: 1 1 auto;
  }
  .scp-tabpanel.is-active {
    display: flex;
  }
  .scp-overview {
    display: flex;
    flex-direction: column;
    gap: 12px;
    min-height: 0;
    flex: 1 1 auto;
  }
  .scp-overview-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 12px;
  }
  .scp-status-chips {
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-end;
    gap: 8px;
  }
  .scp-status-chip {
    display: inline-flex;
    align-items: center;
    padding: 6px 10px;
    border-radius: 999px;
    background: #e2ecf8;
    color: #1f4e79;
    font-size: 12px;
    font-weight: 700;
  }
  .scp-overview-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
    min-height: 0;
    overflow: auto;
    padding-right: 6px;
  }
  .scp-analysis-card-summary {
    grid-column: 1 / -1;
  }
  .scp-fix-summary {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .scp-fix-meta {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
    color: #334155;
    font-size: 13px;
  }
  .scp-fix-badge {
    display: inline-flex;
    align-items: center;
    padding: 6px 10px;
    border-radius: 999px;
    font-size: 12px;
    font-weight: 700;
  }
  .scp-fix-badge.is-success {
    background: #dcfce7;
    color: #166534;
  }
  .scp-fix-badge.is-pending {
    background: #fef3c7;
    color: #92400e;
  }
  .scp-fix-diff {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .scp-fix-line {
    border-radius: 12px;
    padding: 10px 12px;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 12px;
    white-space: pre-wrap;
    word-break: break-word;
  }
  .scp-fix-line.is-before {
    background: #fef2f2;
    color: #991b1b;
  }
  .scp-fix-line.is-after {
    background: #f0fdf4;
    color: #166534;
  }
  .scp-execution-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 16px;
  }
  .scp-execution-grid h5 {
    margin: 0 0 8px;
    font-size: 13px;
    color: #1f4e79;
  }
  .scp-trace-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .scp-trace-row {
    border: 1px solid #dbe4f0;
    border-radius: 12px;
    padding: 10px;
    background: #f8fbff;
  }
  .scp-trace-main {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 8px;
    font-size: 12px;
    color: #334155;
  }
  .scp-trace-detail {
    margin-top: 8px;
  }
  .scp-trace-detail span {
    display: block;
    margin-bottom: 4px;
    font-size: 11px;
    font-weight: 700;
    color: #64748b;
  }
  .scp-trace-detail pre {
    margin: 0;
    padding: 8px;
    background: #eef4fb;
    border-radius: 8px;
    font-size: 11px;
    line-height: 1.5;
  }
  .scp-chat-section {
    display: flex;
    flex-direction: column;
    gap: 12px;
    min-height: 0;
    flex: 1 1 auto;
  }
  .scp-incident {
    width: 100%;
    border: 1px solid #dbe4f0;
    border-radius: 16px;
    background: #fff;
    padding: 12px;
    margin-bottom: 12px;
    text-align: left;
    cursor: pointer;
  }
  .scp-incident.is-active {
    border-color: #1f4e79;
    box-shadow: inset 0 0 0 1px #1f4e79;
  }
  .scp-incident-title {
    font-size: 14px;
    font-weight: 700;
    color: #102542;
    line-height: 1.4;
  }
  .scp-incident-meta {
    margin-top: 6px;
    font-size: 12px;
    color: #64748b;
    line-height: 1.5;
    word-break: break-word;
  }
  .scp-message {
    margin-bottom: 12px;
    padding: 12px;
    border-radius: 16px;
    max-width: 92%;
  }
  .scp-message-user {
    background: #e0f2fe;
    margin-left: auto;
  }
  .scp-message-assistant {
    background: #ecfccb;
  }
  .scp-message-content {
    margin-top: 8px;
    white-space: pre-wrap;
    word-break: break-word;
    font-size: 13px;
    line-height: 1.6;
    color: #0f172a;
  }
  .scp-panel pre {
    white-space: pre-wrap;
    word-break: break-word;
    margin: 8px 0 0;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 12px;
  }
  .scp-message-role {
    font-size: 12px;
    font-weight: 700;
    color: #1f4e79;
  }
  .scp-analysis-card {
    padding: 12px;
    border: 1px solid #dbe4f0;
    border-radius: 16px;
    background: #f8fafc;
    min-width: 0;
    min-height: 0;
    display: flex;
    flex-direction: column;
  }
  .scp-analysis-card h4 {
    margin-bottom: 8px;
    color: #102542;
  }
  .scp-analysis-card p,
  .scp-analysis-card ul {
    margin: 0;
    font-size: 13px;
    line-height: 1.6;
    color: #334155;
  }
  .scp-analysis-card ul {
    padding-left: 18px;
  }
  .scp-card-scroll {
    overflow: auto;
    min-height: 0;
    flex: 1 1 auto;
  }
  .scp-card-empty {
    font-size: 13px;
    line-height: 1.6;
    color: #64748b;
  }
  .scp-card-error {
    display: inline-block;
    margin-top: 8px;
    color: #b91c1c;
  }
  .scp-context-scroll {
    margin-top: 16px;
  }
  .scp-context-scroll pre {
    margin: 0;
    padding: 12px;
    border: 1px solid #dbe4f0;
    border-radius: 16px;
    background: #fff;
    min-height: 100%;
  }
  .scp-ask-form {
    display: grid;
    gap: 12px;
    margin-top: 12px;
    padding-top: 12px;
    border-top: 1px solid #dbe4f0;
    flex: 0 0 auto;
  }
  .scp-ask-form textarea {
    width: 100%;
    border-radius: 16px;
    border: 1px solid #cbd5e1;
    padding: 12px;
    resize: vertical;
    font: inherit;
  }
  .scp-ask-form button {
    justify-self: flex-end;
    border: 0;
    border-radius: 999px;
    padding: 10px 16px;
    background: #1f4e79;
    color: #fff;
    cursor: pointer;
  }
  .scp-empty {
    margin-top: 16px;
    color: #64748b;
    font-size: 13px;
  }
`
