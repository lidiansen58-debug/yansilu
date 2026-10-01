import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { initVault, createNoteInDirectory, getNoteById, updateNoteContent } from "../../packages/domain/src/index.mjs";
import { handleWritingSaveDraftClick, assertWritingDraftCanLeave, recordWritingDraftInput } from "../../apps/web/src/writing-draft-save-controller.js";
import { selectWritingDraftTarget } from "../../apps/web/src/writing-book-chapter-controller.js";

async function fixture(t, chapter) {
  const vault = await fs.mkdtemp(path.join(os.tmpdir(), "yansilu-editor-conflict-"));
  t.after(() => fs.rm(vault, { recursive: true, force: true }));
  await initVault(vault);
  const note = await createNoteInDirectory(vault, { directoryId: "dir_original_default", title: "Article", body: "# Article\n\nBASE" });
  const writingState = { project: { id: "p", draft_note_id: note.id, draft_note: note,
    book_structure: { parts: [{ id: "part", chapters: [{ id: "c", title: "Article", draft_note_id: note.id }] }] } },
    scaffold: { id: "s" }, scaffoldMarkdown: "Outline", draftMarkdown: note.body, draftSaveState: "saved" };
  const editor = { value: note.body }, button = {}, state = { notes: [], noteMoveVaultScope: {}, module: "writing" };
  const writes = [], messages = [];
  const deps = { writingState, state, getVaultPath: () => vault, assertWritingDraftCanLeave,
    $: id => ({ writingDraftEditor: editor, btnWritingSaveDraft: button })[id],
    writingDraftDirectoryId: () => "dir_original_default", writingDraftTitle: () => "Article", writingDraftBody: () => editor.value,
    fetchNote: id => getNoteById(vault, id),
    updateNote: (id, input) => { writes.push(input); return updateNoteContent(vault, id, input); },
    renderWritingPanel: () => { editor.value = writingState.bookChapter?.markdown ?? writingState.draftMarkdown; },
    setStatus: message => messages.push(message) };
  if (chapter) await selectWritingDraftTarget(deps, "c");
  return { vault, note, writingState, editor, writes, messages, deps };
}

for (const chapter of [false, true]) {
  const mode = chapter ? "chapter" : "article";
  test(`${mode} guarded saves refresh baseline after each confirmed write`, async t => {
    const s = await fixture(t, chapter);
    s.editor.value = "# Article\n\nFIRST";
    recordWritingDraftInput(s.deps, s.editor.value);
    await handleWritingSaveDraftClick(s.deps);
    const saved = await getNoteById(s.vault, s.note.id);
    s.editor.value = "# Article\n\nSECOND";
    recordWritingDraftInput(s.deps, s.editor.value);
    await handleWritingSaveDraftClick(s.deps);
    assert.equal(s.writes[0].expectedBody, s.note.body);
    assert.equal(s.writes[0].expectedRevision, s.note.fileRevision);
    assert.equal(s.writes[1].expectedBody, saved.body);
    assert.equal(s.writes[1].expectedRevision, saved.fileRevision);
    assert.match((await getNoteById(s.vault, s.note.id)).body, /SECOND/);
  });
  for (const external of [false, true]) test(`${mode} retains input and baseline when ${external ? "external file" : "newer client"} changes conflict`, async t => {
    const s = await fixture(t, chapter);
    const file = path.join(s.vault, s.note.markdownPath);
    if (external) await fs.writeFile(file, (await fs.readFile(file, "utf8")).replace("BASE", "EXTERNAL"), "utf8");
    else await updateNoteContent(s.vault, s.note.id, { body: "# Article\n\nNEWER" });
    const disk = await fs.readFile(file, "utf8");
    s.editor.value = "# Article\n\nMY-UNSAVED-INPUT";
    recordWritingDraftInput(s.deps, s.editor.value);
    await handleWritingSaveDraftClick(s.deps);
    assert.match(s.editor.value, /MY-UNSAVED-INPUT/);
    assert.equal(await fs.readFile(file, "utf8"), disk);
    assert.equal(chapter ? s.writingState.bookChapter.saveState : s.writingState.draftSaveState, "error");
    assert.match(s.messages.at(-1), /本次未覆盖.*输入仍保留/);
    assert.equal(s.writes.length, 1, "no automatic overwrite retry");
    await handleWritingSaveDraftClick(s.deps);
    assert.equal(s.writes[1].expectedBody, s.note.body, "retry never silently adopts the changed disk base");
    assert.equal(await fs.readFile(file, "utf8"), disk);
  });
  test(`${mode} refuses an existing note with no loaded baseline`, async t => {
    const s = await fixture(t, chapter);
    if (chapter) delete s.writingState.bookChapter.savedBody;
    else delete s.writingState.project.draft_note;
    await handleWritingSaveDraftClick(s.deps);
    assert.equal(s.writes.length, 0);
    assert.match(s.messages.at(-1), /缺少已保存正文/);
  });
  test(`${mode} rejects a metadata-only change without discarding editor input`, async t => {
    const s = await fixture(t, chapter);
    const file = path.join(s.vault, s.note.markdownPath);
    const disk = await fs.readFile(file, "utf8");
    const changed = disk.replace("status: draft", "status: active");
    assert.notEqual(changed, disk);
    await fs.writeFile(file, changed, "utf8");
    assert.equal((await getNoteById(s.vault, s.note.id)).body, s.note.body);
    s.editor.value = "# Article\n\nMY-INPUT";
    recordWritingDraftInput(s.deps, s.editor.value);
    await handleWritingSaveDraftClick(s.deps);
    assert.match(s.editor.value, /MY-INPUT/);
    assert.equal(await fs.readFile(file, "utf8"), changed);
    assert.equal(s.writes[0].expectedRevision, s.note.fileRevision);
    assert.match(s.messages.at(-1), /本次未覆盖/);
  });
}
