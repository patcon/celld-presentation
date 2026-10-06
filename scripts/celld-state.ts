// Prints `GET /state` from the running `celld dev` node's operator listener.
// `celld dev` always binds that listener to a random loopback port, so find
// it by asking which other port the node listening on PORT has open.
//
//   node scripts/celld-state.ts [PORT]
import { execFileSync } from "node:child_process";

const [port = "5173"] = process.argv.slice(2);

const run = (command: string, args: string[]) => {
  try {
    return execFileSync(command, args, { encoding: "utf8" });
  } catch {
    return "";
  }
};

const pid = run("pgrep", ["-f", `celld --no-control-plane .*--listen [^ ]*:${port}( |$)`]).trim().split("\n")[0];
if (!pid) {
  console.error(`No celld dev node is listening on port ${port}. Start one with \`pnpm celld:dev\`.`);
  process.exit(1);
}

// `lsof -F n` prints each listening address on its own line, prefixed with "n".
const internal = run("lsof", ["-nP", "-a", "-p", pid, "-iTCP", "-sTCP:LISTEN", "-Fn"])
  .split("\n")
  .filter((line) => line.startsWith("n127.0.0.1:") && !line.endsWith(`:${port}`))
  .map((line) => line.slice(1))[0];
if (!internal) {
  console.error(`Found the celld node (pid ${pid}), but not its operator listener.`);
  process.exit(1);
}

const response = await fetch(`http://${internal}/state`);
console.log(JSON.stringify(await response.json(), null, 2));
