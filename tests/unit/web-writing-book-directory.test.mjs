import test from "node:test";
import assert from "node:assert/strict";
import { changeWritingBookDirectory, renderWritingBookDirectoryTools } from "../../apps/web/src/writing-book-directory-controller.js";
import { assertWritingDraftCanLeave, handleWritingSaveDraftClick } from "../../apps/web/src/writing-draft-save-controller.js";

function setup() {
  const project = { id: "book", draft_note_id: "article", book_structure: { schema_version: 1, parts: [
    { id: "part", title: "Part", chapters: [
      { id: "a", title: "A", draft_note_id: "body-a", evidence_note_ids: ["source"] },
      { id: "b", title: "B", draft_note_id: "body-b" }
    ] }, { id: "other", title: "Other", chapters: [{ id: "c", title: "C", draft_note_id: "body-c" }] }
  ] } };
  const writingState = { project: structuredClone(project), draftMarkdown: "Article unchanged", draftSaveState: "saved",
    bookChapter: { projectId: "book", id: "a", title: "A", noteId: "body-a", markdown: "Chapter A", saveState: "saved" } };
  const state = { module: "writing", noteMoveVaultScope: {} };
  const messages = [], writes = [];
  let persisted = structuredClone(project);
  const deps = { writingState, state, assertWritingDraftCanLeave, getVaultPath: () => "vault",
    requestTextInput: async () => "New chapter", confirm: () => true, makeChapterId: () => "new",
    renderWritingPanel: () => {}, setStatus: text => messages.push(text),
    fetchWritingProject: async () => structuredClone(persisted),
    updateWritingProjectBookStructure: async (id, { bookStructure, expectedVaultPath }) => {
      assert.equal(expectedVaultPath, "vault");
      writes.push(structuredClone(bookStructure)); persisted = { ...persisted, book_structure: bookStructure };
      return structuredClone(persisted);
    }, fetchNote: async id => ({ id, body: `Saved ${id}` })
  };
  return { deps, writingState, state, writes, messages };
}

test("adding creates only a directory entry and selects its unsaved body", async () => {
  const s = setup();
  await changeWritingBookDirectory(s.deps, "add");
  const added = s.writingState.project.book_structure.parts[0].chapters.at(-1);
  assert.deepEqual(added, { id: "new", title: "New chapter", evidence_note_ids: [], sections: [] });
  assert.equal(s.writingState.bookChapter.id, "new");
  assert.match(s.writingState.bookChapter.markdown, /# New chapter/);
  assert.equal(s.writingState.draftMarkdown, "Article unchanged");
  assert.equal(s.writes.length, 1);
});

test("moving preserves chapter bindings, evidence, bodies and other parts", async () => {
  const s = setup();
  await changeWritingBookDirectory(s.deps, "down");
  assert.deepEqual(s.writingState.project.book_structure.parts[0].chapters.map(c => [c.id, c.draft_note_id]), [["b", "body-b"], ["a", "body-a"]]);
  assert.deepEqual(s.writingState.project.book_structure.parts[0].chapters[1].evidence_note_ids, ["source"]);
  assert.equal(s.writingState.project.book_structure.parts[1].chapters[0].id, "c");
  assert.equal(s.writingState.bookChapter.markdown, "Chapter A");
  await changeWritingBookDirectory(s.deps, "up");
  assert.deepEqual(s.writingState.project.book_structure.parts[0].chapters.map(c => c.id), ["a", "b"]);
});

test("first chapter can be added to an empty book and cancelling makes no changes", async () => {
  const s = setup();
  s.writingState.bookChapter = null;
  s.writingState.project.book_structure = { schema_version: 1, parts: [] };
  s.deps.fetchWritingProject = async () => structuredClone(s.writingState.project);
  s.deps.requestTextInput = async () => "";
  await changeWritingBookDirectory(s.deps, "add");
  assert.equal(s.writes.length, 0);
  s.deps.requestTextInput = async () => "New chapter";
  await changeWritingBookDirectory(s.deps, "add");
  assert.equal(s.writingState.project.book_structure.parts[0].chapters[0].id, "new");
});

test("boundary moves and duplicate chapter identities never issue a write", async () => {
  const s = setup();
  await changeWritingBookDirectory(s.deps, "up");
  assert.equal(s.writes.length, 0);
  s.deps.makeChapterId = () => "a";
  await changeWritingBookDirectory(s.deps, "add");
  assert.equal(s.writes.length, 0);
  assert.match(s.messages.at(-1), /唯一章节标识/);
});

test("remove requires confirmation and detaches only the selected directory entry", async () => {
  const s = setup();
  s.deps.confirm = message => { assert.match(message, /正文文件会保留/); return false; };
  await changeWritingBookDirectory(s.deps, "remove");
  assert.equal(s.writes.length, 0);
  s.deps.confirm = () => true;
  s.deps.deleteNote = () => { throw new Error("Must not delete Markdown"); };
  await changeWritingBookDirectory(s.deps, "remove");
  assert.deepEqual(s.writingState.project.book_structure.parts[0].chapters.map(c => c.id), ["b"]);
  assert.equal(s.writingState.bookChapter, null);
  assert.equal(s.writingState.project.draft_note_id, "article");
  assert.equal(s.writingState.draftMarkdown, "Article unchanged");
});

test("dirty, failed or saving bodies block directory changes before dialogs or writes", async () => {
  for (const saveState of ["dirty", "error", "saving"]) {
    const s = setup(); s.writingState.bookChapter.saveState = saveState;
    s.deps.requestTextInput = () => { throw new Error("Must not prompt"); };
    await changeWritingBookDirectory(s.deps, "add");
    assert.equal(s.writes.length, 0);
    assert.match(s.messages.at(-1), /未保存|正在保存/);
  }
  const s = setup(); s.writingState.draftSaveState = "dirty";
  await changeWritingBookDirectory(s.deps, "remove");
  assert.equal(s.writes.length, 0);
});

test("directory pending deduplicates operations and blocks saves and navigation", async () => {
  const s = setup(); let resolve;
  s.deps.requestTextInput = () => new Promise(done => { resolve = done; });
  const pending = changeWritingBookDirectory(s.deps, "add");
  assert.throws(() => assertWritingDraftCanLeave(s.writingState), /目录正在更新/);
  await changeWritingBookDirectory(s.deps, "down");
  s.deps.createNote = () => { throw new Error("Must not save concurrently"); };
  await handleWritingSaveDraftClick(s.deps);
  resolve("New chapter"); await pending;
  assert.equal(s.writes.length, 1);
  assert.equal(s.writingState.bookDirectoryPending, null);
});

test("late dialog or fetch results cannot write into another vault or project", async () => {
  for (const phase of ["dialog", "read"]) {
    const s = setup(); let resolve;
    if (phase === "dialog") s.deps.requestTextInput = () => new Promise(done => { resolve = done; });
    else s.deps.fetchWritingProject = () => new Promise(done => { resolve = done; });
    const pending = changeWritingBookDirectory(s.deps, "add");
    await Promise.resolve();
    s.state.noteMoveVaultScope = {};
    resolve(phase === "dialog" ? "New" : structuredClone(s.writingState.project));
    await pending;
    assert.equal(s.writes.length, 0);
    assert.equal(s.messages.length, 0);
  }
});

test("failed saves retain original directory and body; retry succeeds", async () => {
  const s = setup(), update = s.deps.updateWritingProjectBookStructure;
  s.deps.updateWritingProjectBookStructure = async () => { throw new Error("Disk failed"); };
  await changeWritingBookDirectory(s.deps, "down");
  assert.equal(s.writingState.project.book_structure.parts[0].chapters[0].id, "a");
  assert.equal(s.writingState.bookChapter.markdown, "Chapter A");
  assert.match(s.messages.at(-1), /目录未更新.*Disk failed/);
  s.deps.updateWritingProjectBookStructure = update;
  await changeWritingBookDirectory(s.deps, "down");
  assert.equal(s.writingState.project.book_structure.parts[0].chapters[0].id, "b");
});

test("stale server structures are rejected rather than overwriting another binding", async () => {
  const s = setup();
  s.deps.fetchWritingProject = async () => {
    const fresh = structuredClone(s.writingState.project);
    fresh.book_structure.parts[0].chapters[0].draft_note_id = "other-body";
    return fresh;
  };
  await changeWritingBookDirectory(s.deps, "down");
  assert.equal(s.writes.length, 0);
  assert.match(s.messages.at(-1), /目录已发生变化/);
});

test("late write results and errors do not replace another project's state", async () => {
  for (const fail of [false, true]) {
    const s = setup(); let resolve, reject;
    s.deps.updateWritingProjectBookStructure = () => new Promise((done, bad) => { resolve = done; reject = bad; });
    const pending = changeWritingBookDirectory(s.deps, "down");
    await Promise.resolve(); await Promise.resolve();
    s.writingState.project = { id: "different", book_structure: { parts: [] } };
    if (fail) reject(new Error("Late error")); else resolve({ id: "book", book_structure: { parts: [] } });
    await pending;
    assert.equal(s.writingState.project.id, "different");
    assert.equal(s.messages.length, 1); // Initial progress only.
  }
});

test("tools reflect chapter boundaries and pending state", () => {
  const s = setup(), elements = Object.fromEntries(["Add", "Remove", "Up", "Down"].map(key => [`btnWritingChapter${key}`, {}]));
  const deps = { ...s.deps, $: id => elements[id] };
  renderWritingBookDirectoryTools(deps);
  assert.equal(elements.btnWritingChapterUp.disabled, true);
  assert.equal(elements.btnWritingChapterDown.disabled, false);
  s.writingState.bookDirectoryPending = { projectId: "book" };
  renderWritingBookDirectoryTools(deps);
  assert.ok(Object.values(elements).every(button => button.disabled));
});
