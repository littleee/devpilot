import {
  createServer,
  type Server,
  type IncomingMessage,
  type ServerResponse,
} from "node:http";

import { createStore, type DevPilotStore } from "./store.js";
import { HttpRouteHandler } from "./http/context.js";
import { createEventStreamHub } from "./http/events.js";
import { handleAnnotationRoutes } from "./http/routes/annotations.js";
import { handleRepairRequestRoutes } from "./http/routes/repair-requests.js";
import { handleSessionRoutes } from "./http/routes/sessions.js";
import { handleSourceResolutionRoutes } from "./http/routes/source-resolution.js";
import { handleStabilityRoutes } from "./http/routes/stability.js";
import { handleWorkspaceDiscoveryRoutes } from "./http/routes/workspace-discovery.js";
import { handleWorkspaceRoutes } from "./http/routes/workspaces.js";
import { sendError, setCorsHeaders } from "./http/shared.js";

const ROUTES: HttpRouteHandler[] = [
  handleSessionRoutes,
  handleWorkspaceRoutes,
  handleWorkspaceDiscoveryRoutes,
  handleAnnotationRoutes,
  handleStabilityRoutes,
  handleRepairRequestRoutes,
  handleSourceResolutionRoutes,
];

export function createHttpHandler(store: DevPilotStore) {
  const events = createEventStreamHub(store);

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
      for (const route of ROUTES) {
        const handled = await route({
          req,
          res,
          url,
          pathname,
          store,
          events,
        });
        if (handled) {
          return;
        }
      }

      sendError(res, 404, "Not found");
    } catch (error) {
      sendError(res, 500, (error as Error).message);
    }
  };
}

export interface StartHttpServerOptions {
  allowPortFallback?: boolean;
}

export interface StartedHttpServer {
  server: Server;
  store: DevPilotStore;
  port: number;
  url: string;
  requestedPort: number;
  didFallback: boolean;
}

function listenOnPort(server: Server, port: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const handleListening = () => {
      server.off("error", handleError);
      resolve();
    };
    const handleError = (error: Error) => {
      server.off("listening", handleListening);
      reject(error);
    };

    server.once("listening", handleListening);
    server.once("error", handleError);
    server.listen(port);
  });
}

function createPortInUseError(port: number): Error {
  return new Error(
    `[devpilot-mcp] Port ${port} is already in use. Retry with --port <free-port> or omit --port to allow automatic fallback.`,
  );
}

export async function startHttpServer(
  port = 5213,
  store?: DevPilotStore,
  options: StartHttpServerOptions = {},
): Promise<StartedHttpServer> {
  const allowPortFallback = options.allowPortFallback ?? true;
  const resolvedStore = store ?? createStore();
  const requestedPort = port;
  let currentPort = port;

  while (currentPort < 65536) {
    const server = createServer(createHttpHandler(resolvedStore));

    try {
      await listenOnPort(server, currentPort);
      const didFallback = currentPort !== requestedPort;
      if (didFallback) {
        console.error(
          `[devpilot-mcp] Port ${requestedPort} was in use, falling back to http://localhost:${currentPort}`,
        );
      }
      console.error(`[devpilot-mcp] HTTP server listening on http://localhost:${currentPort}`);
      return {
        server,
        store: resolvedStore,
        port: currentPort,
        url: `http://localhost:${currentPort}`,
        requestedPort,
        didFallback,
      };
    } catch (error) {
      const nodeError = error as NodeJS.ErrnoException;
      if (nodeError.code === "EADDRINUSE") {
        server.removeAllListeners();
        if (!allowPortFallback) {
          throw createPortInUseError(requestedPort);
        }
        currentPort += 1;
        continue;
      }

      throw error;
    }
  }

  throw new Error(
    `[devpilot-mcp] Could not find an available port starting from ${requestedPort}.`,
  );
}
