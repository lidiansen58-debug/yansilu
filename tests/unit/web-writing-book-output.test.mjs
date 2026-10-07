import test from "node:test";
import assert from "node:assert/strict";
import { installWritingBookOutputEvents } from "../../apps/web/src/writing-book-output.js";

function setup() {
  const writingState = { project: { id: "book", book_structure: { parts: [{ chapters: [
    { id: "a", title: "A", draft_note_id: "body-a" }, { id: "b", title: "B", draft_note_id: "body-b" }
  ] }] } }, draftSaveState: "saved", draftMarkdown: "Article", bookChapter: { projectId: "book", id: "a", markdown: "Current chapter", saveState: "saved" } };
  const state = { module: "writing", noteMoveVaultScope: {} }, messages = [], requests = [];
  const button = { disabled: false, addEventListener() {} };
  const menu = { open: true };
  const deps = { writingState, state, getVaultPath: () => "vault", renderWritingPanel: () => { button.disabled = false; },
    pickExportDirectory: async () => ({ path: "output" }),
    exportWritingBook: async payload => { requests.push(payload); return { status: "completed", bookPath: "output/Book.md", chapterCount: 2, assetCount: 1 }; },
    setStatus: message => messages.push(message) };
  const controller = installWritingBookOutputEvents({ $: id => id === "btnWritingExportBook" ? button : id === "writingMoreMenu" ? menu : null, depsProvider: () => deps });
  return { controller, deps, writingState, state, messages, requests, button, menu };
}

test("book command exports saved directory snapshot, never the current chapter or article editor text", async () => {
  const s = setup(); await s.controller.export();
  assert.deepEqual(s.requests[0], { targetPath: "output", expectedVaultPath: "vault", projectId: "book", expectedBookStructure: s.writingState.project.book_structure });
  assert.match(s.messages.at(-1), /已导出 2 章及 1 个附件/);
  assert.equal(s.writingState.bookChapter.markdown, "Current chapter");
});

test("dirty, error, saving and directory pending block book export", async () => {
  for (const value of ["dirty", "error", "saving"]) {
    const s = setup(); s.writingState.bookChapter.saveState = value;
    await s.controller.export(); assert.equal(s.requests.length, 0);
    assert.equal(s.menu.open, false);
    assert.match(s.messages.at(-1), /未保存|正在保存/);
  }
  const s = setup(); s.writingState.bookDirectoryPending = { projectId: "book" };
  await s.controller.export(); assert.equal(s.requests.length, 0);
});

test("missing saved chapters show their names and cancel makes no request", async () => {
  const s = setup(); delete s.writingState.project.book_structure.parts[0].chapters[1].draft_note_id;
  await s.controller.export(); assert.equal(s.requests.length, 0);
  assert.match(s.messages.at(-1), /尚未保存正文：B/);
  const cancelled = setup(); cancelled.deps.pickExportDirectory = async () => ({ path: "" });
  await cancelled.controller.export(); assert.equal(cancelled.requests.length, 0); assert.equal(cancelled.messages.length, 0);
});

test("changes while choosing a path cancel the export", async () => {
  for (const change of [s => { s.state.noteMoveVaultScope = {}; }, s => { s.writingState.bookChapter.markdown += "edit"; }, s => { s.writingState.project.book_structure.parts[0].chapters.reverse(); }]) {
    const s = setup(); let resolve;
    s.deps.pickExportDirectory = () => new Promise(done => { resolve = done; });
    const pending = s.controller.export(); change(s); resolve({ path: "output" }); await pending;
    assert.equal(s.requests.length, 0);
  }
});

test("duplicate exports are suppressed; errors retain prose and allow retry", async () => {
  const s = setup(); let reject;
  s.deps.exportWritingBook = () => new Promise((_, fail) => { reject = fail; });
  const pending = s.controller.export(); await Promise.resolve();
  await s.controller.export(); assert.equal(s.button.disabled, true);
  reject(new Error("Disk error")); await pending;
  assert.match(s.messages.at(-1), /整稿导出失败.*Disk error/);
  assert.equal(s.writingState.bookChapter.markdown, "Current chapter");
  assert.equal(s.writingState.bookExportPending, null);
});

test("late success and failure do not report into another vault or chapter", async () => {
  for (const fail of [false, true]) {
    const s = setup(); let resolve, reject;
    s.deps.exportWritingBook = () => new Promise((done, bad) => { resolve = done; reject = bad; });
    const pending = s.controller.export(); await Promise.resolve();
    s.writingState.bookChapter = { id: "different" };
    if (fail) reject(new Error("Late error")); else resolve({ status: "completed", bookPath: "output/Book.md", chapterCount: 2 });
    await pending; assert.equal(s.messages.length, 1);
  }
});
