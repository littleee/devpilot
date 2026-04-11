#!/usr/bin/env node

import { startHttpServer } from "./http.js";
import { startMcpServer } from "./mcp.js";

type ParsedArgs = {
  port: number;
  httpUrl: string;
  mcpOnly: boolean;
};

function parseArgs(argv: string[]): ParsedArgs {
  const normalizedArgv = argv[0] === "server" ? argv.slice(1) : argv;
  let port = 5213;
  let httpUrl = "http://localhost:5213";
  let mcpOnly = false;

  for (let index = 0; index < normalizedArgv.length; index += 1) {
    const arg = normalizedArgv[index];

    if (arg === "--port" && normalizedArgv[index + 1]) {
      const nextPort = Number.parseInt(normalizedArgv[index + 1], 10);
      if (!Number.isNaN(nextPort) && nextPort > 0 && nextPort < 65536) {
        port = nextPort;
        if (!normalizedArgv.includes("--http-url")) {
          httpUrl = `http://localhost:${port}`;
        }
      }
      index += 1;
      continue;
    }

    if (arg === "--http-url" && normalizedArgv[index + 1]) {
      httpUrl = normalizedArgv[index + 1];
      index += 1;
      continue;
    }

    if (arg === "--mcp-only") {
      mcpOnly = true;
    }
  }

  return { port, httpUrl, mcpOnly };
}

export { startHttpServer } from "./http.js";
export { startMcpServer } from "./mcp.js";
export { createStore } from "./store.js";
export type * from "./types.js";

async function main(): Promise<void> {
  const { port, httpUrl, mcpOnly } = parseArgs(process.argv.slice(2));

  if (!mcpOnly) {
    startHttpServer(port);
  }

  await startMcpServer(httpUrl);
}

main().catch((error) => {
  console.error("[devpilot-mcp] Failed to start:", error);
  process.exitCode = 1;
});
