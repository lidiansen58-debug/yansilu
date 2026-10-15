import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import http from "node:http";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { fileURLToPath } from "node:url";
import { initVault, createDirectory, createNoteInDirectory, createNoteRelation, listNoteRelations, listDirectories } from "../../packages/domain/src/index.mjs";

const repo = fileURLToPath(new URL("../../", import.meta.url));
async function request(base, route, method = "GET", body) {
  const res = await fetch(base + route, { method, ...(body === undefined ? {} : {
    headers: { "Content-Type": "application/json" }, body: JSON.stringify(body)
  }) });
  return { status: res.status, json: await res.json() };
}
function delayedDelete(base, route) {
  let req;
  const response = new Promise((resolve, reject) => {
    req = http.request(base + route, { method: "DELETE", headers: { "Content-Type": "application/json", "Content-Length": 2 } }, res => {
      let text = "";
      res.on("data", chunk => { text += chunk; });
      res.on("end", () => resolve({ status: res.statusCode, json: JSON.parse(text) }));
      res.on("error", reject);
    });
    req.on("error", reject);
    req.write("{");
  });
  response.catch(() => {});
  return { req, response };
}

async function waitForReady(base) {
  const deadline = Date.now() + 10000;
  while (Date.now() < deadline) {
    const health = await request(base, "/health");
    assert.equal(health.status, 200);
    if (health.json.startupError) throw new Error(health.json.startupError);
    if (health.json.ready === true && health.json.ok === true) return;
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  throw new Error("API did not finish initializing its catalog");
}

for (const kind of ["note", "directory", "relation"]) {
  test(`${kind} DELETE rejects stale, delayed and aborted requests across real cloned vaults, then only deletes the confirmed original`, async t => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "yansilu-delete-scope-"));
    const original = path.join(root, "original"), copied = path.join(root, "copy");
    await initVault(original);
    const directory = await createDirectory(original, { title: "待删除空目录", parentDirectoryId: "dir_original_default",
      fsPath: path.join(original, "notes", "original", "empty-delete"), directoryType: "custom" });
    const notes = [];
    for (const role of ["来源", "目标"]) notes.push(await createNoteInDirectory(original, {
      directoryId: "dir_original_default", body: `# ${role}\n\n跨库删除验证：中文 café 🌿 保持原样。`
    }));
    const relation = await createNoteRelation(original, notes[0].id, {
      toNoteId: notes[1].id, relationType: "supports", rationale: "此目标支持来源判断。", status: "confirmed"
    });
    await fs.cp(original, copied, { recursive: true });
    await initVault(copied);
    const baselines = await Promise.all(notes.map(note => fs.readFile(path.join(original, note.markdownPath))));
    const assertKept = async vault => {
      for (let i = 0; i < notes.length; i++) assert.deepEqual(await fs.readFile(path.join(vault, notes[i].markdownPath)), baselines[i]);
      assert.deepEqual((await listNoteRelations(vault, notes[0].id)).outgoingLinks.map(item => item.id), [relation.id]);
      assert.ok((await listDirectories(vault)).some(item => item.id === directory.id));
      await fs.access(path.join(vault, "notes", "original", "empty-delete"));
    };
    const child = spawn(process.execPath, ["apps/api/src/server.mjs"], {
      cwd: repo, env: { ...process.env, API_PORT: "0", VAULT_PATH: original }, stdio: ["ignore", "pipe", "pipe"]
    });
    t.after(async () => {
      if (child.exitCode === null) { const exited = once(child, "exit"); child.kill(); await exited; }
    });
    let output = "";
    const base = await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(`API startup timeout: ${output}`)), 10000);
      child.stdout.on("data", chunk => {
        output += chunk;
        const match = output.match(/http:\/\/127\.0\.0\.1:(\d+)/);
        if (match) { clearTimeout(timer); resolve(match[0]); }
      });
      child.once("error", error => { clearTimeout(timer); reject(error); });
      child.stderr.on("data", chunk => { output += chunk; });
    });
    await waitForReady(base);
    const route = kind === "note" ? `/api/v1/notes/${notes[0].id}`
      : kind === "directory" ? `/api/v1/directories/${directory.id}` : `/api/v1/relations/${relation.id}`;
    assert.equal((await request(base, "/api/v1/vault", "POST", { vaultPath: copied })).status, 200);
    const stale = await request(base, route, "DELETE", { expectedVaultPath: original });
    assert.equal(stale.status, 409, JSON.stringify(stale.json));
    assert.equal(stale.json.error.code, "VAULT_CHANGED");
    await assertKept(original); await assertKept(copied);

    assert.equal((await request(base, "/api/v1/vault", "POST", { vaultPath: original })).status, 200);
    const delayed = delayedDelete(base, route);
    t.after(() => delayed.req.destroy());
    await new Promise(resolve => setTimeout(resolve, 150));
    assert.equal((await request(base, "/api/v1/vault", "POST", { vaultPath: copied })).status, 200);
    // This client has no expectedVaultPath: the request's original vault still protects it.
    delayed.req.end("}");
    const denied = await delayed.response;
    assert.equal(denied.status, 409, JSON.stringify(denied.json));
    assert.equal(denied.json.error.code, "VAULT_CHANGED");
    await assertKept(original); await assertKept(copied);

    assert.equal((await request(base, "/api/v1/vault", "POST", { vaultPath: original })).status, 200);
    const aborted = delayedDelete(base, route);
    await new Promise(resolve => setTimeout(resolve, 150));
    aborted.req.destroy();
    await assert.rejects(aborted.response);
    assert.equal((await request(base, "/health")).status, 200);
    await assertKept(original); await assertKept(copied);

    const accepted = await request(base, route, "DELETE", { expectedVaultPath: original });
    assert.equal(accepted.status, 200, JSON.stringify(accepted.json));
    assert.equal(accepted.json.deleted, true);
    if (kind === "note") await assert.rejects(fs.access(path.join(original, notes[0].markdownPath)), { code: "ENOENT" });
    if (kind === "directory") await assert.rejects(fs.access(path.join(original, "notes", "original", "empty-delete")), { code: "ENOENT" });
    if (kind === "relation") {
      assert.deepEqual((await listNoteRelations(original, notes[0].id)).outgoingLinks, []);
      assert.deepEqual((await listNoteRelations(original, notes[1].id)).backlinks, []);
      for (let i = 0; i < notes.length; i++) assert.deepEqual(await fs.readFile(path.join(original, notes[i].markdownPath)), baselines[i]);
    }
    await assertKept(copied);
  });
}
