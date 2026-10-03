import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { initVault, createNoteInDirectory, getNoteById, updateNoteContent } from "../../packages/domain/src/index.mjs";
import { handleRecordOriginalFromNoteStateChange as promote } from "../../apps/web/src/app-shell-state-note-creation-actions.js";
import { withGeneratedOriginalMarker, withGeneratedOriginalReference } from "../../apps/web/src/note-persistence-policy.js";
import { recordEditorSourceAsPermanent } from "../../apps/web/src/source-note-editor-promotion.js";
import { normalizeKnownWikilinksToReadableTitles } from "../../apps/web/src/editor-link-picker.js";

function deferred() {
  let resolve;
  const promise = new Promise(r => { resolve = r; });
  return { promise, resolve };
}

function fixture() {
  const body = "# 来源标题\n\n最初的记录。";
  const source = { id: "source", title: "来源标题", body, folderId: "fleeting", status: "draft" };
  const tab = { id: "tab-source", noteId: source.id, body, savedBody: body, title: source.title, savedTitle: source.title, dirty: false };
  const state = { notes: [source], tabs: [tab], activeTabId: tab.id };
  const drafts = [], messages = [], created = [], persisted = [];
  const editor = { writeDraft: t => drafts.push(t.body), clearDraft() {}, clearAutoSaveTimer() {}, scheduleAutoSave() {} };
  const deps = {
    state, editor, typeFromFolder: () => "fleeting", isOriginalRecordableSource: () => true,
    originalDraftBodyFromSource: () => "# 永久观点\n\n独立判断。",
    withGeneratedOriginalReference, withGeneratedOriginalMarker,
    createNote: async payload => { created.push(payload); return { id: "permanent", title: "永久观点", body: payload.body }; },
    updateNote: async (id, patch) => { persisted.push(patch); return { ...source, ...patch }; },
    setStatus: (message, tone) => messages.push({ message, tone }),
    openNoteById: id => { state.activeTabId = `tab-${id}`; }
  };
  return { source, tab, state, deps, drafts, messages, created, persisted, payload: { sourceNoteId: source.id, sourceBody: body } };
}

test("AI promotion passes provenance to creation without marking manual drafts", async () => {
  const ai = fixture();
  await promote({ ...ai.payload, draftBody: "# AI 草稿\n\n待确认判断。", authorshipAiAssisted: true }, ai.deps);
  assert.equal(ai.created[0].authorshipAiAssisted, true);
  const manual = fixture();
  await promote(manual.payload, manual.deps);
  assert.equal(manual.created[0].authorshipAiAssisted, undefined);
});

test("source marker save uses the persisted baseline, not the unsaved source draft", async () => {
  const f = fixture();
  const baseline = f.tab.savedBody;
  f.tab.savedFileRevision = "a".repeat(64);
  f.tab.body += "\n\nUnsaved edits.";
  f.tab.dirty = true;
  await promote(f.payload, f.deps);
  assert.equal(f.persisted[0].expectedBody, baseline);
  assert.equal(f.persisted[0].expectedRevision, "a".repeat(64));
  assert.match(f.persisted[0].body, /Unsaved edits/);
});

test("successful source marker persistence refreshes the editor file revision", async () => {
  const f = fixture();
  f.tab.savedFileRevision = "a".repeat(64);
  f.deps.updateNote = async (_id, patch) => ({ ...f.source, ...patch, fileRevision: "b".repeat(64) });
  await promote(f.payload, f.deps);
  assert.equal(f.tab.savedFileRevision, "b".repeat(64));
  assert.equal(f.tab.dirty, false);
});

test("an empty source file revision is not silently dropped from guarded persistence", async () => {
  const f = fixture();
  f.tab.savedFileRevision = "";
  f.deps.updateNote = async (_id, patch) => {
    assert.equal(patch.expectedRevision, "");
    throw Object.assign(new Error("Invalid file revision"), { code: "NOTE_SAVE_BASE_INVALID" });
  };
  assert.equal((await promote(f.payload, f.deps)).id, "permanent");
  assert.equal(f.tab.dirty, true);
  assert.match(f.messages.at(-1).message, /Invalid file revision/);
});

test("source marker conflict preserves the baseline and created permanent note", async () => {
  const f = fixture();
  const baseline = f.tab.savedBody;
  const revision = "a".repeat(64);
  f.tab.savedFileRevision = revision;
  f.deps.updateNote = async (_id, patch) => {
    assert.equal(patch.expectedBody, baseline);
    assert.equal(patch.expectedRevision, revision);
    throw Object.assign(new Error("Source changed externally"), { code: "NOTE_SAVE_CONFLICT" });
  };
  const result = await promote(f.payload, f.deps);
  assert.equal(result.id, "permanent");
  assert.equal(f.tab.savedBody, baseline);
  assert.equal(f.tab.savedFileRevision, revision);
  assert.equal(f.tab.dirty, true);
  assert.match(f.tab.body, /generated-original=permanent/);
  assert.equal(f.drafts.at(-1), f.tab.body);
  assert.match(f.messages.at(-1).message, /Source changed externally/);
});

test("real vault source promotion cannot overwrite a concurrent source edit", async t => {
  const vault = await fs.mkdtemp(path.join(os.tmpdir(), "yansilu-promotion-guard-"));
  t.after(async () => {
    assert.equal(path.dirname(vault), path.resolve(os.tmpdir()));
    await fs.rm(vault, { recursive: true, force: true });
  });
  await initVault(vault);
  const persistedSource = await createNoteInDirectory(vault, {
    directoryId: "dir_fleeting_default", title: "Source", body: "# Source\n\nOriginal material."
  });
  const f = fixture();
  Object.assign(f.source, persistedSource);
  Object.assign(f.tab, { noteId: persistedSource.id, body: persistedSource.body, savedBody: persistedSource.body,
    title: persistedSource.title, savedTitle: persistedSource.title, savedFileRevision: persistedSource.fileRevision });
  f.payload.sourceNoteId = persistedSource.id;
  f.payload.sourceBody = persistedSource.body;
  let externalBytes;
  f.deps.createNote = async payload => {
    const created = await createNoteInDirectory(vault, payload);
    await updateNoteContent(vault, persistedSource.id, { body: "# Source\n\nChanged outside the editor." });
    externalBytes = await fs.readFile(path.join(vault, persistedSource.markdownPath), "utf8");
    return created;
  };
  f.deps.updateNote = (id, patch) => updateNoteContent(vault, id, patch);
  const created = await promote(f.payload, f.deps);
  assert.ok(created.id);
  assert.equal((await getNoteById(vault, created.id)).id, created.id);
  assert.equal(await fs.readFile(path.join(vault, persistedSource.markdownPath), "utf8"), externalBytes);
  assert.equal(f.tab.savedFileRevision, persistedSource.fileRevision);
  assert.equal(f.tab.dirty, true);
  assert.match(f.tab.body, /generated-original=/);
  assert.equal(f.messages.at(-1).tone, "warn");
});

for (const result of ["failure", "null", "empty", "wrong-id"]) {
  test(`promotion retains an unsaved source draft after marker save: ${result}`, async () => {
    const f = fixture();
    f.tab.body += "\n\n尚未保存的输入。";
    f.tab.dirty = true;
    f.payload.sourceBody = f.tab.body;
    const before = f.tab.savedBody;
    f.deps.updateNote = async () => {
      if (result === "null") return null;
      if (result === "empty") return {};
      if (result === "wrong-id") return { id: "other", body: "wrong note" };
      throw new Error("disk full");
    };
    assert.equal((await promote(f.payload, f.deps)).id, "permanent");
    assert.equal(f.tab.dirty, true);
    assert.equal(f.tab.savedBody, before);
    assert.equal(f.source.id, "source");
    assert.match(f.tab.body, /尚未保存的输入/);
    assert.match(f.tab.body, /generated-original=permanent/);
    assert.equal(f.drafts.at(-1), f.tab.body);
    assert.equal(f.messages.at(-1).tone, "warn");
  });
}

test("a missing creation result never marks or opens a permanent note", async () => {
  const f = fixture();
  f.deps.createNote = async () => ({});
  assert.equal(await promote(f.payload, f.deps), false);
  assert.equal(f.persisted.length, 0);
  assert.equal(f.state.notes.length, 1);
  assert.equal(f.state.activeTabId, "tab-source");
  assert.equal(f.messages.at(-1).tone, "bad");
});

test("promotion preserves edits and renamed title made during creation and source persistence", async () => {
  const f = fixture(), creation = deferred(), saving = deferred(), enteredSave = deferred();
  f.deps.createNote = () => creation.promise;
  f.deps.updateNote = async (_id, patch) => { enteredSave.resolve(patch); return saving.promise; };
  const pending = promote(f.payload, f.deps);
  f.tab.body = "# 新标题\n\n创建期间输入。";
  f.tab.title = "新标题";
  f.tab.dirty = true;
  creation.resolve({ id: "permanent", title: "永久观点", body: "# 永久观点" });
  const patch = await enteredSave.promise;
  assert.match(patch.body, /创建期间输入/);
  assert.equal(patch.title, "新标题");
  assert.equal(f.tab.dirty, true);
  f.tab.body += "\n\n保存期间继续输入。";
  saving.resolve({ ...f.source, ...patch });
  await pending;
  assert.match(f.tab.body, /保存期间继续输入/);
  assert.doesNotMatch(f.tab.savedBody, /保存期间继续输入/);
  assert.match(f.tab.savedBody, /创建期间输入/);
  assert.equal(f.tab.dirty, true);
  assert.equal(f.drafts.at(-1), f.tab.body);
});

test("repeated promotion clicks share creation and wait for the current editor save", async () => {
  const f = fixture(), saving = deferred();
  f.deps.editor.savingPromise = saving.promise;
  const first = promote(f.payload, f.deps);
  const second = promote(f.payload, f.deps);
  await Promise.resolve();
  assert.equal(f.created.length, 0);
  saving.resolve(true);
  const results = await Promise.all([first, second]);
  assert.equal(f.created.length, 1);
  assert.equal(results[0].id, results[1].id);
  assert.equal(f.deps.editor.savingPromise, null);
});

test("a vault switch during creation never writes the source into the next vault", async () => {
  const f = fixture(), creation = deferred(), entered = deferred();
  f.deps.createNote = () => { entered.resolve(); return creation.promise; };
  const pending = promote(f.payload, f.deps);
  await entered.promise;
  f.state.noteMoveVaultScope = {};
  creation.resolve({ id: "permanent", title: "永久观点", body: "# 永久观点" });
  assert.equal(await pending, false);
  assert.equal(f.persisted.length, 0);
  assert.equal(f.state.notes.length, 1);
});

for (const changed of ["note", "vault"]) {
  test(`choosing a directory after changing ${changed} never promotes the wrong editor`, async () => {
    const choosing = deferred();
    let note = { id: "source" };
    const editor = { state: {}, activeNote: () => note, isOriginalRecordableSource: () => true,
      pickPermanentDirectoryForNote: () => choosing.promise,
      onStateChange: () => assert.fail("The old dialog must be cancelled") };
    const pending = recordEditorSourceAsPermanent(editor);
    if (changed === "note") note = { id: "other" };
    else editor.state.noteMoveVaultScope = {};
    choosing.resolve("dir_original_default");
    assert.equal(await pending, false);
  });
}

test("promotion links keep their identity when titles are duplicated and other links are inserted", () => {
  const link = withGeneratedOriginalReference("# Source", "Duplicate", "permanent");
  assert.match(link, /\[\[permanent\|Duplicate\]\]/);
  assert.equal(normalizeKnownWikilinksToReadableTitles(link, [
    { id: "permanent", title: "Duplicate" }, { id: "other", title: "Duplicate" }
  ]), link);
});

test("promotion saves against the source baseline and acknowledges the new file revision", async () => {
  const f = fixture();
  f.source.fileRevision = f.tab.savedFileRevision = "a".repeat(64);
  f.tab.body += "\nUnsaved source edit";
  f.deps.updateNote = async (_id, patch) => {
    assert.equal(patch.expectedBody, f.tab.savedBody);
    assert.equal(patch.expectedRevision, "a".repeat(64));
    return { ...f.source, ...patch, fileRevision: "b".repeat(64) };
  };
  await promote(f.payload, f.deps);
  assert.equal(f.tab.savedFileRevision, "b".repeat(64));
  assert.equal(f.tab.savedBody, f.source.body);
  assert.equal(f.tab.dirty, false);
});

for (const stage of ["creation", "source-save"]) {
  test(`promotion completion preserves a different active note after switching during ${stage}`, async () => {
    const f = fixture(), held = deferred(), entered = deferred();
    let opens = 0, moduleChanges = 0;
    f.state.module = "explorer";
    f.deps.openNoteById = () => { opens++; };
    f.deps.activateModule = () => { moduleChanges++; };
    if (stage === "creation") f.deps.createNote = async payload => {
      entered.resolve(); await held.promise;
      return { id: "permanent", title: "Permanent", body: payload.body };
    };
    else f.deps.updateNote = async (_id, patch) => {
      entered.resolve(); await held.promise;
      return { ...f.source, ...patch };
    };
    const pending = promote(f.payload, f.deps);
    await entered.promise;
    const other = { id: "tab-other", noteId: "other", body: "# Keep editing here", dirty: true };
    f.state.tabs.push(other);
    f.state.activeTabId = other.id;
    held.resolve();
    const result = await pending;
    assert.equal(result.id, "permanent");
    assert.equal(opens, 0);
    assert.equal(moduleChanges, 0);
    assert.equal(f.state.activeTabId, other.id);
    assert.equal(other.body, "# Keep editing here");
    assert.match(f.tab.body, /generated-original=permanent/);
    assert.doesNotMatch(f.messages.at(-1).message, /已生成并打开/);
  });
}

for (const code of ["NOTE_SAVE_CONFLICT", "NOTE_SAVE_RESULT_UNCERTAIN"]) {
  test(`source promotion retains a paused recovery draft for ${code}`, async () => {
    const f = fixture();
    const oldBody = f.tab.savedBody;
    f.tab.savedFileRevision = "a".repeat(64);
    f.deps.updateNote = async () => { throw Object.assign(new Error("Check the source file"), { code }); };
    assert.equal((await promote(f.payload, f.deps)).id, "permanent");
    assert.equal(f.tab.savedBody, oldBody);
    assert.equal(f.tab.savedFileRevision, "a".repeat(64));
    assert.equal(f.tab.saveConflict, true);
    assert.equal(f.tab.saveUiState.mode, code === "NOTE_SAVE_CONFLICT" ? "conflict" : "uncertain");
    assert.equal(f.tab.dirty, true);
    assert.match(f.drafts.at(-1), /generated-original=permanent/);
  });
}
