import { spawn } from "node:child_process";
import {
  normalizePort,
  resolveYansiluApiPort,
  resolveYansiluWebPort,
  waitForYansiluApiReady
} from "./dev-port-guard.mjs";

const API_PORT = normalizePort(process.env.API_PORT, 3000);
const WEB_PORT = normalizePort(process.env.WEB_PORT, 5173);
const children = [];

function log(message) {
  process.stdout.write(`${message}\n`);
}

function spawnService(command) {
  const child = spawn(command.cmd, command.args, {
    env: command.env,
    stdio: ["ignore", "pipe", "pipe"],
    shell: false
  });

  child.stdout.on("data", (d) => process.stdout.write(`[${command.name}] ${d}`));
  child.stderr.on("data", (d) => process.stderr.write(`[${command.name}] ${d}`));
  child.on("exit", (code) => {
    process.stderr.write(`[${command.name}] exited with code ${code}\n`);
  });

  return child;
}

function shutdown(exitCode = 0) {
  for (const child of children) {
    if (!child.killed) child.kill("SIGTERM");
  }
  setTimeout(() => process.exit(exitCode), 200);
}

const apiPlan = await resolveYansiluApiPort({
  preferredPort: API_PORT,
  logger: log
});
const apiBase = apiPlan.baseUrl;

if (apiPlan.action === "reuse") {
  log(`[api] reusing healthy Yansilu API on ${apiBase}`);
} else {
  log(`[api] starting Yansilu API on ${apiBase}`);
  children.push(
    spawnService({
      name: "api",
      cmd: "node",
      args: ["./apps/api/src/server.mjs"],
      env: { ...process.env, API_PORT: String(apiPlan.port), API_BASE: apiBase }
    })
  );
  try {
    await waitForYansiluApiReady(apiPlan.port);
  } catch (error) {
    process.stderr.write(`[api] failed to become healthy: ${String(error?.message || error)}\n`);
    shutdown(1);
    throw error;
  }
  log(`[api] healthy on ${apiBase}`);
}

let webPlan;
try {
  webPlan = await resolveYansiluWebPort({
    preferredPort: WEB_PORT,
    apiBase,
    logger: log
  });
} catch (error) {
  process.stderr.write(`[web] failed to choose a healthy port: ${String(error?.message || error)}\n`);
  shutdown(1);
  throw error;
}
const webBase = webPlan.baseUrl;

if (webPlan.action === "reuse") {
  log(`[web] reusing healthy Yansilu web server on ${webBase}`);
} else {
  log(`[web] starting Yansilu web server on ${webBase} with API_BASE=${apiBase}`);
  children.push(
    spawnService({
      name: "web",
      cmd: "node",
      args: ["./apps/web/src/dev-server.mjs"],
      env: {
        ...process.env,
        WEB_PORT: String(webPlan.port),
        API_BASE: apiBase,
        YANSILU_WEB_BASE: webBase
      }
    })
  );
}

if (apiPlan.action === "reuse" || webPlan.action === "reuse") {
  log("[worker] existing dev stack detected; skip duplicate worker");
} else {
  log(`[worker] starting with API_BASE=${apiBase}`);
  children.push(
    spawnService({
      name: "worker",
      cmd: "node",
      args: ["./apps/worker/src/worker.mjs"],
      env: { ...process.env, API_BASE: apiBase, API_PORT: String(apiPlan.port) }
    })
  );
}

log(`[dev] web: ${webBase}`);
log(`[dev] api: ${apiBase}`);

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));
