import { spawn } from "node:child_process";

const child = spawn(process.execPath, ["apps/api/src/server.mjs"], {
  env: { ...process.env, YANSILU_DESKTOP_PARENT_CHANNEL: "stdin-eof" },
  stdio: ["pipe", "pipe", "inherit"]
});
let reported = false, startupOutput = "";
child.stdout.on("data", bytes => {
  startupOutput = `${startupOutput}${bytes}`.slice(-2000);
  const match = startupOutput.match(/API running on http:\/\/127\.0\.0\.1:(\d+)/);
  if (!reported && match) {
    reported = true;
    process.send({ apiPid: child.pid, port: Number(match[1]) });
  }
});
child.on("exit", code => process.exit(code ?? 1));
