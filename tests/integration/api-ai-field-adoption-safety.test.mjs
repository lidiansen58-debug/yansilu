import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import net from "node:net";
import http from "node:http";
import { spawn } from "node:child_process";

function reviewState({ requestId, timestamp, ...state }) { return state; }

async function fixture(t) {
  const vaultPath = await fs.mkdtemp(path.join(os.tmpdir(), "yansilu-adopt-safety-"));
  const probe = net.createServer();
  await new Promise(resolve => probe.listen(0, "127.0.0.1", resolve));
  const port = probe.address().port;
  await new Promise(resolve => probe.close(resolve));
  const child = spawn(process.execPath, ["apps/api/src/server.mjs"], {
    cwd: path.resolve(import.meta.dirname, "../.."), env: { ...process.env, API_PORT: String(port), VAULT_PATH: vaultPath }, stdio: "ignore"
  });
  t.after(() => child.kill());
  const baseUrl = `http://127.0.0.1:${port}`;
  const request = async (route, body, method = "POST") => {
    const response = await fetch(baseUrl + route, body === undefined ? {} : {
      method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body)
    });
    return { status: response.status, json: await response.json() };
  };
  for (let attempt = 0; ; attempt++) {
    try { if ((await request("/health")).status === 200) break; } catch {}
    if (attempt > 70) throw new Error("API did not start");
    await new Promise(resolve => setTimeout(resolve, 80));
  }
  const created = await request("/api/v1/notes", { directoryId: "dir_original_default", noteType: "permanent",
    title: "采纳安全验证", body: "# 采纳安全验证\n\n原正文、观点及关联需要保留。" });
  assert.equal(created.status, 201, JSON.stringify(created.json));
  const noteRoute = `/api/v1/notes/${created.json.item.id}`;
  const analysis = await request(noteRoute + "/ai-analysis", {});
  assert.equal(analysis.status, 200, JSON.stringify(analysis.json));
  const artifact = analysis.json.item.reviewItems.artifacts.find(a => a.payload?.fieldSuggestion?.target?.field === "thesis");
  assert.ok(artifact, "actual persisted thesis suggestion required");
  const adoptionRoute = `/api/v1/ai/inbox/${artifact.id}/adopt-field-suggestion`;
  const detailRoute = `/api/v1/ai/inbox/${artifact.id}?canonical=true`;
  const note = (await request(noteRoute)).json.item;
  const detail = (await request(detailRoute)).json;
  const body = { confirm: true, expectedRevision: note.fileRevision, expectedVaultPath: vaultPath };
  const file = path.join(vaultPath, note.markdownPath);
  return { vaultPath, baseUrl, request, note, file, noteRoute, adoptionRoute, detailRoute, detail, body };
}

test("stale adoption preserves a later manual save and all pending review state", async t => {
  const f = await fixture(t);
  const changed = await f.request(f.noteRoute, { body: f.note.body + "\n\n其他窗口的新内容。", expectedRevision: f.note.fileRevision }, "PUT");
  assert.equal(changed.status, 200, JSON.stringify(changed.json));
  const bytes = await fs.readFile(f.file);
  const note = (await f.request(f.noteRoute)).json.item;
  const result = await f.request(f.adoptionRoute, f.body);
  assert.equal(result.status, 409, JSON.stringify(result.json));
  assert.equal(result.json.error.code, "NOTE_SAVE_CONFLICT");
  assert.deepEqual(await fs.readFile(f.file), bytes);
  assert.deepEqual((await f.request(f.noteRoute)).json.item, note);
  assert.deepEqual(reviewState((await f.request(f.detailRoute)).json), reviewState(f.detail));
});

test("malformed explicit adoption revisions cannot fall back to an unguarded write", async t => {
  const f = await fixture(t);
  const bytes = await fs.readFile(f.file);
  for (const expectedRevision of [null, "", "not-a-revision", 42]) {
    const result = await f.request(f.adoptionRoute, { ...f.body, expectedRevision });
    assert.equal(result.status, 400, JSON.stringify(result.json));
    assert.equal(result.json.error.code, "NOTE_SAVE_BASE_INVALID");
    assert.deepEqual(await fs.readFile(f.file), bytes);
    assert.deepEqual((await f.request(f.noteRoute)).json.item, f.note);
    assert.deepEqual(reviewState((await f.request(f.detailRoute)).json), reviewState(f.detail));
  }
});

test("concurrent adoption and a later retry write one draft and preserve subsequent manual prose", async t => {
  const f = await fixture(t);
  const results = await Promise.all([f.request(f.adoptionRoute, f.body), f.request(f.adoptionRoute, f.body)]);
  assert.ok(results.some(r => r.status === 200), JSON.stringify(results));
  assert.ok(results.every(r => [200, 409].includes(r.status)), JSON.stringify(results));
  const saved = (await f.request(f.noteRoute)).json.item;
  assert.equal(saved.thesis, f.detail.artifact.payload.fieldSuggestion.content.thesis);
  assert.equal(saved.body, f.note.body);
  const detail = (await f.request(f.detailRoute)).json;
  assert.equal(detail.artifact.userDecisions.filter(d => d.decision === "adopted_as_draft").length, 1);
  assert.equal(detail.canonical.suggestion_review_events.filter(e => e.event_type === "adopted_as_draft").length, 1);
  const changed = await f.request(f.noteRoute, { body: saved.body + "\n\n采纳后的人工补充。", expectedRevision: saved.fileRevision }, "PUT");
  assert.equal(changed.status, 200, JSON.stringify(changed.json));
  const later = (await f.request(f.noteRoute)).json.item, bytes = await fs.readFile(f.file);
  assert.equal((await f.request(f.adoptionRoute, f.body)).status, 200);
  assert.deepEqual((await f.request(f.noteRoute)).json.item, later);
  assert.deepEqual(await fs.readFile(f.file), bytes);
  assert.deepEqual(reviewState((await f.request(f.detailRoute)).json), reviewState(detail));
});

test("incomplete legacy adoption cannot follow a vault switch into cloned note and artifact IDs", async t => {
  const f = await fixture(t);
  const otherVault = await fs.mkdtemp(path.join(os.tmpdir(), "yansilu-adopt-clone-"));
  await fs.cp(f.vaultPath, otherVault, { recursive: true });
  const files = [f.file, path.join(otherVault, f.note.markdownPath)];
  const before = await Promise.all(files.map(file => fs.readFile(file)));
  let pending;
  const response = new Promise((resolve, reject) => {
    pending = http.request(f.baseUrl + f.adoptionRoute, { method: "POST", headers: { "Content-Type": "application/json" } }, res => {
      let text = "";
      res.on("data", chunk => { text += chunk; });
      res.on("end", () => resolve({ status: res.statusCode, json: JSON.parse(text) }));
    });
    pending.on("error", reject);
    pending.write("{");
  });
  t.after(() => pending.destroy());
  await new Promise(resolve => setTimeout(resolve, 150));
  assert.equal((await f.request("/api/v1/vault", { vaultPath: otherVault })).status, 200);
  assert.equal((await f.request(f.noteRoute)).json.item.fileRevision, f.note.fileRevision);
  assert.equal((await f.request(f.detailRoute)).json.artifact.id, f.detail.artifact.id);
  pending.end('"confirm":true}');
  const denied = await response;
  assert.equal(denied.status, 409, JSON.stringify(denied.json));
  assert.equal(denied.json.error.code, "VAULT_CHANGED");
  const stale = await f.request(f.adoptionRoute, f.body);
  assert.equal(stale.status, 409, JSON.stringify(stale.json));
  assert.equal(stale.json.error.code, "VAULT_CHANGED");
  assert.deepEqual(reviewState((await f.request(f.detailRoute)).json), reviewState(f.detail));
  for (const [index, file] of files.entries()) assert.deepEqual(await fs.readFile(file), before[index]);
  assert.equal((await f.request("/api/v1/vault", { vaultPath: f.vaultPath })).status, 200);
  assert.deepEqual(reviewState((await f.request(f.detailRoute)).json), reviewState(f.detail));
  assert.equal((await f.request(f.adoptionRoute, f.body)).status, 200);
  assert.deepEqual(await fs.readFile(files[1]), before[1]);
});
