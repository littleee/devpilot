# DevPilot

`@littleee/devpilot` is a page-native frontend copilot for turning what happens in the browser into actionable engineering work.

The long-term goal is a single workflow that can:

- annotate real UI directly on the page
- capture JavaScript and stability issues with page context
- connect browser observations to local code through MCP
- hand structured tasks to AI tools for assisted or automated fixes

Today, the repository ships the first foundation of that workflow: a browser-native annotation toolbar called `DevPilot`.

## What Exists Today

Current `v0.1.x` capabilities:

- floating in-page toolbar mounted through a Shadow DOM host
- element, text, and area annotations created directly on the live page
- local annotation state with status transitions such as `pending`, `acknowledged`, `resolved`, and `dismissed`
- session panel for reviewing open and closed annotations
- structured export for sending page feedback to AI coding tools

This makes the current package useful as a lightweight page feedback layer even before MCP and automatic remediation land.

## Where It Is Going

DevPilot is being built toward a broader frontend incident and repair workflow:

- MCP-backed workspace linking from browser context to local source files
- stability observation for runtime errors, request failures, and incident grouping
- richer session history that can include AI replies and code actions
- AI-assisted and eventually automated fix loops for selected classes of issues

## Package

The published npm package is:

```bash
npm install @littleee/devpilot
```

Right now the package exports the `DevPilot` mounting API and UI components.

## Quick Start

Zero-config mount:

```ts
import { mountDevPilot } from "@littleee/devpilot";

mountDevPilot();
```

React:

```tsx
import { DevPilot } from "@littleee/devpilot";

export function App() {
  return (
    <>
      <YourApp />
      <DevPilot />
    </>
  );
}
```

## Workspace

Current workspace contents:

- `packages/devpilot`: the published browser toolbar package behind `@littleee/devpilot`

## Development

- Node.js 20 or newer is required.
- Install dependencies with `npm install`.
- Build with `npm run build`.
- Type-check with `npm run check`.

## License

MIT. See [LICENSE](/Users/littleee/project/stability-copilot-platform/LICENSE).
