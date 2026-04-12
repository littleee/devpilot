import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const SERVER_NAME = "devpilot-demo";
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

const result = spawnSync(
  CLAUDE_BIN,
  ["mcp", "remove", "--scope", scope, SERVER_NAME],
  {
    cwd: ROOT,
    stdio: "inherit",
  },
);

if (result.error) {
  console.error("[demo] Failed to remove Claude MCP server:", result.error.message);
  process.exit(1);
}

if (typeof result.status === "number" && result.status !== 0) {
  process.exit(result.status);
}

console.log(`[demo] Claude MCP server "${SERVER_NAME}" removed from scope "${scope}".`);
