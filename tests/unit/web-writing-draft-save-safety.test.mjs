import test from "node:test";
import assert from "node:assert/strict";
import { handleWritingSaveDraftClick } from "../../apps/web/src/writing-panel-events.js";
import { assertWritingDraftCanLeave, recordWritingDraftInput } from "../../apps/web/src/writing-draft-save-controller.js";
import { writingDraftContent } from "../../apps/web/src/writing-workbench-model.js";

function deferred() {
  let resolve, reject;
  const promise = new Promise((done, fail) => { resolve = done; reject = fail; });
  return { promise, resolve, reject };
}

function setup() {
  const editor = { value: "# Article\n\nFirst text" };
  const button = { textContent: "保存草稿", disabled: false };
  const feedback = { textContent: "" };
  const writingState = {
    project: { id: "project-a", draft_note_id: "draft-a", draft_note: { id: "draft-a", body: "# Article\n\nSaved text" } },
    scaffold: { id: "outline-a" }, scaffoldMarkdown: "Outline",
    selectedThemeIndexId: "theme-a", draftMarkdown: editor.value, draftSaveState: "dirty"
  };
  const state = { notes: [], noteMoveVaultScope: {} };
  const messages = [];
  const deps = {
    state, writingState,
    $: id => id === "btnWritingSaveDraft" ? button : id === "writingDraftEditor" ? editor : id === "writingDraftSaveFeedback" ? feedback : null,
    writingDraftDirectoryId: () => "dir_original_default",
    writingDraftTitle: () => "Article",
    writingDraftBody: () => editor.value,
    mapNoteItem: note => note,
    setStatus: (message, tone) => messages.push({ message, tone }),
    renderWritingPanel: () => { editor.value = writingState.draftMarkdown; },
    updateNote: async (id, payload) => ({ id, ...payload })
  };
  return { deps, editor, button, feedback, writingState, state, messages };
}

test("fresh article controller rechecks a lost save and retains later input without another write", async () => {
  const records = new Map();
  const storage = { getItem: key => records.get(key) ?? null, setItem: (key, value) => records.set(key, value), removeItem: key => records.delete(key) };
  const revision = "a".repeat(64);
  let writes = 0, saved;
  const first = setup();
  Object.assign(first.deps, {
    getVaultPath: () => "vault", getStorage: () => storage,
    createSaveOperationId: () => "article-save-operation",
    updateNote: async (id, payload) => { writes++; saved = { id, ...payload, fileRevision: revision }; throw new Error("Lost response"); },
    checkNoteSave: async () => { throw new Error("Offline"); }
  });
  await handleWritingSaveDraftClick(first.deps);
  assert.equal(first.writingState.draftSaveState, "error");
  const refreshed = setup();
  refreshed.editor.value = refreshed.writingState.draftMarkdown = "Later article input";
  Object.assign(refreshed.deps, {
    getVaultPath: () => "vault", getStorage: () => storage,
    updateNote: async () => { writes++; throw new Error("Must not write"); },
    checkNoteSave: async (id, operationId, options) => {
      assert.equal(id, "draft-a");
      assert.equal(operationId, "article-save-operation");
      assert.equal(options.expectedVaultPath, "vault");
      return { state: "completed", note: saved, fileRevision: revision };
    }
  });
  await handleWritingSaveDraftClick(refreshed.deps);
  assert.equal(writes, 1);
  assert.equal(refreshed.editor.value, "Later article input");
  assert.equal(refreshed.writingState.draftSaveState, "dirty");
  assert.equal(refreshed.writingState.project.draft_note.body, saved.body);
  assert.equal(records.size, 0);
});

test("failed local input checkpoint retains visible text and blocks the remote save", async () => {
  const s = setup();
  s.deps.getVaultPath = () => "vault";
  s.deps.recoveryStorage = { setItem: () => { throw new Error("Storage full"); } };
  let writes = 0;
  s.deps.updateNote = async () => { writes++; };
  recordWritingDraftInput(s.deps, "My retained input");
  s.editor.value = "My retained input";
  assert.match(s.messages.at(-1).message, /请勿刷新/);
  await handleWritingSaveDraftClick(s.deps);
  assert.equal(writes, 0);
  assert.equal(s.writingState.draftMarkdown, "My retained input");
  assert.equal(s.writingState.draftSaveState, "error");
});

test("slow save preserves newer text and leaves it explicitly unsaved", async () => {
  const { deps, editor, writingState, state, button, feedback } = setup();
  const request = deferred();
  deps.updateNote = async (id, payload) => { await request.promise; return { id, ...payload }; };
  const saving = handleWritingSaveDraftClick(deps);
  editor.value += "\n\nLater text";
  writingState.draftMarkdown = editor.value;
  writingState.draftSaveState = "dirty";
  request.resolve();
  await saving;
  assert.match(editor.value, /Later text/);
  assert.match(writingState.draftMarkdown, /Later text/);
  assert.equal(writingState.draftSaveState, "dirty");
  assert.doesNotMatch(state.notes[0].body, /Later text/);
  assert.equal(button.textContent, "保存");
  assert.match(feedback.textContent, /未保存/);
});

test("duplicate save while an earlier request is pending writes only once", async () => {
  const { deps, writingState } = setup();
  const request = deferred();
  let writes = 0;
  deps.updateNote = async (id, payload) => { writes++; await request.promise; return { id, ...payload }; };
  const first = handleWritingSaveDraftClick(deps);
  writingState.draftSaveState = "dirty";
  const second = handleWritingSaveDraftClick(deps);
  request.resolve();
  await Promise.all([first, second]);
  assert.equal(writes, 1);
});

for (const change of ["project", "vault", "draft"]) test(`late save success does not overwrite a changed ${change}`, async () => {
  const { deps, editor, writingState, state, messages } = setup();
  const request = deferred();
  deps.updateNote = async (id, payload) => { await request.promise; return { id, ...payload }; };
  const saving = handleWritingSaveDraftClick(deps);
  if (change === "project") writingState.project = { id: "project-b", draft_note_id: "draft-b" };
  else if (change === "draft") writingState.project.draft_note_id = "draft-b";
  else state.noteMoveVaultScope = {};
  writingState.draftMarkdown = editor.value = "Other context text";
  writingState.draftSaveState = "dirty";
  request.resolve();
  await saving;
  assert.equal(writingState.draftMarkdown, "Other context text");
  assert.equal(writingState.draftSaveState, "dirty");
  assert.deepEqual(state.notes, []);
  assert.deepEqual(messages, []);
});

test("save failure retains input and retry updates the same note", async () => {
  const { deps, editor, writingState, button, feedback } = setup();
  const original = editor.value;
  const writes = [];
  deps.updateNote = async (id, payload) => {
    writes.push(id);
    if (writes.length === 1) throw new Error("Disk unavailable");
    return { id, ...payload };
  };
  await handleWritingSaveDraftClick(deps);
  assert.equal(editor.value, original);
  assert.equal(writingState.draftSaveState, "error");
  assert.equal(button.textContent, "重试保存");
  assert.match(feedback.textContent, /保存失败.*保留/);
  await handleWritingSaveDraftClick(deps);
  assert.deepEqual(writes, ["draft-a", "draft-a"]);
  assert.equal(writingState.draftSaveState, "saved");
  assert.equal(feedback.textContent, "已保存");
});

test("typing during save keeps the save button disabled and blocks theme replacement", async () => {
  const { deps, editor, button, writingState } = setup();
  const request = deferred();
  deps.updateNote = async (id, payload) => { await request.promise; return { id, ...payload }; };
  const saving = handleWritingSaveDraftClick(deps);
  recordWritingDraftInput(deps, editor.value += "\nLater text");
  assert.equal(button.disabled, true);
  assert.equal(writingState.draftSaveState, "saving");
  assert.throws(() => assertWritingDraftCanLeave(writingState), /正在保存/);
  request.resolve();
  await saving;
  assert.throws(() => assertWritingDraftCanLeave(writingState), /未保存/);
  await handleWritingSaveDraftClick(deps);
  assert.doesNotThrow(() => assertWritingDraftCanLeave(writingState));
});

test("cleared input remains empty instead of falling back to saved text", () => {
  for (const status of ["dirty", "error", "saving"]) {
    assert.equal(writingDraftContent({ writingState: { draftMarkdown: "", draftSaveState: status, project: { draft_note: { body: "Saved text" } } } }), "");
  }
});

test("first draft binding failure retries binding without saving newer input", async () => {
  const { deps, writingState, editor } = setup();
  writingState.project.draft_note_id = null;
  let creates = 0, binds = 0;
  deps.getVaultPath = () => "vault";
  deps.createNoteId = () => "12345678-1234-4234-8234-123456789abc";
  deps.createNote = async payload => { creates++; return { id: `note_${payload.clientCreationId}`, ...payload }; };
  deps.bindWritingDraftNote = async (projectId, noteId, _scaffold, _version, options) => {
    assert.equal(options.expectedVaultPath, "vault");
    assert.equal(noteId, "note_12345678-1234-4234-8234-123456789abc");
    if (++binds === 1) throw new Error("Binding unavailable");
    return { id: projectId, draft_note_id: noteId };
  };
  await handleWritingSaveDraftClick(deps);
  assert.equal(writingState.draftSaveState, "error");
  editor.value += "\nNewer unbound input";
  recordWritingDraftInput(deps, editor.value);
  deps.updateNote = async () => { assert.fail("binding recovery must not update the file"); };
  await handleWritingSaveDraftClick(deps);
  assert.equal(creates, 1);
  assert.equal(binds, 2);
  assert.equal(writingState.draftSaveState, "dirty");
  assert.match(editor.value, /Newer unbound input/);
  assert.doesNotMatch(writingState.project.draft_note.body, /Newer unbound input/);
});

test("uncertain first article creation rechecks one ID and preserves newer input", async () => {
  const { deps, writingState, editor } = setup();
  writingState.project.draft_note_id = null;
  let creates = 0, reads = 0, found = null, saved;
  deps.createNoteId = () => "12345678-1234-4234-8234-123456789abc";
  deps.createNote = async payload => {
    creates++;
    saved = { id: `note_${payload.clientCreationId}`, ...payload };
    throw Object.assign(new Error("lost response"), { code: "request_timeout" });
  };
  deps.fetchNote = async id => { reads++; assert.equal(id, saved.id); return found; };
  deps.bindWritingDraftNote = async (id, noteId) => ({ id, draft_note_id: noteId });
  await handleWritingSaveDraftClick(deps);
  assert.equal(writingState.draftSaveState, "error");
  await handleWritingSaveDraftClick(deps);
  assert.equal(creates, 2);
  editor.value += "\nNewer input";
  recordWritingDraftInput(deps, editor.value);
  found = saved;
  await handleWritingSaveDraftClick(deps);
  assert.equal(creates, 2);
  assert.equal(reads, 4);
  assert.equal(writingState.project.draft_note_id, saved.id);
  assert.equal(writingState.draftSaveState, "dirty");
  assert.match(editor.value, /Newer input/);
  assert.doesNotMatch(writingState.project.draft_note.body, /Newer input/);
  await handleWritingSaveDraftClick(deps);
  assert.equal(creates, 2);
  assert.equal(writingState.draftSaveState, "saved");
});

test("creation readback cannot replace article input with externally changed prose", async () => {
  const { deps, writingState, editor } = setup();
  writingState.project.draft_note_id = null;
  const input = editor.value;
  let saved;
  deps.createNoteId = () => "12345678-1234-4234-8234-123456789abc";
  deps.createNote = async payload => {
    saved = { id: `note_${payload.clientCreationId}`, ...payload, body: "# Article\n\nExternal prose" };
    throw Object.assign(new Error("lost response"), { code: "request_timeout" });
  };
  deps.fetchNote = async () => saved;
  deps.bindWritingDraftNote = async (id, noteId) => ({ id, draft_note_id: noteId });
  await handleWritingSaveDraftClick(deps);
  assert.equal(editor.value, input);
  assert.equal(writingState.draftSaveState, "dirty");
  assert.equal(writingState.project.draft_note.body, saved.body);
});

test("version-list failure does not falsely mark saved text as failed", async () => {
  const { deps, writingState, messages } = setup();
  deps.listProjectDraftVersions = async () => { throw new Error("List unavailable"); };
  await handleWritingSaveDraftClick(deps);
  assert.equal(writingState.draftSaveState, "saved");
  assert.match(messages.at(-1).message, /正文已保存.*列表刷新失败/);
});

test("text written during version refresh also survives save completion", async () => {
  const { deps, writingState, editor } = setup();
  deps.listProjectDraftVersions = async () => {
    recordWritingDraftInput(deps, editor.value += "\nDuring refresh");
    return [];
  };
  await handleWritingSaveDraftClick(deps);
  assert.match(writingState.draftMarkdown, /During refresh/);
  assert.equal(writingState.draftSaveState, "dirty");
});
