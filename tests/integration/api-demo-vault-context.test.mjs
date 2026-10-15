import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import http from "node:http";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { fileURLToPath } from "node:url";
import { initVault, createNoteInDirectory, listDirectories, getNoteById } from "../../packages/domain/src/index.mjs";

const repo = fileURLToPath(new URL("../../", import.meta.url));
const demoDirectoryId = "dir_demo_smart_notes_product_thinking_original";
async function request(base, route, method = "GET", body) {
  const res = await fetch(base + route, { method, ...(body === undefined ? {} : {
    headers: { "Content-Type": "application/json" }, body: JSON.stringify(body)
  }) });
  return { status: res.status, json: await res.json() };
}
function delayedImport(base) {
  let req;
  const response = new Promise((resolve, reject) => {
    req = http.request(base + "/api/v1/demo/product-thinking/smart-notes", {
      method: "POST", headers: { "Content-Type": "application/json", "Content-Length": 2 }
    }, res => {
      let text = "";
      res.on("data", chunk => { text += chunk; });
      res.on("end", () => resolve({ status: res.statusCode, json: JSON.parse(text) }));
      res.on("error", reject);
    });
    req.on("error", reject); req.write("{");
  });
  response.catch(() => {});
  return { req, response };
}

test("Demo API rejects stale, delayed and aborted requests and only imports into the confirmed original vault", async t => {
  const fixtures = path.join(repo, "output", "demo-vault-api-tests");
  await fs.mkdir(fixtures, { recursive: true });
  const root = await fs.mkdtemp(path.join(fixtures, "scope-"));
  const original = path.join(root, "original"), copied = path.join(root, "copy");
  await initVault(original);
  const note = await createNoteInDirectory(original, { directoryId: "dir_original_default",
    body: "# 原有记录\n\n切换库不能改变这条笔记。中文 café 🌿。" });
  await fs.cp(original, copied, { recursive: true }); await initVault(copied);
  const before = await fs.readFile(path.join(original, note.markdownPath));
  const assertUserKept = async vault => {
    assert.deepEqual(await fs.readFile(path.join(vault, note.markdownPath)), before);
    assert.equal((await getNoteById(vault, note.id)).body, note.body);
  };
  const assertNotImported = async vault => {
    await assertUserKept(vault);
    assert.equal((await listDirectories(vault)).some(item => item.id === demoDirectoryId), false);
    await assert.rejects(getNoteById(vault, "NOTE-YANSILU-CONTENTS"), /not found/);
  };
  const child = spawn(process.execPath, ["apps/api/src/server.mjs"], {
    cwd: repo, env: { ...process.env, API_PORT: "0", VAULT_PATH: original }, stdio: ["ignore", "pipe", "pipe"]
  });
  const pendingRequests = [];
  t.after(async () => {
    pendingRequests.forEach(req => req.destroy());
    if (child.exitCode === null) { const exited = once(child, "exit"); child.kill(); await exited; }
    const relative = path.relative(fixtures, await fs.realpath(root));
    assert.ok(relative && !relative.startsWith("..") && !path.isAbsolute(relative));
    assert.equal((await fs.lstat(root)).isSymbolicLink(), false);
    await fs.rm(root, { recursive: true, force: true });
  });
  let output = "";
  const base = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("API startup timeout")), 10000);
    child.stdout.on("data", chunk => {
      output += chunk; const match = output.match(/http:\/\/127\.0\.0\.1:(\d+)/);
      if (match) { clearTimeout(timer); resolve(match[0]); }
    });
    child.stderr.on("data", () => {});
    child.once("error", error => { clearTimeout(timer); reject(error); });
  });
  const deadline = Date.now() + 10000;
  while (true) {
    const health = await request(base, "/health");
    if (health.json.startupError) throw new Error(health.json.startupError);
    if (health.json.ok === true && health.json.ready === true) break;
    if (Date.now() >= deadline) throw new Error("API initialization timeout");
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  const switchTo = async vaultPath => assert.equal((await request(base, "/api/v1/vault", "POST", { vaultPath })).status, 200);
  await switchTo(copied);
  const stale = await request(base, "/api/v1/demo/product-thinking/smart-notes", "POST", { expectedVaultPath: original });
  assert.equal(stale.status, 409); assert.equal(stale.json.error.code, "VAULT_CHANGED");
  await assertNotImported(original); await assertNotImported(copied);
  await switchTo(original);
  const delayed = delayedImport(base); pendingRequests.push(delayed.req);
  await new Promise(resolve => setTimeout(resolve, 200)); await switchTo(copied);
  delayed.req.end("}");
  const denied = await delayed.response;
  assert.equal(denied.status, 409); assert.equal(denied.json.error.code, "VAULT_CHANGED");
  await assertNotImported(original); await assertNotImported(copied);
  await switchTo(original);
  const aborted = delayedImport(base); pendingRequests.push(aborted.req);
  await new Promise(resolve => setTimeout(resolve, 200)); aborted.req.destroy();
  await assert.rejects(aborted.response);
  assert.equal((await request(base, "/health")).status, 200);
  await assertNotImported(original); await assertNotImported(copied);
  const accepted = await request(base, "/api/v1/demo/product-thinking/smart-notes", "POST", { expectedVaultPath: original });
  assert.equal(accepted.status, 200, JSON.stringify(accepted.json));
  assert.equal(accepted.json.item.directoryId, demoDirectoryId);
  assert.ok((await listDirectories(original)).some(item => item.id === demoDirectoryId));
  assert.equal((await getNoteById(original, accepted.json.item.firstNoteId)).id, accepted.json.item.firstNoteId);
  await assertUserKept(original); await assertNotImported(copied);
});
