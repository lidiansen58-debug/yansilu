import test from "node:test";
import assert from "node:assert/strict";
import { createWritingDocumentLinkOpener } from "../../apps/web/src/writing-document-links.js";
import { createSearchNoteOpener } from "../../apps/web/src/search-note-opener.js";

function setup(notes = []) {
  const opened = [], warnings = [];
  const state = { module: "writing", notes, tabs: [] };
  const writingState = { project: { id: "project" }, draftMarkdown: "正文" };
  const deps = { state, writingState, getVaultPath: () => "vault",
    openWritingSourceNote: async (id, { isCurrent }) => { if (isCurrent()) opened.push(id); },
    setStatus: message => warnings.push(message) };
  return { deps, opened, warnings, open: createWritingDocumentLinkOpener(() => deps) };
}

test("writing references preserve explicit IDs and do not depend on loaded sidebar notes", async () => {
  const s = setup([{ id: "n_wrong", title: "相似标题" }]);
  await s.open("[[n_unloaded|相似标题]]");
  assert.deepEqual(s.opened, ["n_unloaded"]);
  assert.deepEqual(s.warnings, []);
});

test("same-title references require a precise target while full paths remain usable", async () => {
  const s = setup([{ id: "n_a", title: "解释", markdownPath: "A/解释.md" },
    { id: "n_b", title: "解释", markdownPath: "B/解释.md" }]);
  await s.open("[[解释]]");
  assert.deepEqual(s.opened, []);
  assert.match(s.warnings[0], /多条笔记/);
  await s.open("[[A/解释.md#判断|显示名称]]");
  assert.deepEqual(s.opened, ["n_a"]);
  await s.open("[[释]]");
  assert.deepEqual(s.opened, ["n_a"], "A partial title must not open an arbitrary match");
  assert.match(s.warnings.at(-1), /找不到/);
});

test("the same note in state, basket and evidence is not treated as multiple targets", async () => {
  const note = { id: "n_a", title: "解释" }, s = setup([note]);
  s.deps.writingState.project.basket_notes = [note];
  s.deps.writingState.scaffold = { evidence_notes: [note] };
  await s.open("[[解释]]");
  assert.deepEqual(s.opened, ["n_a"]);
  assert.deepEqual(s.warnings, []);
});

for (const change of ["chapter", "typing", "project", "vault", "module", "newer-request"]) {
  test(`a delayed writing reference cannot navigate after ${change}`, async () => {
    const s = setup();
    let release, requested;
    const pending = new Promise(resolve => { release = resolve; });
    const started = new Promise(resolve => { requested = resolve; });
    const navigated = [];
    s.deps.openWritingSourceNote = createSearchNoteOpener({ state: s.deps.state,
      fetchNote: async id => { requested(); await pending; return { id, title: "来源", body: "原文" }; },
      mapNoteItem: note => note, openNoteById: id => { navigated.push(id); return true; },
      activateModule: module => { s.deps.state.module = module; } });
    const opening = s.open("[[n_source|来源]]");
    await started;
    if (change === "chapter") s.deps.writingState.bookChapter = { id: "new", markdown: "新章节" };
    if (change === "typing") s.deps.writingState.draftMarkdown += "继续写";
    if (change === "project") s.deps.writingState.project = { id: "new" };
    if (change === "vault") s.deps.state.noteMoveVaultScope = {};
    if (change === "module") s.deps.state.module = "graph";
    if (change === "newer-request") await s.open("[[找不到的笔记]]");
    release();
    await opening;
    assert.deepEqual(navigated, []);
    assert.deepEqual(s.deps.state.notes, [], "A stale lookup must not insert data into the current vault");
  });
}
