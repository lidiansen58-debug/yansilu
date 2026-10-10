import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import net from "node:net";
import { spawn } from "node:child_process";
import { once } from "node:events";

const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
function isRunning(pid) {
  try { process.kill(pid, 0); return true; } catch { return false; }
}

test("force-ending desktop parent stops actual API and releases only its port", { timeout: 30000 }, async t => {
  const vault = await fs.mkdtemp(path.join(os.tmpdir(), "yansilu-desktop-parent-exit-"));
  const unrelated = net.createServer(socket => socket.end());
  unrelated.listen(0, "127.0.0.1");
  await once(unrelated, "listening");
  t.after(() => new Promise(resolve => unrelated.close(resolve)));
  const unrelatedPort = unrelated.address().port;
  const parent = spawn(process.execPath, ["tests/fixtures/desktop-parent-owner.mjs"], {
    env: { ...process.env, API_PORT: "0", API_HOST: "127.0.0.1", VAULT_PATH: vault,
      YANSILU_DESKTOP_VAULT_RECOVERY_PATH: "", YANSILU_DESKTOP_PARENT_CHANNEL: "" },
    stdio: ["ignore", "ignore", "pipe", "ipc"]
  });
  let apiPid;
  t.after(async () => {
    if (parent.exitCode === null && parent.signalCode === null) { const stopped = once(parent, "exit"); parent.kill(); await stopped; }
    if (apiPid && isRunning(apiPid)) process.kill(apiPid);
  });
  let stderr = "";
  parent.stderr.on("data", bytes => { stderr += bytes; });
  const startup = (await once(parent, "message"))[0];
  apiPid = startup.apiPid;
  const port = startup.port;
  assert.ok(Number.isInteger(apiPid));
  assert.ok(Number.isInteger(port) && port > 0);
  assert.notEqual(port, unrelatedPort, "the unrelated service must own a different port");
  let health;
  const deadline = Date.now() + 10000;
  while (Date.now() < deadline) {
    try {
      health = await (await fetch(`http://127.0.0.1:${port}/health`, { signal: AbortSignal.timeout(500) })).json();
      if (health.ready) break;
    } catch {}
    if (parent.exitCode !== null) assert.fail(stderr);
    await pause(50);
  }
  assert.equal(health?.ready, true, stderr);
  assert.equal(health.pid, apiPid);
  const stopped = once(parent, "exit");
  parent.kill();
  await stopped;
  const exitDeadline = Date.now() + 5000;
  while (isRunning(apiPid) && Date.now() < exitDeadline) await pause(20);
  assert.equal(isRunning(apiPid), false, "API must exit when its parent is forcibly ended");
  const releaseDeadline = Date.now() + 5000;
  for (;;) {
    const available = net.createServer();
    available.listen(port, "127.0.0.1");
    try {
      await once(available, "listening");
      await new Promise(resolve => available.close(resolve));
      break;
    } catch (error) {
      if (error.code !== "EADDRINUSE" || Date.now() >= releaseDeadline) {
        error.message = `Rebinding API port after parent/API exit: ${error.message}`;
        throw error;
      }
      await pause(20);
    }
  }
  assert.equal(unrelated.listening, true);
  const connection = net.connect(unrelatedPort, "127.0.0.1");
  await once(connection, "connect");
  connection.destroy();
});
