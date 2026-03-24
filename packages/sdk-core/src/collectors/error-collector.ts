import { DiagnosticEvent } from '../types'
import { buildFingerprint } from '../utils/fingerprint'
import { SourceMapConsumer } from 'source-map-js'

interface ErrorCollectorOptions {
  onEvent: (event: DiagnosticEvent) => void
  getRoute: () => string
}

function makeId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`
}

const sourceMapCache = new Map<string, Promise<string | null>>()

interface FrameLocation {
  url: string
  line: number
  column: number
}

function buildRuntimeStack(
  errorEvent: ErrorEvent,
  sourceLocation?: string | null
): string {
  const rawStack = errorEvent.error?.stack || ''
  if (sourceLocation) {
    const firstFrame = rawStack
      .split('\n')
      .map((line: string) => line.trim())
      .find((line: string) => line.startsWith('at '))
    if (firstFrame) {
      const fnMatch = firstFrame.match(/^at\s+(.+?)\s+\(/)
      const fnName = fnMatch?.[1]
      return [
        errorEvent.message || rawStack.split('\n')[0] || 'JavaScript error',
        fnName
          ? `    at ${fnName} (${sourceLocation})`
          : `    at ${sourceLocation}`,
      ].join('\n')
    }
    return [
      errorEvent.message || 'JavaScript error',
      `    at ${sourceLocation}`,
    ].join('\n')
  }
  const location =
    errorEvent.filename && errorEvent.lineno
      ? `${errorEvent.filename}:${errorEvent.lineno}:${errorEvent.colno || 0}`
      : ''
  return [location, rawStack].filter(Boolean).join('\n')
}

async function resolveSourceLocation(
  errorEvent: ErrorEvent
): Promise<string | null> {
  const frame = pickBestFrameLocation(errorEvent)
  if (!frame) {
    return null
  }
  const cacheKey = `${frame.url}:${frame.line}:${frame.column}`
  const cached = sourceMapCache.get(cacheKey)
  if (cached) {
    return cached
  }
  const task = (async () => {
    try {
      const response = await fetch(frame.url)
      if (!response.ok) {
        return null
      }
      const code = await response.text()
      const match = code.match(
        /sourceMappingURL=data:application\/json;base64,([A-Za-z0-9+/=]+)/
      )
      if (!match?.[1]) {
        return null
      }
      const rawMap = JSON.parse(atob(match[1])) as ConstructorParameters<
        typeof SourceMapConsumer
      >[0]
      const consumer = new SourceMapConsumer(rawMap)
      const original = consumer.originalPositionFor({
        line: frame.line,
        column: Math.max((frame.column || 1) - 1, 0),
      })
      if (!original.line) {
        return null
      }
      const source = original.source || frame.url
      const resolvedSource = source.startsWith('/')
        ? source
        : source.replace(/^\.\//, '')
      return `${resolvedSource}:${original.line}:${original.column ?? 0}`
    } catch {
      return null
    }
  })()
  sourceMapCache.set(cacheKey, task)
  return task
}

function pickBestFrameLocation(
  errorEvent: ErrorEvent
): FrameLocation | null {
  const stack = errorEvent.error?.stack || ''
  const appFrame = parseFirstFrame(stack, /\/src\/.+\.(tsx?|jsx?)/)
  if (appFrame) {
    return appFrame
  }

  const genericFrame = parseFirstFrame(stack, /^https?:\/\//)
  if (genericFrame) {
    return genericFrame
  }

  const { filename, lineno, colno } = errorEvent
  if (
    filename &&
    lineno &&
    /^https?:\/\/|^\//.test(filename)
  ) {
    return {
      url: filename,
      line: lineno,
      column: colno || 0,
    }
  }

  return null
}

function parseFirstFrame(
  stack: string,
  urlPattern: RegExp
): FrameLocation | null {
  const lines = stack.split('\n')
  for (const line of lines) {
    const trimmed = line.trim()
    const match = trimmed.match(
      /\(?((?:https?:\/\/|\/)[^)\s]+):(\d+):(\d+)\)?$/
    )
    if (!match) {
      continue
    }
    const url = match[1]
    if (!urlPattern.test(url)) {
      continue
    }
    return {
      url,
      line: Number(match[2]),
      column: Number(match[3]),
    }
  }
  return null
}

export function attachErrorCollector(
  options: ErrorCollectorOptions
): () => void {
  const onError = (event: Event) => {
    void handleError(event, options)
  }

  const onRejection = (event: PromiseRejectionEvent) => {
    const route = options.getRoute()
    const reason = event.reason
    const message =
      typeof reason === 'string'
        ? reason
        : reason?.message || 'Unhandled promise rejection'
    if (shouldIgnoreMessage(message)) {
      return
    }
    const payload: DiagnosticEvent = {
      id: makeId('promise'),
      kind: 'promise_error',
      severity: 'high',
      timestamp: Date.now(),
      title: '未处理的 Promise 异常',
      message,
      route,
      count: 1,
      stackTop: reason?.stack,
      fingerprint: '',
    }
    payload.fingerprint = buildFingerprint(payload)
    options.onEvent(payload)
  }

  window.addEventListener('error', onError, true)
  window.addEventListener('unhandledrejection', onRejection)

  return () => {
    window.removeEventListener('error', onError, true)
    window.removeEventListener('unhandledrejection', onRejection)
  }
}

async function handleError(
  event: Event,
  options: ErrorCollectorOptions
): Promise<void> {
  const route = options.getRoute()
  const target = event.target as
    | (HTMLElement & {
        src?: string
        href?: string
        outerHTML?: string
      })
    | null
  const rawTarget = event.target as EventTarget | null

  if (
    target &&
    rawTarget !== window &&
    rawTarget !== document &&
    ('src' in target || 'href' in target)
  ) {
    const resourceUrl =
      target.src || target.href || '[unknown resource]'
    if (shouldIgnoreResource(resourceUrl)) {
      return
    }
    const payload: DiagnosticEvent = {
      id: makeId('resource'),
      kind: 'js_error',
      severity: 'high',
      timestamp: Date.now(),
      title: '静态资源加载失败',
      message: `资源加载失败：${resourceUrl}`,
      route,
      count: 1,
      stackTop: target.outerHTML?.slice(0, 200),
      fingerprint: '',
    }
    payload.fingerprint = buildFingerprint(payload)
    options.onEvent(payload)
    return
  }

  const errorEvent = event as ErrorEvent
  const message =
    errorEvent.message || 'Unknown JavaScript error'
  const source =
    errorEvent.filename || errorEvent.error?.stack || ''
  if (shouldIgnoreResource(source) || shouldIgnoreMessage(message)) {
    return
  }
  const sourceLocation = await resolveSourceLocation(errorEvent)
  const payload: DiagnosticEvent = {
    id: makeId('js'),
    kind: 'js_error',
    severity: 'high',
    timestamp: Date.now(),
    title: 'JavaScript 运行时异常',
    message,
    route,
    count: 1,
      stackTop:
        buildRuntimeStack(errorEvent, sourceLocation) ||
        `${errorEvent.filename || ''}:${errorEvent.lineno || 0}`,
    fingerprint: '',
  }
  payload.fingerprint = buildFingerprint(payload)
  options.onEvent(payload)
}

function shouldIgnoreResource(url: string): boolean {
  return /chrome-extension:|moz-extension:|safari-extension:|extension:|^VM\d+/i.test(
    url
  )
}

function shouldIgnoreMessage(message: string): boolean {
  return /MetaMask|Could not establish connection|The message port closed|ResizeObserver loop completed/i.test(
    message
  )
}
