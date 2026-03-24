import { ContextSnapshot, DiagnosticEvent, MaskRules } from '../types'

const DEFAULT_REDACTED_KEYS = [
  'cookie',
  'authorization',
  'token',
  'session',
  'password',
  'sign',
]

const DEFAULT_RULES: Required<MaskRules> = {
  maxDepth: 2,
  maxKeys: 20,
  maxBytes: 4096,
  redactedKeys: DEFAULT_REDACTED_KEYS,
}

function maskString(value: string): string {
  const email = value.replace(
    /([a-zA-Z0-9._%+-]{1,2})[a-zA-Z0-9._%+-]*@([a-zA-Z0-9.-]+\.[A-Za-z]{2,})/g,
    '$1***@$2'
  )
  const phone = email.replace(/(\d{3})\d{4}(\d{2,4})/g, '$1****$2')
  return phone.replace(
    /("?(?:uid|username)"?\s*:\s*"?)([^",\s]{2})[^",\s]*("?)/gi,
    '$1$2***$3'
  )
}

function maskIdentifier(value: string): string {
  if (value.length <= 2) {
    return `${value[0] || '*'}***`
  }
  if (value.length <= 6) {
    return `${value.slice(0, 1)}***${value.slice(-1)}`
  }
  return `${value.slice(0, 2)}***${value.slice(-2)}`
}

function shouldRedact(key: string, rules: Required<MaskRules>): boolean {
  return rules.redactedKeys.some((candidate) =>
    key.toLowerCase().includes(candidate)
  )
}

function clip(value: unknown, rules: Required<MaskRules>): unknown {
  const serialized = JSON.stringify(value)
  if (!serialized) {
    return value
  }
  const bytes = new TextEncoder().encode(serialized)
  if (bytes.length <= rules.maxBytes) {
    return value
  }
  return `${maskString(serialized.slice(0, rules.maxBytes))}...[truncated]`
}

function sanitize(
  value: unknown,
  rules: Required<MaskRules>,
  depth = 0
): unknown {
  if (value == null) {
    return value
  }
  if (typeof value === 'string') {
    return maskString(value)
  }
  if (typeof value !== 'object') {
    return value
  }
  if (depth >= rules.maxDepth) {
    return clip(value, rules)
  }
  if (Array.isArray(value)) {
    return value
      .slice(0, rules.maxKeys)
      .map((item) => sanitize(item, rules, depth + 1))
  }
  const objectValue = value as Record<string, unknown>
  const entries = Object.entries(objectValue).slice(0, rules.maxKeys)
  return entries.reduce<Record<string, unknown>>((acc, [key, item]) => {
    if (shouldRedact(key, rules)) {
      acc[key] = '[redacted]'
      return acc
    }
    if (['uid', 'username', 'email', 'phone'].includes(key.toLowerCase())) {
      const raw = String(item ?? '')
      acc[key] =
        key.toLowerCase() === 'email' || key.toLowerCase() === 'phone'
          ? maskString(raw)
          : maskIdentifier(raw)
      return acc
    }
    acc[key] = sanitize(item, rules, depth + 1)
    return acc
  }, {})
}

export function resolveMaskRules(maskRules?: MaskRules): Required<MaskRules> {
  return {
    ...DEFAULT_RULES,
    ...maskRules,
    redactedKeys:
      maskRules?.redactedKeys && maskRules.redactedKeys.length > 0
        ? [...DEFAULT_REDACTED_KEYS, ...maskRules.redactedKeys]
        : DEFAULT_REDACTED_KEYS,
  }
}

export function sanitizeDiagnosticEvent(
  event: DiagnosticEvent,
  maskRules?: MaskRules
): DiagnosticEvent {
  const rules = resolveMaskRules(maskRules)
  return {
    ...event,
    message: maskString(event.message),
    title: maskString(event.title),
    stackTop: event.stackTop ? maskString(event.stackTop) : undefined,
    request: event.request
      ? (sanitize(event.request, rules) as DiagnosticEvent['request'])
      : undefined,
    response: event.response
      ? (sanitize(event.response, rules) as DiagnosticEvent['response'])
      : undefined,
    customContext: event.customContext
      ? (sanitize(
          event.customContext,
          rules
        ) as DiagnosticEvent['customContext'])
      : undefined,
  }
}

export function sanitizeContextSnapshot(
  snapshot: ContextSnapshot,
  maskRules?: MaskRules
): ContextSnapshot {
  const rules = resolveMaskRules(maskRules)
  return {
    ...snapshot,
    user: snapshot.user
      ? (sanitize(snapshot.user, rules) as ContextSnapshot['user'])
      : undefined,
    customContext: snapshot.customContext
      ? (sanitize(
          snapshot.customContext,
          rules
        ) as ContextSnapshot['customContext'])
      : undefined,
  }
}
