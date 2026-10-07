import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import net from "node:net";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { createSqliteArtifactStore } from "../../packages/ai-orchestrator/src/sqlite-artifact-store.mjs";
import { fileURLToPath } from "node:url";
import { syncWritingProject } from "../../packages/writing-engine/src/writing-engine.mjs";
import { moveNoteToDirectory } from "../../packages/domain/src/index.mjs";
import { saveNoteWithReadback } from "../../apps/web/src/note-save-readback.js";
import { createNoteCreationController } from "../../apps/web/src/note-creation-controller.js";
import { createWritingNoteWithRecovery } from "../../apps/web/src/writing-note-creation-recovery.js";
import { saveEditorNoteWithRecovery } from "../../apps/web/src/editor-save-recovery.js";
import { randomUUID } from "node:crypto";
import { renderWritingScaffoldPreviewDom } from "../../apps/web/src/writing-scaffold-preview-panel.js";
import { escapeHtml } from "../../apps/web/src/editor-render-utils.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..", "..");

function assertRestoredSourceNotice(scaffold, project, checkId, noteId) {
  const check = scaffold.preflight?.checks.find(item => item.id === checkId);
  assert.equal(check?.status, "warning");
  assert.ok(check.targetNoteIds.includes(noteId));
  const preview = { innerHTML: "" };
  renderWritingScaffoldPreviewDom({ $: () => preview, writingState: { project, scaffold }, escapeHtml });
  assert.ok(preview.innerHTML.includes(escapeHtml(check.message)));
  if (checkId === "source_note_types") {
    assert.ok(preview.innerHTML.includes(`data-writing-outline-source-note="${escapeHtml(noteId)}"`));
  } else {
    assert.match(preview.innerHTML, /来源文件缺失/);
    assert.doesNotMatch(preview.innerHTML, /data-writing-outline-source-note/);
  }
}

test("historical restore preserves the outline when an evidence file is missing", async t => {
  const vaultPath = await makeTempDir("yansilu-history-missing-evidence-");
  const port = await findFreePort(), baseUrl = `http://127.0.0.1:${port}`;
  const child = startApi(port, vaultPath);
  t.after(async () => { if (child.exitCode === null) { const exited = once(child, "exit"); child.kill(); await exited; } });
  await waitForHealth(baseUrl);
  const note = (await postJson(baseUrl, "/api/v1/notes", {
    directoryId: "dir_original_default", body: "# Evidence\n\nKeep this historical reference."
  })).json.item;
  const draft = (await postJson(baseUrl, "/api/v1/notes", {
    directoryId: "dir_original_default", body: "# Article\n\nKeep my article unchanged."
  })).json.item;
  const projectId = (await postJson(baseUrl, "/api/v1/writing-projects", { title: "Missing evidence", basketNoteIds: [note.id] })).json.item.id;
  const source = (await postJson(baseUrl, "/api/v1/draft-scaffolds", { writingProjectId: projectId })).json.item;
  const current = (await postJson(baseUrl, "/api/v1/draft-scaffolds", { writingProjectId: projectId })).json.item;
  const project = (await getJson(baseUrl, `/api/v1/writing-projects/${projectId}`)).json.item;
  const articlePath = path.join(vaultPath, draft.markdownPath), articleBytes = await fs.readFile(articlePath);
  const evidencePath = path.join(vaultPath, note.markdownPath);
  await fs.rename(evidencePath, `${evidencePath}.missing-fixture`);
  const payload = { sourceScaffoldId: source.id, restorationId: `ds_${randomUUID()}`,
    expectedScaffoldId: current.id, expectedScaffoldUpdatedAt: current.updated_at,
    expectedProjectUpdatedAt: project.updated_at, expectedSourceUpdatedAt: source.updated_at, expectedVaultPath: vaultPath };
  const route = `/api/v1/writing-projects/${projectId}/scaffold-restore`;
  const restored = await postJson(baseUrl, route, payload);
  assert.equal(restored.status, 201, JSON.stringify(restored.json));
  assertRestoredSourceNotice(restored.json.item, project, "source_files", note.id);
  assert.deepEqual(restored.json.item.sections, source.sections);
  assert.deepEqual(restored.json.item.open_questions, source.open_questions);
  assert.match(restored.json.item.markdown, /缺失笔记/);
  assert.ok(restored.json.item.markdown.includes(note.id));
  assert.equal((await getJson(baseUrl, `/api/v1/writing-projects/${projectId}`)).json.item.scaffold_id, payload.restorationId);
  const readback = (await getJson(baseUrl, `/api/v1/draft-scaffolds/${payload.restorationId}`)).json.item;
  assert.deepEqual(readback.sections, source.sections);
  assert.deepEqual(restored.json.item.preflight, readback.preflight);
  assert.ok(readback.preflight.checks.some(check => check.id === "source_files" && check.status !== "pass"));
  assert.deepEqual((await getJson(baseUrl, `/api/v1/draft-scaffolds/${source.id}`)).json.item.sections, source.sections);
  assert.deepEqual((await getJson(baseUrl, `/api/v1/draft-scaffolds/${current.id}`)).json.item.sections, current.sections);
  const retried = await postJson(baseUrl, route, payload);
  assert.equal(retried.status, 201);
  assert.equal(retried.json.item.id, payload.restorationId);
  assertRestoredSourceNotice(retried.json.item, project, "source_files", note.id);
  assert.deepEqual(retried.json.item.preflight, readback.preflight);
  assert.equal((await getJson(baseUrl, `/api/v1/writing-projects/${projectId}/scaffolds?limit=50`)).json.items.length, 3);
  const sections = structuredClone(readback.sections);
  sections[0].heading = "Edited after restoring missing evidence";
  const editPayload = { sections, openQuestions: readback.open_questions,
    expectedCurrentScaffoldId: readback.id, expectedVaultPath: vaultPath,
    expectedOutline: { sections: readback.sections, openQuestions: readback.open_questions } };
  const edited = await patchJson(baseUrl, `/api/v1/draft-scaffolds/${readback.id}`, editPayload);
  assert.equal(edited.status, 200, JSON.stringify(edited.json));
  assert.deepEqual(edited.json.item.sections, sections);
  assert.match(edited.json.item.markdown, /缺失笔记/);
  assert.ok(edited.json.item.markdown.includes(note.id));
  const editedReadback = (await getJson(baseUrl, `/api/v1/draft-scaffolds/${readback.id}`)).json.item;
  assert.deepEqual(editedReadback.sections, sections);
  assert.ok(editedReadback.preflight.checks.some(check => check.id === "source_files" && check.status !== "pass"));
  const staleEdit = await patchJson(baseUrl, `/api/v1/draft-scaffolds/${readback.id}`, editPayload);
  assert.equal(staleEdit.status, 409);
  assert.equal(staleEdit.json.error.code, "WRITING_OUTLINE_CONFLICT");
  assert.deepEqual((await getJson(baseUrl, `/api/v1/draft-scaffolds/${readback.id}`)).json.item.sections, sections);
  assert.deepEqual((await getJson(baseUrl, `/api/v1/draft-scaffolds/${source.id}`)).json.item.sections, source.sections);
  assert.deepEqual((await getJson(baseUrl, `/api/v1/draft-scaffolds/${current.id}`)).json.item.sections, current.sections);
  assert.deepEqual(await fs.readFile(articlePath), articleBytes);
  await assert.rejects(fs.access(evidencePath), { code: "ENOENT" });
});

test("restored outline edits retain historical evidence outside the current basket", async t => {
  const vaultPath = await makeTempDir("yansilu-history-outside-basket-");
  const port = await findFreePort(), baseUrl = `http://127.0.0.1:${port}`;
  const child = startApi(port, vaultPath);
  t.after(async () => { if (child.exitCode === null) { const exited = once(child, "exit"); child.kill(); await exited; } });
  await waitForHealth(baseUrl);
  const evidence = (await postJson(baseUrl, "/api/v1/notes", {
    directoryId: "dir_original_default", body: "# Historical evidence title\n\nOriginal material."
  })).json.item;
  const other = (await postJson(baseUrl, "/api/v1/notes", {
    directoryId: "dir_original_default", body: "# Current basket\n\nDifferent material."
  })).json.item;
  const projectId = (await postJson(baseUrl, "/api/v1/writing-projects", { title: "Historical basket", basketNoteIds: [evidence.id] })).json.item.id;
  const source = (await postJson(baseUrl, "/api/v1/draft-scaffolds", { writingProjectId: projectId })).json.item;
  const synced = await patchJson(baseUrl, `/api/v1/writing-projects/${projectId}`, { basketNoteIds: [other.id], expectedVaultPath: vaultPath });
  assert.equal(synced.status, 200, JSON.stringify(synced.json));
  const current = (await postJson(baseUrl, "/api/v1/draft-scaffolds", { writingProjectId: projectId })).json.item;
  const legacyProject = (await postJson(baseUrl, "/api/v1/writing-projects", { title: "Existing basket", basketNoteIds: [evidence.id] })).json.item;
  const movedEvidence = await moveNoteToDirectory(vaultPath, evidence.id, "dir_literature_default");
  assert.equal(movedEvidence.noteType, "literature");
  const legacyRead = await getJson(baseUrl, `/api/v1/writing-projects/${legacyProject.id}`);
  assert.equal(legacyRead.status, 200, JSON.stringify(legacyRead.json));
  const historicalRead = await getJson(baseUrl, `/api/v1/draft-scaffolds/${source.id}`);
  assert.equal(historicalRead.status, 200, JSON.stringify(historicalRead.json));
  assert.ok(historicalRead.json.item.preflight.checks.some(check => check.id === "source_note_types"
    && check.status === "warning" && check.targetNoteIds.includes(evidence.id)));
  const rejectedBasket = await postJson(baseUrl, "/api/v1/writing-projects", { title: "Invalid new basket", basketNoteIds: [evidence.id] });
  assert.equal(rejectedBasket.status, 400);
  const project = (await getJson(baseUrl, `/api/v1/writing-projects/${projectId}`)).json.item;
  const restorePayload = {
    sourceScaffoldId: source.id, restorationId: `ds_${randomUUID()}`, expectedVaultPath: vaultPath,
    expectedScaffoldId: current.id, expectedScaffoldUpdatedAt: current.updated_at,
    expectedProjectUpdatedAt: project.updated_at, expectedSourceUpdatedAt: source.updated_at
  };
  const restoreRoute = `/api/v1/writing-projects/${projectId}/scaffold-restore`;
  const restored = await postJson(baseUrl, restoreRoute, restorePayload);
  assert.equal(restored.status, 201, JSON.stringify(restored.json));
  assertRestoredSourceNotice(restored.json.item, project, "source_note_types", evidence.id);
  const restoredReadback = (await getJson(baseUrl, `/api/v1/draft-scaffolds/${restored.json.item.id}`)).json.item;
  assert.deepEqual(restored.json.item.preflight, restoredReadback.preflight);
  const retried = await postJson(baseUrl, restoreRoute, restorePayload);
  assert.equal(retried.status, 201, JSON.stringify(retried.json));
  assertRestoredSourceNotice(retried.json.item, project, "source_note_types", evidence.id);
  assert.deepEqual(retried.json.item.preflight, restoredReadback.preflight);
  assert.equal(retried.json.item.markdown, restored.json.item.markdown);
  let outline = restored.json.item;
  const edit = async heading => {
    const sections = structuredClone(outline.sections);
    sections[0].heading = heading;
    const response = await patchJson(baseUrl, `/api/v1/draft-scaffolds/${outline.id}`, {
      sections, openQuestions: outline.open_questions, expectedVaultPath: vaultPath, expectedCurrentScaffoldId: outline.id,
      expectedOutline: { sections: outline.sections, openQuestions: outline.open_questions }
    });
    assert.equal(response.status, 200, JSON.stringify(response.json));
    outline = response.json.item;
  };
  await edit("Keep historical source title");
  assert.ok(outline.markdown.includes(evidence.title));
  assert.ok(outline.sections.some(section => section.evidence_note_ids.includes(evidence.id)));
  assert.ok(outline.preflight.checks.some(check => check.id === "source_note_types" && check.status === "warning"));
  const unrelatedLiterature = (await postJson(baseUrl, "/api/v1/notes", {
    directoryId: "dir_literature_default", body: "# Not historical evidence\n\nNew literature."
  })).json.item;
  const invalidSections = structuredClone(outline.sections);
  invalidSections[0].evidence_note_ids.push(unrelatedLiterature.id);
  const invalidEdit = await patchJson(baseUrl, `/api/v1/draft-scaffolds/${outline.id}`, {
    sections: invalidSections, expectedVaultPath: vaultPath, expectedCurrentScaffoldId: outline.id,
    expectedOutline: { sections: outline.sections, openQuestions: outline.open_questions }
  });
  assert.equal(invalidEdit.status, 400);
  assert.deepEqual((await getJson(baseUrl, `/api/v1/draft-scaffolds/${outline.id}`)).json.item.sections, outline.sections);
  const evidencePath = path.join(vaultPath, movedEvidence.markdownPath);
  await fs.rename(evidencePath, `${evidencePath}.missing-fixture`);
  const readback = (await getJson(baseUrl, `/api/v1/draft-scaffolds/${outline.id}`)).json.item;
  assert.ok(readback.preflight.checks.some(check => check.id === "source_files" && check.status !== "pass"));
  await edit("Edit with missing historical source");
  assert.match(outline.markdown, /缺失笔记/);
  assert.ok(outline.markdown.includes(evidence.id));
  const retryAfterEdit = await postJson(baseUrl, restoreRoute, restorePayload);
  assert.equal(retryAfterEdit.status, 201, JSON.stringify(retryAfterEdit.json));
  assertRestoredSourceNotice(retryAfterEdit.json.item, project, "source_files", evidence.id);
  assert.deepEqual(retryAfterEdit.json.item.preflight, outline.preflight);
  assert.deepEqual(retryAfterEdit.json.item.sections, outline.sections);
  assert.equal(retryAfterEdit.json.item.markdown, outline.markdown);
  assert.deepEqual((await getJson(baseUrl, `/api/v1/draft-scaffolds/${source.id}`)).json.item.sections, source.sections);
});

test("historical restore rejects a request whose Vault switches while the body is incomplete", async t => {
  const initialVault = await makeTempDir("yansilu-history-request-old-");
  const targetVault = await makeTempDir("yansilu-history-request-target-");
  const port = await findFreePort(), baseUrl = `http://127.0.0.1:${port}`;
  const child = startApi(port, initialVault);
  t.after(() => child.kill());
  await waitForHealth(baseUrl);
  await postJson(baseUrl, "/api/v1/vault", { vaultPath: targetVault });
  const note = (await postJson(baseUrl, "/api/v1/notes", { directoryId: "dir_original_default", body: "# Target evidence\n\nDo not change." })).json.item;
  const projectId = (await postJson(baseUrl, "/api/v1/writing-projects", { title: "Target history", basketNoteIds: [note.id] })).json.item.id;
  const source = (await postJson(baseUrl, "/api/v1/draft-scaffolds", { writingProjectId: projectId })).json.item;
  const current = (await postJson(baseUrl, "/api/v1/draft-scaffolds", { writingProjectId: projectId })).json.item;
  const project = (await getJson(baseUrl, `/api/v1/writing-projects/${projectId}`)).json.item;
  const before = await fs.readFile(path.join(targetVault, note.markdownPath), "utf8");
  await postJson(baseUrl, "/api/v1/vault", { vaultPath: initialVault });
  let pending;
  const result = new Promise((resolve, reject) => {
    pending = http.request(`${baseUrl}/api/v1/writing-projects/${projectId}/scaffold-restore`, { method: "POST", headers: { "Content-Type": "application/json" } }, res => {
      let text = "";
      res.on("data", chunk => { text += chunk; });
      res.on("end", () => resolve({ status: res.statusCode, json: JSON.parse(text) }));
    });
    pending.on("error", reject); pending.write("{");
  });
  t.after(() => pending.destroy());
  await new Promise(resolve => setTimeout(resolve, 150));
  await postJson(baseUrl, "/api/v1/vault", { vaultPath: targetVault });
  pending.end(JSON.stringify({ sourceScaffoldId: source.id, restorationId: `ds_${randomUUID()}`, expectedScaffoldId: current.id,
    expectedScaffoldUpdatedAt: current.updated_at, expectedProjectUpdatedAt: project.updated_at,
    expectedSourceUpdatedAt: source.updated_at, expectedVaultPath: targetVault }).slice(1));
  const response = await result;
  assert.equal(response.status, 409);
  assert.equal(response.json.error.code, "VAULT_CHANGED");
  assert.equal((await getJson(baseUrl, `/api/v1/writing-projects/${projectId}`)).json.item.scaffold_id, current.id);
  assert.equal((await getJson(baseUrl, `/api/v1/writing-projects/${projectId}/scaffolds?limit=50`)).json.items.length, 2);
  assert.equal(await fs.readFile(path.join(targetVault, note.markdownPath), "utf8"), before);
});

test("historical outline restore is atomic, conflict guarded, idempotent and preserves actual sources and drafts", async t => {
  const vaultPath = await makeTempDir("yansilu-outline-history-");
  const port = await findFreePort(), baseUrl = `http://127.0.0.1:${port}`;
  let child = startApi(port, vaultPath);
  t.after(() => child.kill());
  await waitForHealth(baseUrl);
  const note = (await postJson(baseUrl, "/api/v1/notes", { directoryId: "dir_original_default", body: "# Actual evidence\n\nPreserve these original bytes." })).json.item;
  const draft = (await postJson(baseUrl, "/api/v1/notes", { directoryId: "dir_original_default", body: "# Article\n\nPreserve the article body." })).json.item;
  const projectId = (await postJson(baseUrl, "/api/v1/writing-projects", { title: "History restoration", basketNoteIds: [note.id] })).json.item.id;
  const first = (await postJson(baseUrl, "/api/v1/draft-scaffolds", { writingProjectId: projectId, versionNote: "Original version" })).json.item;
  const second = (await postJson(baseUrl, "/api/v1/draft-scaffolds", { writingProjectId: projectId })).json.item;
  const current = (await patchJson(baseUrl, `/api/v1/draft-scaffolds/${second.id}`, { sections: second.sections.map((s, i) => i ? s : { ...s, heading: "Current different heading" }) })).json.item;
  assert.equal((await postJson(baseUrl, `/api/v1/writing-projects/${projectId}/draft-note`, { draftNoteId: draft.id, sourceScaffoldId: second.id })).status, 200);
  const project = (await getJson(baseUrl, `/api/v1/writing-projects/${projectId}`)).json.item;
  const sourceFile = path.join(vaultPath, note.markdownPath), draftFile = path.join(vaultPath, draft.markdownPath);
  const bytes = await Promise.all([sourceFile, draftFile].map(file => fs.readFile(file, "utf8")));
  const payload = { sourceScaffoldId: first.id, restorationId: `ds_${randomUUID()}`, expectedScaffoldId: second.id,
    expectedScaffoldUpdatedAt: current.updated_at, expectedProjectUpdatedAt: project.updated_at,
    expectedSourceUpdatedAt: first.updated_at, expectedVaultPath: vaultPath };
  const route = `/api/v1/writing-projects/${projectId}/scaffold-restore`;
  for (const invalid of [
    { expectedScaffoldId: first.id }, { expectedScaffoldUpdatedAt: "outdated" },
    { expectedProjectUpdatedAt: "outdated" }, { expectedSourceUpdatedAt: "outdated" },
    { expectedVaultPath: path.join(vaultPath, "different-vault") }
  ]) {
    const response = await postJson(baseUrl, route, { ...payload, ...invalid });
    assert.equal(response.status, 409, JSON.stringify(response.json));
    assert.equal((await getJson(baseUrl, `/api/v1/writing-projects/${projectId}`)).json.item.scaffold_id, second.id);
    assert.equal((await getJson(baseUrl, `/api/v1/writing-projects/${projectId}/scaffolds?limit=50`)).json.items.length, 2);
  }
  const otherProject = (await postJson(baseUrl, "/api/v1/writing-projects", { title: "Other project", basketNoteIds: [note.id] })).json.item;
  const otherVersion = (await postJson(baseUrl, "/api/v1/draft-scaffolds", { writingProjectId: otherProject.id })).json.item;
  assert.equal((await postJson(baseUrl, route, { ...payload, sourceScaffoldId: otherVersion.id })).status, 400);
  assert.equal((await postJson(baseUrl, route, { sourceScaffoldId: first.id })).status, 400);
  const restored = await postJson(baseUrl, route, payload);
  assert.equal(restored.status, 201, JSON.stringify(restored.json));
  assert.equal(restored.json.item.id, payload.restorationId);
  assert.equal(restored.json.item.writing_project.scaffold_id, payload.restorationId);
  assert.equal(restored.json.item.writing_project.draft_note_id, draft.id);
  assert.deepEqual(restored.json.item.sections, first.sections);
  assert.deepEqual(restored.json.item.open_questions, first.open_questions);
  assert.deepEqual((await getJson(baseUrl, `/api/v1/draft-scaffolds/${first.id}`)).json.item.sections, first.sections);
  assert.deepEqual((await getJson(baseUrl, `/api/v1/draft-scaffolds/${current.id}`)).json.item, current);
  const lateSave = await patchJson(baseUrl, `/api/v1/draft-scaffolds/${current.id}`, { sections: current.sections.map((s, i) => i ? s : { ...s, heading: "Late edit must not change historical data" }), expectedCurrentScaffoldId: current.id });
  assert.equal(lateSave.status, 409);
  assert.equal(lateSave.json.error.code, "WRITING_CURRENT_OUTLINE_CHANGED");
  assert.deepEqual((await getJson(baseUrl, `/api/v1/draft-scaffolds/${current.id}`)).json.item, current);
  const retry = await postJson(baseUrl, route, payload);
  assert.equal(retry.status, 201, JSON.stringify(retry.json));
  assert.equal(retry.json.item.id, restored.json.item.id);
  assert.equal((await getJson(baseUrl, `/api/v1/writing-projects/${projectId}/scaffolds?limit=50`)).json.items.length, 3);
  child.kill();
  await once(child, "exit");
  child = startApi(port, vaultPath);
  await waitForHealth(baseUrl);
  assert.equal((await getJson(baseUrl, `/api/v1/writing-projects/${projectId}`)).json.item.scaffold_id, payload.restorationId);
  assert.deepEqual((await getJson(baseUrl, `/api/v1/draft-scaffolds/${payload.restorationId}`)).json.item.sections, first.sections);
  const newer = (await postJson(baseUrl, "/api/v1/draft-scaffolds", { writingProjectId: projectId })).json.item;
  assert.equal((await postJson(baseUrl, route, payload)).status, 409, "A retry must not roll back a newer version");
  assert.equal((await getJson(baseUrl, `/api/v1/writing-projects/${projectId}`)).json.item.scaffold_id, newer.id);
  assert.deepEqual(await Promise.all([sourceFile, draftFile].map(file => fs.readFile(file, "utf8"))), bytes);
});

async function makeTempDir(prefix) {
  return fs.mkdtemp(path.join(os.tmpdir(), prefix));
}

async function findFreePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.on("error", reject);
    server.listen(0, () => {
      const address = server.address();
      const port = typeof address === "object" ? address.port : 0;
      server.close(() => resolve(port));
    });
  });
}

async function waitForHealth(baseUrl) {
  const deadline = Date.now() + 5000;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${baseUrl}/health`);
      if (res.ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 80));
  }
  throw new Error("API server did not become healthy");
}

async function postJson(baseUrl, pathname, body) {
  const res = await fetch(`${baseUrl}${pathname}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  const json = await res.json();
  return { status: res.status, json };
}

async function getJson(baseUrl, pathname) {
  const res = await fetch(`${baseUrl}${pathname}`);
  const json = await res.json();
  return { status: res.status, json };
}

async function patchJson(baseUrl, pathname, body) {
  const res = await fetch(`${baseUrl}${pathname}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  const json = await res.json();
  return { status: res.status, json };
}

async function readRequestJson(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const text = Buffer.concat(chunks).toString("utf8");
  return text ? JSON.parse(text) : {};
}

async function startJsonProvider(output) {
  const requests = [];
  const server = http.createServer(async (req, res) => {
    if (req.method !== "POST" || req.url !== "/v1/chat/completions") {
      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: { message: "not found" } }));
      return;
    }
    const body = await readRequestJson(req);
    requests.push({ body, headers: req.headers });
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        id: "chatcmpl_writing_analysis_test",
        choices: [{ message: { role: "assistant", content: JSON.stringify(output) } }],
        usage: { prompt_tokens: 17, completion_tokens: 19, total_tokens: 36 }
      })
    );
  });

  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      resolve({
        server,
        requests,
        baseUrl: `http://127.0.0.1:${address.port}`
      });
    });
  });
}

function startApi(port, vaultPath) {
  return spawn(process.execPath, ["apps/api/src/server.mjs"], {
    cwd: REPO_ROOT,
    env: {
      ...process.env,
      API_PORT: String(port),
      VAULT_PATH: vaultPath,
      YANSILU_TEST_PROVIDER_KEY: process.env.YANSILU_TEST_PROVIDER_KEY || "test-key"
    },
    stdio: ["ignore", "pipe", "pipe"]
  });
}

for (const focus of ["writing", "source_distill", "note_analysis", "test_chat"]) test(`${focus} AI cancellation closes provider transport, persists nothing and permits retry`, { timeout: 10000 }, async t => {
  const vaultPath = await makeTempDir("yansilu-writing-cancel-");
  const port = await findFreePort();
  const baseUrl = `http://127.0.0.1:${port}`;
  const child = startApi(port, vaultPath);
  t.after(async () => { if (child.exitCode === null) { const exited = once(child, "exit"); child.kill(); await exited; } });
  await waitForHealth(baseUrl);
  const note = (await postJson(baseUrl, "/api/v1/notes", { directoryId: "dir_original_default", body: "# Test\n\nReal evidence." })).json.item;
  let started;
  let disconnected;
  const ready = new Promise(resolve => { started = resolve; });
  const closed = new Promise(resolve => { disconnected = resolve; });
  let calls = 0;
  const provider = http.createServer(async (req, res) => {
    await readRequestJson(req);
    calls++;
    if (calls === 1) { res.on("close", disconnected); started(); return; }
    res.writeHead(200, { "Content-Type": "application/json" });
    const result = focus === "source_distill"
      ? { draft: { title: "Evidence", coreArgument: "Use evidence", content: "Explain the evidence", questions: "", sourceNoteIds: [note.id], evidenceQuote: "Real evidence." } }
      : { writingMoves: [{ text: "Use the real evidence", sourceNoteIds: [note.id] }] };
    res.end(JSON.stringify({ choices: [{ message: { content: JSON.stringify(result) } }] }));
  });
  await new Promise(resolve => provider.listen(0, "127.0.0.1", resolve));
  t.after(async () => { provider.closeAllConnections(); await new Promise(resolve => provider.close(resolve)); });
  const payload = { privacyMode: "local_only", executeModel: true, executeLocalModel: focus === "note_analysis", fallbackOnProviderFailure: false, providerPreset: "local_private_gateway", authMode: "local_no_key",
    endpointUrl: `http://127.0.0.1:${provider.address().port}/v1/chat/completions`, model: "test-local", noteIds: [note.id], persistArtifacts: focus !== "source_distill",
    ...(focus === "source_distill" ? { analysisFocus: focus } : {}), ...(focus === "test_chat" ? { prompt: "Synthetic connection test" } : {}) };
  const controller = new AbortController();
  const route = focus === "test_chat" ? "/api/v1/ai/test-chat" : focus === "note_analysis" ? `/api/v1/notes/${note.id}/ai-analysis` : "/api/v1/writing/ai-analysis";
  const pending = fetch(`${baseUrl}${route}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload), signal: controller.signal });
  const outcome = pending.catch(error => error);
  await ready;
  controller.abort();
  assert.equal((await outcome).name, "AbortError");
  await closed;
  const store = await createSqliteArtifactStore({ vaultPath });
  t.after(() => store.close());
  assert.equal(store.countArtifacts(), 0);
  const retry = await postJson(baseUrl, route, payload);
  assert.equal(retry.status, 200, JSON.stringify(retry.json));
  if (focus !== "note_analysis") assert.equal(store.countArtifacts(), ["source_distill", "test_chat"].includes(focus) ? 0 : 1);
  assert.equal(calls, 2);
});

test("writing first creation retries its stable ID after a lost response without changing the created file", async t => {
  const vaultPath = await makeTempDir("yansilu-api-writing-create-recovery-");
  const port = await findFreePort();
  const baseUrl = `http://127.0.0.1:${port}`;
  const child = startApi(port, vaultPath);
  t.after(() => child.kill());
  await waitForHealth(baseUrl);
  for (const [kind, id] of [["article", "11111111-1234-4234-8234-123456789abc"], ["chapter", "22222222-1234-4234-8234-123456789abc"]]) {
    const holder = {};
    let writes = 0, saved, available = false;
    const deps = { getVaultPath: () => vaultPath, createNoteId: () => id,
      createNote: async payload => {
        writes++;
        const result = await postJson(baseUrl, "/api/v1/notes", payload);
        if (result.status === 201) {
          saved = result.json.item;
          throw Object.assign(new Error("response lost"), { code: "request_timeout" });
        }
        assert.equal(result.json.error.code, "NOTE_ID_EXISTS");
        throw Object.assign(new Error(result.json.error.message), { code: result.json.error.code });
      }, fetchNote: async noteId => available ? (await getJson(baseUrl, `/api/v1/notes/${noteId}`)).json.item : null
    };
    const payload = { directoryId: "dir_original_default", title: kind, body: `# ${kind}\n\nREAL-${kind}` };
    await assert.rejects(createWritingNoteWithRecovery(holder, deps, payload, kind), { code: "NOTE_SAVE_RESULT_UNCERTAIN" });
    await assert.rejects(createWritingNoteWithRecovery(holder, deps, payload, kind), { code: "NOTE_SAVE_RESULT_UNCERTAIN" });
    const file = path.join(vaultPath, saved.markdownPath);
    const before = await fs.readFile(file, "utf8");
    available = true;
    const recovered = await createWritingNoteWithRecovery(holder, deps, { ...payload, body: "NEWER-INPUT" }, kind);
    assert.equal(writes, 2);
    assert.equal(recovered.note.id, `note_${id}`);
    assert.equal(recovered.note.fileRevision, saved.fileRevision);
    assert.equal(recovered.submittedBody, payload.body);
    assert.equal(recovered.recovered, true);
    assert.equal(await fs.readFile(file, "utf8"), before);
  }
});

test("lost creation response is recovered by stable ID without another POST", async t => {
  const vaultPath = await makeTempDir("yansilu-api-create-readback-");
  const port = await findFreePort();
  const baseUrl = `http://127.0.0.1:${port}`;
  const child = startApi(port, vaultPath);
  t.after(() => child.kill());
  await waitForHealth(baseUrl);
  const id = "12345678-1234-4234-8234-123456789abc";
  const state = { notes: [], tabs: [], selectedFolderId: "dir_original_default" };
  let posts = 0;
  const opened = [];
  const create = createNoteCreationController({ state, folderById: () => ({}),
    findUntitledPlaceholder: async () => null, isLocalOnlyNote: () => false,
    initialBodyForFolder: () => "# Recovery\n\nREAL-CREATED-CONTENT", mapNoteItem: note => note,
    ensureEditableNoteBody: body => body, getVaultPath: () => vaultPath, createId: () => id,
    createNote: async payload => {
      posts++;
      const response = await postJson(baseUrl, "/api/v1/notes", payload);
      assert.equal(response.status, 201);
      throw Object.assign(new Error("response lost"), { code: "request_timeout" });
    },
    fetchNote: async noteId => (await getJson(baseUrl, `/api/v1/notes/${noteId}`)).json.item,
    openNoteById: noteId => opened.push(noteId), openStandaloneEditorWindow: () => assert.fail("unexpected window")
  });
  const result = await create({ reuseUntitled: false });
  assert.equal(result.note.id, `note_${id}`);
  assert.equal(posts, 1);
  assert.deepEqual(opened, [`note_${id}`]);
  const file = path.join(vaultPath, result.note.markdownPath);
  const original = await fs.readFile(file, "utf8");
  const replay = await postJson(baseUrl, "/api/v1/notes", { clientCreationId: id, directoryId: "dir_original_default", body: "DO-NOT-OVERWRITE" });
  assert.equal(replay.status, 400);
  assert.equal(replay.json.error.code, "NOTE_ID_EXISTS");
  assert.equal(await fs.readFile(file, "utf8"), original);
});

test("an incomplete create request cannot create in a vault switched while its body is read", async t => {
  const vaultPath = await makeTempDir("yansilu-api-create-scope-");
  const otherVault = await makeTempDir("yansilu-api-create-other-");
  const port = await findFreePort();
  const baseUrl = `http://127.0.0.1:${port}`;
  const child = startApi(port, vaultPath);
  t.after(() => child.kill());
  await waitForHealth(baseUrl);
  let pending;
  const response = new Promise((resolve, reject) => {
    pending = http.request(`${baseUrl}/api/v1/notes`, { method: "POST", headers: { "Content-Type": "application/json" } }, res => {
      let data = "";
      res.on("data", chunk => { data += chunk; });
      res.on("end", () => resolve({ status: res.statusCode, json: JSON.parse(data) }));
    });
    pending.on("error", reject);
    pending.write('{"directoryId":');
  });
  t.after(() => pending.destroy());
  await new Promise(resolve => setTimeout(resolve, 150));
  assert.equal((await postJson(baseUrl, "/api/v1/vault", { vaultPath: otherVault })).status, 200);
  const id = "87654321-1234-4234-8234-123456789abc";
  pending.end(`"dir_original_default","clientCreationId":"${id}","body":"SHOULD-NOT-BE-CREATED"}`);
  const denied = await response;
  assert.equal(denied.status, 409);
  assert.equal(denied.json.error.code, "VAULT_CHANGED");
  assert.equal((await getJson(baseUrl, `/api/v1/notes/note_${id}`)).status, 404);
  await postJson(baseUrl, "/api/v1/vault", { vaultPath });
  assert.equal((await getJson(baseUrl, `/api/v1/notes/note_${id}`)).status, 404);
});

test("writing project form sync rejects incomplete and stale Vault requests and preserves article-only structure", async t => {
  const originalVault = await makeTempDir("yansilu-form-sync-old-"), targetVault = await makeTempDir("yansilu-form-sync-target-");
  const port = await findFreePort(), baseUrl = `http://127.0.0.1:${port}`, child = startApi(port, originalVault);
  t.after(() => child.kill());
  await waitForHealth(baseUrl);
  await postJson(baseUrl, "/api/v1/vault", { vaultPath: targetVault });
  const note = (await postJson(baseUrl, "/api/v1/notes", { directoryId: "dir_original_default", body: "# Form evidence\n\nPreserve this source." })).json.item;
  const project = (await postJson(baseUrl, "/api/v1/writing-projects", { title: "Original title", goal: "Original question", basketNoteIds: [note.id], bookStructure: { schema_version: 1, parts: [] } })).json.item;
  const before = await fs.readFile(path.join(targetVault, note.markdownPath), "utf8");
  await postJson(baseUrl, "/api/v1/vault", { vaultPath: originalVault });
  const route = `/api/v1/writing-projects/${project.id}`;
  let pending;
  const result = new Promise((resolve, reject) => {
    pending = http.request(`${baseUrl}${route}`, { method: "PATCH", headers: { "Content-Type": "application/json" } }, res => {
      let text = ""; res.on("data", chunk => { text += chunk; });
      res.on("end", () => resolve({ status: res.statusCode, json: JSON.parse(text) }));
    });
    pending.on("error", reject); pending.write("{");
  });
  t.after(() => pending.destroy());
  await new Promise(resolve => setTimeout(resolve, 150));
  await postJson(baseUrl, "/api/v1/vault", { vaultPath: targetVault });
  pending.end(JSON.stringify({ title: "Wrong cross-Vault title", expectedVaultPath: targetVault }).slice(1));
  const denied = await result;
  assert.equal(denied.status, 409);
  assert.equal(denied.json.error.code, "VAULT_CHANGED");
  assert.equal((await getJson(baseUrl, route)).json.item.title, "Original title");
  assert.equal((await patchJson(baseUrl, route, { title: "Stale title", expectedVaultPath: originalVault })).status, 409);
  const saved = await patchJson(baseUrl, route, { title: "Latest title", goal: "Latest question", audience: "", tone: "", expectedVaultPath: targetVault });
  assert.equal(saved.status, 200, JSON.stringify(saved.json));
  assert.equal(saved.json.item.title, "Latest title");
  assert.equal(saved.json.item.goal, "Latest question");
  assert.deepEqual(saved.json.item.book_structure.parts, [], "Editing an article topic must not silently create book chapters");
  assert.equal(await fs.readFile(path.join(targetVault, note.markdownPath), "utf8"), before);
});

test("writing project creation rejects incomplete and stale requests across a Vault switch", async t => {
  const vaultPath = await makeTempDir("yansilu-project-create-old-");
  const otherVault = await makeTempDir("yansilu-project-create-new-");
  const baseUrl = `http://127.0.0.1:${await findFreePort()}`;
  const child = startApi(Number(new URL(baseUrl).port), vaultPath);
  t.after(() => child.kill());
  await waitForHealth(baseUrl);
  let pending;
  const response = new Promise((resolve, reject) => {
    pending = http.request(`${baseUrl}/api/v1/writing-projects`, { method: "POST", headers: { "Content-Type": "application/json" } }, res => {
      let text = "";
      res.on("data", chunk => { text += chunk; });
      res.on("end", () => resolve({ status: res.statusCode, json: JSON.parse(text) }));
    });
    pending.on("error", reject); pending.write("{");
  });
  t.after(() => pending.destroy());
  await new Promise(resolve => setTimeout(resolve, 150));
  assert.equal((await postJson(baseUrl, "/api/v1/vault", { vaultPath: otherVault })).status, 200);
  const note = (await postJson(baseUrl, "/api/v1/notes", { directoryId: "dir_original_default", body: "# Original material\n\nUNCHANGED" })).json.item;
  const sourceFile = path.join(otherVault, note.markdownPath);
  const original = await fs.readFile(sourceFile, "utf8");
  const payload = { title: "Must not cross Vaults", basketNoteIds: [note.id] };
  pending.end(JSON.stringify(payload).slice(1));
  const denied = await response;
  assert.equal(denied.status, 409);
  assert.equal(denied.json.error.code, "VAULT_CHANGED");
  const stale = await postJson(baseUrl, "/api/v1/writing-projects", { ...payload, expectedVaultPath: vaultPath });
  assert.equal(stale.status, 409);
  assert.equal((await getJson(baseUrl, "/api/v1/writing-projects?limit=50")).json.items.length, 0);
  const retried = await postJson(baseUrl, "/api/v1/writing-projects", { ...payload, expectedVaultPath: otherVault });
  assert.equal(retried.status, 201, JSON.stringify(retried.json));
  assert.equal((await getJson(baseUrl, "/api/v1/writing-projects?limit=50")).json.items.length, 1);
  assert.equal(await fs.readFile(sourceFile, "utf8"), original);
  await postJson(baseUrl, "/api/v1/vault", { vaultPath });
  assert.equal((await getJson(baseUrl, "/api/v1/writing-projects?limit=50")).json.items.length, 0);
});

for (const [method, suffix] of [["PATCH", "book-structure"], ["POST", "draft-note"], ["POST", "scaffolds"]]) {
  test(`writing ${suffix} rejects an incomplete request across a vault switch`, async t => {
    const vaultPath = await makeTempDir("yansilu-writing-scope-old-");
    const otherVault = await makeTempDir("yansilu-writing-scope-new-");
    const port = await findFreePort();
    const baseUrl = `http://127.0.0.1:${port}`;
    const child = startApi(port, vaultPath);
    t.after(() => child.kill());
    await waitForHealth(baseUrl);
    assert.equal((await postJson(baseUrl, "/api/v1/vault", { vaultPath: otherVault })).status, 200);
    const note = (await postJson(baseUrl, "/api/v1/notes", { directoryId: "dir_original_default", body: "# Target draft\n\nUNCHANGED" })).json.item;
    const projectResponse = await postJson(baseUrl, "/api/v1/writing-projects", { title: "Target project", basketNoteIds: [note.id] });
    assert.equal(projectResponse.status, 201, JSON.stringify(projectResponse.json));
    const project = projectResponse.json.item;
    const projectRoute = `/api/v1/writing-projects/${project.id}`;
    const actionRoute = suffix === "scaffolds" ? "/api/v1/draft-scaffolds" : `${projectRoute}/${suffix}`;
    const payload = suffix === "scaffolds" ? { writingProjectId: project.id }
      : suffix === "draft-note" ? { draftNoteId: note.id }
      : { bookStructure: { parts: [{ id: "late", title: "DO NOT WRITE", chapters: [] }] } };
    const file = path.join(otherVault, note.markdownPath);
    const originalFile = await fs.readFile(file, "utf8");
    await postJson(baseUrl, "/api/v1/vault", { vaultPath });
    let pending;
    const response = new Promise((resolve, reject) => {
      pending = http.request(`${baseUrl}${actionRoute}`, { method, headers: { "Content-Type": "application/json" } }, res => {
        let text = "";
        res.on("data", chunk => { text += chunk; });
        res.on("end", () => resolve({ status: res.statusCode, json: JSON.parse(text) }));
      });
      pending.on("error", reject);
      pending.write("{");
    });
    t.after(() => pending.destroy());
    await new Promise(resolve => setTimeout(resolve, 150));
    assert.equal((await postJson(baseUrl, "/api/v1/vault", { vaultPath: otherVault })).status, 200);
    pending.end(JSON.stringify(payload).slice(1));
    const denied = await response;
    assert.equal(denied.status, 409);
    assert.equal(denied.json.error.code, "VAULT_CHANGED");
    const stale = await fetch(`${baseUrl}${actionRoute}`, { method, headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...payload, expectedVaultPath: vaultPath }) });
    assert.equal(stale.status, 409);
    assert.equal((await stale.json()).error.code, "VAULT_CHANGED");
    assert.deepEqual((await getJson(baseUrl, projectRoute)).json.item, project);
    assert.equal(await fs.readFile(file, "utf8"), originalFile);
    if (suffix === "scaffolds") {
      assert.equal((await getJson(baseUrl, `${projectRoute}/scaffolds?limit=50`)).json.items.length, 0);
      const retried = await postJson(baseUrl, actionRoute, { ...payload, expectedVaultPath: otherVault });
      assert.equal(retried.status, 201, JSON.stringify(retried.json));
      assert.equal((await getJson(baseUrl, `${projectRoute}/scaffolds?limit=50`)).json.items.length, 1);
      assert.equal(await fs.readFile(file, "utf8"), originalFile);
    }
  });
}

test("outline autosave rejects an incomplete request and stale Vault context without touching another outline", async t => {
  const vaultPath = await makeTempDir("yansilu-outline-scope-old-");
  const otherVault = await makeTempDir("yansilu-outline-scope-new-");
  const port = await findFreePort();
  const baseUrl = `http://127.0.0.1:${port}`;
  const child = startApi(port, vaultPath);
  t.after(() => child.kill());
  await waitForHealth(baseUrl);
  assert.equal((await postJson(baseUrl, "/api/v1/vault", { vaultPath: otherVault })).status, 200);
  const note = (await postJson(baseUrl, "/api/v1/notes", { directoryId: "dir_original_default", body: "# Preserved evidence\n\nUNCHANGED" })).json.item;
  const project = (await postJson(baseUrl, "/api/v1/writing-projects", { title: "Preserved project", goal: "Preserve real evidence.", basketNoteIds: [note.id] })).json.item;
  const created = await postJson(baseUrl, "/api/v1/draft-scaffolds", { writingProjectId: project.id });
  assert.equal(created.status, 201, JSON.stringify(created.json));
  const route = `/api/v1/draft-scaffolds/${created.json.item.id}`;
  const original = (await getJson(baseUrl, route)).json.item;
  const originalFile = await fs.readFile(path.join(otherVault, note.markdownPath), "utf8");
  await postJson(baseUrl, "/api/v1/vault", { vaultPath });
  let pending;
  const response = new Promise((resolve, reject) => {
    pending = http.request(`${baseUrl}${route}`, { method: "PATCH", headers: { "Content-Type": "application/json" } }, res => {
      let text = "";
      res.on("data", chunk => { text += chunk; });
      res.on("end", () => resolve({ status: res.statusCode, json: JSON.parse(text) }));
    });
    pending.on("error", reject);
    pending.write("{");
  });
  t.after(() => pending.destroy());
  await new Promise(resolve => setTimeout(resolve, 150));
  assert.equal((await postJson(baseUrl, "/api/v1/vault", { vaultPath: otherVault })).status, 200);
  const payload = { sections: [{ heading: "DO NOT OVERWRITE", purpose: "Wrong context", evidence_note_ids: [note.id] }], openQuestions: [] };
  pending.end(JSON.stringify(payload).slice(1));
  const denied = await response;
  assert.equal(denied.status, 409);
  assert.equal(denied.json.error.code, "VAULT_CHANGED");
  const stale = await patchJson(baseUrl, route, { ...payload, expectedVaultPath: vaultPath });
  assert.equal(stale.status, 409);
  assert.equal(stale.json.error.code, "VAULT_CHANGED");
  assert.deepEqual((await getJson(baseUrl, route)).json.item, original);
  assert.equal(await fs.readFile(path.join(otherVault, note.markdownPath), "utf8"), originalFile);
  const saved = await patchJson(baseUrl, route, { ...payload, sections: original.sections, expectedVaultPath: otherVault });
  assert.equal(saved.status, 200, JSON.stringify(saved.json));
  assert.deepEqual(saved.json.item.sections.map(section => section.evidence_note_ids), original.sections.map(section => section.evidence_note_ids));
  const baseline = { sections: saved.json.item.sections, openQuestions: saved.json.item.open_questions };
  const changed = await patchJson(baseUrl, route, { sections: [{ ...saved.json.item.sections[0], heading: "External edit" }], openQuestions: [] });
  assert.equal(changed.status, 200);
  const conflict = await patchJson(baseUrl, route, { sections: baseline.sections, openQuestions: baseline.openQuestions, expectedOutline: baseline });
  assert.equal(conflict.status, 409);
  assert.equal(conflict.json.error.code, "WRITING_OUTLINE_CONFLICT");
  assert.deepEqual((await getJson(baseUrl, route)).json.item, changed.json.item);
});

test("lost save response is recovered from its operation receipt without rewriting", async t => {
  const vaultPath = await makeTempDir("yansilu-api-save-readback-");
  const port = await findFreePort();
  const baseUrl = `http://127.0.0.1:${port}`;
  const child = startApi(port, vaultPath);
  t.after(() => child.kill());
  await waitForHealth(baseUrl);
  const created = (await postJson(baseUrl, "/api/v1/notes", { directoryId: "dir_original_default", body: "# Readback\n\nBASE" })).json.item;
  let writes = 0;
  const route = `/api/v1/notes/${created.id}`;
  const payload = { expectedBody: created.body, expectedRevision: created.fileRevision, body: "# Readback\n\nSAVED-WITH-LOST-RESPONSE" };
  const saved = await saveNoteWithReadback({ noteId: created.id, payload, operationId: "readback-operation-1",
    write: async body => {
      writes++;
      const response = await fetch(`${baseUrl}${route}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      assert.equal(response.status, 200);
      await response.json();
      throw Object.assign(new Error("response lost"), { code: "request_timeout" });
    },
    check: async id => (await getJson(baseUrl, `${route}/save-status?operationId=${id}`)).json.item
  });
  assert.equal(writes, 1);
  assert.match(saved.body, /SAVED-WITH-LOST-RESPONSE/);
  assert.equal(saved.fileRevision, (await getJson(baseUrl, route)).json.item.fileRevision);
  const file = path.join(vaultPath, saved.markdownPath);
  await fs.writeFile(file, (await fs.readFile(file, "utf8")).replace("SAVED-WITH-LOST-RESPONSE", "EXTERNAL-AFTER-SAVE"), "utf8");
  assert.equal((await getJson(baseUrl, `${route}/save-status?operationId=readback-operation-1`)).json.item.state, "changed");
});

test("fresh editor recovery after API restart reads the original save without overwriting newer input", async t => {
  const vaultPath = await makeTempDir("yansilu-api-editor-refresh-");
  const port = await findFreePort();
  const baseUrl = `http://127.0.0.1:${port}`;
  let child = startApi(port, vaultPath);
  const stop = async () => {
    if (child.exitCode !== null || child.signalCode !== null) return;
    const exited = new Promise(resolve => child.once("exit", resolve));
    child.kill(); await exited;
  };
  t.after(stop);
  await waitForHealth(baseUrl);
  const created = (await postJson(baseUrl, "/api/v1/notes", { directoryId: "dir_original_default", body: "# Editor\n\nBASE" })).json.item;
  const route = `/api/v1/notes/${created.id}`;
  const records = new Map();
  const storage = { getItem: key => records.get(key) ?? null, setItem: (key, value) => records.set(key, value), removeItem: key => records.delete(key) };
  let writes = 0, blocked = true;
  const deps = { getVaultPath: () => vaultPath, getStorage: () => storage, createSaveOperationId: () => "editor-refresh-operation-1",
    updateNote: async (_id, payload, options) => {
      writes++;
      const response = await fetch(`${baseUrl}${route}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...payload, operationId: options.operationId }) });
      assert.equal(response.status, 200);
      await response.json();
      throw Object.assign(new Error("response lost"), { code: "NOTE_SAVE_RESULT_UNCERTAIN" });
    },
    checkNoteSave: async (_id, op, options) => {
      if (blocked) throw new Error("read blocked");
      return (await getJson(baseUrl, `${route}/save-status?${new URLSearchParams({ operationId: op, expectedVaultPath: options.expectedVaultPath })}`)).json.item;
    }
  };
  await assert.rejects(saveEditorNoteWithRecovery(deps, created.id, { body: "# Editor\n\nSUBMITTED", expectedBody: created.body, expectedRevision: created.fileRevision }), { code: "NOTE_SAVE_RESULT_UNCERTAIN" });
  const saved = (await getJson(baseUrl, route)).json.item;
  const file = path.join(vaultPath, saved.markdownPath);
  const bytes = await fs.readFile(file), modified = (await fs.stat(file)).mtimeMs;
  await stop(); child = startApi(port, vaultPath); await waitForHealth(baseUrl);
  blocked = false;
  const recovered = await saveEditorNoteWithRecovery({ ...deps }, created.id, { body: "# Editor\n\nNEWER INPUT", expectedBody: created.body });
  assert.match(recovered.body, /SUBMITTED/);
  assert.equal(recovered.recoveredSave, true);
  assert.equal(writes, 1);
  assert.equal(records.size, 0);
  assert.deepEqual(await fs.readFile(file), bytes);
  assert.equal((await fs.stat(file)).mtimeMs, modified);
  const wrongVault = path.join(vaultPath, "another-vault");
  const denied = await fetch(`${baseUrl}${route}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ body: "WRONG VAULT", expectedVaultPath: wrongVault }) });
  assert.equal(denied.status, 409);
  assert.equal((await denied.json()).error.code, "NOTE_SAVE_VAULT_CHANGED");
  assert.equal((await getJson(baseUrl, `${route}/save-status?${new URLSearchParams({ operationId: "editor-refresh-operation-1", expectedVaultPath: wrongVault })}`)).status, 409);
  assert.deepEqual(await fs.readFile(file), bytes);
});

test("save receipt survives an actual API restart without permitting replay", async t => {
  const vaultPath = await makeTempDir("yansilu-api-save-restart-");
  const port = await findFreePort();
  const baseUrl = `http://127.0.0.1:${port}`;
  let child = startApi(port, vaultPath);
  const stop = async () => {
    if (child.exitCode !== null || child.signalCode !== null) return;
    const exited = new Promise(resolve => child.once("exit", resolve));
    child.kill();
    await exited;
  };
  t.after(stop);
  await waitForHealth(baseUrl);
  const created = (await postJson(baseUrl, "/api/v1/notes", { directoryId: "dir_original_default", body: "# Restart\n\nBASE" })).json.item;
  const route = `/api/v1/notes/${created.id}`;
  const payload = { operationId: "restart-save-operation-1", expectedBody: created.body,
    expectedRevision: created.fileRevision, body: "# Restart\n\nCONFIRMED" };
  const put = () => fetch(`${baseUrl}${route}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
  const savedResponse = await put();
  assert.equal(savedResponse.status, 200);
  const saved = (await savedResponse.json()).item;
  const filename = path.join(vaultPath, saved.markdownPath);
  const before = await fs.readFile(filename);
  await stop();
  child = startApi(port, vaultPath);
  await waitForHealth(baseUrl);
  const receipt = await getJson(baseUrl, `${route}/save-status?operationId=${payload.operationId}`);
  assert.equal(receipt.status, 200);
  assert.equal(receipt.json.item.state, "completed");
  assert.equal(receipt.json.item.note.fileRevision, saved.fileRevision);
  const replay = await put();
  assert.equal((await replay.json()).error.code, "NOTE_SAVE_OPERATION_REUSED");
  assert.deepEqual(await fs.readFile(filename), before);
  await fs.writeFile(filename, before.toString("utf8").replace("CONFIRMED", "EXTERNAL"), "utf8");
  assert.equal((await getJson(baseUrl, `${route}/save-status?operationId=${payload.operationId}`)).json.item.state, "changed");
});

test("note save API preserves newer disk text when a stale client supplies its baseline", async t => {
  const vaultPath = await makeTempDir("yansilu-api-save-conflict-");
  const port = await findFreePort();
  const baseUrl = `http://127.0.0.1:${port}`;
  const child = startApi(port, vaultPath);
  t.after(() => child.kill());
  await waitForHealth(baseUrl);
  const created = await postJson(baseUrl, "/api/v1/notes", { directoryId: "dir_original_default", body: "# Conflict\n\nBASE" });
  assert.equal(created.status, 201);
  const note = created.json.item;
  const save = async body => {
    const response = await fetch(`${baseUrl}/api/v1/notes/${note.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    return { status: response.status, json: await response.json() };
  };
  assert.equal((await save({ expectedBody: note.body, body: "# Conflict\n\nNEWER" })).status, 200);
  const filename = path.join(vaultPath, note.markdownPath);
  const disk = await fs.readFile(filename, "utf8");
  const rejected = await save({ expectedBody: note.body, body: "# Conflict\n\nSTALE" });
  assert.notEqual(rejected.status, 200);
  assert.match(JSON.stringify(rejected.json), /NOTE_SAVE_CONFLICT/);
  assert.equal(await fs.readFile(filename, "utf8"), disk);
  const current = (await getJson(baseUrl, `/api/v1/notes/${note.id}`)).json.item;
  assert.match(current.fileRevision, /^[a-f0-9]{64}$/);
  const metadataEdit = disk.replace("status: draft", "status: active");
  assert.notEqual(metadataEdit, disk);
  await fs.writeFile(filename, metadataEdit, "utf8");
  const metadataRejected = await save({ expectedBody: current.body, expectedRevision: current.fileRevision, body: current.body, status: "draft" });
  assert.notEqual(metadataRejected.status, 200);
  assert.match(JSON.stringify(metadataRejected.json), /NOTE_SAVE_CONFLICT/);
  assert.equal(await fs.readFile(filename, "utf8"), metadataEdit);
});

test("an incomplete save request cannot write into a vault switched while its body is read", async t => {
  const vaultPath = await makeTempDir("yansilu-api-save-scope-");
  const otherVault = await makeTempDir("yansilu-api-save-other-");
  const port = await findFreePort();
  const baseUrl = `http://127.0.0.1:${port}`;
  const child = startApi(port, vaultPath);
  t.after(() => child.kill());
  await waitForHealth(baseUrl);
  const create = () => postJson(baseUrl, "/api/v1/notes", { id: "shared-note", directoryId: "dir_original_default", body: "# Scope\n\nUNCHANGED" });
  const first = await create();
  assert.equal(first.status, 201);
  assert.equal((await postJson(baseUrl, "/api/v1/vault", { vaultPath: otherVault })).status, 200);
  const second = await create();
  assert.equal(second.status, 201);
  assert.equal((await postJson(baseUrl, "/api/v1/vault", { vaultPath })).status, 200);
  const files = [path.join(vaultPath, first.json.item.markdownPath), path.join(otherVault, second.json.item.markdownPath)];
  const before = [];
  for (const file of files) before.push(await fs.readFile(file, "utf8"));
  let pending;
  const response = new Promise((resolve, reject) => {
    pending = http.request(`${baseUrl}/api/v1/notes/${first.json.item.id}`, { method: "PUT", headers: { "Content-Type": "application/json" } }, res => {
      let data = "";
      res.on("data", chunk => { data += chunk; });
      res.on("end", () => resolve({ status: res.statusCode, json: JSON.parse(data) }));
    });
    pending.on("error", reject);
    pending.write('{"body":');
  });
  t.after(() => pending.destroy());
  await new Promise(resolve => setTimeout(resolve, 150));
  assert.equal((await postJson(baseUrl, "/api/v1/vault", { vaultPath: otherVault })).status, 200);
  pending.end('"SHOULD-NOT-BE-WRITTEN"}');
  const denied = await response;
  assert.equal(denied.status, 409);
  assert.match(JSON.stringify(denied.json), /NOTE_SAVE_VAULT_CHANGED/);
  for (let index = 0; index < files.length; index++) assert.equal(await fs.readFile(files[index], "utf8"), before[index]);
});

test("book chapters preserve separate Markdown drafts through legacy updates, reorder and project sync", async (t) => {
  const vaultPath = await makeTempDir("yansilu-api-book-chapters-");
  const port = await findFreePort();
  const baseUrl = `http://127.0.0.1:${port}`;
  const child = startApi(port, vaultPath);
  t.after(() => child.kill());
  await waitForHealth(baseUrl);

  const sources = [];
  const drafts = [];
  const draftFiles = [];
  for (let index = 1; index <= 3; index += 1) {
    const source = await postJson(baseUrl, "/api/v1/notes", {
      directoryId: "dir_original_default", body: `# Source ${index}\n\nEvidence ${index}.`
    });
    assert.equal(source.status, 201, JSON.stringify(source.json));
    sources.push(source.json.item.id);
    const draft = await postJson(baseUrl, "/api/v1/notes", {
      directoryId: "dir_original_default", body: `# Chapter ${index}\n\nUNIQUE-CHAPTER-${index}\n\n[[Source ${index}]]`
    });
    assert.equal(draft.status, 201, JSON.stringify(draft.json));
    drafts.push(draft.json.item.id);
    const filename = path.join(vaultPath, draft.json.item.markdownPath);
    draftFiles.push({ filename, content: await fs.readFile(filename, "utf8") });
  }

  const legacyStructure = { schema_version: 1, parts: [{ id: "part_main", chapters: sources.map((id, index) => ({
    id: `chapter_${index + 1}`, title: `Chapter ${index + 1}`, evidence_note_ids: [id]
  })) }] };
  const article = await postJson(baseUrl, "/api/v1/writing-projects", {
    title: "Article with an explicitly empty chapter directory", basketNoteIds: sources,
    bookStructure: { schema_version: 1, parts: [] }
  });
  assert.equal(article.status, 201, JSON.stringify(article.json));
  assert.deepEqual(article.json.item.book_structure.parts, []);
  assert.deepEqual((await getJson(baseUrl, `/api/v1/writing-projects/${article.json.item.id}`)).json.item.book_structure.parts, []);
  const created = await postJson(baseUrl, "/api/v1/writing-projects", {
    title: "A three-chapter book", basketNoteIds: sources, bookStructure: legacyStructure
  });
  assert.equal(created.status, 201, JSON.stringify(created.json));
  assert.equal(created.json.item.book_structure.schema_version, 1);
  assert.ok(created.json.item.book_structure.parts[0].chapters.every((chapter) => !Object.hasOwn(chapter, "draft_note_id")));
  const projectPath = `/api/v1/writing-projects/${created.json.item.id}`;
  const structurePath = `${projectPath}/book-structure`;
  const bookStructure = structuredClone(created.json.item.book_structure);
  bookStructure.parts[0].chapters.forEach((chapter, index) => { chapter.draft_note_id = drafts[index]; });
  const saved = await patchJson(baseUrl, structurePath, { bookStructure });
  assert.equal(saved.status, 200, JSON.stringify(saved.json));
  assert.deepEqual(saved.json.item.book_structure.parts[0].chapters.map((chapter) => chapter.draft_note_id), drafts);
  assert.equal(saved.json.item.draft_note_id, null, "chapter bindings do not replace the article draft");

  const oldClientStructure = structuredClone(legacyStructure);
  oldClientStructure.parts[0].chapters.reverse();
  oldClientStructure.parts[0].chapters[0].title = "Reordered third chapter";
  const reordered = await patchJson(baseUrl, structurePath, { bookStructure: oldClientStructure });
  assert.equal(reordered.status, 200, JSON.stringify(reordered.json));
  assert.deepEqual(reordered.json.item.book_structure.parts[0].chapters.map((chapter) => chapter.draft_note_id), [...drafts].reverse());
  const synced = await syncWritingProject(vaultPath, created.json.item.id, { basketNoteIds: [...sources].reverse() });
  assert.deepEqual(synced.book_structure.parts, reordered.json.item.book_structure.parts);
  const reopened = await getJson(baseUrl, projectPath);
  assert.equal(reopened.status, 200, JSON.stringify(reopened.json));
  assert.deepEqual(reopened.json.item.book_structure.parts, synced.book_structure.parts);

  const regenerate = await patchJson(baseUrl, structurePath, { regenerate: true });
  assert.equal(regenerate.status, 400);
  assert.match(regenerate.json.error.message, /saved chapter drafts/);
  const duplicate = structuredClone(reopened.json.item.book_structure);
  duplicate.parts[0].chapters[1].draft_note_id = drafts[2];
  const duplicateResult = await patchJson(baseUrl, structurePath, { bookStructure: duplicate });
  assert.equal(duplicateResult.status, 400);
  assert.match(duplicateResult.json.error.message, /separate draft notes/);
  const duplicateChapter = structuredClone(reopened.json.item.book_structure);
  duplicateChapter.parts[0].chapters[1].id = duplicateChapter.parts[0].chapters[0].id;
  assert.equal((await patchJson(baseUrl, structurePath, { bookStructure: duplicateChapter })).status, 400);
  const missing = structuredClone(reopened.json.item.book_structure);
  missing.parts[0].chapters[0].draft_note_id = "pn_missing";
  assert.equal((await patchJson(baseUrl, structurePath, { bookStructure: missing })).status, 400);
  assert.equal((await postJson(baseUrl, "/api/v1/writing-projects", {
    title: "Invalid chapter binding", basketNoteIds: sources, bookStructure: missing
  })).status, 400);
  const literature = await postJson(baseUrl, "/api/v1/notes", {
    directoryId: "dir_literature_default", body: "# A source, not chapter prose\n\nOriginal reading material."
  });
  assert.equal(literature.status, 201, JSON.stringify(literature.json));
  const wrongType = structuredClone(reopened.json.item.book_structure);
  wrongType.parts[0].chapters[0].draft_note_id = literature.json.item.id;
  const wrongTypeResult = await patchJson(baseUrl, structurePath, { bookStructure: wrongType });
  assert.equal(wrongTypeResult.status, 400);
  assert.match(wrongTypeResult.json.error.message, /draft must be a permanent note/);
  await assert.rejects(syncWritingProject(vaultPath, created.json.item.id, { bookStructure: missing }));
  assert.deepEqual((await getJson(baseUrl, projectPath)).json.item.book_structure.parts, reopened.json.item.book_structure.parts);

  const detached = structuredClone(reopened.json.item.book_structure);
  detached.parts[0].chapters[0].draft_note_id = null;
  const detachment = await patchJson(baseUrl, projectPath, { bookStructure: detached });
  assert.equal(detachment.status, 200, JSON.stringify(detachment.json));
  assert.equal(Object.hasOwn(detachment.json.item.book_structure.parts[0].chapters[0], "draft_note_id"), false);
  const removed = structuredClone(detachment.json.item.book_structure);
  removed.parts[0].chapters.splice(1, 1);
  assert.equal((await patchJson(baseUrl, structurePath, { bookStructure: removed })).status, 200);
  for (const { filename, content } of draftFiles) assert.equal(await fs.readFile(filename, "utf8"), content);
});

test("writing AI analysis API requires confirmation and stores review-only remote artifacts", async (t) => {
  const vaultPath = await makeTempDir("yansilu-api-writing-ai-vault-");
  const port = await findFreePort();
  const baseUrl = `http://127.0.0.1:${port}`;
  const child = startApi(port, vaultPath);

  t.after(() => child.kill());
  await waitForHealth(baseUrl);

  const note = await postJson(baseUrl, "/api/v1/notes", {
    directoryId: "dir_original_default",
    status: "active",
    body: "# AI review boundary\n\nAI writing support should expose source note ids and remain reviewable."
  });
  assert.equal(note.status, 201);

  const rejected = await postJson(baseUrl, "/api/v1/writing/ai-analysis", {
    writingGoal: "Prepare a source-grounded outline.",
    noteIds: [note.json.item.id]
  });
  assert.equal(rejected.status, 403);
  assert.equal(rejected.json.error.code, "WRITING_REMOTE_MODEL_CONFIRMATION_REQUIRED");

  const prepared = await postJson(baseUrl, "/api/v1/writing/ai-analysis", {
    userConfirmedRemoteModel: true,
    writingGoal: "Prepare a source-grounded outline.",
    currentOutline: { title: "Edited article", sections: [{ heading: "Actual edited heading", purpose: "Actual edited point", sourceNoteIds: [note.json.item.id] }], openQuestions: ["Need an example"] },
    noteIds: [note.json.item.id],
    model: "gpt-strong",
    persistArtifacts: false
  });
  assert.equal(prepared.status, 200, JSON.stringify(prepared.json));
  assert.equal(prepared.json.item.request.requestType, "writing_strong_model_analysis");
  assert.equal(prepared.json.item.request.privacy.mode, "remote_after_confirmation");
  assert.equal(prepared.json.item.request.privacy.cloudModelAllowed, true);
  assert.equal(prepared.json.item.request.privacy.cloudModelUsed, false);
  assert.equal(prepared.json.item.request.canAutoConfirm, false);
  assert.equal(prepared.json.item.result, null);

  const merged = await postJson(baseUrl, "/api/v1/writing/ai-analysis", {
    userConfirmedRemoteModel: true,
    writingGoal: "Prepare a source-grounded outline.",
    noteIds: [note.json.item.id],
    remoteModelResponse: {
      writingMoves: [
        {
          moveType: "claim",
          text: "Open by separating AI support from user judgment.",
          sourceNoteIds: [note.json.item.id],
          suggestedLocation: "opening",
          whyItMatters: "It makes authorship boundaries explicit."
        }
      ],
      outlineDrafts: [
        {
          title: "Review-first outline",
          sections: ["Problem", "Boundary", "Workflow"],
          sourceNoteIds: [note.json.item.id],
          gaps: ["Need one accepted example."]
        }
      ],
      sourceGaps: [
        {
          gap: "example_missing",
          claim: "Review queues prevent accidental adoption.",
          requiredSourceType: "note",
          relatedNoteIds: [note.json.item.id]
        }
      ]
    },
    persistArtifacts: false
  });
  assert.equal(merged.status, 200, JSON.stringify(merged.json));
  assert.equal(merged.json.item.result.analysisMode, "remote_strong_model_writing");
  assert.equal(merged.json.item.result.provenance.cloudModelUsed, true);
  assert.equal(merged.json.item.result.summary.canAutoConfirm, false);
  assert.equal(merged.json.item.result.artifactsPersisted, false);
  assert.deepEqual(merged.json.item.result.artifacts.map((item) => item.type), ["WritingMove", "OutlineDraft", "SourceGap"]);
  assert.ok(merged.json.item.result.artifacts.every((item) => item.status === "pending_review"));
  assert.ok(merged.json.item.result.artifacts.every((item) => item.origin === "ai_generated"));

  const remoteProvider = await startJsonProvider({
    writingMoves: [
      {
        moveType: "counterpoint",
        text: "Add a caveat that review queues still require user attention.",
        sourceNoteIds: [note.json.item.id],
        suggestedLocation: "middle",
        whyItMatters: "It keeps the workflow honest."
      }
    ],
    outlineDrafts: [
      {
        title: "Executed review outline",
        sections: ["Boundary", "Execution", "Review"],
        sourceNoteIds: [note.json.item.id],
        gaps: ["Need one manual adoption example."]
      }
    ],
    sourceGaps: [
      {
        gap: "manual_adoption_example",
        claim: "Review-first AI works better with explicit adoption examples.",
        requiredSourceType: "note",
        relatedNoteIds: [note.json.item.id]
      }
    ]
  });
  t.after(() => remoteProvider.server.close());

  const executed = await postJson(baseUrl, "/api/v1/writing/ai-analysis", {
    userConfirmedRemoteModel: true,
    executeRemoteModel: true,
    providerPreset: "local_private_gateway",
    modelPack: "Privacy First",
    authMode: "local_no_key",
    endpointUrl: `${remoteProvider.baseUrl}/v1/chat/completions`,
    runtimeModelMap: {
      "local_private_gateway:strong_reasoning": "local-strong-model"
    },
    writingGoal: "Prepare a source-grounded outline.",
    noteIds: [note.json.item.id],
    model: "local-strong-model",
    persistArtifacts: false
  });
  assert.equal(executed.status, 200, JSON.stringify(executed.json));
  assert.equal(executed.json.item.modelExecution.status, "succeeded");
  assert.equal(executed.json.item.modelExecution.providerId, "local_private_gateway");
  assert.equal(executed.json.item.result.analysisMode, "remote_strong_model_writing");
  assert.equal(executed.json.item.result.provenance.cloudModelUsed, true);
  assert.deepEqual(executed.json.item.result.artifacts.map((item) => item.type), ["WritingMove", "OutlineDraft", "SourceGap"]);
  assert.ok(executed.json.item.result.artifacts.every((item) => item.status === "pending_review"));
  assert.equal(remoteProvider.requests.length, 1);
  assert.equal(remoteProvider.requests[0].body.model, "local-strong-model");
  const outlineProvider = await startJsonProvider({ checks: [{
    kind: "contradiction", sectionNumbers: [1], problem: "The section removes the review boundary.", action: "Keep review before adoption.",
    sourceNoteIds: [note.json.item.id], evidenceQuote: "AI writing support should expose source note ids and remain reviewable."
  }] });
  t.after(() => outlineProvider.server.close());
  const checked = await postJson(baseUrl, "/api/v1/writing/ai-analysis", {
    privacyMode: "local_only", executeModel: true, providerPreset: "local_private_gateway", authMode: "local_no_key",
    endpointUrl: `${outlineProvider.baseUrl}/v1/chat/completions`, model: "local-strong-model", noteIds: [note.json.item.id],
    writingGoal: "Check the edited outline", persistArtifacts: false,
    currentOutline: { title: "Edited article", sections: [{ heading: "Actual edited heading", purpose: "Actual edited point", sourceNoteIds: [note.json.item.id] }], openQuestions: ["Need an example"] }
  });
  assert.equal(checked.status, 200, JSON.stringify(checked.json));
  assert.equal(checked.json.item.result.summary.outlineDraftCount, 0);
  assert.equal(checked.json.item.result.artifacts[0].status, "pending_review");
  assert.match(checked.json.item.result.artifacts[0].payload.whyItMatters, /依据原文/);
  const providerPayload = JSON.parse(outlineProvider.requests[0].body.messages[1].content);
  assert.equal(providerPayload.task, "writing_outline_check");
  assert.equal(providerPayload.currentOutline.sections[0].heading, "Actual edited heading");
  assert.equal(providerPayload.currentOutline.sections[0].purpose, "Actual edited point");
  assert.deepEqual(providerPayload.currentOutline.sections[0].sourceNoteIds, [note.json.item.id]);

  const sourceDraft = { title: "AI support needs a review boundary", coreArgument: "AI support should preserve the user's decision to accept a claim.",
    content: "Expose source references and review suggestions before adopting them.", questions: "How can review stay lightweight?",
    sourceNoteIds: [note.json.item.id], evidenceQuote: "AI writing support should expose source note ids and remain reviewable." };
  const sourceProvider = await startJsonProvider({ draft: sourceDraft });
  t.after(() => sourceProvider.server.close());
  const sourceInput = { privacyMode: "local_only", analysisFocus: "source_distill", executeModel: true,
    providerPreset: "local_private_gateway", authMode: "local_no_key", endpointUrl: `${sourceProvider.baseUrl}/v1/chat/completions`,
    model: "local-strong-model", noteIds: [note.json.item.id], writingGoal: "Form one editable viewpoint", persistArtifacts: false };
  const distilled = await postJson(baseUrl, "/api/v1/writing/ai-analysis", sourceInput);
  assert.equal(distilled.status, 200, JSON.stringify(distilled.json));
  assert.deepEqual(distilled.json.item.result.sourceDistillDraft, sourceDraft);
  assert.equal(distilled.json.item.result.artifactsPersisted, false);
  assert.deepEqual(distilled.json.item.result.storedArtifactIds, []);
  assert.equal(distilled.json.item.result.provenance.canAutoConfirm, false);
  assert.equal(JSON.parse(sourceProvider.requests[0].body.messages[1].content).task, "source_note_distillation");
  const badDraft = await postJson(baseUrl, "/api/v1/writing/ai-analysis", {
    ...sourceInput, modelResponse: { draft: { ...sourceDraft, evidenceQuote: "An invented quotation" } }
  });
  assert.equal(badDraft.status, 400);
  assert.match(badDraft.json.error.message, /依据不在来源材料/);

  const storedRemoteConfig = await postJson(baseUrl, "/api/v1/ai/provider-configs", {
    providerId: "openai_compatible_gateway",
    authMode: "workspace_managed",
    secretRef: "env:YANSILU_TEST_PROVIDER_KEY",
    endpointUrl: "https://stored-remote-gateway.example.test/v1/chat/completions",
    runtimeModelMap: {
      "openai_compatible_gateway:strong_reasoning": "stored-strong-model"
    }
  });
  assert.equal(storedRemoteConfig.status, 200, JSON.stringify(storedRemoteConfig.json));

  const clearedExecution = await postJson(baseUrl, "/api/v1/writing/ai-analysis", {
    userConfirmedRemoteModel: true,
    executeRemoteModel: true,
    providerPreset: "openai_compatible_gateway",
    modelPack: "Global Optimized",
    authMode: "workspace_managed",
    secretRef: "",
    endpointUrl: "",
    runtimeModelMap: {},
    writingGoal: "This should not reuse stored provider settings.",
    noteIds: [note.json.item.id],
    persistArtifacts: false
  });
  assert.equal(clearedExecution.status, 400, JSON.stringify(clearedExecution.json));
  assert.equal(clearedExecution.json.error.code, "AI_PROVIDER_CONFIG_INVALID");
  assert.equal(remoteProvider.requests.length, 1);

  const disabledLocalConfig = await postJson(baseUrl, "/api/v1/ai/provider-configs", {
    providerId: "local_private_gateway",
    authMode: "local_no_key",
    status: "disabled",
    endpointUrl: "",
    runtimeModelMap: {}
  });
  assert.equal(disabledLocalConfig.status, 200, JSON.stringify(disabledLocalConfig.json));

  const restoredExecution = await postJson(baseUrl, "/api/v1/writing/ai-analysis", {
    userConfirmedRemoteModel: true,
    executeRemoteModel: true,
    providerPreset: "local_private_gateway",
    modelPack: "Privacy First",
    authMode: "local_no_key",
    endpointUrl: `${remoteProvider.baseUrl}/v1/chat/completions`,
    runtimeModelMap: {
      "local_private_gateway:strong_reasoning": "local-restored-model"
    },
    writingGoal: "This should use the refreshed provider draft.",
    noteIds: [note.json.item.id],
    model: "local-restored-model",
    persistArtifacts: false
  });
  assert.equal(restoredExecution.status, 200, JSON.stringify(restoredExecution.json));
  assert.equal(restoredExecution.json.item.modelExecution.status, "succeeded");
  assert.equal(restoredExecution.json.item.modelExecution.providerId, "local_private_gateway");
  assert.equal(remoteProvider.requests.length, 2);
  assert.equal(remoteProvider.requests[1].body.model, "local-restored-model");
});

test("writing APIs create project basket and draft scaffold from permanent notes", async (t) => {
  const vaultPath = await makeTempDir("yansilu-api-writing-vault-");
  const port = await findFreePort();
  const baseUrl = `http://127.0.0.1:${port}`;
  const child = startApi(port, vaultPath);

  t.after(() => child.kill());
  await waitForHealth(baseUrl);

  const noteA = await postJson(baseUrl, "/api/v1/notes", {
    directoryId: "dir_original_default",
    status: "active",
    body: "# Writing from claims\n\nA draft should start from durable original claims.",
    boundaryOrCounterpoint: "This claim weakens when the paragraph cannot point back to a stable note."
  });
  assert.equal(noteA.status, 201);

  const noteB = await postJson(baseUrl, "/api/v1/notes", {
    directoryId: "dir_original_default",
    status: "active",
    body: "# Evidence mapping\n\nEach paragraph should trace back to source notes.",
    boundaryOrCounterpoint: "Evidence mapping is not enough when two similar concepts are still being conflated."
  });
  assert.equal(noteB.status, 201);

  const literature = await postJson(baseUrl, "/api/v1/notes", {
    directoryId: "dir_literature_default",
    body: "# Literature excerpt\n\nThis should not enter the writing basket directly."
  });
  assert.equal(literature.status, 201);

  const invalidIndex = await postJson(baseUrl, "/api/v1/index-cards", {
    directoryId: "dir_original_default",
    indexType: "topic",
    title: "Invalid topic index",
    noteIds: [literature.json.item.id]
  });
  assert.equal(invalidIndex.status, 400);
  assert.equal(invalidIndex.json.error.code, "INDEX_CARD_INVALID");
  assert.match(invalidIndex.json.error.message, /only accept permanent notes/);

  const topicIndex = await postJson(baseUrl, "/api/v1/index-cards", {
    directoryId: "dir_original_default",
    indexType: "topic",
    title: "Writing themes",
    summary: "A reusable topic entry for the current writing direction.",
    thesis: "This topic is about turning notes into compressed writing inputs.",
    threeLineSummary: [
      "The topic centers on turning notes into compressed writing inputs.",
      "It matters because structure is easier when claims are already distilled.",
      "It connects note quality directly to writing quality."
    ],
    centralQuestion: "How can a note system force better compression before drafting begins?",
    items: [
      { noteId: noteA.json.item.id, shortLabel: "claim", rationale: "Sets the main writing stance." },
      { noteId: noteB.json.item.id, shortLabel: "evidence", rationale: "Keeps each paragraph tied to notes." }
    ]
  });
  assert.equal(topicIndex.status, 201, JSON.stringify(topicIndex.json));
  assert.match(topicIndex.json.item.id, /^idx_/);
  assert.equal(topicIndex.json.item.index_type, "topic");
  assert.equal(topicIndex.json.item.thesis, "This topic is about turning notes into compressed writing inputs.");
  assert.deepEqual(topicIndex.json.item.three_line_summary, [
    "The topic centers on turning notes into compressed writing inputs.",
    "It matters because structure is easier when claims are already distilled.",
    "It connects note quality directly to writing quality."
  ]);
  assert.equal(topicIndex.json.item.central_question, "How can a note system force better compression before drafting begins?");
  assert.equal(topicIndex.json.item.thinkingStatus.status, "ready_for_writing");
  assert.equal(topicIndex.json.item.thinkingStatus.label, "可进入写作");
  assert.equal(topicIndex.json.item.note_count, 2);
  assert.deepEqual(topicIndex.json.item.item_note_ids, [noteA.json.item.id, noteB.json.item.id]);

  const listedIndexes = await getJson(baseUrl, "/api/v1/index-cards?directoryId=dir_original_default&indexType=topic&includeDescendants=true&limit=8");
  assert.equal(listedIndexes.status, 200, JSON.stringify(listedIndexes.json));
  assert.equal(listedIndexes.json.items.length, 1);
  assert.equal(listedIndexes.json.items[0].id, topicIndex.json.item.id);
  assert.equal(listedIndexes.json.items[0].thinkingStatus.status, "ready_for_writing");

  const fetchedIndex = await getJson(baseUrl, `/api/v1/index-cards/${encodeURIComponent(topicIndex.json.item.id)}`);
  assert.equal(fetchedIndex.status, 200, JSON.stringify(fetchedIndex.json));
  assert.equal(fetchedIndex.json.item.id, topicIndex.json.item.id);
  assert.equal(fetchedIndex.json.item.thesis, "This topic is about turning notes into compressed writing inputs.");
  assert.equal(fetchedIndex.json.item.central_question, "How can a note system force better compression before drafting begins?");
  assert.equal(fetchedIndex.json.item.thinkingStatus.status, "ready_for_writing");
  assert.equal(fetchedIndex.json.item.items[0].note.noteType, "permanent");

  const noteC = await postJson(baseUrl, "/api/v1/notes", {
    directoryId: "dir_original_default",
    status: "active",
    body: "# Theme tension\n\nA third permanent note adds a missing tension to the theme.",
    boundaryOrCounterpoint: "This only helps once the theme is explicit enough to compare competing claims."
  });
  assert.equal(noteC.status, 201);

  const updatedIndex = await patchJson(baseUrl, `/api/v1/index-cards/${encodeURIComponent(topicIndex.json.item.id)}`, {
    summary: "A reusable topic entry that now includes the missing tension note.",
    centralQuestion: "Which theme question is strong enough to organize the next writing move?",
    items: [
      { noteId: noteA.json.item.id, shortLabel: "claim", rationale: "Sets the main writing stance." },
      { noteId: noteB.json.item.id, shortLabel: "evidence", rationale: "Keeps each paragraph tied to notes." },
      { noteId: noteC.json.item.id, shortLabel: "tension", rationale: "Adds the missing tension that the theme still needs." }
    ]
  });
  assert.equal(updatedIndex.status, 200, JSON.stringify(updatedIndex.json));
  assert.equal(updatedIndex.json.item.central_question, "Which theme question is strong enough to organize the next writing move?");
  assert.equal(updatedIndex.json.item.note_count, 3);
  assert.deepEqual(updatedIndex.json.item.item_note_ids, [noteA.json.item.id, noteB.json.item.id, noteC.json.item.id]);
  assert.equal(updatedIndex.json.item.items[2].note.id, noteC.json.item.id);

  const rejected = await postJson(baseUrl, "/api/v1/writing-projects", {
    title: "Rejected project",
    basketNoteIds: [literature.json.item.id]
  });
  assert.equal(rejected.status, 400);
  assert.equal(rejected.json.error.code, "WRITING_PROJECT_INVALID");
  assert.match(rejected.json.error.message, /only accepts permanent notes/);

  const project = await postJson(baseUrl, "/api/v1/writing-projects", {
    title: "Writing mainline",
    goal: "Turn selected permanent notes into a draft scaffold.",
    audience: "Knowledge workers",
    tone: "clear",
    intent: "Explain why writing should begin from distilled notes rather than blank prompts.",
    desiredReaderTakeaway: "Readers should see thought compression as the bridge between note-taking and writing.",
    basketNoteIds: [noteA.json.item.id, noteB.json.item.id],
    relatedIndexIds: [topicIndex.json.item.id]
  });
  assert.equal(project.status, 201, JSON.stringify(project.json));
  assert.match(project.json.item.id, /^wp_/);
  assert.deepEqual(project.json.item.basket_note_ids, [noteA.json.item.id, noteB.json.item.id]);
  assert.deepEqual(project.json.item.related_index_ids, [topicIndex.json.item.id]);
  assert.equal(project.json.item.intent, "Explain why writing should begin from distilled notes rather than blank prompts.");
  assert.equal(project.json.item.desired_reader_takeaway, "Readers should see thought compression as the bridge between note-taking and writing.");
  assert.equal(project.json.item.thinkingStatus.status, "needs_scaffold");
  assert.equal(project.json.item.basket_notes.length, 2);
  assert.equal(project.json.item.book_structure.schema_version, 1);
  assert.equal(project.json.item.book_structure.parts.length, 3);
  assert.ok(project.json.item.book_structure.parts.every((part) => part.chapters.length > 0));
  assert.ok(project.json.item.book_structure.parts.every((part) => part.chapters.every((chapter) => chapter.sections.length > 0)));
  assert.ok(project.json.item.book_structure.pools.cases.length > 0);
  assert.ok(project.json.item.book_structure.pools.cases.some((item) => item.note_ids.includes(noteA.json.item.id) || item.note_ids.includes(noteB.json.item.id)));
  assert.ok(project.json.item.book_structure.pools.counterarguments.length > 0);
  assert.ok(
    project.json.item.book_structure.pools.counterarguments.some(
      (item) => item.note_ids.includes(noteA.json.item.id) || item.note_ids.includes(noteB.json.item.id)
    )
  );

  const updatedBookStructure = {
    ...project.json.item.book_structure,
    direction_ideas: [
      {
        id: "idea_judgment_training",
        title: "Judgment training book",
        reader: "Knowledge workers",
        promise: "Teach readers to turn durable notes into decisions.",
        risk: "Needs concrete cases.",
        note_ids: [noteA.json.item.id]
      }
    ]
  };
  const bookStructurePatch = await patchJson(baseUrl, `/api/v1/writing-projects/${encodeURIComponent(project.json.item.id)}/book-structure`, {
    bookStructure: updatedBookStructure
  });
  assert.equal(bookStructurePatch.status, 200, JSON.stringify(bookStructurePatch.json));
  assert.equal(bookStructurePatch.json.item.book_structure.direction_ideas.length, 1);
  assert.equal(bookStructurePatch.json.item.book_structure.direction_ideas[0].title, "Judgment training book");

  const emptyBookStructurePatch = await patchJson(baseUrl, `/api/v1/writing-projects/${encodeURIComponent(project.json.item.id)}/book-structure`, {});
  assert.equal(emptyBookStructurePatch.status, 400, JSON.stringify(emptyBookStructurePatch.json));
  assert.match(emptyBookStructurePatch.json.error.message, /bookStructure or regenerate is required/);

  const fetchedBookProject = await getJson(baseUrl, `/api/v1/writing-projects/${encodeURIComponent(project.json.item.id)}`);
  assert.equal(fetchedBookProject.status, 200, JSON.stringify(fetchedBookProject.json));
  assert.equal(fetchedBookProject.json.item.book_structure.direction_ideas[0].id, "idea_judgment_training");
  assert.equal(fetchedBookProject.json.item.book_structure.parts.length, 3);

  const scaffold = await postJson(baseUrl, "/api/v1/draft-scaffolds", {
    writingProjectId: project.json.item.id,
    versionNote: "First scaffold pass from two permanent notes."
  });
  assert.equal(scaffold.status, 201, JSON.stringify(scaffold.json));
  assert.match(scaffold.json.item.id, /^ds_/);
  assert.equal(scaffold.json.item.writing_project_id, project.json.item.id);
  assert.equal(scaffold.json.item.generated_by, "writing-engine:v1");
  assert.equal(scaffold.json.item.version_note, "First scaffold pass from two permanent notes.");
  assert.ok(scaffold.json.item.sections.length >= 4);
  assert.ok(scaffold.json.item.sections.every((section) => Array.isArray(section.evidence_note_ids)));
  assert.ok(scaffold.json.item.sections.every((section) => Array.isArray(section.gaps)));
  assert.ok(scaffold.json.item.sections.every((section) => Array.isArray(section.counterpoints)));
  assert.ok(scaffold.json.item.sections.some((section) => section.counterpoints.some((item) => /stable note|conflated/i.test(item))));
  assert.ok(scaffold.json.item.sections.some((section) => section.open_questions.some((item) => /边界|反例/i.test(item))));
  assert.ok(scaffold.json.item.open_questions.some((item) => /反方|区分|边界/i.test(item)));
  assert.equal(scaffold.json.item.preflight.status, "needs_attention");
  assert.ok(scaffold.json.item.preflight.checks.some((check) => check.id === "writing_intent" && check.status === "pass"));
  assert.ok(scaffold.json.item.preflight.checks.some((check) => check.id === "confirmed_distillation" && check.status === "warning"));
  assert.ok(scaffold.json.item.preflight.checks.some((check) => check.id === "distillation_quality" && check.status === "warning"));
  assert.equal(scaffold.json.item.writing_project.scaffold_id, scaffold.json.item.id);
  assert.equal(scaffold.json.item.writing_project.updated_at, scaffold.json.item.updated_at);
  assert.equal(scaffold.json.item.writing_project.thinkingStatus.status, "ready_for_review");
  assert.match(scaffold.json.export.markdown, /# Writing mainline/);
  assert.match(scaffold.json.export.markdown, /## 文章提纲预检/);
  assert.match(scaffold.json.export.markdown, /- 提醒 已确认提纯/);
  assert.match(scaffold.json.export.markdown, /- 提醒 提纯质量/);
  assert.match(scaffold.json.export.markdown, /## 段落-证据对照表/);
  assert.match(scaffold.json.export.markdown, /- 意图: Explain why writing should begin from distilled notes rather than blank prompts\./);
  assert.match(scaffold.json.export.markdown, /- 读者收获: Readers should see thought compression as the bridge between note-taking and writing\./);
  assert.match(scaffold.json.export.markdown, /待补缺口:/);
  assert.match(scaffold.json.export.markdown, /反方与边界:/);
  assert.match(scaffold.json.export.markdown, /要正面处理哪条反方或边界|补出哪条反方、限制或例外/);
  assert.match(scaffold.json.export.markdown, /进一步区分|区分/i);
  assert.match(scaffold.json.export.markdown, /Writing from claims/);
  assert.equal(scaffold.json.export.json.sections.length, scaffold.json.item.sections.length);
  assert.equal(scaffold.json.export.json.preflight.status, "needs_attention");

  const fetchedScaffold = await getJson(baseUrl, `/api/v1/draft-scaffolds/${encodeURIComponent(scaffold.json.item.id)}`);
  assert.equal(fetchedScaffold.status, 200, JSON.stringify(fetchedScaffold.json));
  assert.equal(fetchedScaffold.json.item.id, scaffold.json.item.id);
  assert.equal(fetchedScaffold.json.item.preflight.status, "needs_attention");
  assert.match(fetchedScaffold.json.export.markdown, /段落-证据对照表/);
  assert.match(fetchedScaffold.json.export.markdown, /反方与边界:/);

  const scaffoldV2 = await postJson(baseUrl, "/api/v1/draft-scaffolds", {
    writingProjectId: project.json.item.id,
    versionNote: "Second scaffold pass with a tighter structure."
  });
  assert.equal(scaffoldV2.status, 201, JSON.stringify(scaffoldV2.json));
  assert.notEqual(scaffoldV2.json.item.id, scaffold.json.item.id);

  const scaffoldVersions = await getJson(baseUrl, `/api/v1/writing-projects/${encodeURIComponent(project.json.item.id)}/scaffolds?limit=12`);
  assert.equal(scaffoldVersions.status, 200, JSON.stringify(scaffoldVersions.json));
  assert.ok(Array.isArray(scaffoldVersions.json.items));
  assert.equal(scaffoldVersions.json.items.length, 2);
  assert.equal(scaffoldVersions.json.items[0].id, scaffoldV2.json.item.id);
  assert.equal(scaffoldVersions.json.items[0].version_note, "Second scaffold pass with a tighter structure.");
  assert.equal(scaffoldVersions.json.items[1].id, scaffold.json.item.id);
  assert.equal(scaffoldVersions.json.items[1].version_note, "First scaffold pass from two permanent notes.");

  const updatedScaffoldNote = await fetch(`${baseUrl}/api/v1/draft-scaffolds/${encodeURIComponent(scaffold.json.item.id)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ versionNote: "Updated scaffold explanation after review." })
  }).then(async (res) => ({ status: res.status, json: await res.json() }));
  assert.equal(updatedScaffoldNote.status, 200, JSON.stringify(updatedScaffoldNote.json));
  assert.equal(updatedScaffoldNote.json.item.version_note, "Updated scaffold explanation after review.");

  const syncedProjectViaApi = await patchJson(baseUrl, `/api/v1/writing-projects/${encodeURIComponent(project.json.item.id)}`, {
    title: "Writing mainline revised",
    goal: "Explain the revised writing path.",
    basketNoteIds: project.json.item.basket_note_ids
  });
  assert.equal(syncedProjectViaApi.status, 200, JSON.stringify(syncedProjectViaApi.json));
  assert.equal(syncedProjectViaApi.json.item.title, "Writing mainline revised");
  assert.equal(syncedProjectViaApi.json.item.goal, "Explain the revised writing path.");

  const updatedScaffold = await patchJson(baseUrl, `/api/v1/draft-scaffolds/${encodeURIComponent(scaffold.json.item.id)}`, {
    sections: [{ heading: "Revised opening", purpose: "State the revised problem.", evidence_note_ids: ["pn-1"] }],
    openQuestions: ["What still needs evidence?"]
  });
  assert.equal(updatedScaffold.status, 200, JSON.stringify(updatedScaffold.json));
  assert.equal(updatedScaffold.json.item.sections[0].heading, "Revised opening");
  const rereadScaffold = await getJson(baseUrl, `/api/v1/draft-scaffolds/${encodeURIComponent(scaffold.json.item.id)}`);
  assert.equal(rereadScaffold.status, 200, JSON.stringify(rereadScaffold.json));
  assert.equal(rereadScaffold.json.item.sections[0].heading, "Revised opening");
  assert.match(rereadScaffold.json.export.markdown, /Revised opening/);

  const draftNote = await postJson(baseUrl, "/api/v1/notes", {
    directoryId: "dir_original_default",
    status: "draft",
    body: "# Writing mainline draft\n\nDraft body generated from scaffold."
  });
  assert.equal(draftNote.status, 201, JSON.stringify(draftNote.json));

  const bindDraft = await postJson(baseUrl, `/api/v1/writing-projects/${encodeURIComponent(project.json.item.id)}/draft-note`, {
    draftNoteId: draftNote.json.item.id,
    sourceScaffoldId: scaffold.json.item.id,
    versionNote: "First prose pass from scaffold v1."
  });
  assert.equal(bindDraft.status, 200, JSON.stringify(bindDraft.json));
  assert.equal(bindDraft.json.item.draft_note_id, draftNote.json.item.id);
  assert.equal(bindDraft.json.item.draft_note.id, draftNote.json.item.id);
  assert.equal(bindDraft.json.item.draft_note.title, "Writing mainline draft");

  const draftNoteV2 = await postJson(baseUrl, "/api/v1/notes", {
    directoryId: "dir_original_default",
    status: "draft",
    body: "# Writing mainline draft v2\n\nDraft body generated from the second scaffold."
  });
  assert.equal(draftNoteV2.status, 201, JSON.stringify(draftNoteV2.json));

  const bindDraftV2 = await postJson(baseUrl, `/api/v1/writing-projects/${encodeURIComponent(project.json.item.id)}/draft-note`, {
    draftNoteId: draftNoteV2.json.item.id,
    sourceScaffoldId: scaffoldV2.json.item.id,
    versionNote: "Second prose pass from scaffold v2."
  });
  assert.equal(bindDraftV2.status, 200, JSON.stringify(bindDraftV2.json));
  assert.equal(bindDraftV2.json.item.draft_note_id, draftNoteV2.json.item.id);

  const draftVersions = await getJson(baseUrl, `/api/v1/writing-projects/${encodeURIComponent(project.json.item.id)}/draft-versions?limit=12`);
  assert.equal(draftVersions.status, 200, JSON.stringify(draftVersions.json));
  assert.ok(Array.isArray(draftVersions.json.items));
  assert.equal(draftVersions.json.items.length, 2);
  assert.equal(draftVersions.json.items[0].draft_note_id, draftNoteV2.json.item.id);
  assert.equal(draftVersions.json.items[0].version_no, 2);
  assert.equal(draftVersions.json.items[0].source_scaffold_id, scaffoldV2.json.item.id);
  assert.equal(draftVersions.json.items[0].version_note, "Second prose pass from scaffold v2.");
  assert.equal(draftVersions.json.items[0].is_current, true);
  assert.equal(draftVersions.json.items[1].draft_note_id, draftNote.json.item.id);
  assert.equal(draftVersions.json.items[1].version_no, 1);
  assert.equal(draftVersions.json.items[1].source_scaffold_id, scaffold.json.item.id);
  assert.equal(draftVersions.json.items[1].version_note, "First prose pass from scaffold v1.");

  const updatedDraftVersionNote = await fetch(
    `${baseUrl}/api/v1/draft-note-versions/${encodeURIComponent(draftVersions.json.items[1].id)}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ versionNote: "Updated prose explanation after comparison." })
    }
  ).then(async (res) => ({ status: res.status, json: await res.json() }));
  assert.equal(updatedDraftVersionNote.status, 200, JSON.stringify(updatedDraftVersionNote.json));
  assert.equal(updatedDraftVersionNote.json.item.version_note, "Updated prose explanation after comparison.");
  assert.equal(updatedDraftVersionNote.json.item.version_no, 1);
  assert.equal(updatedDraftVersionNote.json.item.source_scaffold_id, scaffold.json.item.id);
  assert.equal(updatedDraftVersionNote.json.item.is_current, false);

  const rereadDraftVersions = await getJson(baseUrl, `/api/v1/writing-projects/${encodeURIComponent(project.json.item.id)}/draft-versions?limit=12`);
  assert.equal(rereadDraftVersions.status, 200, JSON.stringify(rereadDraftVersions.json));
  assert.equal(rereadDraftVersions.json.items[1].version_note, "Updated prose explanation after comparison.");

  const rebindCurrent = await postJson(
    baseUrl,
    `/api/v1/writing-projects/${encodeURIComponent(project.json.item.id)}/current-draft`,
    {
      draftNoteId: draftNote.json.item.id
    }
  );
  assert.equal(rebindCurrent.status, 200, JSON.stringify(rebindCurrent.json));
  assert.equal(rebindCurrent.json.item.draft_note_id, draftNote.json.item.id);
  assert.equal(rebindCurrent.json.item.draft_note.id, draftNote.json.item.id);

  const reboundDraftVersions = await getJson(
    baseUrl,
    `/api/v1/writing-projects/${encodeURIComponent(project.json.item.id)}/draft-versions?limit=12`
  );
  assert.equal(reboundDraftVersions.status, 200, JSON.stringify(reboundDraftVersions.json));
  assert.equal(reboundDraftVersions.json.items.length, 2);
  assert.equal(reboundDraftVersions.json.items[0].draft_note_id, draftNoteV2.json.item.id);
  assert.equal(reboundDraftVersions.json.items[0].is_current, false);
  assert.equal(reboundDraftVersions.json.items[1].draft_note_id, draftNote.json.item.id);
  assert.equal(reboundDraftVersions.json.items[1].is_current, true);

  const fetchedProject = await getJson(baseUrl, `/api/v1/writing-projects/${encodeURIComponent(project.json.item.id)}`);
  assert.equal(fetchedProject.status, 200, JSON.stringify(fetchedProject.json));
  assert.deepEqual(fetchedProject.json.item.related_index_ids, [topicIndex.json.item.id]);
  assert.equal(fetchedProject.json.item.intent, "Explain why writing should begin from distilled notes rather than blank prompts.");
  assert.equal(fetchedProject.json.item.desired_reader_takeaway, "Readers should see thought compression as the bridge between note-taking and writing.");
  assert.equal(fetchedProject.json.item.scaffold_id, scaffoldV2.json.item.id);
  assert.equal(fetchedProject.json.item.draft_note_id, draftNote.json.item.id);
  assert.equal(fetchedProject.json.item.draft_note.id, draftNote.json.item.id);
  assert.equal(fetchedProject.json.item.thinkingStatus.status, "ready_for_review");

  const listedProjects = await getJson(baseUrl, "/api/v1/writing-projects?limit=8");
  assert.equal(listedProjects.status, 200, JSON.stringify(listedProjects.json));
  assert.ok(Array.isArray(listedProjects.json.items));
  assert.equal(listedProjects.json.items[0].id, project.json.item.id);
  assert.deepEqual(listedProjects.json.items[0].related_index_ids, [topicIndex.json.item.id]);
  assert.equal(listedProjects.json.items[0].intent, "Explain why writing should begin from distilled notes rather than blank prompts.");
  assert.equal(listedProjects.json.items[0].desired_reader_takeaway, "Readers should see thought compression as the bridge between note-taking and writing.");
  assert.equal(listedProjects.json.items[0].draft_note_id, draftNote.json.item.id);
  assert.equal(listedProjects.json.items[0].scaffold_id, scaffoldV2.json.item.id);
  assert.deepEqual(listedProjects.json.items[0].basket_note_ids, [noteA.json.item.id, noteB.json.item.id]);
  assert.equal(listedProjects.json.items[0].basket_notes.length, 2);
  assert.equal(listedProjects.json.items[0].basket_notes[0].title, "Writing from claims");
  assert.equal(listedProjects.json.items[0].thinkingStatus.status, "ready_for_review");

  const secondProject = await postJson(baseUrl, "/api/v1/writing-projects", {
    title: "Side outline",
    goal: "Keep a separate branch without a draft note yet.",
    audience: "Editors",
    tone: "concise",
    basketNoteIds: [noteA.json.item.id]
  });
  assert.equal(secondProject.status, 201, JSON.stringify(secondProject.json));

  const filteredByQuery = await getJson(baseUrl, "/api/v1/writing-projects?limit=8&q=mainline");
  assert.equal(filteredByQuery.status, 200, JSON.stringify(filteredByQuery.json));
  assert.equal(filteredByQuery.json.items.length, 1);
  assert.equal(filteredByQuery.json.items[0].id, project.json.item.id);

  const filteredWithDraft = await getJson(baseUrl, "/api/v1/writing-projects?limit=8&hasDraft=true");
  assert.equal(filteredWithDraft.status, 200, JSON.stringify(filteredWithDraft.json));
  assert.equal(filteredWithDraft.json.items.length, 1);
  assert.equal(filteredWithDraft.json.items[0].id, project.json.item.id);

  const filteredWithoutDraft = await getJson(baseUrl, "/api/v1/writing-projects?limit=8&hasDraft=false");
  assert.equal(filteredWithoutDraft.status, 200, JSON.stringify(filteredWithoutDraft.json));
  assert.equal(filteredWithoutDraft.json.items.length, 1);
  assert.equal(filteredWithoutDraft.json.items[0].id, secondProject.json.item.id);

  const filteredByStatus = await getJson(baseUrl, "/api/v1/writing-projects?limit=8&status=draft");
  assert.equal(filteredByStatus.status, 200, JSON.stringify(filteredByStatus.json));
  assert.ok(filteredByStatus.json.items.some((item) => item.id === project.json.item.id));
  assert.ok(filteredByStatus.json.items.some((item) => item.id === secondProject.json.item.id));

  const syncedProject = await syncWritingProject(vaultPath, project.json.item.id, {
    title: "Updated writing mainline",
    goal: "Updated book goal",
    audience: "Senior editors"
  });
  assert.equal(syncedProject.book_structure.mainline, "Updated book goal");
  assert.equal(syncedProject.book_structure.reader, "Senior editors");
  assert.equal(syncedProject.book_structure.parts.length, 3);
  assert.equal(syncedProject.book_structure.direction_ideas[0].id, "idea_judgment_training");
});

test("core writing flow keeps working when status guidance is ignored", async (t) => {
  const vaultPath = await makeTempDir("yansilu-api-writing-regression-vault-");
  const port = await findFreePort();
  const baseUrl = `http://127.0.0.1:${port}`;
  const child = startApi(port, vaultPath);

  t.after(() => child.kill());
  await waitForHealth(baseUrl);

  const noteA = await postJson(baseUrl, "/api/v1/notes", {
    directoryId: "dir_original_default",
    body: "# Rough claim\n\nCore flow should accept an unfinished permanent note."
  });
  assert.equal(noteA.status, 201, JSON.stringify(noteA.json));
  assert.equal(noteA.json.item.noteType, "permanent");
  assert.equal(noteA.json.item.distillationStatus, "missing");
  assert.equal(noteA.json.item.authorship.user_confirmed, false);
  assert.equal(noteA.json.item.thinkingStatus.status, "needs_thesis");

  const noteB = await postJson(baseUrl, "/api/v1/notes", {
    directoryId: "dir_original_default",
    body: "# Supporting example\n\nThe scaffold can still point back to draft-quality material."
  });
  assert.equal(noteB.status, 201, JSON.stringify(noteB.json));
  assert.equal(noteB.json.item.thinkingStatus.status, "needs_thesis");

  const index = await postJson(baseUrl, "/api/v1/index-cards", {
    directoryId: "dir_original_default",
    indexType: "topic",
    title: "Unfinished source material",
    noteIds: [noteA.json.item.id, noteB.json.item.id]
  });
  assert.equal(index.status, 201, JSON.stringify(index.json));
  assert.deepEqual(index.json.item.item_note_ids, [noteA.json.item.id, noteB.json.item.id]);
  assert.equal(index.json.item.thinkingStatus.status, "needs_central_question");

  const project = await postJson(baseUrl, "/api/v1/writing-projects", {
    title: "Regression draft",
    goal: "Prove advisory status does not block the original writing path.",
    basketNoteIds: [noteA.json.item.id, noteB.json.item.id],
    relatedIndexIds: [index.json.item.id]
  });
  assert.equal(project.status, 201, JSON.stringify(project.json));
  assert.deepEqual(project.json.item.basket_note_ids, [noteA.json.item.id, noteB.json.item.id]);
  assert.deepEqual(project.json.item.related_index_ids, [index.json.item.id]);
  assert.equal(project.json.item.thinkingStatus.status, "needs_intent");
  assert.ok(project.json.item.preflight.checks.some((item) => item.code === "missing_central_question"));

  const scaffold = await postJson(baseUrl, "/api/v1/draft-scaffolds", {
    writingProjectId: project.json.item.id
  });
  assert.equal(scaffold.status, 201, JSON.stringify(scaffold.json));
  assert.equal(scaffold.json.item.writing_project_id, project.json.item.id);
  assert.equal(scaffold.json.item.writing_project.thinkingStatus.status, "needs_intent");
  assert.equal(scaffold.json.item.preflight.status, "needs_attention");
  assert.ok(scaffold.json.item.preflight.checks.some((check) => check.id === "writing_intent" && check.status === "warning"));
  assert.ok(scaffold.json.item.preflight.checks.some((check) => check.id === "distillation_quality" && check.status === "warning"));
  assert.match(scaffold.json.export.markdown, /# Regression draft/);
  assert.match(scaffold.json.export.markdown, /- 意图: 待补充/);
  assert.match(scaffold.json.export.markdown, /- 提醒 写作意图/);
  assert.match(scaffold.json.export.markdown, /- 提醒 提纯质量/);
  assert.match(scaffold.json.export.markdown, /补一张带中心问题的主题卡，或改用已经写出中心问题的主题/);
  assert.match(scaffold.json.export.markdown, /Rough claim/);
  assert.match(scaffold.json.export.markdown, /Supporting example/);

  const fetchedProject = await getJson(baseUrl, `/api/v1/writing-projects/${encodeURIComponent(project.json.item.id)}`);
  assert.equal(fetchedProject.status, 200, JSON.stringify(fetchedProject.json));
  assert.equal(fetchedProject.json.item.scaffold_id, scaffold.json.item.id);
  assert.equal(fetchedProject.json.item.thinkingStatus.status, "needs_intent");
});

test("existing writing work stays readable when an old source note file is missing", async (t) => {
  const vaultPath = await makeTempDir("yansilu-api-writing-missing-source-vault-");
  const port = await findFreePort();
  const baseUrl = `http://127.0.0.1:${port}`;
  const child = startApi(port, vaultPath);

  t.after(() => child.kill());
  await waitForHealth(baseUrl);

  const note = await postJson(baseUrl, "/api/v1/notes", {
    directoryId: "dir_original_default",
    body: "# 可恢复的旧材料\n\n已有提纲和草稿不应因为源文件后来被移除而打不开。"
  });
  assert.equal(note.status, 201, JSON.stringify(note.json));

  const project = await postJson(baseUrl, "/api/v1/writing-projects", {
    title: "缺失材料的旧项目",
    goal: "验证旧提纲仍然可以打开。",
    basketNoteIds: [note.json.item.id]
  });
  assert.equal(project.status, 201, JSON.stringify(project.json));

  const scaffold = await postJson(baseUrl, "/api/v1/draft-scaffolds", {
    writingProjectId: project.json.item.id
  });
  assert.equal(scaffold.status, 201, JSON.stringify(scaffold.json));

  await fs.rm(path.join(vaultPath, note.json.item.markdownPath));

  const fetchedProject = await getJson(baseUrl, `/api/v1/writing-projects/${encodeURIComponent(project.json.item.id)}`);
  assert.equal(fetchedProject.status, 200, JSON.stringify(fetchedProject.json));
  assert.equal(fetchedProject.json.item.basket_notes[0].status, "missing");
  assert.ok(fetchedProject.json.item.preflight.checks.some((check) => check.code === "basket_notes_missing_source"));

  const fetchedScaffold = await getJson(baseUrl, `/api/v1/draft-scaffolds/${encodeURIComponent(scaffold.json.item.id)}`);
  assert.equal(fetchedScaffold.status, 200, JSON.stringify(fetchedScaffold.json));
  assert.ok(fetchedScaffold.json.item.preflight.checks.some((check) => check.id === "source_files"));

  const replacementScaffold = await postJson(baseUrl, "/api/v1/draft-scaffolds", {
    writingProjectId: project.json.item.id
  });
  assert.equal(replacementScaffold.status, 400, JSON.stringify(replacementScaffold.json));
  assert.equal(replacementScaffold.json.error.code, "DRAFT_SCAFFOLD_INVALID");
});
