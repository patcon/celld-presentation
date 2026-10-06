// Finds the `celld dev` node serving on APP_PORT, and what it was started with.
// `celld dev` always binds the node's operator listener to a random loopback
// port, and picks a new one each time it restarts the node, so ask which other
// port it has open.
import { execFileSync } from "node:child_process";

const run = (command: string, args: string[]) => {
  try {
    return execFileSync(command, args, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
  } catch {
    return "";
  }
};

export function findNode(appPort: string) {
  return run("pgrep", ["-f", `celld --no-control-plane .*--listen [^ ]*:${appPort}( |$)`]).trim().split("\n")[0] || undefined;
}

function operatorOf(pid: string, appPort: string) {
  // `lsof -F n` prints each listening address on its own line, prefixed with "n".
  return run("lsof", ["-nP", "-a", "-p", pid, "-iTCP", "-sTCP:LISTEN", "-Fn"])
    .split("\n")
    .filter((line) => line.startsWith("n127.0.0.1:") && !line.endsWith(`:${appPort}`))
    .map((line) => line.slice(1))[0];
}

// Returns the operator listener's `127.0.0.1:PORT`, or undefined if no node is up.
export function findOperator(appPort: string) {
  const pid = findNode(appPort);
  return pid && operatorOf(pid, appPort);
}

export type NodeInfo = {
  pid: string;
  name?: string;
  listen?: string;
  operator?: string;
  bucket?: string;
  store?: string;
  idleEvictS?: number;
};

// The node's own name, listeners and bucket, from its arguments and environment
// (`ps eww` appends the environment), since its operator /state doesn't say.
export function describeNode(appPort: string): NodeInfo | undefined {
  const pid = findNode(appPort);
  if (!pid) return undefined;
  const words = run("ps", ["eww", "-o", "command=", "-p", pid]).trim().split(/\s+/);
  const arg = (flag: string) => (words.includes(flag) ? words[words.indexOf(flag) + 1] : undefined);
  const env = (name: string) => words.find((word) => word.startsWith(`${name}=`))?.slice(name.length + 1);
  return {
    pid,
    name: env("CELLD_NODE"),
    listen: arg("--listen"),
    operator: operatorOf(pid, appPort),
    bucket: arg("--bucket"),
    store: env("CELLD_INTERNAL_DEV_STORE"),
    idleEvictS: Number(env("CELLD_IDLE_EVICT_S")) || undefined,
  };
}

export function celldVersion() {
  return run("celld", ["--version"]).match(/celld (\S+)/)?.[1];
}
