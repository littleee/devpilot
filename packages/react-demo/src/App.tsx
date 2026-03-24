import React, { useEffect } from 'react'
import { initCopilot, destroyCopilot } from '../../widget/src'

export default function App() {
  useEffect(() => {
    initCopilot({
      appId: 'react-demo',
      appName: 'React Demo',
      env: 'development',
      agentBaseUrl: 'http://localhost:7788',
      enabled: true,
      getContext: () => ({
        currentUser: {
          uid: 'demo-user-001',
          username: 'react-demo-user',
        },
      }),
    })
    return () => destroyCopilot()
  }, [])

  return (
    <main style={{ padding: 40 }}>
      <h1>React Demo Host</h1>
      <p>Open the floating copilot and trigger a JS or API error.</p>
    </main>
  )
}
