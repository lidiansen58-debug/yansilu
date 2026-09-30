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
  const writingState = {
    project: { id: "project-a", draft_note_id: "draft-a" },
    scaffold: { id: "outline-a" }, scaffoldMarkdown: "Outline",
    selectedThemeIndexId: "theme-a", draftMarkdown: editor.value, draftSaveState: "dirty"
  };
  const state = { notes: [], noteMoveVaultScope: {} };
  const messages = [];
  const deps = {
    state, writingState,
    $: id => id === "btnWritingSaveDraft" ? button : id === "writingDraftEditor" ? editor : null,
    writingDraftDirectoryId: () => "dir_original_default",
    writingDraftTitle: () => "Article",
    writingDraftBody: () => editor.value,
    mapNoteItem: note => note,
    setStatus: (message, tone) => messages.push({ message, tone }),
    renderWritingPanel: () => { editor.value = writingState.draftMarkdown; },
    updateNote: async (id, payload) => ({ id, ...payload })
  };
  return { deps, editor, button, writingState, state, messages };
}

test("slow save preserves newer text and leaves it explicitly unsaved", async () => {
  const { deps, editor, writingState, state, button } = setup();
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
  assert.equal(button.textContent, "保存草稿");
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
  const { deps, editor, writingState, button } = setup();
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
  assert.equal(button.textContent, "保存失败，重试");
  await handleWritingSaveDraftClick(deps);
  assert.deepEqual(writes, ["draft-a", "draft-a"]);
  assert.equal(writingState.draftSaveState, "saved");
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

test("first draft binding failure retries the same created note", async () => {
  const { deps, writingState } = setup();
  writingState.project.draft_note_id = null;
  let creates = 0, binds = 0;
  deps.createNote = async payload => { creates++; return { id: "new-draft", ...payload }; };
  deps.bindWritingDraftNote = async (projectId, noteId) => {
    assert.equal(noteId, "new-draft");
    if (++binds === 1) throw new Error("Binding unavailable");
    return { id: projectId, draft_note_id: noteId };
  };
  await handleWritingSaveDraftClick(deps);
  assert.equal(writingState.draftSaveState, "error");
  await handleWritingSaveDraftClick(deps);
  assert.equal(creates, 1);
  assert.equal(binds, 2);
  assert.equal(writingState.draftSaveState, "saved");
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
