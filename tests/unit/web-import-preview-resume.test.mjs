import test from "node:test";
import assert from "node:assert/strict";
import { createImportPreviewResumeController } from "../../apps/web/src/import-preview-resume-controller.js";
import { canResumeImportPreview, importRequestMatches, syncImportPreviewEntry } from "../../apps/web/src/import-preview-resume-model.js";
import { persistImportWorkspace, restoreImportWorkspace, createImportWorkspaceRecovery } from "../../apps/web/src/import-workspace-recovery.js";
import { createImportToolbarActions } from "../../apps/web/src/import-toolbar-actions.js";

function harness(extra = {}) {
  const values = { connector: "obsidian", path: "C:/source", payload: "", options: "", importRecordId: "imp" };
  const request = { connector: "obsidian", payload: { path: values.path }, options: {} };
  const record = { importRecordId: "imp", ...request, status: "preview", candidatePreview: {
    sources: [{ id: "source" }], permanentNotes: [{ id: "safe" }, { id: "new" }, { id: "blocked", originalityStatus: "blocked" }]
  } };
  const state = { lastPreview: { ...record }, previewRequest: { ...values }, selectedCandidateIds: new Set(["source", "safe", "blocked", "missing"]) };
  const calls = { reads: 0, results: [], statuses: [], checkpoints: 0, clears: 0 };
  const scope = { vault: "vault" };
  const resume = createImportPreviewResumeController({ importState: state, getToolbarValues: () => values,
    getVaultPath: () => scope.vault, readImportRecord: async () => { calls.reads++; return record; },
    showImportResult: payload => calls.results.push(payload), setStatus: (...args) => calls.statuses.push(args),
    checkpoint: () => calls.checkpoints++, clearCache: () => calls.clears++, ...extra });
  return { values, request, record, state, calls, scope, resume };
}

test("resume upgrades full metadata but never selects newly revealed or guarded candidates", async () => {
  const h = harness();
  assert.equal((await h.resume(h.values, h.request)).handled, true);
  assert.deepEqual([...h.state.selectedCandidateIds], ["source", "safe"]);
  assert.equal(h.calls.results[0].stage, "preview");
  assert.equal(h.state.previewResumeBusy, false);
});

test("same pending read is coalesced even when read rejects synchronously", async () => {
  let complete, reads = 0;
  const h = harness({ readImportRecord: () => { reads++; return new Promise(resolve => { complete = resolve; }); } });
  const first = h.resume(h.values, h.request);
  assert.equal(h.resume(h.values, h.request), first);
  await Promise.resolve();
  complete(h.record);
  await first;
  assert.equal(reads, 1);
  const failed = harness({ readImportRecord: () => { throw new Error("connection refused"); } });
  await failed.resume(failed.values, failed.request);
  assert.equal(failed.state.previewResumeBusy, false);
  assert.match(failed.calls.results[0].message, /connection refused/);
  assert.deepEqual([...failed.state.selectedCandidateIds], ["source", "safe", "blocked", "missing"]);
});

test("legacy cache cannot carry hidden default selections into the expanded preview", async () => {
  const h = harness();
  h.state.lastPreview = { ...h.state.lastPreview, candidatePreview: {
    sources: [{ id: "source" }], permanentNotes: [{ id: "safe" }], truncated: true
  } };
  h.state.selectedCandidateIds.add("new");
  await h.resume(h.values, h.request);
  assert.deepEqual([...h.state.selectedCandidateIds], ["source", "safe"]);
});

for (const mutation of ["vault", "path", "record", "options"]) {
  test(`late resume response cannot overwrite changed ${mutation}`, async () => {
    let complete;
    const h = harness({ readImportRecord: () => new Promise(resolve => { complete = resolve; }) });
    const pending = h.resume(h.values, h.request);
    await Promise.resolve();
    if (mutation === "vault") h.scope.vault = "other";
    if (mutation === "path") h.values.path = "C:/other";
    if (mutation === "record") h.state.lastPreview = { importRecordId: "new-record" };
    if (mutation === "options") h.values.options = '{"detectWikilinks":true}';
    complete(h.record);
    assert.equal((await pending).handled, true);
    assert.equal(h.calls.results.length, 0);
    assert.equal(h.calls.statuses.length, 0);
  });
}

for (const status of ["completed", "confirming", "interrupted", "failed", "cancelled"]) {
  test(`${status} record opens readonly status, not another preview or confirmation`, async () => {
    const h = harness();
    h.record.status = status;
    const result = await h.resume(h.values, h.request, { restart: true });
    assert.equal(result.handled, true);
    assert.equal(h.calls.results[0].stage, "record");
    assert.equal(h.calls.clears, ["completed", "cancelled"].includes(status) ? 1 : 0);
    assert.equal(canResumeImportPreview(h.state, h.values), !["completed", "cancelled"].includes(status));
  });
}

test("explicit rescan is allowed only after verifying pending preview", async () => {
  const h = harness();
  assert.equal(await h.resume(h.values, h.request, { restart: true }), null);
  assert.equal(h.calls.reads, 1);
  assert.equal(h.calls.results.length, 0);
});

for (const corruption of ["missing", "id", "payload", "options"]) {
  test(`invalid server record (${corruption}) keeps cache and does not rescan`, async () => {
    const h = harness();
    if (corruption === "id") h.record.importRecordId = "other";
    if (corruption === "payload") h.record.payload = { path: "other" };
    if (corruption === "options") h.record.options = { detectWikilinks: true };
    if (corruption === "missing") h.record.candidatePreview = null;
    assert.equal((await h.resume(h.values, h.request)).handled, true);
    assert.equal(h.calls.results[0].stage, "preview_error");
    assert.equal(h.calls.clears, 0);
  });
}

test("toolbar keeps one primary, updates without remounting, and source edits require new preview", () => {
  const h = harness();
  const button = {}, restart = {};
  const get = id => id === "btnImportPreview" ? button : restart;
  syncImportPreviewEntry(get, h.state, h.values);
  assert.equal(button.textContent, "继续核对");
  assert.equal(restart.hidden, false);
  h.values.directoryId = "another-target";
  assert.equal(canResumeImportPreview(h.state, h.values), true);
  h.values.path = "C:/another-source";
  syncImportPreviewEntry(get, h.state, h.values);
  assert.equal(button.textContent, "预览笔记");
  assert.equal(restart.hidden, true);
  assert.equal(importRequestMatches(h.record, { ...h.request, payload: { path: "C:/source" } }), true);
});

test("legacy cache restores request snapshot and completion clear removes it", () => {
  const h = harness(), data = new Map();
  const storage = { getItem: key => data.get(key), setItem: (key, value) => data.set(key, value), removeItem: key => data.delete(key) };
  persistImportWorkspace(storage, "vault", h.state, h.values);
  const key = [...data.keys()][0];
  const saved = JSON.parse(data.get(key));
  delete saved.previewRequest;
  data.set(key, JSON.stringify(saved));
  const state = {};
  const values = restoreImportWorkspace(storage, "vault", state);
  assert.equal(canResumeImportPreview(state, values), true);
  const recovery = createImportWorkspaceRecovery({ getVaultPath: () => "vault", getStorage: () => storage });
  recovery.clear();
  assert.equal(data.size, 0);
});

test("resume read failures never fall through to preview POST", async () => {
  const h = harness({ readImportRecord: async () => { throw new Error("offline"); } });
  const actions = createImportToolbarActions({ getToolbarValues: () => h.values, resumeImportPreview: h.resume,
    previewImport: () => assert.fail("must not write"), setStatus: () => {} });
  assert.equal(await actions.handlePreview(), null);
  assert.equal(h.calls.results[0].stage, "preview_error");
});
