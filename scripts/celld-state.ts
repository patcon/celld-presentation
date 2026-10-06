// Prints `GET /state` from the running `celld dev` node's operator listener.
//
//   node scripts/celld-state.ts [APP_PORT]
import { findNode, findOperator } from "./celld-node.ts";

const [appPort = "5173"] = process.argv.slice(2);

if (!findNode(appPort)) {
  console.error(`No celld dev node is listening on port ${appPort}. Start one with \`pnpm celld:dev\`.`);
  process.exit(1);
}
const operator = findOperator(appPort);
if (!operator) {
  console.error("Found the celld node, but not its operator listener.");
  process.exit(1);
}

const response = await fetch(`http://${operator}/state`);
console.log(JSON.stringify(await response.json(), null, 2));
