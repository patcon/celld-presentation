// Finds the operator listener of the `celld dev` node serving on APP_PORT.
// `celld dev` always binds that listener to a random loopback port, and picks
// a new one each time it restarts the node, so ask which other port it has open.
import { execFileSync } from "node:child_process";

const run = (command: string, args: string[]) => {
  try {
    return execFileSync(command, args, { encoding: "utf8" });
  } catch {
    return "";
  }
};

export function findNode(appPort: string) {
  return run("pgrep", ["-f", `celld --no-control-plane .*--listen [^ ]*:${appPort}( |$)`]).trim().split("\n")[0] || undefined;
}

// Returns the operator listener's `127.0.0.1:PORT`, or undefined if no node is up.
export function findOperator(appPort: string) {
  const pid = findNode(appPort);
  if (!pid) return undefined;
  // `lsof -F n` prints each listening address on its own line, prefixed with "n".
  return run("lsof", ["-nP", "-a", "-p", pid, "-iTCP", "-sTCP:LISTEN", "-Fn"])
    .split("\n")
    .filter((line) => line.startsWith("n127.0.0.1:") && !line.endsWith(`:${appPort}`))
    .map((line) => line.slice(1))[0];
}
