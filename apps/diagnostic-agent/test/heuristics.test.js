const test = require('node:test')
const assert = require('node:assert/strict')

const {
  classifyIncident,
} = require('../../../dist/apps/diagnostic-agent/src/core/classify')
const {
  runHeuristics,
} = require('../../../dist/apps/diagnostic-agent/src/core/heuristics')
const {
  normalizeIncident,
} = require('../../../dist/apps/diagnostic-agent/src/core/normalize')

test('classifyIncident recognizes api errors', () => {
  assert.equal(
    classifyIncident({
      kind: 'api_error',
    }),
    'api_error'
  )
})

test('runHeuristics returns backend-focused guidance for 500 errors', () => {
  const incident = normalizeIncident({
    trigger: 'auto',
    threadId: '1',
    app: {
      appId: 'demo',
      appName: 'Demo',
      env: 'development',
    },
    event: {
      id: '1',
      kind: 'api_error',
      severity: 'critical',
      route: '/feature/list',
      title: 'API request failed',
      message: 'internal server error',
      request: {
        url: '/api/demo',
        method: 'GET',
      },
      response: {
        status: 500,
        traceId: 'trace-1',
      },
    },
    context: {
      url: 'http://localhost',
      route: '/feature/list',
      query: {},
      title: 'Feature',
      env: 'development',
      recentEvents: [],
    },
    conversation: [],
  })

  const result = runHeuristics(incident)

  assert.match(result.summary, /后端异常/)
  assert.ok(
    result.evidence.some((item) => item.includes('trace-1'))
  )
})
