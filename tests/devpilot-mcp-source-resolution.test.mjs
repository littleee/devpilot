import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createServer } from "node:http";

import { createHttpHandler } from "../packages/devpilot-mcp/dist/http.js";
import { createStore } from "../packages/devpilot-mcp/dist/store.js";

test("workspace registration and source resolution return verified local files and snippets", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "devpilot-source-resolution-"));
  const workspaceRoot = path.join(dir, "workspace");
  const dbPath = path.join(dir, "store.sqlite");
  const sourceDir = path.join(workspaceRoot, "src", "components");
  const sourceFile = path.join(sourceDir, "SaveButton.tsx");

  fs.mkdirSync(sourceDir, { recursive: true });
  fs.writeFileSync(
    sourceFile,
    [
      "export function SaveButton() {",
      "  const label = 'Save';",
      "  return <button>{label}</button>;",
      "}",
      "",
    ].join("\n"),
    "utf8",
  );

  const store = createStore(dbPath);
  const server = createServer(createHttpHandler(store));

  try {
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    const address = server.address();
    const port = typeof address === "object" && address ? address.port : 0;
    const baseUrl = `http://127.0.0.1:${port}`;

    const workspaceResponse = await fetch(`${baseUrl}/workspaces/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        rootPath: workspaceRoot,
        name: "demo-workspace",
        devServerUrls: ["http://localhost:3000"],
      }),
    });
    assert.equal(workspaceResponse.status, 201);

    const sessionResponse = await fetch(`${baseUrl}/sessions/ensure`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        pageKey: "http://localhost:3000/dashboard",
        pathname: "/dashboard",
        url: "http://localhost:3000/dashboard",
        title: "Dashboard",
      }),
    });
    assert.equal(sessionResponse.status, 200);
    const session = await sessionResponse.json();

    const annotationResponse = await fetch(`${baseUrl}/sessions/${session.id}/annotations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: "ann-source-1",
        pathname: "/dashboard",
        createdAt: 1,
        updatedAt: 2,
        status: "pending",
        comment: "The CTA is wrong",
        elementName: "button Save",
        elementPath: "main > section.card > button.primary",
        pageX: 10,
        pageY: 20,
        rect: { left: 0, top: 0, width: 10, height: 10 },
        context: {
          componentHints: ["SaveButton"],
          sourceHints: ["src/components/SaveButton.tsx:2:9"],
        },
      }),
    });
    assert.equal(annotationResponse.status, 201);

    const resolveAnnotationResponse = await fetch(`${baseUrl}/sources/resolve/annotation`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        annotationId: "ann-source-1",
      }),
    });
    assert.equal(resolveAnnotationResponse.status, 200);
    const resolvedAnnotation = await resolveAnnotationResponse.json();
    assert.equal(resolvedAnnotation.matches.length, 1);
    assert.equal(resolvedAnnotation.matches[0].filePath, sourceFile);
    assert.equal(resolvedAnnotation.matches[0].line, 2);
    assert.equal(resolvedAnnotation.matches[0].column, 9);

    const stabilityResponse = await fetch(`${baseUrl}/sessions/${session.id}/stability`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: "sti-source-1",
        pathname: "/dashboard",
        createdAt: 3,
        updatedAt: 4,
        status: "open",
        severity: "high",
        title: "Save action crashes",
        symptom: "Clicking save throws an error",
        signals: "stack=TypeError: boom\\n    at save (http://localhost:3000/src/components/SaveButton.tsx:3:10)",
        context: {
          capturedAt: 3,
          title: "Dashboard",
          url: "http://localhost:3000/dashboard",
          pathname: "/dashboard",
          viewport: { width: 1440, height: 900 },
          openAnnotationCount: 1,
          openAnnotationComments: ["button Save: The CTA is wrong"],
        },
      }),
    });
    assert.equal(stabilityResponse.status, 201);

    const resolveStabilityResponse = await fetch(`${baseUrl}/sources/resolve/stability`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        stabilityItemId: "sti-source-1",
      }),
    });
    assert.equal(resolveStabilityResponse.status, 200);
    const resolvedStability = await resolveStabilityResponse.json();
    assert.equal(resolvedStability.matches.length, 1);
    assert.equal(resolvedStability.matches[0].filePath, sourceFile);
    assert.equal(resolvedStability.matches[0].line, 3);
    assert.equal(resolvedStability.matches[0].column, 10);

    const snippetResponse = await fetch(`${baseUrl}/sources/snippet`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        filePath: sourceFile,
        line: 3,
        contextLines: 1,
      }),
    });
    assert.equal(snippetResponse.status, 200);
    const snippetPayload = await snippetResponse.json();
    assert.equal(snippetPayload.snippet.startLine, 2);
    assert.equal(snippetPayload.snippet.endLine, 4);
    assert.match(snippetPayload.snippet.content, /return <button>\{label\}<\/button>;/);
  } finally {
    await new Promise((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
    store.close();
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("auto-discovery finds workspace roots and route mapping resolves entry files", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "devpilot-auto-discover-"));
  const workspaceRoot = path.join(dir, "repo");
  const appDir = path.join(workspaceRoot, "app", "dashboard");
  const routeFile = path.join(appDir, "page.tsx");
  const dbPath = path.join(dir, "store.sqlite");

  fs.mkdirSync(appDir, { recursive: true });
  fs.writeFileSync(path.join(workspaceRoot, "package.json"), JSON.stringify({ name: "repo" }), "utf8");
  fs.writeFileSync(
    routeFile,
    [
      "export default function DashboardPage() {",
      "  return <main>Dashboard</main>;",
      "}",
      "",
    ].join("\n"),
    "utf8",
  );

  const store = createStore(dbPath);
  const server = createServer(createHttpHandler(store));

  try {
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    const address = server.address();
    const port = typeof address === "object" && address ? address.port : 0;
    const baseUrl = `http://127.0.0.1:${port}`;

    const autoDiscoverResponse = await fetch(`${baseUrl}/workspaces/auto-discover`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        startPaths: [workspaceRoot],
        persist: true,
      }),
    });
    assert.equal(autoDiscoverResponse.status, 200);
    const autoDiscovered = await autoDiscoverResponse.json();
    assert.equal(autoDiscovered.workspaces.length, 1);
    assert.equal(autoDiscovered.workspaces[0].rootPath, workspaceRoot);

    const sessionResponse = await fetch(`${baseUrl}/sessions/ensure`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        pageKey: "http://localhost:3000/dashboard",
        pathname: "/dashboard",
        url: "http://localhost:3000/dashboard",
        title: "Dashboard",
      }),
    });
    assert.equal(sessionResponse.status, 200);
    const session = await sessionResponse.json();

    const annotationResponse = await fetch(`${baseUrl}/sessions/${session.id}/annotations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: "ann-route-1",
        pathname: "/dashboard",
        createdAt: 1,
        updatedAt: 2,
        status: "pending",
        comment: "Dashboard header spacing is wrong",
        elementName: "header",
        elementPath: "main > header.page-header",
        pageX: 20,
        pageY: 40,
        rect: { left: 0, top: 0, width: 10, height: 10 },
        context: {
          componentHints: [],
          sourceHints: [],
        },
      }),
    });
    assert.equal(annotationResponse.status, 201);

    const resolveAnnotationResponse = await fetch(`${baseUrl}/sources/resolve/annotation`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        annotationId: "ann-route-1",
      }),
    });
    assert.equal(resolveAnnotationResponse.status, 200);
    const resolved = await resolveAnnotationResponse.json();
    assert.equal(resolved.matches.length, 1);
    assert.equal(resolved.matches[0].strategy, "route-entry");
    assert.equal(resolved.matches[0].filePath, routeFile);
  } finally {
    await new Promise((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
    store.close();
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
