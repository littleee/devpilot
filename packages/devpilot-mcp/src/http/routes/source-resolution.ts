import type { HttpRouteHandler } from "../context.js";
import { parseBody, sendError, sendJson } from "../shared.js";
import {
  createSourceSnippet,
  resolveAnnotationSources,
  resolveStabilitySources,
} from "../../source/resolver.js";

type ResolveAnnotationSourceBody = {
  annotationId?: string;
  maxResults?: number;
};

type ResolveStabilitySourceBody = {
  stabilityItemId?: string;
  maxResults?: number;
};

type SourceSnippetBody = {
  filePath?: string;
  line?: number;
  contextLines?: number;
};

export const handleSourceResolutionRoutes: HttpRouteHandler = async ({
  req,
  res,
  pathname,
  store,
}) => {
  if (req.method === "POST" && pathname === "/sources/resolve/annotation") {
    const body = await parseBody<ResolveAnnotationSourceBody>(req);
    if (!body.annotationId) {
      sendError(res, 400, "annotationId is required");
      return true;
    }

    const annotation = store.getAnnotation(body.annotationId);
    if (!annotation) {
      sendError(res, 404, "Annotation not found");
      return true;
    }

    const session = store.getSession(annotation.sessionId);
    const matches = resolveAnnotationSources(
      annotation,
      store.listWorkspaces(),
      session?.url,
      body.maxResults,
    );

    sendJson(res, 200, { annotationId: annotation.id, matches });
    return true;
  }

  if (req.method === "POST" && pathname === "/sources/resolve/stability") {
    const body = await parseBody<ResolveStabilitySourceBody>(req);
    if (!body.stabilityItemId) {
      sendError(res, 400, "stabilityItemId is required");
      return true;
    }

    const item = store.getStabilityItem(body.stabilityItemId);
    if (!item) {
      sendError(res, 404, "Stability item not found");
      return true;
    }

    const matches = resolveStabilitySources(
      item,
      store.listWorkspaces(),
      body.maxResults,
    );

    sendJson(res, 200, { stabilityItemId: item.id, matches });
    return true;
  }

  if (req.method === "POST" && pathname === "/sources/snippet") {
    const body = await parseBody<SourceSnippetBody>(req);
    if (!body.filePath) {
      sendError(res, 400, "filePath is required");
      return true;
    }

    const snippet = createSourceSnippet(
      body.filePath,
      body.line,
      body.contextLines,
    );

    sendJson(res, 200, { snippet });
    return true;
  }

  return false;
};
