const test = require('node:test')
const assert = require('node:assert/strict')

const {
  sanitizeDiagnosticEvent,
  sanitizeContextSnapshot,
} = require('../../../dist/packages/sdk-core/src')

test('sanitizeDiagnosticEvent redacts sensitive keys and masks values', () => {
  const event = sanitizeDiagnosticEvent({
    id: '1',
    kind: 'api_error',
    severity: 'high',
    timestamp: Date.now(),
    fingerprint: 'f',
    title: 'API error',
    message: 'user john@example.com token leaked',
    route: '/demo',
    count: 1,
    request: {
      url: '/api/demo',
      method: 'POST',
      body: {
        token: 'secret',
        uid: '123456',
      },
    },
    response: {
      status: 500,
      errMsg: 'timeout',
    },
  })

  assert.equal(event.request.body.token, '[redacted]')
  assert.match(event.message, /\*\*\*/)
})

test('sanitizeContextSnapshot truncates custom context safely', () => {
  const snapshot = sanitizeContextSnapshot({
    url: 'http://localhost/test',
    route: '/test',
    query: {},
    title: 'Test',
    env: 'development',
    app: { appId: 'demo', appName: 'Demo' },
    recentEvents: [],
    customContext: {
      username: 'super-long-user-name',
      nested: {
        deeper: {
          shouldClip: true,
        },
      },
    },
  })

  assert.ok(snapshot.customContext.username.includes('***'))
  assert.equal(typeof snapshot.customContext.nested, 'object')
})
