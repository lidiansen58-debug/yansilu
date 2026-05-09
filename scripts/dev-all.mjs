import net from "node:net";
import { spawn } from "node:child_process";

const commands = [
  { name: "api", cmd: "node", args: ["./apps/api/src/server.mjs"], port: 3000 },
  { name: "web", cmd: "node", args: ["./apps/web/src/dev-server.mjs"], port: 5173 },
  { name: "worker", cmd: "node", args: ["./apps/worker/src/worker.mjs"] }
];

function isPortInUse(port) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    const finish = (inUse) => {
      socket.destroy();
      resolve(inUse);
    };

    socket.setTimeout(500);
    socket.once("connect", () => finish(true));
    socket.once("timeout", () => finish(false));
    socket.once("error", () => finish(false));
    socket.connect(port, "127.0.0.1");
  });
}

const resolvedCommands = await Promise.all(
  commands.map(async (command) => ({
    ...command,
    reuseExisting: command.port ? await isPortInUse(command.port) : false
  }))
);

const shouldSkipWorker = resolvedCommands.some((command) => command.reuseExisting);

const children = resolvedCommands
  .filter((command) => {
    if (command.reuseExisting) {
      process.stdout.write(`[${command.name}] reusing existing service on :${command.port}\n`);
      return false;
    }
    if (command.name === "worker" && shouldSkipWorker) {
      process.stdout.write("[worker] reusing existing dev stack; skip duplicate worker\n");
      return false;
    }
    return true;
  })
  .map((command) => {
    const child = spawn(command.cmd, command.args, {
      stdio: ["ignore", "pipe", "pipe"],
      shell: false
    });

    child.stdout.on("data", (d) => process.stdout.write(`[${command.name}] ${d}`));
    child.stderr.on("data", (d) => process.stderr.write(`[${command.name}] ${d}`));
    child.on("exit", (code) => {
      process.stderr.write(`[${command.name}] exited with code ${code}\n`);
    });

    return child;
  });

const shutdown = () => {
  for (const child of children) {
    if (!child.killed) child.kill("SIGTERM");
  }
  setTimeout(() => process.exit(0), 200);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
