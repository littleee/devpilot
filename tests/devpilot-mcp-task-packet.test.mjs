import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { createStore } from "../packages/devpilot-mcp/dist/store.js";
import { buildSessionTaskPacket } from "../packages/devpilot-mcp/dist/mcp/task-packet.js";

function withTempStore(run) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "devpilot-task-packet-"));
  const dbPath = path.join(dir, "store.sqlite");
  const store = createStore(dbPath);

  try {
    return run(store);
  } finally {
    store.close();
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

test("buildSessionTaskPacket creates an agent-ready v2 brief from open session items", () =>
  withTempStore((store) => {
    const workspaceRoot = path.join(path.dirname(store.getDbPath()), "workspace");
    const sourceDir = path.join(workspaceRoot, "src", "components");
    const sourceFile = path.join(sourceDir, "SaveButton.tsx");
    fs.mkdirSync(sourceDir, { recursive: true });
    fs.writeFileSync(
      sourceFile,
      [
        "export function SaveButton() {",
        "  return <button>Save</button>;",
        "}",
        "",
      ].join("\n"),
      "utf8",
    );

    store.registerWorkspace({
      rootPath: workspaceRoot,
      name: "demo-workspace",
      devServerUrls: ["http://example.com"],
    });

    const session = store.ensureSession({
      pageKey: "http://example.com/dashboard",
      pathname: "/dashboard",
      url: "http://example.com/dashboard",
      title: "Dashboard",
    });

    store.addAnnotation(session.id, {
      id: "ann-open",
      pathname: "/dashboard",
      createdAt: 1,
      updatedAt: 2,
      kind: "element",
      status: "pending",
      comment: "CTA is misaligned",
      elementName: "button Save",
      elementPath: "main > section.card > button.primary",
      pageX: 120,
      pageY: 260,
      rect: { left: 100, top: 240, width: 180, height: 44 },
      context: {
        componentHints: ["SaveButton"],
        sourceHints: ["src/components/SaveButton.tsx:2:10"],
        selectorCandidates: ["button.primary"],
      },
    });

    store.addAnnotation(session.id, {
      id: "ann-closed",
      pathname: "/dashboard",
      createdAt: 1,
      updatedAt: 3,
      status: "resolved",
      comment: "Already fixed",
      elementName: "label",
      elementPath: "form > label",
      pageX: 20,
      pageY: 20,
      rect: { left: 0, top: 0, width: 10, height: 10 },
    });

    store.addStabilityItem(session.id, {
      id: "sti-open",
      pathname: "/dashboard",
      createdAt: 4,
      updatedAt: 5,
      status: "open",
      severity: "high",
      title: "Save action crashes",
      symptom: "Clicking save throws a TypeError.",
      fixGoal: "Restore the save flow without runtime failures.",
      context: {
        capturedAt: 4,
        title: "Dashboard",
        url: "http://example.com/dashboard",
        pathname: "/dashboard",
        viewport: { width: 1440, height: 900 },
        platform: "MacIntel",
        language: "en-US",
        screen: { width: 1728, height: 1117 },
        referrer: "http://example.com/home",
        openAnnotationCount: 1,
        openAnnotationComments: ["button Save: CTA is misaligned"],
        openAnnotationSummaries: [
          {
            elementName: "button Save",
            elementPath: "main > section.card > button.primary",
            comment: "CTA is misaligned",
            kind: "element",
          },
        ],
      },
    });

    store.addRepairRequest(session.id, {
      id: "req-open",
      pathname: "/dashboard",
      createdAt: 6,
      updatedAt: 7,
      status: "requested",
      title: "Fix save flow",
      severity: "high",
      prompt: "Fix the broken save flow and align the CTA.",
      requestedBy: "human",
      stabilityItemId: "sti-open",
    });

    const fullSession = store.getSessionWithAnnotations(session.id);
    assert.ok(fullSession);

    const result = buildSessionTaskPacket(fullSession, {
      workspaces: store.listWorkspaces(),
    });
    assert.equal(result.packet.schema, "devpilot.task-packet/v2");
    assert.equal(result.packet.summary.annotationCount, 1);
    assert.equal(result.packet.summary.stabilityCount, 1);
    assert.equal(result.packet.summary.totalIssueCount, 2);
    assert.equal(result.packet.summary.resolvedSourceCount, 1);
    assert.equal(result.packet.task.type, "repair");
    assert.equal(result.packet.task.desiredOutcome, "Fix the broken save flow and align the CTA.");
    assert.equal(result.packet.agent.intent, "mixed-fix");
    assert.equal(result.packet.agent.priority, "high");
    assert.ok(result.packet.agent.primaryTargets.includes("repair:Fix save flow"));
    assert.ok(result.packet.agent.primaryTargets.includes("resolved:src/components/SaveButton.tsx"));
    assert.ok(
      result.packet.agent.primaryTargets.some((target) =>
        target.startsWith("file:src/components/SaveButton.tsx"),
      ),
    );
    assert.ok(result.packet.agent.suggestedSearchQueries.includes("SaveButton"));
    assert.ok(result.packet.agent.suggestedSearchQueries.includes("src/components/SaveButton.tsx"));
    assert.equal(result.packet.context?.platform, "MacIntel");
    assert.equal(result.packet.evidence.annotations.length, 1);
    assert.equal(result.packet.evidence.stabilityItems?.length, 1);
    assert.equal(result.packet.resolvedSources?.[0].filePath, sourceFile);
    assert.equal(result.packet.evidence.annotations[0].resolvedSources?.[0].line, 2);
    assert.equal(result.repairRequests.length, 1);
    assert.equal(result.repairRequests[0].prompt, "Fix the broken save flow and align the CTA.");
  }));
