# DevPilot / DevPilot-MCP Roadmap

## Product Direction

DevPilot is no longer a "stability copilot drawer". The product direction is:

- `devpilot`: a page-native development toolbar
- `devpilot-mcp`: a local bridge + MCP server

The interaction model:

- toolbar-first
- page overlay / marker / popup-first
- session-first
- detail panels only when needed

Not based on the old:

- global drawer
- mixed incident + annotation inbox
- AG-UI-first product shell

## Design Principles

1. The page is the main workspace.
2. Annotation and stability are separate modes, not one mixed queue.
3. Users should only need:
   - one frontend package
   - one MCP package
   - Claude / Cursor
4. `devpilot-mcp` should hide the local bridge complexity by starting:
   - an HTTP bridge for the toolbar
   - an MCP server for external agents
5. External agents are the primary code executors. DevPilot should not depend on an embedded repair agent as the main product path.

## What We Reuse From The Current Repo

We should keep and evolve these capabilities:

- browser-side collectors for incidents
- workspace registry ideas
- source lookup / source reading
- local patch safety boundaries
- widget injection / host bootstrapping experience

We should phase out these assumptions:

- "stability copilot" naming
- AG-UI as the product center
- large dashboard drawer as the primary UX
- mixed incident and annotation presentation

## Version Plan

### v0.1 - Product Reset

Goal: establish the new product boundary and remove old mental models.

Deliverables:

- rename product direction in docs to `DevPilot` / `DevPilot-MCP`
- remove stale AG-UI / stability-copilot design docs
- define the unified core model:
  - `session`
  - `observation`
  - `thread`
  - `workspace`
- split observations into:
  - `annotation`
  - `incident`
  - `note`
- define package roles:
  - `devpilot` = browser toolbar package
  - `devpilot-mcp` = HTTP bridge + MCP + store + workspace tools

Out of scope:

- final UI implementation
- code modification workflows

Exit criteria:

- roadmap approved
- obsolete docs removed
- top-level repo docs align with new direction

### v0.2 - Toolbar & Annotation Core

Deliverables:

- bottom-right floating toolbar
- page-layer interaction model
  - click annotation
  - text selection annotation
  - area selection annotation
- inline annotation popup near the selected target
- page markers for saved annotations
- local persistence for unsynced annotations
- optional HTTP sync to `devpilot-mcp`
- session creation / restore

Out of scope:

- stability overlays
- workspace/source tools
- code repair

Exit criteria:

- annotations can be created, persisted, synced, and resolved through `devpilot-mcp`

### v0.3 - DevPilot-MCP Foundation

Deliverables:

- `devpilot-mcp server` starts:
  - HTTP bridge
  - MCP stdio server
- SQLite-backed local store
- HTTP APIs for:
  - sessions
  - observations
  - pending items
  - replies
  - resolution
- MCP tools for:
  - list sessions
  - get session
  - get pending observations
  - reply / resolve / dismiss
  - watch observations

Out of scope:

- source reading
- workspace mapping
- stability overlays

Exit criteria:

- Claude / Cursor can read and act on annotation observations

### v0.4 - Stability Mode

Goal: add stability as a parallel mode without mixing it into the annotation workflow.

Deliverables:

- browser collectors publish incidents as observations
- separate stability mode in toolbar
- incident markers / incident popups on the page
- session panel shows:
  - annotations section
  - incidents section
- no mixed counters
- no mixed inbox

Out of scope:

- code patching
- multi-file project analysis

Exit criteria:

- incidents are visible in DevPilot and in `devpilot-mcp`
- Claude / Cursor can read pending incidents from MCP

### v0.5 - Workspace & Source Resolution

Goal: connect page issues to local repositories cleanly.

Deliverables:

- workspace registry in `devpilot-mcp`
- explicit workspace registration / lookup
- route / stack / URL to local source resolving
- source snippet tool
- source file tool
- project search tool
- session detail shows whether an observation is linked to local code

Out of scope:

- direct patch application
- automated fixes

Exit criteria:

- Claude / Cursor can resolve an observation to local source and inspect files through MCP

### v0.6 - Agent Collaboration Flow

Goal: make Claude / Cursor the primary execution path for development work.

Deliverables:

- canonical agent workflow docs:
  - read pending observations
  - acknowledge
  - inspect source
  - edit code
  - reply
  - resolve
- "watch mode" workflow for ongoing observation intake
- session/thread UX for agent replies
- clear distinction between:
  - annotation discussion
  - incident diagnosis

Out of scope:

- built-in embedded AI repair engine

Exit criteria:

- a developer can use Claude / Cursor + `devpilot-mcp` end-to-end without needing the old repair drawer flow

### v0.7 - Optional Patch Assist

Goal: add optional patch proposal / apply flows without making them the product center.

Deliverables:

- patch proposal view
- apply after confirmation
- limited validation hooks
- clear "experimental" labeling

Out of scope:

- full autonomous coding agent
- production deployment workflow

Exit criteria:

- patch proposals are optional assistance, not required for the core DevPilot workflow

## UI Architecture Target

### Primary UI Pieces

- `DevPilotLauncher`
- `DevPilotToolbar`
- `DevPilotPageLayer`
- `AnnotationPopup`
- `IncidentPopup`
- `SessionPanel`
- `DetailPanel`

### Interaction Hierarchy

Level 1:

- toolbar
- page overlay
- popup
- marker

Level 2:

- session panel
- grouped observations

Level 3:

- detail panel
- source location
- workspace state
- optional patch proposal

## Current Repo Migration Notes

### Keep For Reuse

- source lookup logic
- workspace registration ideas
- browser collectors
- local patch safety constraints

### Replace Or Phase Out

- old drawer-centric widget shell
- AG-UI-specific framing
- stability-copilot terminology
- mixed incident/detail/list dashboard layout

## Immediate Next Build Sequence

1. Lock naming and package boundaries.
2. Replace the current drawer-centric widget shell with a toolbar/page-layer shell.
3. Build the `devpilot-mcp` HTTP + MCP bridge on top of the current local tooling ideas.
4. Move stability into a separate page mode, not a dashboard shell.
5. Add workspace/source tools after annotation + MCP are stable.
