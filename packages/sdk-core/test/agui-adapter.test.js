const test = require('node:test')
const assert = require('node:assert/strict')

const {
  parseAgUiEventForTest,
} = require('../../../dist/packages/sdk-core/src/client/agent-client')

test('parseAgUiEvent keeps AG-UI events intact', () => {
  const snapshotEvent = parseAgUiEventForTest({
    type: 'STATE_SNAPSHOT',
    snapshot: {
      incident: {
        id: 'evt-1',
        kind: 'js_error',
        severity: 'high',
        title: 'JavaScript 运行时异常',
        message: 'boom',
        route: '/darwin/relationship/list',
        count: 3,
      },
      diagnosis: {
        status: 'done',
        source: 'llm',
        summary: 'summary',
        possibleCauses: ['cause-1'],
        evidence: ['evidence-1'],
        nextSteps: ['step-1'],
        missingContext: ['ctx-1'],
        confidence: 'high',
      },
    },
  })

  assert.deepEqual(snapshotEvent, {
    type: 'STATE_SNAPSHOT',
    snapshot: {
      incident: {
        id: 'evt-1',
        kind: 'js_error',
        severity: 'high',
        title: 'JavaScript 运行时异常',
        message: 'boom',
        route: '/darwin/relationship/list',
        count: 3,
      },
      diagnosis: {
        status: 'done',
        source: 'llm',
        summary: 'summary',
        possibleCauses: ['cause-1'],
        evidence: ['evidence-1'],
        nextSteps: ['step-1'],
        missingContext: ['ctx-1'],
        confidence: 'high',
      },
    },
  })

  assert.deepEqual(
    parseAgUiEventForTest({
      type: 'MESSAGES_SNAPSHOT',
      messages: [
        {
          id: 'hist-1',
          role: 'user',
          content: '为什么会报错？',
          timestamp: 1,
        },
        {
          id: 'hist-2',
          role: 'assistant',
          content: '因为字段缺失。',
          timestamp: 2,
        },
      ],
    }),
    {
      type: 'MESSAGES_SNAPSHOT',
      messages: [
        {
          id: 'hist-1',
          role: 'user',
          content: '为什么会报错？',
          timestamp: 1,
        },
        {
          id: 'hist-2',
          role: 'assistant',
          content: '因为字段缺失。',
          timestamp: 2,
        },
      ],
    }
  )

  assert.deepEqual(
    parseAgUiEventForTest({
      type: 'TEXT_MESSAGE_START',
      messageId: 'm1',
      role: 'assistant',
    }),
    { type: 'TEXT_MESSAGE_START', messageId: 'm1', role: 'assistant' }
  )

  assert.deepEqual(
    parseAgUiEventForTest({
      type: 'TEXT_MESSAGE_CONTENT',
      messageId: 'm1',
      delta: 'hello',
    }),
    { type: 'TEXT_MESSAGE_CONTENT', messageId: 'm1', delta: 'hello' }
  )

  assert.deepEqual(
    parseAgUiEventForTest({
      type: 'TEXT_MESSAGE_END',
      messageId: 'm1',
    }),
    { type: 'TEXT_MESSAGE_END', messageId: 'm1' }
  )

  assert.deepEqual(
    parseAgUiEventForTest({
      type: 'RUN_FINISHED',
      threadId: 'thread-1',
      runId: 'run-1',
    }),
    { type: 'RUN_FINISHED', threadId: 'thread-1', runId: 'run-1' }
  )
})
