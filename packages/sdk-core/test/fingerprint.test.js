const test = require('node:test')
const assert = require('node:assert/strict')

const {
  buildFingerprint,
} = require('../../../dist/packages/sdk-core/src')

test('buildFingerprint uses normalized URL and message details', () => {
  const fingerprint = buildFingerprint({
    kind: 'api_error',
    route: '/feature/list',
    message: 'Bad request',
    stackTop: 'Error: bad request',
    request: {
      url: 'http://localhost:3000/api/demo?id=1',
    },
    response: {
      status: 400,
    },
  })

  assert.equal(
    fingerprint,
    'api_error|/api/demo|400|Error: bad request|/feature/list'
  )
})

test('buildFingerprint dedupes js errors across runtime and source-mapped frames', () => {
  const runtimeFingerprint = buildFingerprint({
    kind: 'js_error',
    route: '/darwin/relationship/list',
    message:
      "Uncaught TypeError: Cannot read properties of undefined (reading 'ONLINE')",
    stackTop:
      "TypeError: Cannot read properties of undefined (reading 'ONLINE')\n    at RelationshipList (http://127.0.0.1:5199/src/pages/relationship/list.tsx?t=1774264593741:649:25)",
  })

  const sourceMappedFingerprint = buildFingerprint({
    kind: 'js_error',
    route: '/darwin/relationship/list',
    message:
      "Uncaught TypeError: Cannot read properties of undefined (reading 'ONLINE')",
    stackTop:
      "source:///list.tsx:980:37\nhttp://127.0.0.1:5199/src/pages/relationship/list.tsx?t=1774264593741:649:25\nTypeError: Cannot read properties of undefined (reading 'ONLINE')\n    at RelationshipList (http://127.0.0.1:5199/src/pages/relationship/list.tsx?t=1774264593741:649:25)",
  })

  assert.equal(runtimeFingerprint, sourceMappedFingerprint)
})

test('buildFingerprint handles vite querystring frames consistently', () => {
  const withQuery = buildFingerprint({
    kind: 'js_error',
    route: '/darwin/relationship/list',
    message:
      "Uncaught TypeError: Cannot read properties of undefined (reading 'ONLINE')",
    stackTop:
      "Uncaught TypeError: Cannot read properties of undefined (reading 'ONLINE')\n    at RelationshipList (http://127.0.0.1:5199/src/pages/relationship/list.tsx?t=1774266506230:649:25)",
  })

  const withoutQuery = buildFingerprint({
    kind: 'js_error',
    route: '/darwin/relationship/list',
    message:
      "Uncaught TypeError: Cannot read properties of undefined (reading 'ONLINE')",
    stackTop:
      "Uncaught TypeError: Cannot read properties of undefined (reading 'ONLINE')\n    at RelationshipList (http://127.0.0.1:5199/src/pages/relationship/list.tsx:649:25)",
  })

  assert.equal(withQuery, withoutQuery)
})
