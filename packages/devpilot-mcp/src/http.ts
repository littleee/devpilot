import { createServer, type IncomingMessage, type ServerResponse } from "node:http";

import { createStore, type DevPilotStore } from "./store.js";
import type { DevPilotAnnotationRecord, DevPilotEnsureSessionInput } from "./types.js";

type DevPilotStreamEventType =
  | "session.created"
  | "session.updated"
  | "annotation.created"
  | "annotation.updated"
  | "annotation.deleted"
  | "thread.message";

type DevPilotStreamEvent = {
  type: DevPilotStreamEventType;
  timestamp: string;
  sessionId: string;
  sequence: number;
  payload: unknown;
};

function setCorsHeaders(res: ServerResponse): void {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PATCH,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

function sendJson(res: ServerResponse, statusCode: number, payload: unknown): void {
  setCorsHeaders(res);
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(payload));
}

function sendError(res: ServerResponse, statusCode: number, message: string): void {
  sendJson(res, statusCode, { error: message });
}

async function parseBody<T>(req: IncomingMessage): Promise<T> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }
  const raw = Buffer.concat(chunks).toString("utf8").trim();
  return (raw ? JSON.parse(raw) : {}) as T;
}

export function createHttpHandler(store: DevPilotStore) {
  let nextSequence = 1;
  const eventHistory: DevPilotStreamEvent[] = [];
  const globalSubscribers = new Set<ServerResponse>();
  const sessionSubscribers = new Map<string, Set<ServerResponse>>();

  const sendSseEvent = (res: ServerResponse, event: DevPilotStreamEvent): void => {
    res.write(`event: ${event.type}\n`);
    res.write(`id: ${event.sequence}\n`);
    res.write(`data: ${JSON.stringify(event)}\n\n`);
  };

  const emitEvent = (
    type: DevPilotStreamEventType,
    sessionId: string,
    payload: unknown,
  ): void => {
    const event: DevPilotStreamEvent = {
      type,
      sessionId,
      payload,
      timestamp: new Date().toISOString(),
      sequence: nextSequence,
    };
    nextSequence += 1;
    eventHistory.push(event);
    if (eventHistory.length > 500) {
      eventHistory.shift();
    }

    const targets = new Set<ServerResponse>(globalSubscribers);
    const scoped = sessionSubscribers.get(sessionId);
    if (scoped) {
      scoped.forEach((subscriber) => targets.add(subscriber));
    }

    targets.forEach((subscriber) => sendSseEvent(subscriber, event));
  };

  const registerSubscriber = (res: ServerResponse, sessionId?: string): void => {
    if (sessionId) {
      const scoped = sessionSubscribers.get(sessionId) || new Set<ServerResponse>();
      scoped.add(res);
      sessionSubscribers.set(sessionId, scoped);
      return;
    }

    globalSubscribers.add(res);
  };

  const unregisterSubscriber = (res: ServerResponse, sessionId?: string): void => {
    if (sessionId) {
      const scoped = sessionSubscribers.get(sessionId);
      if (!scoped) {
        return;
      }
      scoped.delete(res);
      if (scoped.size === 0) {
        sessionSubscribers.delete(sessionId);
      }
      return;
    }

    globalSubscribers.delete(res);
  };

  const replayEvents = (res: ServerResponse, lastEventId: string | string[] | undefined, sessionId?: string) => {
    const lastSequence = Number.parseInt(
      Array.isArray(lastEventId) ? lastEventId[0] : lastEventId || "",
      10,
    );
    if (Number.isNaN(lastSequence)) {
      return;
    }

    eventHistory
      .filter((event) => event.sequence > lastSequence)
      .filter((event) => (sessionId ? event.sessionId === sessionId : true))
      .forEach((event) => sendSseEvent(res, event));
  };

  const sendInitialPendingEvents = (res: ServerResponse, sessionId?: string): void => {
    const pendingAnnotations = sessionId
      ? store.getPendingAnnotations(sessionId)
      : store.getAllPendingAnnotations();

    pendingAnnotations.forEach((annotation) => {
      sendSseEvent(res, {
        type: "annotation.created",
        sessionId: annotation.sessionId,
        timestamp: new Date(annotation.createdAt).toISOString(),
        sequence: 0,
        payload: annotation,
      });
    });

    res.write(
      `event: sync.complete\ndata: ${JSON.stringify({
        sessionId: sessionId || "all",
        count: pendingAnnotations.length,
        timestamp: new Date().toISOString(),
      })}\n\n`,
    );
  };

  return async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
    setCorsHeaders(res);

    if (req.method === "OPTIONS") {
      res.statusCode = 204;
      res.end();
      return;
    }

    const url = new URL(req.url || "/", "http://localhost");
    const { pathname } = url;

    try {
      if (req.method === "GET" && pathname === "/health") {
        sendJson(res, 200, { ok: true, dbPath: store.getDbPath() });
        return;
      }

      if (req.method === "GET" && pathname === "/events") {
        const isAgent = url.searchParams.get("agent") === "true";

        res.writeHead(200, {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
          "Access-Control-Allow-Origin": "*",
        });
        res.write(": connected\n\n");

        replayEvents(res, req.headers["last-event-id"]);
        if (isAgent) {
          sendInitialPendingEvents(res);
        }

        registerSubscriber(res);
        const keepAlive = setInterval(() => {
          res.write(": ping\n\n");
        }, 30000);

        req.on("close", () => {
          clearInterval(keepAlive);
          unregisterSubscriber(res);
        });
        return;
      }

      if (req.method === "POST" && pathname === "/sessions/ensure") {
        const body = await parseBody<DevPilotEnsureSessionInput>(req);
        if (!body.pageKey || !body.pathname || !body.url) {
          sendError(res, 400, "pageKey, pathname, and url are required");
          return;
        }

        const session = store.ensureSession({
          pageKey: body.pageKey,
          pathname: body.pathname,
          url: body.url,
          title: body.title || body.pathname,
        });
        emitEvent("session.updated", session.id, session);
        sendJson(res, 200, session);
        return;
      }

      if (req.method === "GET" && pathname === "/sessions") {
        sendJson(res, 200, store.listSessions());
        return;
      }

      const sessionMatch = pathname.match(/^\/sessions\/([^/]+)$/);
      if (req.method === "GET" && sessionMatch) {
        const session = store.getSessionWithAnnotations(sessionMatch[1]);
        if (!session) {
          sendError(res, 404, "Session not found");
          return;
        }
        sendJson(res, 200, session);
        return;
      }

      const sessionEventsMatch = pathname.match(/^\/sessions\/([^/]+)\/events$/);
      if (req.method === "GET" && sessionEventsMatch) {
        const sessionId = sessionEventsMatch[1];
        const session = store.getSession(sessionId);
        if (!session) {
          sendError(res, 404, "Session not found");
          return;
        }

        const isAgent = url.searchParams.get("agent") === "true";

        res.writeHead(200, {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
          "Access-Control-Allow-Origin": "*",
        });
        res.write(": connected\n\n");

        replayEvents(res, req.headers["last-event-id"], sessionId);
        if (isAgent) {
          sendInitialPendingEvents(res, sessionId);
        }

        registerSubscriber(res, sessionId);
        const keepAlive = setInterval(() => {
          res.write(": ping\n\n");
        }, 30000);

        req.on("close", () => {
          clearInterval(keepAlive);
          unregisterSubscriber(res, sessionId);
        });
        return;
      }

      const sessionPendingMatch = pathname.match(/^\/sessions\/([^/]+)\/pending$/);
      if (req.method === "GET" && sessionPendingMatch) {
        const annotations = store.getPendingAnnotations(sessionPendingMatch[1]);
        sendJson(res, 200, { count: annotations.length, annotations });
        return;
      }

      if (req.method === "GET" && pathname === "/pending") {
        const annotations = store.getAllPendingAnnotations();
        sendJson(res, 200, { count: annotations.length, annotations });
        return;
      }

      const addAnnotationMatch = pathname.match(/^\/sessions\/([^/]+)\/annotations$/);
      if (req.method === "POST" && addAnnotationMatch) {
        const body = await parseBody<Omit<DevPilotAnnotationRecord, "sessionId" | "replies">>(req);
        if (!body.id || !body.comment || !body.elementName || !body.elementPath || !body.rect) {
          sendError(res, 400, "annotation id, comment, elementName, elementPath, and rect are required");
          return;
        }

        const annotation = store.addAnnotation(addAnnotationMatch[1], body);
        if (!annotation) {
          sendError(res, 404, "Session not found");
          return;
        }

        emitEvent("annotation.created", annotation.sessionId, annotation);
        sendJson(res, 201, annotation);
        return;
      }

      const annotationMatch = pathname.match(/^\/annotations\/([^/]+)$/);
      if (annotationMatch && req.method === "GET") {
        const annotation = store.getAnnotation(annotationMatch[1]);
        if (!annotation) {
          sendError(res, 404, "Annotation not found");
          return;
        }
        sendJson(res, 200, annotation);
        return;
      }

      if (annotationMatch && req.method === "PATCH") {
        const body = await parseBody<Partial<DevPilotAnnotationRecord>>(req);
        const annotation = store.updateAnnotation(annotationMatch[1], body);
        if (!annotation) {
          sendError(res, 404, "Annotation not found");
          return;
        }
        emitEvent("annotation.updated", annotation.sessionId, annotation);
        sendJson(res, 200, annotation);
        return;
      }

      if (annotationMatch && req.method === "DELETE") {
        const deleted = store.deleteAnnotation(annotationMatch[1]);
        if (!deleted) {
          sendError(res, 404, "Annotation not found");
          return;
        }
        emitEvent("annotation.deleted", deleted.sessionId, deleted);
        sendJson(res, 200, { deleted: true, annotationId: annotationMatch[1] });
        return;
      }

      const threadMatch = pathname.match(/^\/annotations\/([^/]+)\/thread$/);
      if (threadMatch && req.method === "POST") {
        const body = await parseBody<{ role: "human" | "agent"; content: string }>(req);
        if (!body.role || !body.content) {
          sendError(res, 400, "role and content are required");
          return;
        }
        const annotation = store.addReply(threadMatch[1], body.role, body.content);
        if (!annotation) {
          sendError(res, 404, "Annotation not found");
          return;
        }
        emitEvent("thread.message", annotation.sessionId, annotation);
        sendJson(res, 201, annotation);
        return;
      }

      sendError(res, 404, "Not found");
    } catch (error) {
      sendError(res, 500, (error as Error).message);
    }
  };
}

export function startHttpServer(port = 5213, store = createStore()) {
  const server = createServer(createHttpHandler(store));
  server.listen(port, () => {
    console.error(`[devpilot-mcp] HTTP server listening on http://localhost:${port}`);
  });
  return { server, store };
}
