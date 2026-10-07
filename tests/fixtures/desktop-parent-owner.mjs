import { spawn } from "node:child_process";

const child = spawn(process.execPath, ["apps/api/src/server.mjs"], {
  env: { ...process.env, YANSILU_DESKTOP_PARENT_CHANNEL: "stdin-eof" },
  stdio: ["pipe", "ignore", "inherit"]
});
process.send({ apiPid: child.pid });
child.on("exit", code => process.exit(code ?? 1));
