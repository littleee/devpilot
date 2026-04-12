# Claude CLI MCP Demo

This demo is the fastest way to validate the full local workflow:

- `DevPilot` runs inside a real browser page
- `devpilot-mcp` stores sessions, annotations, and stability items
- `Claude Code` connects to the local MCP stdio server and can read or update that data

## What This Demo Covers

The page mounts the local workspace package:

```ts
<DevPilot
  endpoint="http://127.0.0.1:5213"
  defaultOpen
  features={{ mcp: true, stability: true }}
/>
```

That means you can test:

- element / text / area annotations
- MCP session sync
- stability auto-observation for runtime errors and failed fetches
- Claude Code MCP tools against locally generated data

## One-Time Setup

From the repository root:

```bash
npm install
npm run build
npm --prefix examples/claude-mcp-demo install
node scripts/demo/register-claude-mcp-demo.mjs
```

## Run The Demo

Terminal 1:

```bash
npm run demo:claude:mcp:bridge
```

Terminal 2:

```bash
npm run demo:claude:mcp:web
```

Terminal 3:

```bash
claude
```

Inside Claude Code, try prompts like:

- `List current DevPilot sessions and show open annotations.`
- `Summarize open stability items and suggest next repair steps.`
- `Acknowledge the newest pending annotation and reply with a short diagnosis.`

## Reset / Remove

If you want to remove the Claude MCP registration for this project:

```bash
node scripts/demo/remove-claude-mcp-demo.mjs
```
