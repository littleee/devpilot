import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const MCP_ENTRY = resolve(ROOT, "packages/devpilot-mcp/dist/index.js");
const SERVER_NAME = "devpilot-demo";
const HTTP_URL = process.env.DEVPILOT_DEMO_HTTP_URL || "http://127.0.0.1:5213";
const scope = process.argv.includes("--user") ? "user" : "project";

function resolveClaudeBin() {
  const explicit = process.env.CLAUDE_BIN;
  if (explicit && existsSync(explicit)) {
    return explicit;
  }

  const homeBin = resolve(process.env.HOME || ROOT, ".npm-global", "bin", "claude");
  if (existsSync(homeBin)) {
    return homeBin;
  }

  const lookup = spawnSync("zsh", ["-lc", "command -v claude"], {
    cwd: ROOT,
    encoding: "utf8",
  });

  const candidate = lookup.stdout?.trim();
  if (candidate) {
    return candidate;
  }

  return "claude";
}

const CLAUDE_BIN = resolveClaudeBin();

if (!existsSync(MCP_ENTRY)) {
  console.error("[demo] Missing built MCP entry:", MCP_ENTRY);
  console.error("[demo] Run `npm run build` from the repository root first.");
  process.exit(1);
}

const removeResult = spawnSync(
  CLAUDE_BIN,
  ["mcp", "remove", "--scope", scope, SERVER_NAME],
  {
    cwd: ROOT,
    stdio: "ignore",
  },
);

if (removeResult.error) {
  console.error("[demo] Failed to call Claude CLI:", removeResult.error.message);
  process.exit(1);
}

const addArgs = [
  "mcp",
  "add",
  "--scope",
  scope,
  SERVER_NAME,
  "--",
  "node",
  MCP_ENTRY,
  "server",
  "--mcp-only",
  "--http-url",
  HTTP_URL,
];

const addResult = spawnSync(CLAUDE_BIN, addArgs, {
  cwd: ROOT,
  stdio: "inherit",
});

if (addResult.error) {
  console.error("[demo] Failed to register Claude MCP server:", addResult.error.message);
  process.exit(1);
}

if (typeof addResult.status === "number" && addResult.status !== 0) {
  process.exit(addResult.status);
}

console.log(`[demo] Claude MCP server "${SERVER_NAME}" registered with scope "${scope}".`);
console.log(`[demo] Claude will connect to ${HTTP_URL} through ${MCP_ENTRY}.`);
