import test from "node:test";
import assert from "node:assert/strict";

import {
  createDevPilotTaskPacket,
  formatDevPilotTaskPacketMarkdown,
} from "../packages/devpilot/dist/task-packet.js";

test("createDevPilotTaskPacket emits agent-ready v2 protocol for mixed issues", () => {
  const packet = createDevPilotTaskPacket({
    type: "repair",
    taskTitle: "Fix dashboard issues on /dashboard",
    description: "The page has one UI bug and one runtime failure.",
    desiredOutcome: "Resolve the reported UI and runtime issues with minimal safe changes.",
    pathname: "/dashboard",
    pageTitle: "Dashboard",
    url: "http://localhost:3000/dashboard",
    viewport: { width: 1440, height: 900 },
    annotations: [
      {
        id: "ann-1",
        pathname: "/dashboard",
        createdAt: 1,
        updatedAt: 2,
        kind: "element",
        status: "pending",
        comment: "Primary CTA is misaligned with the card footer.",
        elementName: "button Save changes",
        elementPath: "main > section.card > button.primary",
        pageX: 120,
        pageY: 320,
        rect: { left: 100, top: 300, width: 160, height: 44 },
        context: {
          componentHints: ["SaveButton"],
          selectorCandidates: ["button.primary", "[data-testid='save-button']"],
          sourceHints: ["src/components/SaveButton.tsx"],
          dataAttributes: { "data-testid": "save-button" },
        },
      },
    ],
    stabilityItems: [
      {
        id: "sti-1",
        pathname: "/dashboard",
        createdAt: 3,
        updatedAt: 4,
        status: "open",
        severity: "high",
        title: "Save action crashes",
        symptom: "Clicking save throws an unhandled TypeError.",
        fixGoal: "Make the save flow succeed without runtime errors.",
        context: {
          capturedAt: 3,
          title: "Dashboard",
          url: "http://localhost:3000/dashboard",
          pathname: "/dashboard",
          viewport: { width: 1440, height: 900 },
          openAnnotationCount: 1,
          openAnnotationComments: ["button Save changes: Primary CTA is misaligned with the card footer."],
          openAnnotationSummaries: [
            {
              elementName: "button Save changes",
              elementPath: "main > section.card > button.primary",
              comment: "Primary CTA is misaligned with the card footer.",
              kind: "element",
            },
          ],
        },
      },
    ],
    platform: "MacIntel",
    language: "en-US",
  });

  assert.equal(packet.schema, "devpilot.task-packet/v2");
  assert.equal(packet.summary.annotationCount, 1);
  assert.equal(packet.summary.stabilityCount, 1);
  assert.equal(packet.summary.totalIssueCount, 2);
  assert.ok(packet.summary.sourceHitCount >= 2);
  assert.equal(packet.agent.intent, "mixed-fix");
  assert.equal(packet.agent.priority, "high");
  assert.equal(packet.agent.changeScope, "targeted");
  assert.equal(packet.agent.executionMode, "safe-minimal-change");
  assert.ok(packet.agent.primaryTargets.includes("component:SaveButton"));
  assert.ok(packet.agent.primaryTargets.includes("file:src/components/SaveButton.tsx"));
  assert.ok(
    packet.agent.acceptanceCriteria.includes(
      "Resolve the reported UI and runtime issues with minimal safe changes.",
    ),
  );
  assert.ok(
    packet.agent.suggestedSearchQueries.includes("SaveButton"),
  );
  assert.ok(
    packet.agent.outputContract.includes("List the files changed."),
  );

  const markdown = formatDevPilotTaskPacketMarkdown(packet);
  assert.match(markdown, /\*\*Schema:\*\* devpilot\.task-packet\/v2/);
  assert.match(markdown, /## Agent Brief/);
  assert.match(markdown, /### Acceptance Criteria/);
  assert.match(markdown, /## Output Contract/);
  assert.match(markdown, /Search for `file:src\/components\/SaveButton\.tsx`/);
});
