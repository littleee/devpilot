const test = require('node:test')
const assert = require('node:assert/strict')

const {
  renderCopilotMarkup,
} = require('../../../dist/packages/widget/src')

test('renderCopilotMarkup renders incident list and summary', () => {
  const html = renderCopilotMarkup({
    incidents: [
      {
        event: {
          id: 'incident-1',
          kind: 'api_error',
          severity: 'high',
          timestamp: Date.now(),
          fingerprint: 'api|1',
          title: 'API request failed',
          message: 'timeout',
          route: '/data-management/list',
          count: 1,
        },
        conversation: [],
        analysis: {
          summary: 'Request timed out.',
          possibleCauses: ['Upstream timeout'],
          evidence: ['TraceId: abc'],
          nextSteps: ['Inspect backend logs'],
          rawChunks: [],
          missingContext: [],
          source: 'diagnostic-started:llm',
          confidence: 'medium',
        },
        status: 'done',
      },
    ],
    selectedIncidentId: 'incident-1',
    unreadCount: 2,
    isOpen: true,
    route: '/data-management/list',
    query: {},
    title: 'Data Management',
  })

  assert.match(html, /稳定性副驾 \(2\)/)
  assert.match(html, /API request failed/)
  assert.match(html, /分析对话/)
})
