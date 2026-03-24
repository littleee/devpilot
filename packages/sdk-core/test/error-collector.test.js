const test = require('node:test')
const assert = require('node:assert/strict')

const {
  attachErrorCollector,
} = require('../../../dist/packages/sdk-core/src/collectors/error-collector')

test('attachErrorCollector captures resource loading errors', () => {
  const captured = []
  global.window = {
    addEventListener(type, handler) {
      if (type === 'error') {
        this.__errorHandler = handler
      }
    },
    removeEventListener() {},
  }
  global.document = {}

  attachErrorCollector({
    onEvent: (event) => {
      captured.push(event)
    },
    getRoute: () => '/demo',
  })

  window.__errorHandler({
    target: {
      src: 'http://localhost:3000/@react-refresh',
      outerHTML: '<script src="/@react-refresh"></script>',
    },
  })

  assert.equal(captured.length, 1)
  assert.equal(captured[0].title, '静态资源加载失败')
})
