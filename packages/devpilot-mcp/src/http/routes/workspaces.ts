import type { DevPilotRegisterWorkspaceInput } from "../../types.js";
import type { HttpRouteHandler } from "../context.js";
import { parseBody, sendError, sendJson } from "../shared.js";
import { validateWorkspaceRoot } from "../../source/resolver.js";

export const handleWorkspaceRoutes: HttpRouteHandler = async ({
  req,
  res,
  pathname,
  store,
}) => {
  if (req.method === "GET" && pathname === "/workspaces") {
    sendJson(res, 200, { workspaces: store.listWorkspaces() });
    return true;
  }

  if (req.method === "POST" && pathname === "/workspaces/register") {
    const body = await parseBody<DevPilotRegisterWorkspaceInput>(req);
    if (!body.rootPath) {
      sendError(res, 400, "rootPath is required");
      return true;
    }

    const workspace = store.registerWorkspace({
      ...body,
      rootPath: validateWorkspaceRoot(body.rootPath),
    });

    sendJson(res, 201, { workspace });
    return true;
  }

  const workspaceMatch = pathname.match(/^\/workspaces\/([^/]+)$/);
  if (req.method === "GET" && workspaceMatch) {
    const workspace = store.getWorkspace(workspaceMatch[1]);
    if (!workspace) {
      sendError(res, 404, "Workspace not found");
      return true;
    }

    sendJson(res, 200, { workspace });
    return true;
  }

  return false;
};
