# Stability Panel Redesign

## Goal

Refactor the current `Stability Copilot` panel from a feature-heavy utility view into a clearer issue inbox.

The panel should help users answer four questions quickly:

1. Is runtime observation enabled right now?
2. What new issues were captured?
3. Which issue should I care about first?
4. How do I hand this issue to AI for diagnosis or repair?

The redesign should reduce cognitive load, make the main action obvious, and preserve DevPilot's differentiation around runtime issue capture.

---

## Product Position

`Stability Copilot` is not just another panel in the toolbar.

It is the product surface that turns browser runtime failures into structured engineering work. If this panel feels noisy or hard to parse, users will not feel the value of the feature even if the underlying collectors are working correctly.

That means the panel should behave less like a "debug settings area" and more like a focused problem inbox.

---

## Current Problems

### 1. Too much information at once

The current panel mixes:

- observation state
- summary cards
- creation controls
- issue list
- issue detail
- repair actions
- explanatory copy

This makes first-use scanning harder than it should be.

### 2. The main task is not obvious enough

Users do not open the panel to study system structure.

They open it to:

- confirm that observation is running
- see what failed
- decide whether it matters
- send it to AI

The current UI exposes too many parallel actions before that flow is clear.

### 3. Observation feedback is still too weak

After enabling Stability Copilot, users want immediate reassurance:

- it is on
- it is listening
- the latest capture happened at time X
- nothing happened yet, or here is what happened

Without that feedback, the feature can feel unreliable even when it is working.

### 4. The panel still feels like a tool surface, not an inbox

The panel should feel like a queue of runtime issues to triage.

Instead, it still reads partly like an internal control surface for DevPilot itself.

---

## Redesign Principles

### 1. One panel, one job

The panel's primary job is:

`see runtime issues -> choose one -> send to AI`

Everything else should support that.

### 2. Show state first, details second

Top-level state should be scannable in seconds.

Fine-grained stack traces, request payloads, and structured context should only appear after a specific issue is selected.

### 3. Make the primary CTA singular

Each issue should have one obvious primary action:

- `Send to AI`
or
- `Create Repair Request`

Do not present multiple same-level actions unless the distinction is truly important.

### 4. Use product language, not system language

Prefer:

- `Watching for runtime issues`
- `Last captured 2m ago`
- `3 open issues`

Avoid leading with protocol or implementation terms.

### 5. Treat empty states as product moments

When there are no issues, the panel should still reassure the user that the feature is active and useful.

---

## Proposed Information Architecture

### Section 1: Observation Status

This becomes the top block of the panel.

It should show:

- `Stability Copilot: On / Off`
- current observation state
- last captured event time
- current open issue count

Suggested presentation:

- compact status row
- one sentence of supporting text at most

Example:

```text
Stability Copilot: On
Watching for JS errors, promise rejections, and failed requests
Last event: 2m ago
3 open issues
```

When off:

```text
Stability Copilot is off
Turn it on to capture runtime issues automatically
```

### Section 2: Issue Inbox

This is the main body.

Each row should stay compact and only include:

- issue type
- short title / message
- relative time
- severity
- page or request hint

Example row:

```text
[Error] Failed to load checkout totals
2m ago · /checkout · High
```

Each row should support:

- click to open detail
- unread/new visual state

### Section 3: Selected Issue Detail

Only visible after selecting an issue.

This detail area should include:

- normalized title
- issue type
- time captured
- runtime message
- request or stack details when available
- page URL / route
- related page context
- structured evidence block

This is where we can keep technical richness without overwhelming the whole panel.

### Section 4: Primary Action Area

The selected issue detail should end with one clear primary CTA:

- `Send to AI`

Secondary actions can exist, but visually subordinate:

- dismiss
- mark resolved
- copy raw details

If connected mode is enabled, `Send to AI` can translate internally into repair-request creation.

---

## Proposed User Flows

### Flow A: Feature just enabled

1. User turns on Stability Copilot in Settings.
2. Panel shows active observation state.
3. Empty state reassures the user that observation is running.
4. First captured issue creates a visible badge and a clear inbox entry.

### Flow B: User sees a new issue

1. User opens Stability panel.
2. User sees a small list of recent open issues.
3. User clicks the most relevant one.
4. User reads detail.
5. User clicks `Send to AI`.

### Flow C: No issue worth acting on

1. User opens panel.
2. User reviews one issue.
3. User dismisses it or marks it resolved.
4. Issue leaves the open queue.

---

## Recommended UI Structure

```text
+--------------------------------------------------+
| Stability Copilot                               |
| On · Watching for runtime issues                |
| Last event 2m ago · 3 open issues               |
+--------------------------------------------------+
| Open Issues                                     |
| [Error] Failed to load checkout totals          |
| [Fetch] POST /api/checkout returned 500         |
| [Promise] Payment intent rejected               |
+--------------------------------------------------+
| Selected Issue                                  |
| Failed to load checkout totals                  |
| Error · High · /checkout · 2m ago               |
| Message                                         |
| Stack / request / related context               |
| Page context / hints                            |
|                                                 |
| [Send to AI]   [Dismiss]   [Mark resolved]      |
+--------------------------------------------------+
```

---

## States To Design Explicitly

### 1. Off state

- feature disabled
- no issue list shown
- clear explanation of what enabling does

### 2. Empty active state

- feature enabled
- no issues captured yet
- reassuring message that observation is active

### 3. New issue state

- badge on toolbar
- list row highlighted as new
- latest capture timestamp updated

### 4. Selected issue state

- detail drawer/section visible
- primary CTA visible

### 5. Recovering / reconnecting state

Only if relevant in connected mode.

- should not dominate the panel
- should be visible but secondary

---

## What To Remove or De-emphasize

### Remove

- long explanatory paragraphs
- multiple heavyweight summary blocks above the issue list
- action groups that compete equally with the main CTA

### De-emphasize

- internal implementation language
- connection mechanics inside the main body
- low-value metrics that do not help triage

---

## Copy Recommendations

### Good

- `Watching for runtime issues`
- `No issues captured yet`
- `Last captured 3m ago`
- `Send to AI`
- `Dismiss`
- `Mark resolved`

### Avoid

- `Auto observation is enabled and can route structured repair workflows`
- `Runtime diagnostics synchronization state`
- `Current detail`

---

## Connected Mode Behavior

The panel should not look fundamentally different between local and connected mode.

The difference should mostly affect what happens after the primary action:

- local mode: `Send to AI` copies or prepares a task packet
- connected mode: `Send to AI` can create a repair request and sync it

The user should not have to learn a new panel just because MCP is enabled.

---

## Metrics To Watch

After the redesign, we should watch:

- how often users enable Stability Copilot
- how often captured issues are opened
- how often selected issues are sent to AI
- how often issues are dismissed vs resolved
- time from first capture to AI handoff

These will tell us whether the panel is becoming an actual workflow surface instead of a passive dashboard.

---

## Implementation Phases

### Phase 1: Structural cleanup

- simplify header
- move observation state into one compact block
- reduce heavy summary cards
- make issue list the primary body

### Phase 2: Inbox behavior

- compact issue rows
- selected issue detail area
- badge/new state handling

### Phase 3: CTA clarity

- introduce one primary action
- demote secondary actions visually
- align local and connected behavior behind the same button label

### Phase 4: Empty/off states

- better empty state copy
- stronger “watching” reassurance
- clearer onboarding when first enabled

---

## Recommended Priority

This redesign should be treated as a high-priority Beta follow-up.

Suggested order relative to other work:

1. screenshot evidence for AI handoff
2. stability panel redesign
3. first-use onboarding
4. language switching

If the team wants to emphasize Stability Copilot in external messaging, the redesign should move even higher.

---

## Summary

The stability panel should evolve from a dense feature panel into a focused runtime issue inbox.

The key shift is:

`system surface -> triage surface`

When the redesign is complete, users should be able to open the panel and immediately understand:

- whether observation is active
- what went wrong
- what to act on first
- how to hand that issue to AI
