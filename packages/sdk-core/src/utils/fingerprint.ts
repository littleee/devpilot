import { DiagnosticEvent } from '../types'

export function normalizeUrl(input?: string): string {
  if (!input) {
    return '/'
  }
  try {
    const base =
      typeof window !== 'undefined' && window.location
        ? window.location.origin
        : 'http://localhost'
    const url = new URL(input, base)
    return url.pathname
  } catch {
    return input.split('?')[0] || '/'
  }
}

export function normalizeMessage(message: string): string {
  return message.trim().replace(/\s+/g, ' ').slice(0, 200)
}

function normalizeFramePath(frame: string): string {
  return frame
    .replace(/\?t=\d+/g, '')
    .replace(/^source:\/\/\//, '')
    .replace(/^https?:\/\/[^/]+\//, '')
    .replace(/:\d+:\d+(\)?)$/, '$1')
}

function normalizeStackSignature(
  kind: DiagnosticEvent['kind'],
  stackTop?: string
): string {
  const lines = (stackTop || '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)

  if (!lines.length) {
    return ''
  }

  if (kind === 'js_error' || kind === 'promise_error') {
    const appFrame = lines.find(
      (line) =>
        /^at\s+.+(src\/.+\.(tsx?|jsx?))/.test(line) ||
        /^at\s+.+(source:\/\/\/.+\.(tsx?|jsx?))/.test(line)
    )
    if (appFrame) {
      return normalizeFramePath(appFrame)
    }

    const sourceLine = lines.find((line) =>
      /(src\/.+\.(tsx?|jsx?))|(source:\/\/\/.+\.(tsx?|jsx?))/.test(
        line
      )
    )
    if (sourceLine) {
      return normalizeFramePath(sourceLine)
    }
  }

  return normalizeFramePath(lines[0])
}

export function buildFingerprint(
  event: Pick<
    DiagnosticEvent,
    'kind' | 'route' | 'message' | 'stackTop' | 'request' | 'response'
  >
): string {
  const requestUrl = normalizeUrl(event.request?.url)
  const code =
    event.response?.errNo ??
    event.response?.status ??
    normalizeMessage(event.message)
  const stackTop = normalizeStackSignature(
    event.kind,
    event.stackTop
  )
  return [
    event.kind,
    requestUrl,
    String(code),
    stackTop,
    event.route || '/',
  ].join('|')
}
