import { spawn } from "node:child_process";

const commands = [
  { name: "api", cmd: "node", args: ["./apps/api/src/server.mjs"] },
  { name: "web", cmd: "node", args: ["./apps/web/src/dev-server.mjs"] },
  { name: "worker", cmd: "node", args: ["./apps/worker/src/worker.mjs"] }
];

const children = commands.map((c) => {
  const child = spawn(c.cmd, c.args, {
    stdio: ["ignore", "pipe", "pipe"],
    shell: false
  });

  child.stdout.on("data", (d) => process.stdout.write(`[${c.name}] ${d}`));
  child.stderr.on("data", (d) => process.stderr.write(`[${c.name}] ${d}`));
  child.on("exit", (code) => {
    process.stderr.write(`[${c.name}] exited with code ${code}\n`);
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
