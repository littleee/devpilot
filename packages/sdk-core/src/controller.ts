import { streamDiagnostic } from './client/agent-client'
import { applyPatch, Operation } from 'fast-json-patch'
import {
  attachErrorCollector,
} from './collectors/error-collector'
import { attachInteractionCollector } from './collectors/interaction-collector'
import { attachNetworkCollector } from './collectors/network-collector'
import { attachRouteCollector } from './collectors/route-collector'
import {
  ContextSnapshot,
  ConversationTurn,
  CopilotAnalysisRequest,
  CopilotConfig,
  CopilotStateSnapshot,
  CopilotState,
  DiagnosticEvent,
  IncidentAnalysis,
  IncidentRecord,
  RecentEventSummary,
} from './types'
import {
  sanitizeContextSnapshot,
  sanitizeDiagnosticEvent,
} from './utils/masking'
import { buildFingerprint } from './utils/fingerprint'
import { AgUiEvent, AgUiEventType } from './protocol/agui'

type Listener = (state: CopilotState) => void

function asConversationRole(
  role: unknown
): ConversationTurn['role'] | null {
  if (role === 'assistant') {
    return 'assistant'
  }
  if (role === 'user') {
    return 'user'
  }
  if (role === 'system') {
    return 'system'
  }
  return null
}

const DEFAULT_ANALYSIS: IncidentAnalysis = {
  assistantReply: '',
  summary: '',
  possibleCauses: [],
  evidence: [],
  nextSteps: [],
  rawChunks: [],
  steps: [],
  tools: [],
  missingContext: [],
}

function cloneAnalysis(analysis: IncidentAnalysis): IncidentAnalysis {
  return {
    assistantReply: analysis.assistantReply,
    summary: analysis.summary,
    possibleCauses: [...analysis.possibleCauses],
    evidence: [...analysis.evidence],
    nextSteps: [...analysis.nextSteps],
    rawChunks: [...analysis.rawChunks],
    steps: analysis.steps.map((step) => ({ ...step })),
    tools: analysis.tools.map((tool) => ({ ...tool })),
    source: analysis.source,
    confidence: analysis.confidence,
    missingContext: [...analysis.missingContext],
  }
}

function makeId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`
}

function queryToObject(search: string): Record<string, string> {
  const query: Record<string, string> = {}
  const params = new URLSearchParams(search)
  params.forEach((value, key) => {
    query[key] = value
  })
  return query
}

function resolveEnabled(config: CopilotConfig): boolean {
  if (typeof config.enabled === 'boolean') {
    return config.enabled
  }
  return ['development', 'dev', 'local'].includes(config.env)
}

export class CopilotController {
  private config: CopilotConfig
  private state: CopilotState
  private listeners = new Set<Listener>()
  private cleanups: Array<() => void> = []
  private inFlight = new Map<string, AbortController>()
  private streamingMessages = new Map<
    string,
    { messageId: string; index: number }
  >()
  private streamedRuns = new Set<string>()

  constructor(config: CopilotConfig) {
    this.config = config
    this.state = {
      incidents: [],
      selectedIncidentId: undefined,
      unreadCount: 0,
      isOpen: false,
      route: window.location.pathname,
      query: queryToObject(window.location.search),
      title: document.title,
    }
  }

  public start(): void {
    if (!resolveEnabled(this.config)) {
      return
    }
    this.cleanups.push(
      attachErrorCollector({
        onEvent: (event) => {
          this.ingestEvent(event, true)
        },
        getRoute: () => this.state.route,
      })
    )
    this.cleanups.push(
      attachInteractionCollector((action) => {
        this.state.lastAction = action
        this.emit()
      })
    )
    this.cleanups.push(
      attachRouteCollector(() => {
        this.state.route = window.location.pathname
        this.state.query = queryToObject(window.location.search)
        this.state.title = document.title
        this.emit()
      })
    )
    this.cleanups.push(
      attachNetworkCollector({
        onEvent: (event) => {
          this.ingestEvent(event, true)
        },
        getRoute: () => this.state.route,
        ignoreBaseUrl: this.config.agentBaseUrl,
      })
    )
  }

  public subscribe(listener: Listener): () => void {
    this.listeners.add(listener)
    listener(this.getState())
    return () => {
      this.listeners.delete(listener)
    }
  }

  public getState(): CopilotState {
    return {
      ...this.state,
      incidents: this.state.incidents.map((record) => ({
        ...record,
        event: { ...record.event },
        conversation: [...record.conversation],
        analysis: cloneAnalysis(record.analysis),
      })),
    }
  }

  public open(): void {
    this.state.isOpen = true
    this.state.unreadCount = 0
    this.emit()
  }

  public close(): void {
    this.state.isOpen = false
    this.emit()
  }

  public selectIncident(incidentId: string): void {
    this.state.selectedIncidentId = incidentId
    this.emit()
  }

  public reportCustomEvent(
    partial: Pick<DiagnosticEvent, 'title' | 'message'> &
      Partial<DiagnosticEvent>
  ): void {
    const event: DiagnosticEvent = {
      id: partial.id || makeId('custom'),
      kind: partial.kind || 'custom',
      severity: partial.severity || 'medium',
      timestamp: partial.timestamp || Date.now(),
      title: partial.title,
      message: partial.message,
      route: partial.route || this.state.route,
      count: 1,
      stackTop: partial.stackTop,
      traceId: partial.traceId,
      request: partial.request,
      response: partial.response,
      customContext: partial.customContext,
      fingerprint: partial.fingerprint || '',
    }
    if (!event.fingerprint) {
      event.fingerprint = buildFingerprint(event)
    }
    this.ingestEvent(event, true)
  }

  public async followUp(
    incidentId: string,
    question: string
  ): Promise<void> {
    const incident = this.state.incidents.find(
      (record) => record.event.id === incidentId
    )
    if (!incident || !question.trim()) {
      return
    }
    const userTurn: ConversationTurn = {
      role: 'user',
      content: question.trim(),
      timestamp: Date.now(),
    }
    incident.conversation = [...incident.conversation, userTurn]
    this.emit()
    await this.runAnalysis(incident, 'manual')
  }

  public destroy(): void {
    this.cleanups.forEach((cleanup) => cleanup())
    this.cleanups = []
    this.inFlight.forEach((controller) => controller.abort())
    this.inFlight.clear()
    this.streamingMessages.clear()
    this.streamedRuns.clear()
    this.listeners.clear()
  }

  private ingestEvent(
    event: DiagnosticEvent,
    shouldAnalyze: boolean
  ): void {
    const deduped = this.tryDeduplicate(event)
    if (deduped) {
      if (!this.state.isOpen) {
        this.state.unreadCount += 1
      }
      this.emit()
      return
    }
    const incident: IncidentRecord = {
      event,
      conversation: [],
      analysis: cloneAnalysis(DEFAULT_ANALYSIS),
      status: 'idle',
    }
    this.state.incidents = [incident, ...this.state.incidents].slice(0, 30)
    this.state.selectedIncidentId =
      this.state.selectedIncidentId || event.id
    if (!this.state.isOpen) {
      this.state.unreadCount += 1
    }
    this.emit()
    if (shouldAnalyze) {
      void this.runAnalysis(incident, 'auto')
    }
  }

  private tryDeduplicate(event: DiagnosticEvent): boolean {
    const current = this.state.incidents.find(
      (record) =>
        record.event.fingerprint === event.fingerprint &&
        Math.abs(record.event.timestamp - event.timestamp) <= 3000
    )
    if (!current) {
      return false
    }
    current.event.count += 1
    current.event.timestamp = event.timestamp
    return true
  }

  private async buildContextSnapshot(): Promise<ContextSnapshot> {
    let customContext: Record<string, unknown> | undefined
    if (this.config.getContext) {
      try {
        customContext =
          (await this.config.getContext()) || undefined
      } catch (error) {
        customContext = {
          getContextError: (error as Error).message,
        }
      }
    }
    const recentEvents: RecentEventSummary[] = this.state.incidents
      .slice(0, 5)
      .map((record) => ({
        id: record.event.id,
        kind: record.event.kind,
        title: record.event.title,
        route: record.event.route,
        timestamp: record.event.timestamp,
        count: record.event.count,
      }))
    return sanitizeContextSnapshot(
      {
        url: window.location.href,
        route: this.state.route,
        query: this.state.query,
        title: this.state.title,
        env: this.config.env,
        app: {
          appId: this.config.appId,
          appName: this.config.appName,
        },
        recentEvents,
        lastAction: this.state.lastAction,
        customContext,
      },
      this.config.maskRules
    )
  }

  private async runAnalysis(
    incident: IncidentRecord,
    trigger: 'auto' | 'manual'
  ): Promise<void> {
    if (!this.config.agentBaseUrl) {
      incident.status = 'error'
      incident.error = '还没有配置 Agent 服务地址。'
      this.emit()
      return
    }
    const controller = new AbortController()
    const sanitizedEvent = sanitizeDiagnosticEvent(
      incident.event,
      this.config.maskRules
    )
    const context = await this.buildContextSnapshot()
    const request: CopilotAnalysisRequest = {
      trigger,
      threadId: incident.event.id,
      event: sanitizedEvent,
      context,
      conversation: incident.conversation,
      app: {
        appId: this.config.appId,
        appName: this.config.appName,
        env: this.config.env,
      },
    }
    incident.status = 'loading'
    incident.error = undefined
    if (trigger === 'auto') {
      incident.analysis = cloneAnalysis(DEFAULT_ANALYSIS)
    } else {
      incident.analysis.assistantReply = ''
      incident.analysis.rawChunks = []
    }
    this.streamingMessages.delete(incident.event.id)
    this.streamedRuns.delete(incident.event.id)
    this.inFlight.set(incident.event.id, controller)
    this.emit()
    try {
      await streamDiagnostic(this.config.agentBaseUrl, request, {
        signal: controller.signal,
        onEvent: (payload) => {
          this.applyStreamEvent(incident, payload, trigger)
        },
      })
    } catch (error) {
      incident.status = 'error'
      incident.error = (error as Error).message
    } finally {
      this.inFlight.delete(incident.event.id)
      this.emit()
    }
  }

  private applyStreamEvent(
    incident: IncidentRecord,
    payload: AgUiEvent,
    trigger: 'auto' | 'manual'
  ): void {
    const shouldApplyDiagnosisState =
      trigger === 'auto' ||
      !this.hasStructuredDiagnosis(incident.analysis)

    switch (payload.type) {
      case 'RUN_STARTED':
        incident.status = 'loading'
        break
      case 'STEP_STARTED':
        this.upsertStep(incident, {
          stepName: payload.stepName,
          status: 'running',
          startedAt: payload.timestamp || Date.now(),
        })
        break
      case 'STEP_FINISHED':
        this.upsertStep(incident, {
          stepName: payload.stepName,
          status: 'done',
          finishedAt: payload.timestamp || Date.now(),
        })
        break
      case 'STATE_SNAPSHOT':
        if (shouldApplyDiagnosisState && payload.snapshot) {
          this.applyStateSnapshot(incident, payload.snapshot)
        }
        break
      case 'STATE_DELTA':
        if (
          shouldApplyDiagnosisState &&
          Array.isArray(payload.delta)
        ) {
          this.applyStateDelta(incident, payload.delta)
        }
        break
      case 'MESSAGES_SNAPSHOT':
        incident.conversation = this.normalizeMessages(
          payload.messages
        )
        break
      case 'TEXT_MESSAGE_START':
        this.startStreamingMessage(incident, payload)
        break
      case 'TEXT_MESSAGE_CONTENT':
        incident.analysis.rawChunks.push(payload.delta)
        this.appendStreamingMessage(incident, payload)
        break
      case 'TEXT_MESSAGE_END':
        this.finishStreamingMessage(incident, payload)
        break
      case 'TOOL_CALL_START':
        this.upsertTool(incident, {
          toolCallId: payload.toolCallId,
          toolCallName: payload.toolCallName,
          parentMessageId: payload.parentMessageId,
          status: 'running',
          argsText: '',
          startedAt: payload.timestamp || Date.now(),
        })
        break
      case 'TOOL_CALL_ARGS':
        this.appendToolArgs(
          incident,
          payload.toolCallId,
          payload.delta
        )
        break
      case 'TOOL_CALL_END':
        this.finishTool(
          incident,
          payload.toolCallId,
          payload.timestamp || Date.now()
        )
        break
      case 'TOOL_CALL_RESULT':
        this.setToolResult(
          incident,
          payload.toolCallId,
          payload.content,
          payload.timestamp || Date.now()
        )
        break
      case 'RUN_ERROR':
        incident.status = 'error'
        incident.error = payload.message || 'Agent 流式分析失败。'
        this.streamingMessages.delete(incident.event.id)
        this.streamedRuns.delete(incident.event.id)
        break
      case 'RUN_FINISHED':
        incident.status = 'done'
        if (!this.streamedRuns.has(incident.event.id)) {
          incident.conversation = [
            ...incident.conversation,
            {
              role: 'assistant',
              content:
                incident.analysis.assistantReply ||
                this.composeAssistantMessage(incident.analysis),
              timestamp: Date.now(),
            },
          ]
        }
        this.streamingMessages.delete(incident.event.id)
        this.streamedRuns.delete(incident.event.id)
        break
      default:
        break
    }
    this.emit()
  }

  private startStreamingMessage(
    incident: IncidentRecord,
    payload: Extract<AgUiEvent, { type: 'TEXT_MESSAGE_START' }>
  ): void {
    const messageId = payload.messageId || makeId('msg')
    const role = asConversationRole(payload.role) || 'assistant'
    const index = incident.conversation.length
    incident.conversation = [
      ...incident.conversation,
      {
        role,
        content: '',
        timestamp: Date.now(),
      },
    ]
    this.streamingMessages.set(incident.event.id, { messageId, index })
    this.streamedRuns.add(incident.event.id)
  }

  private appendStreamingMessage(
    incident: IncidentRecord,
    payload: Extract<AgUiEvent, { type: 'TEXT_MESSAGE_CONTENT' }>
  ): void {
    const role: ConversationTurn['role'] = 'assistant'
    const content = payload.delta || ''
    let current = this.streamingMessages.get(incident.event.id)

    if (
      !current ||
      (payload.messageId && current.messageId !== payload.messageId)
    ) {
      this.startStreamingMessage(incident, {
        type: AgUiEventType.TEXT_MESSAGE_START,
        messageId: payload.messageId,
        role,
      })
      current = this.streamingMessages.get(incident.event.id)
    }

    if (!current) {
      return
    }

    const turn = incident.conversation[current.index]
    if (!turn) {
      return
    }

    incident.conversation = incident.conversation.map((item, index) =>
      index === current?.index
        ? {
            ...item,
            role,
            content: `${item.content}${content}`,
          }
        : item
    )

    const updatedTurn = incident.conversation[current.index]
    if (updatedTurn?.role === 'assistant') {
      incident.analysis.assistantReply = updatedTurn.content
    }
  }

  private finishStreamingMessage(
    incident: IncidentRecord,
    payload: Extract<AgUiEvent, { type: 'TEXT_MESSAGE_END' }>
  ): void {
    const current = this.streamingMessages.get(incident.event.id)
    if (
      current &&
      (!payload.messageId || payload.messageId === current.messageId)
    ) {
      this.streamingMessages.delete(incident.event.id)
    }
  }

  private normalizeMessages(
    messages: Array<Record<string, unknown>>
  ): ConversationTurn[] {
    return messages.reduce<ConversationTurn[]>((all, message) => {
      const role = asConversationRole(message.role)
      const content = this.normalizeMessageContent(message.content)
      if (!role || content === null) {
        return all
      }
      all.push({
        role,
        content,
        timestamp:
          typeof message.timestamp === 'number'
            ? message.timestamp
            : Date.now(),
      })
      return all
    }, [])
  }

  private normalizeMessageContent(
    value: unknown
  ): string | null {
    if (typeof value === 'string') {
      return value
    }
    if (typeof value === 'undefined') {
      return ''
    }
    if (!Array.isArray(value)) {
      return null
    }
    return value
      .map((item) => {
        if (
          item &&
          typeof item === 'object' &&
          (item as { type?: unknown }).type === 'text'
        ) {
          return String((item as { text?: unknown }).text || '')
        }
        return ''
      })
      .join('\n')
      .trim()
  }

  private composeAssistantMessage(
    analysis: IncidentAnalysis
  ): string {
    return analysis.summary
      ? `${analysis.summary}${analysis.nextSteps[0] ? `\n建议先从这一步开始：${analysis.nextSteps[0]}` : ''}`
      : '我已经更新了本轮诊断结果，你可以结合旁边的诊断卡片继续追问。'
  }

  private hasStructuredDiagnosis(
    analysis: IncidentAnalysis
  ): boolean {
    return Boolean(
      analysis.summary ||
        analysis.possibleCauses.length ||
        analysis.evidence.length ||
        analysis.nextSteps.length ||
        analysis.missingContext.length
    )
  }

  private applyStateDelta(
    incident: IncidentRecord,
    delta: Array<Record<string, unknown>>
  ): void {
    const nextSnapshot = this.buildStateSnapshot(incident)
    const patched = applyPatch(
      nextSnapshot as Record<string, unknown>,
      delta as unknown as Operation[],
      false,
      false
    )
    this.applyStateSnapshot(
      incident,
      (patched.newDocument ||
        nextSnapshot) as CopilotStateSnapshot
    )
  }

  private upsertStep(
    incident: IncidentRecord,
    nextStep: {
      stepName: string
      status: 'running' | 'done'
      startedAt?: number
      finishedAt?: number
    }
  ): void {
    const existingIndex = incident.analysis.steps.findIndex(
      (step) => step.stepName === nextStep.stepName
    )
    if (existingIndex === -1) {
      incident.analysis.steps = [
        ...incident.analysis.steps,
        { ...nextStep },
      ]
      return
    }
    incident.analysis.steps = incident.analysis.steps.map(
      (step, index) =>
        index === existingIndex
          ? {
              ...step,
              ...nextStep,
              startedAt:
                step.startedAt || nextStep.startedAt,
            }
          : step
    )
  }

  private upsertTool(
    incident: IncidentRecord,
    nextTool: {
      toolCallId: string
      toolCallName: string
      status: 'running' | 'done'
      parentMessageId?: string
      argsText: string
      startedAt?: number
      finishedAt?: number
      resultText?: string
    }
  ): void {
    const existingIndex = incident.analysis.tools.findIndex(
      (tool) => tool.toolCallId === nextTool.toolCallId
    )
    if (existingIndex === -1) {
      incident.analysis.tools = [
        ...incident.analysis.tools,
        { ...nextTool },
      ]
      return
    }
    incident.analysis.tools = incident.analysis.tools.map(
      (tool, index) =>
        index === existingIndex
          ? {
              ...tool,
              ...nextTool,
              startedAt:
                tool.startedAt || nextTool.startedAt,
            }
          : tool
    )
  }

  private appendToolArgs(
    incident: IncidentRecord,
    toolCallId: string,
    delta: string
  ): void {
    const existing = incident.analysis.tools.find(
      (tool) => tool.toolCallId === toolCallId
    )
    if (!existing) {
      this.upsertTool(incident, {
        toolCallId,
        toolCallName: toolCallId,
        status: 'running',
        argsText: delta,
      })
      return
    }
    incident.analysis.tools = incident.analysis.tools.map((tool) =>
      tool.toolCallId === toolCallId
        ? {
            ...tool,
            argsText: `${tool.argsText}${delta}`,
          }
        : tool
    )
  }

  private finishTool(
    incident: IncidentRecord,
    toolCallId: string,
    finishedAt: number
  ): void {
    incident.analysis.tools = incident.analysis.tools.map((tool) =>
      tool.toolCallId === toolCallId
        ? {
            ...tool,
            status: 'done',
            finishedAt,
          }
        : tool
    )
  }

  private setToolResult(
    incident: IncidentRecord,
    toolCallId: string,
    resultText: string,
    finishedAt: number
  ): void {
    const existing = incident.analysis.tools.find(
      (tool) => tool.toolCallId === toolCallId
    )
    if (!existing) {
      this.upsertTool(incident, {
        toolCallId,
        toolCallName: toolCallId,
        status: 'done',
        argsText: '',
        resultText,
        finishedAt,
      })
      return
    }
    incident.analysis.tools = incident.analysis.tools.map((tool) =>
      tool.toolCallId === toolCallId
        ? {
            ...tool,
            status: 'done',
            resultText,
            finishedAt,
          }
        : tool
    )
  }

  private buildStateSnapshot(
    incident: IncidentRecord
  ): CopilotStateSnapshot {
    return {
      incident: {
        id: incident.event.id,
        kind: incident.event.kind,
        severity: incident.event.severity,
        title: incident.event.title,
        message: incident.event.message,
        route: incident.event.route,
        count: incident.event.count,
      },
      diagnosis: {
        status: incident.status,
        source: incident.analysis.source,
        summary: incident.analysis.summary,
        possibleCauses: [...incident.analysis.possibleCauses],
        evidence: [...incident.analysis.evidence],
        nextSteps: [...incident.analysis.nextSteps],
        confidence: incident.analysis.confidence,
        missingContext: [...incident.analysis.missingContext],
      },
    }
  }

  private applyStateSnapshot(
    incident: IncidentRecord,
    snapshot: CopilotStateSnapshot
  ): void {
    const diagnosis = snapshot.diagnosis
    if (diagnosis) {
      if (
        diagnosis.status === 'idle' ||
        diagnosis.status === 'loading' ||
        diagnosis.status === 'done' ||
        diagnosis.status === 'error'
      ) {
        incident.status = diagnosis.status
      }
      if (diagnosis.source) {
        incident.analysis.source = diagnosis.source
      }
      if (typeof diagnosis.summary === 'string') {
        incident.analysis.summary = diagnosis.summary
      }
      if (Array.isArray(diagnosis.possibleCauses)) {
        incident.analysis.possibleCauses = [
          ...diagnosis.possibleCauses,
        ]
      }
      if (Array.isArray(diagnosis.evidence)) {
        incident.analysis.evidence = [...diagnosis.evidence]
      }
      if (Array.isArray(diagnosis.nextSteps)) {
        incident.analysis.nextSteps = [...diagnosis.nextSteps]
      }
      if (Array.isArray(diagnosis.missingContext)) {
        incident.analysis.missingContext = [
          ...diagnosis.missingContext,
        ]
      }
      if (
        diagnosis.confidence === 'low' ||
        diagnosis.confidence === 'medium' ||
        diagnosis.confidence === 'high'
      ) {
        incident.analysis.confidence = diagnosis.confidence
      }
    }

    const nextIncident = snapshot.incident
    if (nextIncident) {
      if (typeof nextIncident.count === 'number') {
        incident.event.count = nextIncident.count
      }
      if (typeof nextIncident.message === 'string') {
        incident.event.message = nextIncident.message
      }
      if (typeof nextIncident.title === 'string') {
        incident.event.title = nextIncident.title
      }
      if (typeof nextIncident.route === 'string') {
        incident.event.route = nextIncident.route
      }
    }
  }

  private emit(): void {
    const nextState = this.getState()
    this.listeners.forEach((listener) => listener(nextState))
  }
}
