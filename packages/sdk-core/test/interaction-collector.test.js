const test = require('node:test')
const assert = require('node:assert/strict')

const {
  isCopilotEventTarget,
} = require('../../../dist/packages/sdk-core/src/collectors/interaction-collector')

test('isCopilotEventTarget ignores clicks inside the widget host', () => {
  class FakeElement {}
  global.HTMLElement = FakeElement

  const host = new FakeElement()
  host.dataset = {
    stabilityCopilot: 'true',
  }

  const result = isCopilotEventTarget({
    composedPath() {
      return [host]
    },
  })

  assert.equal(result, true)
})
