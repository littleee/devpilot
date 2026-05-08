import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { createStore } from "../packages/devpilot-mcp/dist/store.js";
import { buildSessionTaskPacket } from "../packages/devpilot-mcp/dist/mcp/task-packet.js";
import {
  buildAgentPlaybookBundle,
  buildAgentWorkflowRecommendation,
} from "../packages/devpilot-mcp/dist/mcp/agent-playbook.js";

function withTempStore(run) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "devpilot-agent-playbook-"));
  const dbPath = path.join(dir, "store.sqlite");
  const store = createStore(dbPath);

  try {
    return run(store);
  } finally {
    store.close();
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

test("agent workflow recommends self-driving when repair requests and verified sources are present", () =>
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
    });

    const fullSession = store.getSessionWithAnnotations(session.id);
    assert.ok(fullSession);

    const { packet, repairRequests } = buildSessionTaskPacket(fullSession, {
      workspaces: store.listWorkspaces(),
    });
    const recommendation = buildAgentWorkflowRecommendation({
      sessionId: session.id,
      session: {
        id: session.id,
        title: session.title,
        pathname: session.pathname,
        url: session.url,
      },
      packet,
      repairRequests,
    });

    assert.equal(recommendation.recommendedMode, "self-driving");
    assert.ok(recommendation.reasons.some((reason) => reason.includes("repair requests")));
    assert.ok(recommendation.nextTools.includes("devpilot_accept_repair_request"));
    assert.ok(recommendation.nextTools.includes("devpilot_get_source_snippet"));
    assert.ok(recommendation.completionTools.includes("devpilot_complete_repair_request"));
    assert.match(recommendation.sessionPrompt || "", /Session ID:/);

    const bundle = buildAgentPlaybookBundle({
      mode: "self-driving",
      sessionContext: {
        sessionId: session.id,
        session: {
          id: session.id,
          title: session.title,
          pathname: session.pathname,
          url: session.url,
        },
        packet,
        repairRequests,
      },
    });

    assert.equal(bundle.playbooks.length, 1);
    assert.equal(bundle.playbooks[0].mode, "self-driving");
    assert.match(bundle.playbooks[0].promptTemplates?.task || "", /Desired outcome:/);
  }));

test("agent workflow falls back to critique when risk is high and source targeting is weak", () => {
  const packet = {
    schema: "devpilot.task-packet/v2",
    generatedAt: "2026-04-21T00:00:00.000Z",
    page: {
      title: "Dashboard",
      url: "http://example.com/dashboard",
      pathname: "/dashboard",
      viewport: { width: 1440, height: 900 },
    },
    summary: {
      annotationCount: 0,
      stabilityCount: 1,
      totalIssueCount: 1,
      sourceHitCount: 0,
      resolvedSourceCount: 0,
    },
    task: {
      type: "repair",
      title: "Fix dashboard crash",
      description: "A critical runtime failure is blocking the dashboard.",
      desiredOutcome: "Restore the dashboard without runtime failures.",
    },
    agent: {
      version: "1",
      intent: "stability-fix",
      priority: "critical",
      changeScope: "targeted",
      executionMode: "safe-minimal-change",
      primaryTargets: ["issue:Dashboard crash"],
      acceptanceCriteria: ["Restore the dashboard without runtime failures."],
      constraints: ["Preserve unrelated behavior."],
      suggestedSteps: ["Inspect the runtime path before editing."],
      suggestedSearchQueries: ["Dashboard crash"],
      outputContract: ["Explain root cause and validation."],
    },
    evidence: {
      annotations: [],
      stabilityItems: [
        {
          id: "sti-1",
          index: 1,
          title: "Dashboard crash",
          status: "open",
          severity: "critical",
          symptom: "The page throws immediately after load.",
          context: {
            capturedAt: 1,
            title: "Dashboard",
            url: "http://example.com/dashboard",
            pathname: "/dashboard",
            viewport: { width: 1440, height: 900 },
          },
          createdAt: 1,
          updatedAt: 1,
        },
      ],
    },
  };

  const recommendation = buildAgentWorkflowRecommendation({
    sessionId: "session-critical",
    session: {
      id: "session-critical",
      title: "Dashboard",
      pathname: "/dashboard",
      url: "http://example.com/dashboard",
    },
    packet,
    repairRequests: [],
  });

  assert.equal(recommendation.recommendedMode, "critique");
  assert.ok(recommendation.reasons.some((reason) => reason.includes("Critical issues")));
  assert.ok(recommendation.nextTools.includes("devpilot_diagnose_stability_item"));
  assert.ok(recommendation.nextTools.includes("devpilot_resolve_stability_source"));
  assert.deepEqual(recommendation.completionTools, ["devpilot_reply"]);

  const watchBundle = buildAgentPlaybookBundle({
    mode: "watch",
    includePromptTemplate: false,
  });

  assert.equal(watchBundle.playbooks[0].mode, "watch");
  assert.ok(
    watchBundle.playbooks[0].toolSequence[0].tools.includes("devpilot_watch_annotations"),
  );
  assert.equal(watchBundle.playbooks[0].promptTemplates, undefined);
});
