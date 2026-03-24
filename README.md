# Stability Copilot Platform

Independent workspace for a reusable stability copilot:

- `packages/sdk-core`: host-agnostic collectors, masking, state, and streaming client
- `packages/widget`: Shadow DOM widget and singleton SDK entrypoints
- `packages/react-demo`: minimal React integration example
- `packages/vanilla-demo`: zero-framework integration example
- `apps/diagnostic-agent`: SSE-based diagnostic agent service

Darwin consumes the widget as the first host via direct source import during local development.
