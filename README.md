# DevPilot

`@littleee/devpilot` is a page-native frontend copilot for turning what happens in the browser into actionable engineering work.

The long-term goal is a single workflow that can:

- annotate real UI directly on the page
- capture JavaScript and stability issues with page context
- connect browser observations to local code through MCP
- hand structured tasks to AI tools for assisted or automated fixes

Today, the repository ships the first practical foundation of that workflow: a browser-native toolbar called `DevPilot`.

## What Exists Today

Current `v0.1.x` capabilities:

- floating in-page toolbar mounted through a Shadow DOM host
- element, text, and area annotations created directly on the live page
- local annotation state with lightweight status tracking
- **one-click "Copy to AI"** that exports annotations + stability issues as a unified task packet
- **Stability Copilot** (disabled by default; enable via the settings panel switch)
- optional MCP-backed sync when an endpoint is provided
- connection-disconnect indicator (red dot on the settings icon)

The current product shape is intentionally simple:

```text
Annotate -> Copy to AI -> Paste into Claude / Codex / Cursor
```

### How to Use

1. **Hover and click** any element on the page to add an annotation
2. **Select text** and click the toolbar to capture text-specific issues
3. **Hold Shift + drag** to create area annotations for grouped elements
4. Click the **Copy to AI** button in the toolbar (or press it after creating annotations)
5. Paste the structured markdown into your AI tool

> **Tip:** Enable "Stability Copilot" in the settings panel to automatically capture JS errors, unhandled promise rejections, and failed network requests.

### What Gets Copied

Clicking **Copy to AI** produces a `devpilot.task-packet/v1` markdown document that includes:

- Page context (title, URL, viewport)
- Task summary (issue count, type)
- Annotations grouped by inferred page region (Header, Main Content, Sidebar, etc.)
- Each annotation includes: element path, DOM depth, CSS classes, component hints, source hits
- Stability issues (if Stability Copilot is enabled and issues exist)

<details>
<summary>Example output preview</summary>

```markdown
# DevPilot Task Packet
**Schema:** devpilot.task-packet/v1

## Page Context
**Page:** My App
**URL:** http://localhost:3000/dashboard
**Viewport:** 1440x900

## Task
**Type:** annotation
**Title:** Fix 3 annotations on /dashboard

## Evidence: Annotations (3)

### Main Content (2)
#### 1. button.btn-primary
- **Path:** `main > div.card > button.btn-primary`
- **DOM Depth:** 3
- **Comment:** Button color does not match design spec

### Header (1)
#### 3. nav.navbar
- **Path:** `body > header > nav.navbar`
- **DOM Depth:** 2
- **Comment:** Logo is misaligned on mobile
```

</details>

This makes DevPilot useful today as a lightweight page feedback and AI handoff layer, even before the broader connected repair workflow is fully complete.

## Where It Is Going

DevPilot is being built toward a broader frontend incident and repair workflow:

- MCP-backed workspace linking from browser context to local source files
- stability observation for runtime errors, request failures, and incident grouping
- richer connected workflow history that can include AI replies and code actions
- AI-assisted and eventually automated fix loops for selected classes of issues

## Package

The published npm package is:

```bash
npm install @littleee/devpilot
```

Right now the package exports the `DevPilot` mounting API and UI components.

## Product Modes

DevPilot is one product with two usage modes:

- `Local mode`
  - annotate directly on the page
  - capture structured browser context
  - copy a task packet into Claude, Codex, Cursor, or similar tools
- `Connected mode`
  - connect the browser session to local engineering workflows through MCP
  - optionally sync runtime issues and repair requests
  - support collaborative or agent-assisted repair loops

Most users should be able to start in local mode without any backend setup.

## Quick Start

Zero-config mount (local mode only — no backend needed):

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

**To enable connected mode** (MCP sync + Stability Copilot):

```ts
mountDevPilot({
  endpoint: "http://127.0.0.1:5213",
  features: {
    mcp: true,
    stability: true,
  },
});
```

> You must also run the [`@littleee/devpilot-mcp`](./packages/devpilot-mcp) bridge locally for connected mode.

## Workspace

Current workspace contents:

- `packages/devpilot`: the published browser toolbar package behind `@littleee/devpilot`

## Development

- Node.js 20 or newer is required.
- Install dependencies with `npm install`.
- Build with `npm run build`.
- Type-check with `npm run check`.

## License

MIT. See [LICENSE](/LICENSE).
