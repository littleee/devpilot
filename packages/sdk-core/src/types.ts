import { AgUiEvent } from './protocol/agui'

export type DiagnosticKind =
  | 'js_error'
  | 'promise_error'
  | 'api_error'
  | 'custom'

export type DiagnosticSeverity =
  | 'low'
  | 'medium'
  | 'high'
  | 'critical'

export interface RequestExcerpt {
  url: string
  method: string
  headers?: Record<string, string>
  body?: unknown
}

export interface ResponseExcerpt {
  status?: number
  errNo?: string | number
  errMsg?: string
  traceId?: string
  body?: unknown
}

export interface DiagnosticEvent {
  id: string
  kind: DiagnosticKind
  severity: DiagnosticSeverity
  timestamp: number
  fingerprint: string
  title: string
  message: string
  route: string
  count: number
  stackTop?: string
  traceId?: string
  request?: RequestExcerpt
  response?: ResponseExcerpt
  customContext?: Record<string, unknown>
}

export interface RecentEventSummary {
  id: string
  kind: DiagnosticKind
  title: string
  route: string
  timestamp: number
  count: number
}

export interface UserSummary {
  uid?: string
  username?: string
  email?: string
  phone?: string
}

export interface LastActionSummary {
  text: string
  tag: string
  role?: string
  timestamp: number
}

export interface ContextSnapshot {
  url: string
  route: string
  query: Record<string, string>
  title: string
  env: string
  app: {
    appId: string
    appName: string
  }
  user?: UserSummary
  lastAction?: LastActionSummary
  recentEvents: RecentEventSummary[]
  customContext?: Record<string, unknown>
}

export interface ConversationTurn {
  role: 'system' | 'user' | 'assistant'
  content: string
  timestamp: number
}

export interface StepTrace {
  stepName: string
  status: 'running' | 'done'
  startedAt?: number
  finishedAt?: number
}

export interface ToolTrace {
  toolCallId: string
  toolCallName: string
  status: 'running' | 'done'
  parentMessageId?: string
  argsText: string
  resultText?: string
  startedAt?: number
  finishedAt?: number
}

export interface IncidentAnalysis {
  assistantReply: string
  summary: string
  possibleCauses: string[]
  evidence: string[]
  nextSteps: string[]
  rawChunks: string[]
  steps: StepTrace[]
  tools: ToolTrace[]
  source?: string
  confidence?: 'low' | 'medium' | 'high'
  missingContext: string[]
}

export interface DiagnosisStateSnapshot {
  status?: IncidentRecord['status']
  source?: string
  summary?: string
  possibleCauses?: string[]
  evidence?: string[]
  nextSteps?: string[]
  confidence?: 'low' | 'medium' | 'high'
  missingContext?: string[]
}

export interface IncidentStateSnapshot {
  id?: string
  kind?: DiagnosticKind
  severity?: DiagnosticSeverity
  title?: string
  message?: string
  route?: string
  count?: number
}

export interface CopilotStateSnapshot {
  incident?: IncidentStateSnapshot
  diagnosis?: DiagnosisStateSnapshot
}

export interface IncidentRecord {
  event: DiagnosticEvent
  conversation: ConversationTurn[]
  analysis: IncidentAnalysis
  status: 'idle' | 'loading' | 'done' | 'error'
  error?: string
}

export interface CopilotTheme {
  accentColor?: string
  surfaceColor?: string
  textColor?: string
}

export interface MaskRules {
  maxDepth?: number
  maxKeys?: number
  maxBytes?: number
  redactedKeys?: string[]
}

export interface CopilotConfig {
  appId: string
  appName: string
  env: string
  agentBaseUrl?: string
  enabled?: boolean
  mount?: HTMLElement | string
  theme?: CopilotTheme
  maskRules?: MaskRules
  getContext?: () =>
    | Record<string, unknown>
    | Promise<Record<string, unknown> | undefined>
    | undefined
}

export interface CopilotState {
  incidents: IncidentRecord[]
  selectedIncidentId?: string
  unreadCount: number
  isOpen: boolean
  route: string
  query: Record<string, string>
  title: string
  lastAction?: LastActionSummary
}

export interface CopilotAnalysisRequest {
  trigger: 'auto' | 'manual'
  threadId: string
  event: DiagnosticEvent
  context: ContextSnapshot
  conversation: ConversationTurn[]
  app: {
    appId: string
    appName: string
    env: string
  }
}

export interface StreamHandlers {
  onEvent: (payload: AgUiEvent) => void
  signal?: AbortSignal
}
