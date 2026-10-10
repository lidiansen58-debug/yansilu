import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import net from "node:net";
import http from "node:http";
import { spawn } from "node:child_process";
import { DatabaseSync } from "node:sqlite";

async function fixture(t, { field = "thesis", linked = false } = {}) {
  const vaultPath = await fs.mkdtemp(path.join(os.tmpdir(), "yansilu-ai-confirm-note-"));
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
    title: "人工审阅", body: "# 人工审阅\n\n原正文和笔记关联必须保留。" });
  assert.equal(created.status, 201, JSON.stringify(created.json));
  const noteId = created.json.item.id;
  const noteRoute = `/api/v1/notes/${noteId}`;
  const authored = await request(noteRoute, { thesis: "原观点", threeLineSummary: ["原概括"], authorshipConfirmed: true }, "PUT");
  assert.equal(authored.status, 200, JSON.stringify(authored.json));
  let suggestionId, artifactId;
  if (linked) {
    const analysis = await request(`${noteRoute}/ai-analysis`, {});
    assert.equal(analysis.status, 200, JSON.stringify(analysis.json));
    suggestionId = analysis.json.item.reviewItems.storedSuggestionIds[0];
    const artifact = analysis.json.item.reviewItems.artifacts.find(a => a.payload?.fieldSuggestion?.id === suggestionId);
    artifactId = artifact.id;
    field = artifact.payload.fieldSuggestion.target.field;
    const adopted = await request(`/api/v1/ai/inbox/${artifactId}/adopt-field-suggestion`, { confirm: true });
    assert.equal(adopted.status, 200, JSON.stringify(adopted.json));
  } else {
    const suggestion = await request("/api/v1/ai-suggestions", { target: { type: "permanent_note", id: noteId, field },
      scope: "note_field", content: field === "thesis" ? { thesis: "原建议" } : { three_line_summary: ["原建议概括"] } });
    assert.equal(suggestion.status, 201, JSON.stringify(suggestion.json));
    suggestionId = suggestion.json.item.id;
    assert.equal((await request(`/api/v1/ai-suggestions/${suggestionId}`, { status: "adopted_as_draft" }, "PATCH")).status, 200);
  }
  const suggestionRoute = `/api/v1/ai-suggestions/${suggestionId}?canonical=true`;
  const content = field === "thesis" ? { thesis: "人工核对并改写的观点" } : { three_line_summary: ["人工概括一", "人工概括二"] };
  const edited = await request(suggestionRoute, { status: "edited", content }, "PATCH");
  assert.equal(edited.status, 200, JSON.stringify(edited.json));
  const detail = await request(suggestionRoute);
  assert.equal(detail.status, 200);
  assert.deepEqual(detail.json.writeBase, detail.json.canonical.write_base);
  const body = { status: "confirmed", userConfirmed: true, content, applyToNote: true, writeBase: detail.json.writeBase };
  const note = (await request(noteRoute)).json.item;
  return { request, baseUrl, vaultPath, note, noteRoute, suggestionRoute, artifactId, field, body, detail: detail.json };
}

for (const field of ["thesis", "three_line_summary", "threeLineSummary"]) test(`explicit confirmation writes only ${field} and preserves body and authorship`, async t => {
  const f = await fixture(t, { field });
  const confirmed = await f.request(f.suggestionRoute, f.body, "PATCH");
  assert.equal(confirmed.status, 200, JSON.stringify(confirmed.json));
  const saved = (await f.request(f.noteRoute)).json.item;
  assert.equal(saved.body, f.note.body);
  assert.deepEqual(saved.authorship, f.note.authorship);
  assert.equal(saved.title, f.note.title);
  if (field === "thesis") { assert.equal(saved.thesis, f.body.content.thesis); assert.deepEqual(saved.threeLineSummary, f.note.threeLineSummary); }
  else { assert.deepEqual(saved.threeLineSummary, f.body.content.three_line_summary); assert.equal(saved.thesis, f.note.thesis); }
  assert.equal(confirmed.json.item.status, "confirmed");
  assert.equal(confirmed.json.item.history.filter(e => e.toStatus === "confirmed").length, 1);
  // Same request after a lost response cannot duplicate history or overwrite subsequent manual edits.
  assert.equal((await f.request(f.noteRoute, { body: saved.body + "\n\n确认后的人工补充。" }, "PUT")).status, 200);
  const later = (await f.request(f.noteRoute)).json.item;
  const retry = await f.request(f.suggestionRoute, f.body, "PATCH");
  assert.equal(retry.status, 200, JSON.stringify(retry.json));
  assert.equal(retry.json.item.history.filter(e => e.toStatus === "confirmed").length, 1);
  assert.deepEqual((await f.request(f.noteRoute)).json.item, later);
});

test("confirmation never truncates a reviewed summary or accepts non-text lines", async t => {
  const f = await fixture(t, { field: "three_line_summary" });
  for (const value of [["one", "two", "three", "four"], ["valid", 42], ["valid", " "]]) {
    const result = await f.request(f.suggestionRoute, { ...f.body, content: { three_line_summary: value } }, "PATCH");
    assert.equal(result.status, 400, JSON.stringify(result.json));
    assert.equal(result.json.error.code, "AI_SUGGESTION_WRITE_CONTENT_INVALID");
    assert.deepEqual((await f.request(f.noteRoute)).json.item, f.note);
    assert.equal((await f.request(f.suggestionRoute)).json.item.status, "edited");
  }
});

for (const mutation of ["body", "thesis"]) test(`a later manual ${mutation} edit prevents confirmation without changing review history`, async t => {
  const f = await fixture(t);
  const changed = await f.request(f.noteRoute, mutation === "body" ? { body: f.note.body + "\n\n更新正文" }
    : { thesis: "另一窗口的观点", thesisChangeReason: "补充证据后修订。" }, "PUT");
  assert.equal(changed.status, 200, JSON.stringify(changed.json));
  const before = (await f.request(f.noteRoute)).json.item;
  const confirmed = await f.request(f.suggestionRoute, f.body, "PATCH");
  assert.equal(confirmed.status, 409, JSON.stringify(confirmed.json));
  assert.equal(confirmed.json.error.code, "NOTE_SAVE_CONFLICT");
  assert.deepEqual((await f.request(f.noteRoute)).json.item, before);
  const review = (await f.request(f.suggestionRoute)).json.item;
  assert.equal(review.status, "edited");
  assert.deepEqual(review.history, f.detail.item.history);
});

test("changed review and malformed content or write baselines cannot mutate the note", async t => {
  const f = await fixture(t);
  for (const patch of [{ writeBase: null }, { writeBase: { ...f.body.writeBase, fileRevision: "" } },
    { content: { thesis: [] } }, { userConfirmed: false }, { writeBase: { ...f.body.writeBase, vaultPath: path.join(f.vaultPath, "other") } }]) {
    const result = await f.request(f.suggestionRoute, { ...f.body, ...patch }, "PATCH");
    assert.ok(result.status >= 400, JSON.stringify(result.json));
    assert.deepEqual((await f.request(f.noteRoute)).json.item, f.note);
    assert.equal((await f.request(f.suggestionRoute)).json.item.status, "edited");
  }
  const otherReview = await f.request(f.suggestionRoute, { status: "confirmed", userConfirmed: true,
    content: { thesis: "另一次审阅确认的内容" } }, "PATCH");
  assert.equal(otherReview.status, 200, JSON.stringify(otherReview.json));
  const stale = await f.request(f.suggestionRoute, f.body, "PATCH");
  assert.equal(stale.status, 409);
  assert.equal(stale.json.error.code, "AI_SUGGESTION_WRITE_REVIEW_CHANGED");
  assert.deepEqual((await f.request(f.noteRoute)).json.item, f.note);
});

test("linked artifact failure rolls back suggestion, catalog and exact Markdown bytes; retry commits once", async t => {
  const f = await fixture(t, { linked: true });
  const file = path.join(f.vaultPath, f.note.markdownPath);
  const bytes = await fs.readFile(file);
  const db = new DatabaseSync(path.join(f.vaultPath, ".yansilu", "ai-agent.db"));
  t.after(() => db.close());
  db.exec("CREATE TRIGGER fail_confirm_artifact BEFORE UPDATE ON ai_artifacts BEGIN SELECT RAISE(ABORT, 'confirm persistence failure'); END;");
  const failed = await f.request(f.suggestionRoute, f.body, "PATCH");
  assert.equal(failed.status, 400, JSON.stringify(failed.json));
  assert.match(failed.json.error.message, /confirm persistence failure/);
  assert.deepEqual(await fs.readFile(file), bytes);
  assert.deepEqual((await f.request(f.noteRoute)).json.item, f.note);
  const review = (await f.request(f.suggestionRoute)).json;
  assert.equal(review.item.status, "edited");
  assert.deepEqual(review.item.history, f.detail.item.history);
  assert.deepEqual(review.artifact, f.detail.artifact);
  db.exec("DROP TRIGGER fail_confirm_artifact;");
  const confirmed = await f.request(f.suggestionRoute, f.body, "PATCH");
  assert.equal(confirmed.status, 200, JSON.stringify(confirmed.json));
  const saved = (await f.request(f.noteRoute)).json.item;
  if (f.field === "thesis") assert.equal(saved.thesis, f.body.content.thesis);
  else assert.deepEqual(saved.threeLineSummary, f.body.content.three_line_summary);
  assert.equal(confirmed.json.artifact.payload.fieldSuggestion.status, "confirmed");
  assert.deepEqual(confirmed.json.artifact.payload.fieldSuggestion.content, f.body.content);
});

test("concurrent identical confirmations apply one note write and one review event", async t => {
  const f = await fixture(t);
  const results = await Promise.all([f.request(f.suggestionRoute, f.body, "PATCH"), f.request(f.suggestionRoute, f.body, "PATCH")]);
  assert.ok(results.some(r => r.status === 200));
  assert.ok(results.every(r => [200, 409].includes(r.status)), JSON.stringify(results));
  const saved = (await f.request(f.noteRoute)).json.item;
  const review = (await f.request(f.suggestionRoute)).json.item;
  assert.equal(saved.thesis, f.body.content.thesis);
  assert.equal(review.history.filter(e => e.toStatus === "confirmed").length, 1);
});

test("incomplete and stale confirmations cannot follow a vault switch into cloned note and suggestion IDs", async t => {
  const f = await fixture(t);
  const otherVault = await fs.mkdtemp(path.join(os.tmpdir(), "yansilu-confirm-clone-"));
  await fs.cp(f.vaultPath, otherVault, { recursive: true });
  const files = [f.vaultPath, otherVault].map(vault => path.join(vault, f.note.markdownPath));
  const before = await Promise.all(files.map(file => fs.readFile(file)));
  let pending;
  const response = new Promise((resolve, reject) => {
    pending = http.request(f.baseUrl + f.suggestionRoute, { method: "PATCH", headers: { "Content-Type": "application/json" } }, res => {
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
  const copied = (await f.request(f.noteRoute)).json.item;
  assert.equal(copied.fileRevision, f.note.fileRevision);
  assert.equal((await f.request(f.suggestionRoute)).json.item.id, f.detail.item.id);
  pending.end(JSON.stringify(f.body).slice(1));
  const denied = await response;
  assert.equal(denied.status, 409, JSON.stringify(denied.json));
  assert.equal(denied.json.error.code, "AI_SUGGESTION_WRITE_VAULT_CHANGED");
  const stale = await f.request(f.suggestionRoute, f.body, "PATCH");
  assert.equal(stale.status, 409, JSON.stringify(stale.json));
  assert.equal(stale.json.error.code, "AI_SUGGESTION_WRITE_VAULT_CHANGED");
  assert.equal((await f.request(f.suggestionRoute)).json.item.status, "edited");
  for (const [index, file] of files.entries()) assert.deepEqual(await fs.readFile(file), before[index]);
  assert.equal((await f.request("/api/v1/vault", { vaultPath: f.vaultPath })).status, 200);
  assert.equal((await f.request(f.suggestionRoute)).json.item.status, "edited");
  const retried = await f.request(f.suggestionRoute, f.body, "PATCH");
  assert.equal(retried.status, 200, JSON.stringify(retried.json));
  assert.deepEqual(await fs.readFile(files[1]), before[1]);
});
