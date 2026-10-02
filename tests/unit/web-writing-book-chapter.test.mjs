import test from "node:test";
import assert from "node:assert/strict";
import { selectWritingDraftTarget, selectedWritingBookChapter } from "../../apps/web/src/writing-book-chapter-controller.js";
import { assertWritingDraftCanLeave, recordWritingDraftInput, handleWritingSaveDraftClick } from "../../apps/web/src/writing-draft-save-controller.js";
import { writingDraftContent } from "../../apps/web/src/writing-workbench-model.js";
const creationId = "12345678-1234-4234-8234-123456789abc";
const createdNoteId = `note_${creationId}`;

function deferred() {
  let resolve, reject;
  const promise = new Promise((done, fail) => { resolve = done; reject = fail; });
  return { promise, resolve, reject };
}
function setup() {
  const writingState = { project: { id: "book", draft_note_id: "article", book_structure: {
    parts: [{ id: "part", chapters: [
      { id: "first", title: "First", evidence_note_ids: ["source"] },
      { id: "second", title: "Second", draft_note_id: "chapter-second" }
    ] }]
  } }, scaffold: { id: "article-outline" }, draftMarkdown: "# Article\n\nKeep article prose", draftSaveState: "saved" };
  const state = { notes: [{ id: "source", title: "Real source" }], noteMoveVaultScope: {}, module: "writing" };
  const editor = { value: writingState.draftMarkdown }, select = { value: "" }, button = {};
  const messages = [], writes = [];
  const deps = { writingState, state, assertWritingDraftCanLeave, getVaultPath: () => "test-vault",
    createNoteId: () => creationId,
    $: id => ({ writingDraftEditor: editor, writingDraftTarget: select, btnWritingSaveDraft: button })[id],
    renderWritingPanel: () => { editor.value = writingDraftContent({ writingState }); },
    setStatus: message => messages.push(message),
    writingDraftDirectoryId: () => "dir_original_default",
    fetchNote: async id => ({ id, body: `# Second\n\nSaved ${id}` }),
    createNote: async payload => { writes.push(["create", payload]); return { id: `note_${payload.clientCreationId}`, ...payload }; },
    updateNote: async (id, payload) => { writes.push([id, payload]); return { id, ...payload }; },
    fetchWritingProject: async () => structuredClone(writingState.project),
    updateWritingProjectBookStructure: async (id, payload) => {
      assert.equal(payload.expectedVaultPath, "test-vault");
      return { ...writingState.project, book_structure: payload.bookStructure };
    }
  };
  return { deps, writingState, state, editor, select, messages, writes };
}

test("fresh chapter controller rechecks a lost save and preserves later prose", async () => {
  const records = new Map();
  const storage = { getItem: key => records.get(key) ?? null, setItem: (key, value) => records.set(key, value), removeItem: key => records.delete(key) };
  const revision = "b".repeat(64);
  let writes = 0, saved;
  const first = setup();
  first.deps.getStorage = () => storage;
  first.deps.createSaveOperationId = () => "chapter-save-operation";
  first.deps.updateNote = async (id, payload) => { writes++; saved = { id, ...payload, fileRevision: revision }; throw new Error("Lost response"); };
  first.deps.checkNoteSave = async () => { throw new Error("Offline"); };
  await selectWritingDraftTarget(first.deps, "second");
  first.editor.value = "Submitted chapter";
  recordWritingDraftInput(first.deps, first.editor.value);
  await handleWritingSaveDraftClick(first.deps);
  assert.equal(first.writingState.bookChapter.saveState, "error");
  assert.equal(first.writingState.bookChapter.saveErrorCode, "NOTE_SAVE_RESULT_UNCERTAIN");
  const refreshed = setup();
  refreshed.deps.getStorage = () => storage;
  refreshed.deps.updateNote = async () => { writes++; throw new Error("Must not write"); };
  refreshed.deps.checkNoteSave = async (id, operationId, options) => {
    assert.equal(id, "chapter-second");
    assert.equal(operationId, "chapter-save-operation");
    assert.equal(options.expectedVaultPath, "test-vault");
    return { state: "completed", note: saved, fileRevision: revision };
  };
  await selectWritingDraftTarget(refreshed.deps, "second");
  refreshed.editor.value = "Later chapter input";
  recordWritingDraftInput(refreshed.deps, refreshed.editor.value);
  await handleWritingSaveDraftClick(refreshed.deps);
  assert.equal(writes, 1);
  assert.equal(refreshed.editor.value, "Later chapter input");
  assert.equal(refreshed.writingState.bookChapter.saveState, "dirty");
  assert.equal(refreshed.writingState.bookChapter.saveErrorCode, "");
  assert.equal(refreshed.writingState.bookChapter.savedBody, "Submitted chapter");
  assert.equal(records.size, 0);
});

test("chapter input survives a fresh controller state without adopting a newer disk baseline", async () => {
  const records = new Map();
  const storage = { getItem: key => records.get(key) ?? null, setItem: (key, value) => records.set(key, value), removeItem: key => records.delete(key) };
  const first = setup();
  first.deps.recoveryStorage = storage;
  await selectWritingDraftTarget(first.deps, "second");
  const baseline = first.writingState.bookChapter.savedBody;
  recordWritingDraftInput(first.deps, "My unsaved chapter");
  const refreshed = setup();
  refreshed.deps.recoveryStorage = storage;
  refreshed.deps.fetchNote = async id => ({ id, body: "External newer body", fileRevision: "new-version" });
  await selectWritingDraftTarget(refreshed.deps, "second");
  assert.equal(refreshed.editor.value, "My unsaved chapter");
  assert.equal(refreshed.writingState.bookChapter.savedBody, baseline);
  assert.equal(refreshed.writingState.bookChapter.saveState, "dirty");
  await handleWritingSaveDraftClick(refreshed.deps);
  assert.equal(refreshed.writes[0][1].expectedBody, baseline);
  assert.equal(records.size, 0);
});

test("damaged chapter recovery record does not commit a partial selection", async () => {
  const s = setup();
  s.deps.recoveryStorage = { getItem: () => "null" };
  await selectWritingDraftTarget(s.deps, "second");
  assert.equal(selectedWritingBookChapter(s.writingState), null);
  assert.equal(s.editor.value, "# Article\n\nKeep article prose");
  assert.match(s.messages.at(-1), /本机草稿恢复记录/);
});

test("chapter selection, separate saving and return preserve the article and real references", async () => {
  const s = setup();
  await selectWritingDraftTarget(s.deps, "first");
  assert.match(s.editor.value, /\[\[source\|Real source\]\]/);
  s.editor.value += "My first chapter";
  recordWritingDraftInput(s.deps, s.editor.value);
  assert.throws(() => assertWritingDraftCanLeave(s.writingState), /章节还有未保存/);
  await selectWritingDraftTarget(s.deps, "second");
  assert.equal(selectedWritingBookChapter(s.writingState).id, "first");
  await handleWritingSaveDraftClick(s.deps);
  assert.equal(s.writingState.bookChapter.saveState, "saved");
  assert.equal(s.writingState.project.book_structure.parts[0].chapters[0].draft_note_id, createdNoteId);
  assert.equal(s.writingState.project.draft_note_id, "article");
  await selectWritingDraftTarget(s.deps, "second");
  assert.match(s.editor.value, /Saved chapter-second/);
  await selectWritingDraftTarget(s.deps, "");
  assert.equal(s.editor.value, "# Article\n\nKeep article prose");
});

test("new chapter seed preserves IDs when evidence notes share a title", async () => {
  const s = setup();
  s.state.notes.push({ id: "source-duplicate", title: "Real source" });
  s.writingState.project.book_structure.parts[0].chapters[0].evidence_note_ids = ["source", "source-duplicate"];
  await selectWritingDraftTarget(s.deps, "first");
  assert.match(s.editor.value, /\[\[source\|Real source\]\]/);
  assert.match(s.editor.value, /\[\[source-duplicate\|Real source\]\]/);
});

test("article unsaved input blocks entering a chapter", async () => {
  const s = setup();
  s.writingState.draftSaveState = "dirty";
  await selectWritingDraftTarget(s.deps, "first");
  assert.equal(selectedWritingBookChapter(s.writingState), null);
  assert.match(s.messages.at(-1), /未保存/);
});

test("uncertain first chapter creation only rechecks and keeps later prose", async () => {
  const s = setup();
  await selectWritingDraftTarget(s.deps, "first");
  s.editor.value += "First chapter prose";
  recordWritingDraftInput(s.deps, s.editor.value);
  let creates = 0, reads = 0, saved, found = null;
  s.deps.createNote = async payload => {
    creates++;
    saved = { id: `note_${payload.clientCreationId}`, ...payload };
    throw Object.assign(new Error("lost response"), { code: "api_unavailable" });
  };
  s.deps.fetchNote = async id => { reads++; assert.equal(id, saved.id); return found; };
  await handleWritingSaveDraftClick(s.deps);
  assert.equal(s.writingState.bookChapter.saveState, "error");
  await handleWritingSaveDraftClick(s.deps);
  assert.equal(creates, 2);
  s.editor.value += "\nLater chapter prose";
  recordWritingDraftInput(s.deps, s.editor.value);
  found = saved;
  await handleWritingSaveDraftClick(s.deps);
  assert.equal(creates, 2);
  assert.equal(reads, 4);
  assert.equal(s.writingState.bookChapter.noteId, saved.id);
  assert.equal(s.writingState.bookChapter.saveState, "dirty");
  assert.match(s.editor.value, /Later chapter prose/);
  assert.doesNotMatch(s.writingState.bookChapter.savedBody, /Later chapter prose/);
  await handleWritingSaveDraftClick(s.deps);
  assert.equal(s.writingState.bookChapter.saveState, "saved");
  assert.equal(creates, 2);
});

test("creation readback cannot replace chapter input with externally changed prose", async () => {
  const s = setup();
  await selectWritingDraftTarget(s.deps, "first");
  s.editor.value += "My chapter prose";
  recordWritingDraftInput(s.deps, s.editor.value);
  const input = s.editor.value;
  let saved;
  s.deps.createNote = async payload => {
    saved = { id: `note_${payload.clientCreationId}`, ...payload, body: "# First\n\nExternal prose" };
    throw Object.assign(new Error("lost response"), { code: "request_timeout" });
  };
  s.deps.fetchNote = async () => saved;
  await handleWritingSaveDraftClick(s.deps);
  assert.equal(s.editor.value, input);
  assert.equal(s.writingState.bookChapter.saveState, "dirty");
  assert.equal(s.writingState.bookChapter.savedBody, saved.body);
});

test("chapter input and saving do not require an article outline", async () => {
  const s = setup();
  s.writingState.scaffold = null;
  await selectWritingDraftTarget(s.deps, "first");
  s.editor.value += "Chapter without article outline";
  recordWritingDraftInput(s.deps, s.editor.value);
  assert.equal(s.writingState.bookChapter.saveState, "dirty");
  await handleWritingSaveDraftClick(s.deps);
  assert.equal(s.writingState.bookChapter.saveState, "saved");
});

test("late chapter reads and read failures cannot replace a newer selection", async () => {
  const s = setup(), pending = deferred();
  s.deps.fetchNote = () => pending.promise;
  const opening = selectWritingDraftTarget(s.deps, "second");
  await selectWritingDraftTarget(s.deps, "first");
  pending.reject(new Error("Late read failure"));
  await opening;
  assert.equal(s.writingState.bookChapter.id, "first");
  assert.equal(s.messages.some(message => message.includes("Late read failure")), false);
});

test("late chapter read after typing or changing vault is ignored", async () => {
  for (const change of ["typing", "vault", "module", "binding"]) {
    const s = setup(), pending = deferred();
    s.deps.fetchNote = () => pending.promise;
    const opening = selectWritingDraftTarget(s.deps, "second");
    if (change === "typing") recordWritingDraftInput(s.deps, "New article input");
    if (change === "vault") s.state.noteMoveVaultScope = {};
    if (change === "module") s.state.module = "notes";
    if (change === "binding") s.writingState.project.book_structure.parts[0].chapters[1].draft_note_id = "new-draft";
    pending.resolve({ id: "chapter-second", body: "Late text" });
    await opening;
    assert.equal(selectedWritingBookChapter(s.writingState), null, change);
  }
});

test("failed first binding retries the same created chapter file", async () => {
  const s = setup();
  await selectWritingDraftTarget(s.deps, "first");
  s.editor.value += "A saved chapter";
  recordWritingDraftInput(s.deps, s.editor.value);
  const binding = s.deps.updateWritingProjectBookStructure;
  let calls = 0;
  s.deps.updateWritingProjectBookStructure = (...args) => { if (++calls === 1) throw new Error("Disk error"); return binding(...args); };
  await handleWritingSaveDraftClick(s.deps);
  assert.equal(s.writingState.bookChapter.saveState, "error");
  assert.match(s.editor.value, /A saved chapter/);
  s.editor.value += "\nNewer unbound input";
  recordWritingDraftInput(s.deps, s.editor.value);
  await handleWritingSaveDraftClick(s.deps);
  assert.deepEqual(s.writes.map(item => item[0]), ["create"]);
  assert.equal(s.writingState.bookChapter.saveState, "dirty");
  assert.match(s.editor.value, /Newer unbound input/);
  assert.doesNotMatch(s.writingState.bookChapter.savedBody, /Newer unbound input/);
});

test("slow chapter save deduplicates, blocks leaving and preserves newer typing", async () => {
  const s = setup(), pending = deferred();
  await selectWritingDraftTarget(s.deps, "second");
  const update = s.deps.updateNote;
  s.deps.updateNote = async (...args) => { await pending.promise; return update(...args); };
  s.editor.value += "First input";
  recordWritingDraftInput(s.deps, s.editor.value);
  const saving = handleWritingSaveDraftClick(s.deps);
  await handleWritingSaveDraftClick(s.deps);
  assert.throws(() => assertWritingDraftCanLeave(s.writingState), /正在保存/);
  s.editor.value += "Newer input";
  recordWritingDraftInput(s.deps, s.editor.value);
  pending.resolve();
  await saving;
  assert.equal(s.writes.length, 1);
  assert.doesNotMatch(s.writes[0][1].body, /Newer/);
  assert.match(s.editor.value, /Newer/);
  assert.equal(s.writingState.bookChapter.saveState, "dirty");
});

test("late chapter save cannot bind into another vault or project", async () => {
  for (const change of ["vault", "project"]) {
    const s = setup(), pending = deferred();
    await selectWritingDraftTarget(s.deps, "first");
    s.deps.createNote = () => pending.promise;
    let bound = false;
    s.deps.updateWritingProjectBookStructure = () => { bound = true; };
    const saving = handleWritingSaveDraftClick(s.deps);
    if (change === "vault") s.state.noteMoveVaultScope = {};
    else s.writingState.project = { id: "another-project" };
    pending.resolve({ id: "late-note", body: "Late content" });
    await saving;
    assert.equal(bound, false);
    assert.equal(s.state.notes.length, 1);
  }
});
