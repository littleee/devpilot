export interface AgentAppInfo {
  appId: string
  appName: string
  env: string
}

export interface AgentDiagnosticEvent {
  id: string
  kind: 'js_error' | 'promise_error' | 'api_error' | 'custom'
  severity: 'low' | 'medium' | 'high' | 'critical'
  route: string
  title: string
  message: string
  stackTop?: string
  traceId?: string
  request?: {
    url: string
    method: string
    body?: unknown
  }
  response?: {
    status?: number
    errNo?: string | number
    errMsg?: string
    traceId?: string
    body?: unknown
  }
}

export interface AgentContextSnapshot {
  url: string
  route: string
  query: Record<string, string>
  title: string
  env: string
  recentEvents: Array<{
    id: string
    kind: string
    title: string
    route: string
    timestamp: number
    count: number
  }>
  customContext?: Record<string, unknown>
}

export interface AgentConversationTurn {
  role: 'system' | 'user' | 'assistant'
  content: string
  timestamp: number
}

export interface AgentRequestPayload {
  trigger: 'auto' | 'manual'
  threadId: string
  app: AgentAppInfo
  event: AgentDiagnosticEvent
  context: AgentContextSnapshot
  conversation: AgentConversationTurn[]
}

export interface NormalizedIncident {
  trigger: 'auto' | 'manual'
  event: AgentDiagnosticEvent
  context: AgentContextSnapshot
  conversation: AgentConversationTurn[]
  app: AgentAppInfo
  classification: 'api_error' | 'js_error' | 'promise_error' | 'custom'
}

export interface SourceInspectionResult {
  localPath: string
  relativePath: string
  line: number
  column: number
  snippet: string
  lineText: string
}

export interface ToolExecution {
  toolCallName: string
  argsText: string
  resultText: string
}

export interface CodeFixResult {
  applied: boolean
  localPath: string
  relativePath: string
  line: number
  column: number
  beforeLineText: string
  afterLineText?: string
  replacement?: string
  reason?: string
}

export interface HeuristicResult {
  summary: string
  possibleCauses: string[]
  evidence: string[]
  nextSteps: string[]
}

export interface ModelDiagnosis extends HeuristicResult {
  chatReply: string
  confidence: 'low' | 'medium' | 'high'
  missingContext?: string[]
}
