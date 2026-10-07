import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import fs from "node:fs/promises";
import os from "node:os";
import net from "node:net";
import http from "node:http";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { createImportConfirmationRecovery } from "../../apps/web/src/import-confirmation-recovery.js";
import { createImportRecordJournal } from "../../apps/api/src/import-record-journal.mjs";
import { parseMarkdownWithFrontmatter, serializeMarkdownWithFrontmatter } from "../../packages/domain/src/frontmatter.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..", "..");
const FIXTURES_ROOT = path.join(REPO_ROOT, "tests", "fixtures", "imports");

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
  let lastError;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${baseUrl}/health`);
      if (res.ok) return;
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw lastError || new Error("API server did not become healthy");
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

function startApi(port, vaultPath) {
  return spawn(process.execPath, ["apps/api/src/server.mjs"], {
    cwd: REPO_ROOT,
    env: {
      ...process.env,
      API_PORT: String(port),
      VAULT_PATH: vaultPath
    },
    stdio: ["ignore", "pipe", "pipe"]
  });
}

async function stopApi(child) {
  if (!child || child.killed) return;
  child.kill();
  await new Promise((resolve) => child.once("exit", resolve));
}

for (const legacyPreview of [false, true]) {
  test(`viewpoint evidence survives actual selected import, files and API restart${legacyPreview ? " from an old preview" : ""}`, async t => {
    const vaultPath = await makeTempDir("yansilu-viewpoint-import-vault-");
    const source = await makeTempDir("yansilu-viewpoint-import-source-");
    const history = { previousThesis: "All explanations generalize.", thesis: "Explanations require conditions.", reason: "An exception exposed a missing assumption.",
      changedAt: "2026-01-02T03:04:05Z", sourceNoteIds: ["pn_old_evidence", "ln_old_material", "pn_excluded", "pn_missing"] };
    const pending = { previous_thesis: history.thesis, thesis: "Test each condition.", reason: "A second case.",
      changed_at: "2026-02-03T04:05:06Z", source_note_ids: ["pn_old_evidence", "pn_excluded"] };
    const originals = new Map([
      ["claim.md", serializeMarkdownWithFrontmatter({ id: "pn_old_claim", type: "permanent", title: "Explanation", thesis: history.thesis,
        authorship: { user_confirmed: true, ai_assisted: true },
        starting_question: "When does an explanation fail?", viewpoint_history: [JSON.stringify(history)], pending_viewpoint_revision: pending }, "My judgment uses [[pn_old_evidence]].")],
      ["evidence.md", serializeMarkdownWithFrontmatter({ id: "pn_old_evidence", type: "permanent", title: "Counterexample" }, "An actual counterexample.")],
      ["material.md", serializeMarkdownWithFrontmatter({ id: "ln_old_material", type: "literature", title: "Observation" }, "An observation recorded earlier.")],
      ["excluded.md", serializeMarkdownWithFrontmatter({ id: "pn_excluded", type: "permanent", title: "Excluded" }, "A judgment not selected for import.")]
    ]);
    for (const [file, body] of originals) await fs.writeFile(path.join(source, file), body, "utf8");
    const port = await findFreePort();
    const baseUrl = `http://127.0.0.1:${port}`;
    let child = startApi(port, vaultPath);
    t.after(async () => { await stopApi(child); await fs.rm(source, { recursive: true, force: true }); await fs.rm(vaultPath, { recursive: true, force: true }); });
    await waitForHealth(baseUrl);
    const preview = await postJson(baseUrl, "/api/v1/imports/preview", { connector: "obsidian", payload: { path: source } });
    assert.equal(preview.status, 200, JSON.stringify(preview.json));
    const id = preview.json.importRecordId;
    const claim = preview.json.candidatePreview.permanentNotes.find(note => note.title === "Explanation");
    const evidence = preview.json.candidatePreview.permanentNotes.find(note => note.title === "Counterexample");
    const excluded = preview.json.candidatePreview.permanentNotes.find(note => note.title === "Excluded");
    const material = preview.json.candidatePreview.literatureNotes.find(note => note.title === "Observation");
    await stopApi(child);
    if (legacyPreview) {
      const journal = createImportRecordJournal();
      const legacy = await journal.read(vaultPath, id);
      const oldClaim = legacy.candidates.permanent.find(note => note.id === claim.id);
      oldClaim.viewpoint_history = [JSON.stringify(history)];
      oldClaim.pending_viewpoint_revision = JSON.stringify(pending);
      await journal.write(legacy);
    }
    child = startApi(port, vaultPath);
    await waitForHealth(baseUrl);
    const confirmed = await postJson(baseUrl, `/api/v1/imports/${id}/confirm`, { confirm: true, selectedCandidateIds: [claim.id, evidence.id, material.id] });
    assert.equal(confirmed.status, 200, JSON.stringify(confirmed.json));
    assert.deepEqual(confirmed.json.result.created, { sources: 0, literatureNotes: 1, permanentNotes: 2 });
    const readClaim = async () => (await getJson(baseUrl, `/api/v1/notes/${claim.id}`)).json.item;
    const expectedHistory = { ...history, sourceNoteIds: [evidence.id, material.id, excluded.id, "pn_missing"] };
    const verify = async () => {
      const imported = await readClaim();
      assert.deepEqual(imported.viewpointHistory, [expectedHistory]);
      assert.deepEqual(imported.pendingViewpointRevision, { previousThesis: pending.previous_thesis, thesis: pending.thesis, reason: pending.reason,
        changedAt: pending.changed_at, sourceNoteIds: [evidence.id, excluded.id] });
      assert.equal(imported.startingQuestion, "When does an explanation fail?");
      assert.equal(imported.authorship.user_confirmed, false);
      assert.equal(imported.authorship.ai_assisted, true);
      assert.notEqual(imported.distillationStatus, "confirmed");
      assert.match(imported.body, /\[\[pn_old_evidence\]\]/);
      const raw = await fs.readFile(path.join(vaultPath, imported.markdownPath), "utf8");
      assert.ok(raw.includes(evidence.id) && raw.includes(material.id) && raw.includes(excluded.id));
      assert.equal((await getJson(baseUrl, `/api/v1/notes/${excluded.id}`)).status, 404);
      assert.equal(confirmed.json.result.createdFiles.some(file => file.noteId === excluded.id), false);
      for (const [file, body] of originals) assert.equal(await fs.readFile(path.join(source, file), "utf8"), body);
    };
    await verify();
    await stopApi(child);
    child = startApi(port, vaultPath);
    await waitForHealth(baseUrl);
    await verify();
    if (!legacyPreview) {
      const current = await readClaim();
      const authorConfirmed = await postJson(baseUrl, `/api/v1/permanent-notes/${claim.id}/distillation/confirm`, { expectedRevision: current.fileRevision });
      assert.equal(authorConfirmed.status, 200, JSON.stringify(authorConfirmed.json));
      assert.deepEqual(authorConfirmed.json.item.authorship, { user_confirmed: true, ai_assisted: true });
      const confirmedPath = path.join(vaultPath, authorConfirmed.json.item.markdownPath);
      const baseline = parseMarkdownWithFrontmatter(await fs.readFile(confirmedPath, "utf8")).frontmatter;
      assert.equal(baseline.source_trace, path.join(source, "claim.md"));
      let latest = authorConfirmed.json.item;
      for (let round = 0; round < 12; round++) {
        const repeated = await postJson(baseUrl, `/api/v1/permanent-notes/${claim.id}/distillation/confirm`, { expectedRevision: latest.fileRevision });
        assert.equal(repeated.status, 200, JSON.stringify(repeated.json));
        latest = repeated.json.item;
        const metadata = parseMarkdownWithFrontmatter(await fs.readFile(confirmedPath, "utf8")).frontmatter;
        assert.equal(metadata.original_frontmatter, baseline.original_frontmatter);
        assert.equal(metadata.source_trace, baseline.source_trace);
        assert.deepEqual(latest.authorship, { user_confirmed: true, ai_assisted: true });
        assert.ok(latest.body.includes("My judgment uses [[pn_old_evidence]]."));
        assert.equal((latest.body.match(/^## 提炼观点$/gm) || []).length, 1);
      }
      const destination = await makeTempDir("yansilu-viewpoint-roundtrip-export-");
      const secondVault = await makeTempDir("yansilu-viewpoint-roundtrip-vault-");
      t.after(async () => { await fs.rm(destination, { recursive: true, force: true }); await fs.rm(secondVault, { recursive: true, force: true }); });
      const exported = await postJson(baseUrl, "/api/v1/exports/markdown", { targetPath: destination, directoryId: "dir_original_default" });
      assert.equal(exported.status, 202, JSON.stringify(exported.json));
      assert.equal(exported.json.copied, 2);
      const files = (await fs.readdir(destination, { recursive: true })).filter(file => file.endsWith(".md"));
      const bytes = new Map(await Promise.all(files.map(async file => [file, await fs.readFile(path.join(destination, file))])));
      assert.equal((await postJson(baseUrl, "/api/v1/vault", { vaultPath: secondVault })).status, 200);
      const nextPreview = await postJson(baseUrl, "/api/v1/imports/preview", { connector: "obsidian", payload: { path: destination } });
      assert.equal(nextPreview.status, 200);
      const nextClaim = nextPreview.json.candidatePreview.permanentNotes.find(note => note.title === "Explanation");
      const nextEvidence = nextPreview.json.candidatePreview.permanentNotes.find(note => note.title === "Counterexample");
      assert.notEqual(nextClaim.id, claim.id);
      const nextConfirm = await postJson(baseUrl, `/api/v1/imports/${nextPreview.json.importRecordId}/confirm`, { confirm: true });
      assert.equal(nextConfirm.status, 200, JSON.stringify(nextConfirm.json));
      const nextNote = (await getJson(baseUrl, `/api/v1/notes/${nextClaim.id}`)).json.item;
      assert.deepEqual(nextNote.viewpointHistory, [{ ...history, sourceNoteIds: [nextEvidence.id, material.id, excluded.id, "pn_missing"] }]);
      assert.deepEqual(nextNote.pendingViewpointRevision.sourceNoteIds, [nextEvidence.id, excluded.id]);
      assert.equal(nextNote.authorship.user_confirmed, false);
      assert.equal(nextNote.authorship.ai_assisted, true);
      const relations = (await getJson(baseUrl, `/api/v1/notes/${nextClaim.id}/relations`)).json.item.outgoingLinks;
      assert.ok(relations.some(relation => relation.toNoteId === nextEvidence.id), "The unchanged old body link must still resolve to the actual reimported evidence");
      for (const [file, raw] of bytes) assert.deepEqual(await fs.readFile(path.join(destination, file)), raw);
    }
  });
}

test("ambiguous old viewpoint evidence is preserved and visibly reported after restoring an old import", async t => {
  const vaultPath = await makeTempDir("yansilu-ambiguous-viewpoint-vault-");
  const source = await makeTempDir("yansilu-ambiguous-viewpoint-source-");
  const revision = { previousThesis: "Before", thesis: "After", reason: "An observation", sourceNoteIds: ["pn_duplicate"] };
  const originals = new Map([
    ["claim.md", serializeMarkdownWithFrontmatter({ id: "pn_claim", type: "permanent", title: "Claim", viewpoint_history: [JSON.stringify(revision)] }, "An independent judgment.")],
    ["first.md", serializeMarkdownWithFrontmatter({ id: "pn_duplicate", type: "permanent", title: "First observation" }, "One real observation.")],
    ["second.md", serializeMarkdownWithFrontmatter({ id: "pn_duplicate", type: "permanent", title: "Second observation" }, "A different real observation.")]
  ]);
  for (const [file, body] of originals) await fs.writeFile(path.join(source, file), body, "utf8");
  const port = await findFreePort();
  const baseUrl = `http://127.0.0.1:${port}`;
  let child = startApi(port, vaultPath);
  t.after(async () => { await stopApi(child); await fs.rm(source, { recursive: true, force: true }); await fs.rm(vaultPath, { recursive: true, force: true }); });
  await waitForHealth(baseUrl);
  const preview = await postJson(baseUrl, "/api/v1/imports/preview", { connector: "obsidian", payload: { path: source } });
  assert.equal(preview.status, 200);
  assert.equal(preview.json.warnings.filter(warning => warning.code === "IMPORT_VIEWPOINT_REFERENCE_AMBIGUOUS").length, 1);
  const id = preview.json.importRecordId;
  const claimId = preview.json.candidatePreview.permanentNotes.find(note => note.title === "Claim").id;
  await stopApi(child);
  const journal = createImportRecordJournal();
  const legacy = await journal.read(vaultPath, id);
  legacy.warnings = [];
  legacy.candidates.warnings = [];
  legacy.summary.warnings = 0;
  await journal.write(legacy);
  child = startApi(port, vaultPath);
  await waitForHealth(baseUrl);
  const confirmed = await postJson(baseUrl, `/api/v1/imports/${id}/confirm`, { confirm: true });
  assert.equal(confirmed.status, 200, JSON.stringify(confirmed.json));
  assert.equal(confirmed.json.warnings[0].code, "IMPORT_VIEWPOINT_REFERENCE_AMBIGUOUS");
  const imported = (await getJson(baseUrl, `/api/v1/notes/${claimId}`)).json.item;
  assert.deepEqual(imported.viewpointHistory[0].sourceNoteIds, ["pn_duplicate"]);
  const record = (await getJson(baseUrl, `/api/v1/imports/${id}`)).json.importRecord;
  const warnings = record.warnings.filter(warning => warning.code === "IMPORT_VIEWPOINT_REFERENCE_AMBIGUOUS");
  assert.equal(warnings.length, 1);
  assert.match(warnings[0].message, /对应多条导入笔记/);
  assert.equal(record.summary.warnings, 1);
  for (const [file, body] of originals) assert.equal(await fs.readFile(path.join(source, file), "utf8"), body);
});

test("completed import survives an actual API restart and cannot be imported again", async t => {
  const vaultPath = await makeTempDir("yansilu-import-restart-");
  const port = await findFreePort();
  const baseUrl = `http://127.0.0.1:${port}`;
  let child = startApi(port, vaultPath);
  t.after(() => stopApi(child));
  await waitForHealth(baseUrl);
  const preview = await postJson(baseUrl, "/api/v1/imports/preview", {
    connector: "obsidian", payload: { path: path.join(FIXTURES_ROOT, "markdown-basic") }, options: {}
  });
  assert.equal(preview.status, 200);
  const id = preview.json.importRecordId;
  const confirmed = await postJson(baseUrl, `/api/v1/imports/${id}/confirm`, { confirm: true, overrideOriginality: true });
  assert.equal(confirmed.status, 200, JSON.stringify(confirmed.json));
  const before = (await getJson(baseUrl, `/api/v1/imports/${id}`)).json.importRecord;
  const files = await Promise.all(before.confirmResult.createdFiles.map(item => fs.readFile(path.join(vaultPath, item.path))));
  await stopApi(child);
  child = startApi(port, vaultPath);
  await waitForHealth(baseUrl);
  const restored = (await getJson(baseUrl, `/api/v1/imports/${id}`)).json.importRecord;
  assert.equal(restored.status, "completed");
  assert.deepEqual(restored.confirmResult, before.confirmResult);
  const duplicate = await postJson(baseUrl, `/api/v1/imports/${id}/confirm`, { confirm: true });
  assert.equal(duplicate.json.error.code, "IMPORT_STATUS_INVALID");
  for (let i = 0; i < files.length; i++) assert.deepEqual(await fs.readFile(path.join(vaultPath, before.confirmResult.createdFiles[i].path)), files[i]);
});

test("large preview survives API restart and selected late candidates cannot bypass quote evidence", async t => {
  const vaultPath = await makeTempDir("yansilu-large-import-vault-");
  const source = await makeTempDir("yansilu-large-import-source-");
  t.after(() => fs.rm(source, { recursive: true, force: true }));
  const bodies = new Map();
  for (let index = 1; index <= 25; index++) {
    const file = `${String(index).padStart(2, "0")}.md`;
    const body = `---\ntype: permanent\n---\n# Judgment ${index}\n\n## 一句话论点\nI check the assumptions behind judgment ${index} before using it in a new situation.\n`;
    bodies.set(file, body);
    await fs.writeFile(path.join(source, file), body, "utf8");
  }
  const quotation = "Retrieval practice strengthens long term retention more than passive rereading.";
  const copied = `---\ntype: permanent\n---\n# Copied claim\n\n## 一句话论点\n${quotation}\n\n## 原文\n${quotation}\n`;
  bodies.set("26.md", copied);
  await fs.writeFile(path.join(source, "26.md"), copied, "utf8");
  const port = await findFreePort();
  const baseUrl = `http://127.0.0.1:${port}`;
  let child = startApi(port, vaultPath);
  t.after(() => stopApi(child));
  await waitForHealth(baseUrl);
  const preview = await postJson(baseUrl, "/api/v1/imports/preview", { connector: "obsidian", payload: { path: source }, options: {} });
  assert.equal(preview.status, 200, JSON.stringify(preview.json));
  assert.equal(preview.json.candidatePreview.permanentNotes.length, 26);
  assert.equal(preview.json.candidatePreview.sources.length, 26);
  assert.equal(preview.json.candidatePreview.truncated, false);
  const blocked = preview.json.candidatePreview.permanentNotes.find(item => item.title === "Copied claim");
  assert.equal(blocked.originalityStatus, "blocked");
  const late = preview.json.candidatePreview.permanentNotes.find(item => item.title === "Judgment 25");
  const journal = createImportRecordJournal();
  const legacy = await journal.read(vaultPath, preview.json.importRecordId);
  for (const key of ["sources", "literatureNotes", "permanentNotes"]) legacy.candidatePreview[key] = legacy.candidatePreview[key].slice(0, 12);
  legacy.candidatePreview.truncated = true;
  await journal.write(legacy);
  await stopApi(child);
  child = startApi(port, vaultPath);
  await waitForHealth(baseUrl);
  const record = (await getJson(baseUrl, `/api/v1/imports/${preview.json.importRecordId}`)).json.importRecord;
  assert.equal(record.candidatePreview.permanentNotes.length, 26);
  assert.equal(record.candidatePreview.sources.length, 26);
  assert.equal(record.candidatePreview.permanentNotes.find(item => item.id === blocked.id).originalityStatus, "blocked");
  const rejected = await postJson(baseUrl, `/api/v1/imports/${record.importRecordId}/confirm`, {
    confirm: true, selectedCandidateIds: [late.id, blocked.id]
  });
  assert.equal(rejected.status, 409, JSON.stringify(rejected.json));
  assert.equal(rejected.json.error.code, "IMPORT_ORIGINALITY_BLOCKED");
  assert.ok(rejected.json.error.details.blockedPermanentIds.includes(blocked.id));
  assert.equal((await getJson(baseUrl, "/api/v1/directories/dir_original_default/notes")).json.items.length, 0);
  const confirmation = await postJson(baseUrl, `/api/v1/imports/${record.importRecordId}/confirm`, {
    confirm: true, selectedCandidateIds: [late.id]
  });
  assert.equal(confirmation.status, 200, JSON.stringify(confirmation.json));
  assert.equal(confirmation.json.result.created.permanentNotes, 1);
  assert.equal(confirmation.json.result.createdFiles.some(item => item.noteId === blocked.id), false);
  const file = confirmation.json.result.createdFiles.find(item => item.noteId === late.id);
  assert.match(await fs.readFile(path.join(vaultPath, file.path), "utf8"), /judgment 25/);
  const completed = (await getJson(baseUrl, `/api/v1/imports/${record.importRecordId}`)).json.importRecord;
  assert.equal(completed.candidatePreview.permanentNotes.length, 26);
  for (const [name, body] of bodies) assert.equal(await fs.readFile(path.join(source, name), "utf8"), body);
});

test("an interrupted import journal cannot execute confirmation after API restart", async t => {
  const vaultPath = await makeTempDir("yansilu-import-interrupted-");
  const port = await findFreePort();
  const baseUrl = `http://127.0.0.1:${port}`;
  let child = startApi(port, vaultPath);
  t.after(() => stopApi(child));
  await waitForHealth(baseUrl);
  const preview = await postJson(baseUrl, "/api/v1/imports/preview", {
    connector: "obsidian", payload: { path: path.join(FIXTURES_ROOT, "markdown-basic") }, options: {}
  });
  assert.equal(preview.status, 200);
  const id = preview.json.importRecordId;
  await stopApi(child);
  const journal = createImportRecordJournal();
  const record = await journal.read(vaultPath, id);
  await journal.write({ ...record, state: "confirming" });
  child = startApi(port, vaultPath);
  await waitForHealth(baseUrl);
  const confirm = await postJson(baseUrl, `/api/v1/imports/${id}/confirm`, { confirm: true });
  assert.equal(confirm.json.error.code, "IMPORT_STATUS_INVALID");
  const restored = (await getJson(baseUrl, `/api/v1/imports/${id}`)).json.importRecord;
  assert.equal(restored.status, "interrupted");
  const files = await fs.readdir(path.join(vaultPath, "notes"), { recursive: true });
  assert.deepEqual(files.filter(name => name.endsWith(".md")), []);
});

test("lost import confirmation response is recovered from the real record without importing again", async t => {
  const vaultPath = await makeTempDir("yansilu-import-confirm-readback-");
  const port = await findFreePort();
  const baseUrl = `http://127.0.0.1:${port}`;
  const child = startApi(port, vaultPath);
  t.after(() => stopApi(child));
  await waitForHealth(baseUrl);
  const preview = await postJson(baseUrl, "/api/v1/imports/preview", {
    connector: "obsidian", payload: { path: path.join(FIXTURES_ROOT, "obsidian-realistic-vault") }, options: {}
  });
  assert.equal(preview.status, 200);
  const id = preview.json.importRecordId;
  let writes = 0, available = false;
  const confirm = createImportConfirmationRecovery({
    write: async (recordId, payload) => {
      writes++;
      const response = await postJson(baseUrl, `/api/v1/imports/${recordId}/confirm`, { confirm: true, ...payload });
      assert.equal(response.status, 200);
      throw Object.assign(new Error("response lost after import completed"), { code: "request_timeout" });
    },
    read: async recordId => available ? (await getJson(baseUrl, `/api/v1/imports/${recordId}`)).json.importRecord : null
  });
  await assert.rejects(confirm(id, { overrideOriginality: true }), { code: "IMPORT_CONFIRM_UNCERTAIN" });
  await assert.rejects(confirm(id, {}), { code: "IMPORT_CONFIRM_UNCERTAIN" });
  const record = (await getJson(baseUrl, `/api/v1/imports/${id}`)).json.importRecord;
  assert.equal(record.status, "completed");
  const before = [];
  for (const item of record.confirmResult.createdFiles) before.push(await fs.readFile(path.join(vaultPath, item.path)));
  assert.ok(before.length > 0);
  available = true;
  const recovered = await confirm(id, { selectedCandidateIds: [] });
  assert.equal(recovered.status, "completed");
  assert.deepEqual(recovered.result, record.confirmResult);
  assert.equal((await confirm(id, {})).status, "completed");
  assert.equal(writes, 1);
  for (let index = 0; index < before.length; index++) {
    assert.deepEqual(await fs.readFile(path.join(vaultPath, record.confirmResult.createdFiles[index].path)), before[index]);
  }
});

test("an import confirmation cannot follow a vault switch while its body is still arriving", async t => {
  const originalVault = await makeTempDir("yansilu-import-request-scope-");
  const otherVault = await makeTempDir("yansilu-import-request-other-");
  const port = await findFreePort();
  const baseUrl = `http://127.0.0.1:${port}`;
  const child = startApi(port, originalVault);
  t.after(() => stopApi(child));
  await waitForHealth(baseUrl);
  const preview = await postJson(baseUrl, "/api/v1/imports/preview", {
    connector: "obsidian", payload: { path: path.join(FIXTURES_ROOT, "obsidian-realistic-vault") }, options: {}
  });
  assert.equal(preview.status, 200);
  const id = preview.json.importRecordId;
  let pending;
  const response = new Promise((resolve, reject) => {
    pending = http.request(`${baseUrl}/api/v1/imports/${id}/confirm`, { method: "POST", headers: { "Content-Type": "application/json" } }, res => {
      let data = "";
      res.on("data", chunk => { data += chunk; });
      res.on("end", () => resolve({ status: res.statusCode, json: JSON.parse(data) }));
    });
    pending.on("error", reject);
    pending.write('{"confirm":');
  });
  t.after(() => pending.destroy());
  await new Promise(resolve => setTimeout(resolve, 150));
  assert.equal((await postJson(baseUrl, "/api/v1/vault", { vaultPath: otherVault })).status, 200);
  pending.end('true,"overrideOriginality":true}');
  const denied = await response;
  assert.equal(denied.status, 409);
  assert.equal(denied.json.error.code, "IMPORT_VAULT_CHANGED");
  const stale = await postJson(baseUrl, `/api/v1/imports/${id}/confirm`, { confirm: true, overrideOriginality: true });
  assert.equal(stale.status, 404);
  assert.equal(stale.json.error.code, "IMPORT_RECORD_NOT_FOUND");
  assert.equal((await getJson(baseUrl, `/api/v1/imports/${id}`)).status, 404);
  const sampleId = preview.json.samples.sourceIds[0];
  assert.equal((await getJson(baseUrl, `/api/v1/notes/${sampleId}`)).status, 404);
  await postJson(baseUrl, "/api/v1/vault", { vaultPath: originalVault });
  assert.equal((await getJson(baseUrl, `/api/v1/notes/${sampleId}`)).status, 404);
});

test("API import confirm can write only selected candidates from an Obsidian vault", async () => {
  const vaultPath = await makeTempDir("yansilu-api-vault-selected-");
  const port = await findFreePort();
  const baseUrl = `http://127.0.0.1:${port}`;
  const fixturePath = path.join(FIXTURES_ROOT, "obsidian-realistic-vault");
  const child = startApi(port, vaultPath);

  try {
    await waitForHealth(baseUrl);

    const preview = await postJson(baseUrl, "/api/v1/imports/preview", {
      connector: "obsidian",
      payload: { path: fixturePath },
      options: { detectWikilinks: true }
    });
    assert.equal(preview.status, 200, JSON.stringify(preview.json));

    const [selectedSourceId] = preview.json.samples.sourceIds;
    const confirm = await postJson(baseUrl, `/api/v1/imports/${preview.json.importRecordId}/confirm`, {
      confirm: true,
      selectedCandidateIds: [selectedSourceId]
    });

    assert.equal(confirm.status, 200, JSON.stringify(confirm.json));
    assert.deepEqual(confirm.json.result.created, {
      sources: 1,
      literatureNotes: 0,
      permanentNotes: 0
    });
    assert.deepEqual(confirm.json.result.selection, {
      mode: "subset",
      candidateIds: [selectedSourceId],
      totalCandidates: 4,
      selectedCandidates: 1,
      counts: {
        sources: 1,
        literatureNotes: 0,
        permanentNotes: 0
      }
    });
  } finally {
    await stopApi(child);
  }
});

test("API import confirm blocks originality-flagged permanent notes by default and allows explicit override", async () => {
  const vaultPath = await makeTempDir("yansilu-api-vault-originality-");
  const importRoot = await makeTempDir("yansilu-api-import-originality-");
  const port = await findFreePort();
  const baseUrl = `http://127.0.0.1:${port}`;
  const child = startApi(port, vaultPath);

  await fs.writeFile(
    path.join(importRoot, "copied-claim.md"),
    [
      "---",
      "title: Copied claim",
      "type: permanent",
      'tags: ["permanent"]',
      "---",
      "",
      "## 一句话论点",
      "A copied claim should remain a source excerpt.",
      "",
      "## 原文",
      "A copied claim should remain a source excerpt."
    ].join("\n"),
    "utf8"
  );

  try {
    await waitForHealth(baseUrl);

    const preview = await postJson(baseUrl, "/api/v1/imports/preview", {
      connector: "obsidian",
      payload: { path: importRoot }
    });
    assert.equal(preview.status, 200, JSON.stringify(preview.json));
    assert.deepEqual(preview.json.originalityGuard.flaggedPermanentIds, preview.json.samples.permanentNoteIds);

    const blocked = await postJson(baseUrl, `/api/v1/imports/${preview.json.importRecordId}/confirm`, {
      confirm: true
    });
    assert.equal(blocked.status, 409, JSON.stringify(blocked.json));
    assert.equal(blocked.json.error.code, "IMPORT_ORIGINALITY_BLOCKED");

    const subsetBlocked = await postJson(baseUrl, `/api/v1/imports/${preview.json.importRecordId}/confirm`, {
      confirm: true, selectedCandidateIds: preview.json.samples.permanentNoteIds
    });
    assert.equal(subsetBlocked.status, 409, JSON.stringify(subsetBlocked.json));
    assert.equal(subsetBlocked.json.error.code, "IMPORT_ORIGINALITY_BLOCKED");

    const confirmed = await postJson(baseUrl, `/api/v1/imports/${preview.json.importRecordId}/confirm`, {
      confirm: true,
      overrideOriginality: true
    });
    assert.equal(confirmed.status, 200, JSON.stringify(confirmed.json));
    assert.deepEqual(confirmed.json.originalityGuard.flaggedPermanentIds, preview.json.samples.permanentNoteIds);
  } finally {
    await stopApi(child);
  }
});

test("API import confirm writes obsidian literature, permanent notes, and copied assets", async () => {
  const vaultPath = await makeTempDir("yansilu-api-vault-obsidian-");
  const port = await findFreePort();
  const baseUrl = `http://127.0.0.1:${port}`;
  const fixturePath = path.join(FIXTURES_ROOT, "obsidian-realistic-vault");
  const child = startApi(port, vaultPath);

  try {
    await waitForHealth(baseUrl);

    const preview = await postJson(baseUrl, "/api/v1/imports/preview", {
      connector: "obsidian",
      payload: { path: fixturePath },
      options: { detectWikilinks: true }
    });
    assert.equal(preview.status, 200, JSON.stringify(preview.json));

    const confirm = await postJson(baseUrl, `/api/v1/imports/${preview.json.importRecordId}/confirm`, {
      confirm: true,
      directoryId: "dir_literature_default"
    });
    assert.equal(confirm.status, 200, JSON.stringify(confirm.json));
    assert.deepEqual(confirm.json.result.created, {
      sources: 2,
      literatureNotes: 1,
      permanentNotes: 1
    });
    assert.ok(confirm.json.result.createdFiles.some((item) => item.noteType === "asset"));

    const literatureFile = confirm.json.result.createdFiles.find((item) => item.noteType === "literature");
    const markdown = await fs.readFile(path.join(vaultPath, literatureFile.path), "utf8");
    assert.match(markdown, /assets\/imports\//);
  } finally {
    await stopApi(child);
  }
});

test("API import records can be fetched and listed during the current app session", async () => {
  const vaultPath = await makeTempDir("yansilu-api-vault-records-");
  const port = await findFreePort();
  const baseUrl = `http://127.0.0.1:${port}`;
  const fixturePath = path.join(FIXTURES_ROOT, "obsidian-realistic-vault");
  const child = startApi(port, vaultPath);

  try {
    await waitForHealth(baseUrl);

    const preview = await postJson(baseUrl, "/api/v1/imports/preview", {
      connector: "obsidian",
      payload: { path: fixturePath },
      options: { detectWikilinks: true }
    });
    assert.equal(preview.status, 200, JSON.stringify(preview.json));

    const fetchedPreview = await getJson(baseUrl, `/api/v1/imports/${preview.json.importRecordId}`);
    assert.equal(fetchedPreview.status, 200, JSON.stringify(fetchedPreview.json));
    assert.equal(fetchedPreview.json.importRecord.status, "preview");

    const confirm = await postJson(baseUrl, `/api/v1/imports/${preview.json.importRecordId}/confirm`, {
      confirm: true,
      directoryId: "dir_literature_default",
      overrideOriginality: true
    });
    assert.equal(confirm.status, 200, JSON.stringify(confirm.json));

    const fetchedCompleted = await getJson(baseUrl, `/api/v1/imports/${preview.json.importRecordId}`);
    assert.equal(fetchedCompleted.status, 200, JSON.stringify(fetchedCompleted.json));
    assert.equal(fetchedCompleted.json.importRecord.status, "completed");

    const listed = await getJson(baseUrl, "/api/v1/imports?limit=10");
    assert.equal(listed.status, 200, JSON.stringify(listed.json));
    assert.ok(Array.isArray(listed.json.items));
    assert.ok(listed.json.items.some((item) => item.importRecordId === preview.json.importRecordId));
  } finally {
    await stopApi(child);
  }
});

test("API import preview returns warnings instead of 500 for unreadable obsidian paths", async () => {
  const vaultPath = await makeTempDir("yansilu-api-vault-unreadable-");
  const port = await findFreePort();
  const baseUrl = `http://127.0.0.1:${port}`;
  const child = startApi(port, vaultPath);

  try {
    await waitForHealth(baseUrl);

    const preview = await postJson(baseUrl, "/api/v1/imports/preview", {
      connector: "obsidian",
      payload: { path: path.join(vaultPath, "missing-obsidian-vault") }
    });

    assert.equal(preview.status, 200, JSON.stringify(preview.json));
    assert.equal(preview.json.summary.sources, 0);
    assert.equal(preview.json.summary.literatureNotes, 0);
    assert.equal(preview.json.summary.permanentNotes, 0);
    assert.equal(preview.json.summary.warnings, 1);
    assert.equal(preview.json.warnings[0].code, "IMPORT_SOURCE_UNREADABLE");
  } finally {
    await stopApi(child);
  }
});

test("API import rollback is rejected in simplified mode", async () => {
  const vaultPath = await makeTempDir("yansilu-api-vault-rollback-");
  const port = await findFreePort();
  const baseUrl = `http://127.0.0.1:${port}`;
  const fixturePath = path.join(FIXTURES_ROOT, "obsidian-realistic-vault");
  const child = startApi(port, vaultPath);

  try {
    await waitForHealth(baseUrl);

    const preview = await postJson(baseUrl, "/api/v1/imports/preview", {
      connector: "obsidian",
      payload: { path: fixturePath },
      options: { detectWikilinks: true }
    });
    assert.equal(preview.status, 200, JSON.stringify(preview.json));

    const confirm = await postJson(baseUrl, `/api/v1/imports/${preview.json.importRecordId}/confirm`, {
      confirm: true,
      directoryId: "dir_literature_default",
      overrideOriginality: true
    });
    assert.equal(confirm.status, 200, JSON.stringify(confirm.json));

    const rollback = await postJson(baseUrl, `/api/v1/imports/${preview.json.importRecordId}/rollback`, {});
    assert.equal(rollback.status, 400, JSON.stringify(rollback.json));
    assert.equal(rollback.json.error.code, "IMPORT_ROLLBACK_UNSUPPORTED");
  } finally {
    await stopApi(child);
  }
});
