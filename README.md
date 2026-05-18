# DevPilot

**English | [中文](README.zh-CN.md)**

`@didi/devpilot` is a page-native frontend copilot for turning what happens in the browser into actionable engineering work.

The long-term goal is a single workflow that can:

- annotate real UI directly on the page
- capture JavaScript and stability issues with page context
- connect browser observations to local code through MCP
- hand structured tasks to AI tools for assisted or automated fixes

Today, the repository ships the first practical foundation of that workflow: a browser-native toolbar called `DevPilot`.

## What Exists Today

Current `v0.2.0 beta` capabilities:

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

Clicking **Copy to AI** produces a `devpilot.task-packet/v2` markdown document that includes:

- Page context (title, URL, viewport)
- Structured summary (issue counts, source-hit count)
- Agent brief (intent, priority, constraints, acceptance criteria, output contract)
- Annotations grouped by inferred page region (Header, Main Content, Sidebar, etc.)
- Each annotation includes: element path, DOM depth, CSS classes, component hints, source hits
- Stability issues (if Stability Copilot is enabled and issues exist)

<details>
<summary>Example output preview</summary>

```markdown
# DevPilot Task Packet
**Schema:** devpilot.task-packet/v2

## Page Context
**Page:** My App
**URL:** http://localhost:3000/dashboard
**Viewport:** 1440x900

## Agent Brief
**Intent:** ui-fix
**Priority:** medium

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
npm install @didi/devpilot
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
import { mountDevPilot } from "@didi/devpilot";

mountDevPilot();
```

React:

```tsx
import { DevPilot } from "@didi/devpilot";

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

> You must also run the [`@didi/devpilot-mcp`](./packages/devpilot-mcp) bridge locally for connected mode.

## Connected Agent Flow

When `@didi/devpilot-mcp` is running, Claude, Codex, or another MCP-compatible agent can pull the same standardized brief that DevPilot exports in local mode.

Recommended flow:

1. Start the local bridge with `npx -y @didi/devpilot-mcp server`
2. Connect your coding agent to the DevPilot MCP server
3. Prefer `devpilot_auto_discover_workspaces`; use `devpilot_register_workspace` only when you need to correct or add a workspace manually
4. Call `devpilot_list_sessions` to find the active browser session
5. Call `devpilot_get_session_task_packet` to get an agent-ready `devpilot.task-packet/v2`
6. Read `workflow.recommendedMode`, `workflow.nextTools`, and `workflow.sessionPrompt` from the response
7. If you want the full official workflow definition, call `devpilot_get_agent_playbook`
8. Use `packet.resolvedSources`, `packet.agent.primaryTargets`, `packet.agent.acceptanceCriteria`, and `packet.sourceHits` to locate and fix the issue
9. Use `devpilot_reply`, `devpilot_resolve`, or `devpilot_complete_repair_request` to write status back

`devpilot_get_session_task_packet` is still the shortest path when you want a coding agent to start from a structured brief instead of stitching together raw session data by hand, but it now also returns a recommended workflow mode plus the next MCP tools to call. `devpilot_get_agent_playbook` exposes the full official DevPilot playbook for `critique`, `self-driving`, and `watch` modes, including default prompt templates and ordered tool sequencing. When workspaces are discovered or registered, DevPilot also returns verified local file matches with line and column information, and it now uses route-aware matching when stack traces are weak.

Remote sync stays opt-in. Passing an `endpoint` alone does not enable MCP sync; set `features.mcp: true` as well when you want the browser package to talk to the local bridge.

## Workspace

Current workspace contents:

- `packages/devpilot`: the published browser toolbar package behind `@didi/devpilot`

## Development

- Node.js 20 or newer is required.
- Install dependencies with `npm install`.
- Build with `npm run build`.
- Type-check with `npm run check`.

## License

MIT. See [LICENSE](/LICENSE).
