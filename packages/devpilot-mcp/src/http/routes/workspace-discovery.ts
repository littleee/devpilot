import type { HttpRouteHandler } from "../context.js";
import { parseBody, sendJson } from "../shared.js";
import { autoDiscoverWorkspaces } from "../../source/resolver.js";

type AutoDiscoverBody = {
  startPaths?: string[];
  persist?: boolean;
};

export const handleWorkspaceDiscoveryRoutes: HttpRouteHandler = async ({
  req,
  res,
  pathname,
  store,
}) => {
  if (req.method === "POST" && pathname === "/workspaces/auto-discover") {
    const body = await parseBody<AutoDiscoverBody>(req);
    const discovered = autoDiscoverWorkspaces(body.startPaths);
    const persist = body.persist ?? true;

    const workspaces = persist
      ? discovered.map((workspace) =>
          store.registerWorkspace({
            rootPath: workspace.rootPath,
            name: workspace.name,
            devServerUrls: workspace.devServerUrls,
          }),
        )
      : discovered;

    sendJson(res, 200, { workspaces, persisted: persist });
    return true;
  }

  return false;
};
