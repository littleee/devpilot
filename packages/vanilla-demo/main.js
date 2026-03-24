import { initCopilot } from '../widget/src/index.ts'

initCopilot({
  appId: 'vanilla-demo',
  appName: 'Vanilla Demo',
  env: 'development',
  agentBaseUrl: 'http://localhost:7788',
  enabled: true,
})
