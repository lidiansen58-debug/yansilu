import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import http from "node:http";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { fileURLToPath } from "node:url";
import { initVault, createNoteInDirectory } from "../../packages/domain/src/index.mjs";
import { createIndexCard, listIndexCards } from "../../packages/domain/src/index-card-store.mjs";
import { createWritingProject, listWritingProjects } from "../../packages/writing-engine/src/writing-engine.mjs";

const repo = fileURLToPath(new URL("../../", import.meta.url));
async function request(base, route, method = "GET", body) {
  const response = await fetch(base + route, { method, ...(body === undefined ? {} : {
    headers: { "Content-Type": "application/json" }, body: JSON.stringify(body)
  }) });
  return { status: response.status, json: await response.json() };
}

async function fixture(t) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "yansilu-theme-create-scope-"));
  const original = path.join(root, "original"), copied = path.join(root, "copied");
  await initVault(original);
  const notes = [];
  for (const title of ["理解依据", "表达依据"]) notes.push(await createNoteInDirectory(original, {
    directoryId: "dir_original_default", body: `# ${title}\n\n保留中文 café 🌿 与 [[正文链接]]。`
  }));
  const payload = { directoryId: "dir_original_default", indexType: "topic", title: "待保存主题",
    centralQuestion: "如何核对理解？", noteIds: notes.map(note => note.id) };
  await createIndexCard(original, { ...payload, id: "idx_existing", title: "已有主题" });
  await createWritingProject(original, { title: "已有文章", basketNoteIds: payload.noteIds, relatedIndexIds: ["idx_existing"] });
  await fs.cp(original, copied, { recursive: true });
  await initVault(copied);
  const snapshot = async vault => ({ cards: await listIndexCards(vault, { limit: 50 }),
    projects: await listWritingProjects(vault, { limit: 50 }),
    files: await Promise.all(notes.map(note => fs.readFile(path.join(vault, note.markdownPath)))) });
  const baselines = await Promise.all([original, copied].map(snapshot));
  const child = spawn(process.execPath, ["apps/api/src/server.mjs"], {
    cwd: repo, env: { ...process.env, API_PORT: "0", VAULT_PATH: original }, stdio: ["ignore", "pipe", "pipe"]
  });
  t.after(async () => { if (child.exitCode === null) { const exited = once(child, "exit"); child.kill(); await exited; } });
  let output = "";
  const base = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("API startup timed out")), 10000);
    child.stdout.on("data", chunk => {
      output += chunk;
      const match = output.match(/http:\/\/127\.0\.0\.1:(\d+)/);
      if (match) { clearTimeout(timer); resolve(match[0]); }
    });
    child.once("error", error => { clearTimeout(timer); reject(error); });
    child.stderr.on("data", () => {});
  });
  const deadline = Date.now() + 10000;
  while (true) {
    const health = await request(base, "/health");
    assert.equal(health.status, 200);
    assert.equal(health.json.startupError || "", "");
    if (health.json.ready === true && health.json.ok === true) break;
    if (Date.now() >= deadline) throw new Error("API catalog readiness timed out");
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  return { base, original, copied, payload, snapshot, baselines };
}

function delayedCreate(base) {
  let req;
  const response = new Promise((resolve, reject) => {
    req = http.request(base + "/api/v1/index-cards", { method: "POST", headers: { "Content-Type": "application/json" } }, res => {
      let text = ""; res.on("data", chunk => { text += chunk; });
      res.on("end", () => { try { resolve({ status: res.statusCode, json: JSON.parse(text) }); } catch (error) { reject(error); } });
      res.on("error", reject);
    });
    req.on("error", reject); req.write("{");
  });
  response.catch(() => {});
  return { req, response };
}

for (const mode of ["legacy partial body", "partial body names the new vault", "stale complete request"]) {
  test(`theme creation rejects ${mode} without changing either cloned vault`, { timeout: 30000 }, async t => {
    const f = await fixture(t);
    let delayed;
    if (mode !== "stale complete request") {
      delayed = delayedCreate(f.base); t.after(() => delayed.req.destroy());
      await new Promise(resolve => setTimeout(resolve, 150));
    }
    assert.equal((await request(f.base, "/api/v1/vault", "POST", { vaultPath: f.copied })).status, 200);
    let result;
    if (delayed) {
      delayed.req.end(JSON.stringify({ ...f.payload, ...(mode.includes("names") ? { expectedVaultPath: f.copied } : {}) }).slice(1));
      result = await delayed.response;
    } else result = await request(f.base, "/api/v1/index-cards", "POST", { ...f.payload, expectedVaultPath: f.original });
    const after = await Promise.all([f.original, f.copied].map(f.snapshot));
    t.diagnostic(JSON.stringify({ responseStatus: result.status, cardCounts: after.map(item => item.cards.length) }));
    assert.equal(result.status, 409, JSON.stringify(result.json));
    assert.equal(result.json.error.code, "VAULT_CHANGED");
    assert.deepEqual(after, f.baselines, "Denied creation must preserve themes, articles and exact note bytes in both vaults");

    const saved = await request(f.base, "/api/v1/index-cards", "POST", { ...f.payload,
      ...(mode === "legacy partial body" ? {} : { expectedVaultPath: f.copied }) });
    assert.equal(saved.status, 201, JSON.stringify(saved.json));
    assert.equal(saved.json.item.title, f.payload.title);
    assert.deepEqual(saved.json.item.items.map(item => item.note_id), f.payload.noteIds);
    assert.deepEqual(await f.snapshot(f.original), f.baselines[0]);
    const current = await f.snapshot(f.copied);
    assert.equal(current.cards.length, 2);
    assert.deepEqual(current.cards.find(card => card.id === "idx_existing"), f.baselines[1].cards[0]);
    assert.deepEqual(current.projects, f.baselines[1].projects);
    assert.deepEqual(current.files, f.baselines[1].files);
  });
}
