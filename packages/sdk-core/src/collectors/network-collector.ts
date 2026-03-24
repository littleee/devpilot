import { DiagnosticEvent, RequestExcerpt, ResponseExcerpt } from '../types'
import { buildFingerprint, normalizeUrl } from '../utils/fingerprint'

interface NetworkCollectorOptions {
  onEvent: (event: DiagnosticEvent) => void
  getRoute: () => string
  ignoreBaseUrl?: string
}

type JsonLike = Record<string, unknown>

function makeId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`
}

function shouldIgnore(url: string, ignoreBaseUrl?: string): boolean {
  if (!ignoreBaseUrl) {
    return false
  }
  return normalizeUrl(url).startsWith(normalizeUrl(ignoreBaseUrl))
}

function pickTraceId(headers: Headers | Record<string, string>): string | undefined {
  if (headers instanceof Headers) {
    return (
      headers.get('trace-id') ||
      headers.get('traceid') ||
      headers.get('x-trace-id') ||
      undefined
    )
  }
  return headers['trace-id'] || headers.traceid || headers['x-trace-id']
}

function parseJsonSafely(input?: string): JsonLike | undefined {
  if (!input) {
    return undefined
  }
  try {
    return JSON.parse(input)
  } catch {
    return undefined
  }
}

function buildApiEvent(
  route: string,
  request: RequestExcerpt,
  response: ResponseExcerpt,
  message: string,
  severity: DiagnosticEvent['severity']
): DiagnosticEvent {
  const payload: DiagnosticEvent = {
    id: makeId('api'),
    kind: 'api_error',
    severity,
    timestamp: Date.now(),
    title: 'API request failed',
    message,
    route,
    count: 1,
    traceId: response.traceId,
    request,
    response,
    fingerprint: '',
  }
  payload.fingerprint = buildFingerprint(payload)
  return payload
}

function inspectBody(
  body: JsonLike | undefined
): { failed: boolean; errNo?: string | number; errMsg?: string } {
  if (!body) {
    return { failed: false }
  }
  const errNo = (body.errNo || body.err_code || body.code) as
    | string
    | number
    | undefined
  const errMsg = (body.errMsg || body.err_message || body.message) as
    | string
    | undefined
  if (
    errNo !== undefined &&
    !['0', '200', '204', 0, 200, 204].includes(errNo)
  ) {
    return { failed: true, errNo, errMsg }
  }
  return { failed: false, errNo, errMsg }
}

export function attachNetworkCollector(
  options: NetworkCollectorOptions
): () => void {
  const originalFetch = window.fetch ? window.fetch.bind(window) : undefined
  const originalOpen = XMLHttpRequest.prototype.open
  const originalSend = XMLHttpRequest.prototype.send
  const originalSetRequestHeader =
    XMLHttpRequest.prototype.setRequestHeader

  if (originalFetch) {
    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const startedAt = Date.now()
      const url =
        typeof input === 'string'
          ? input
          : input instanceof URL
          ? input.toString()
          : input.url
      if (shouldIgnore(url, options.ignoreBaseUrl)) {
        return originalFetch(input, init)
      }
      const method =
        init?.method || (typeof input === 'object' && 'method' in input ? input.method : 'GET')
      try {
        const response = await originalFetch(input, init)
        const bodyText = await response.clone().text()
        const body = parseJsonSafely(bodyText)
        const inspection = inspectBody(body)
        if (!response.ok || inspection.failed) {
          options.onEvent(
            buildApiEvent(
              options.getRoute(),
              {
                url,
                method: method.toUpperCase(),
                body: init?.body ? String(init.body) : undefined,
              },
              {
                status: response.status,
                errNo: inspection.errNo,
                errMsg: inspection.errMsg,
                traceId: pickTraceId(response.headers),
                body,
              },
              inspection.errMsg ||
                `HTTP ${response.status} after ${Date.now() - startedAt}ms`,
              response.status >= 500 ? 'critical' : 'high'
            )
          )
        }
        return response
      } catch (error) {
        options.onEvent(
          buildApiEvent(
            options.getRoute(),
            {
              url,
              method: method.toUpperCase(),
              body: init?.body ? String(init.body) : undefined,
            },
            {
              status: 0,
            },
            (error as Error).message || 'Network request failed',
            'critical'
          )
        )
        throw error
      }
    }
  }

  XMLHttpRequest.prototype.open = function patchedOpen(
    method: string,
    url: string | URL,
    async?: boolean,
    username?: string | null,
    password?: string | null
  ) {
    ;(this as XMLHttpRequest & {
      __copilotMeta?: {
        method: string
        url: string
        headers: Record<string, string>
        startedAt: number
      }
    }).__copilotMeta = {
      method: method.toUpperCase(),
      url: String(url),
      headers: {},
      startedAt: Date.now(),
    }
    return originalOpen.call(this, method, url, async ?? true, username, password)
  }

  XMLHttpRequest.prototype.setRequestHeader = function patchedSetRequestHeader(
    key: string,
    value: string
  ) {
    const meta = (this as XMLHttpRequest & {
      __copilotMeta?: {
        headers: Record<string, string>
      }
    }).__copilotMeta
    if (meta) {
      meta.headers[key.toLowerCase()] = value
    }
    return originalSetRequestHeader.call(this, key, value)
  }

  XMLHttpRequest.prototype.send = function patchedSend(body?: Document | XMLHttpRequestBodyInit | null) {
    const xhr = this as XMLHttpRequest & {
      __copilotMeta?: {
        method: string
        url: string
        headers: Record<string, string>
        startedAt: number
      }
    }
    const meta = xhr.__copilotMeta
    if (!meta || shouldIgnore(meta.url, options.ignoreBaseUrl)) {
      return originalSend.call(this, body)
    }
    const onDone = () => {
      const parsedBody = parseJsonSafely(xhr.responseText)
      const inspection = inspectBody(parsedBody)
      const failed =
        xhr.status >= 400 || xhr.status === 0 || inspection.failed
      if (failed) {
        const traceId =
          xhr.getResponseHeader('trace-id') ||
          xhr.getResponseHeader('traceid') ||
          xhr.getResponseHeader('x-trace-id') ||
          undefined
        options.onEvent(
          buildApiEvent(
            options.getRoute(),
            {
              url: meta.url,
              method: meta.method,
              headers: meta.headers,
              body: body ? String(body) : undefined,
            },
            {
              status: xhr.status,
              errNo: inspection.errNo,
              errMsg: inspection.errMsg,
              traceId,
              body: parsedBody,
            },
            inspection.errMsg ||
              `HTTP ${xhr.status} after ${Date.now() - meta.startedAt}ms`,
            xhr.status >= 500 || xhr.status === 0 ? 'critical' : 'high'
          )
        )
      }
      xhr.removeEventListener('loadend', onDone)
      xhr.removeEventListener('error', onDone)
      xhr.removeEventListener('timeout', onDone)
    }
    xhr.addEventListener('loadend', onDone)
    xhr.addEventListener('error', onDone)
    xhr.addEventListener('timeout', onDone)
    return originalSend.call(this, body)
  }

  return () => {
    if (originalFetch) {
      window.fetch = originalFetch
    }
    XMLHttpRequest.prototype.open = originalOpen
    XMLHttpRequest.prototype.send = originalSend
    XMLHttpRequest.prototype.setRequestHeader =
      originalSetRequestHeader
  }
}
