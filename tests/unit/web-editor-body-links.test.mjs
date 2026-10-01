import test from "node:test";
import assert from "node:assert/strict";
import { bodyLinkRangeAtSelection, bodyLinkTokenForNote } from "../../apps/web/src/editor-body-links.js";
import { EditorRelationLinkController } from "../../apps/web/src/editor-relation-link-controller.js";

test("a cursor inside a link selects its whole token for replacement", () => {
  const body = "前文 [[target#heading|别名]] 后文 [[other]]";
  assert.deepEqual(bodyLinkRangeAtSelection(body, { from: 8, to: 8 }), { from: 3, to: 24, raw: "target#heading|别名" });
  assert.equal(bodyLinkRangeAtSelection(body, { from: 0, to: 30 }), null);
  assert.equal(bodyLinkRangeAtSelection(body, { from: 24, to: 24 }), null);
  assert.equal(bodyLinkRangeAtSelection("[[unfinished", { from: 3, to: 3 }), null);
});

test("duplicate titles retain the chosen identity and labels cannot corrupt link syntax", () => {
  assert.equal(bodyLinkTokenForNote({ id: "second", title: "同名标题" }), "[[second|同名标题]]");
  assert.equal(bodyLinkTokenForNote({ id: "first", title: "同名标题" }), "[[first|同名标题]]");
  assert.equal(bodyLinkTokenForNote({ id: "safe", title: "[标题]|换\n行" }), "[[safe|标题  换 行]]");
});

test("editing keeps the current reference intact and custom labels survive a target change", () => {
  const existing = { raw: "folder/材料.md#段落|我的引用", noteId: "old", noteTitle: "材料" };
  assert.equal(bodyLinkTokenForNote({ id: "old", title: "材料" }, existing), "[[folder/材料.md#段落|我的引用]]");
  assert.equal(bodyLinkTokenForNote({ id: "new", title: "新材料" }, existing), "[[new|我的引用]]");
  assert.equal(bodyLinkTokenForNote({ id: "new", title: "新材料" }, { ...existing, raw: "old#段落|材料" }), "[[new|新材料]]");
  assert.equal(bodyLinkTokenForNote({ id: "new", title: "新材料" }, { ...existing, raw: "old#^block" }), "[[new|新材料]]");
});

test("arrow navigation overrides a previously pinned target", () => {
  const notes = [{ id: "a", title: "同名" }, { id: "b", title: "同名" }];
  const host = { state: { notes }, currentLinkCandidates: notes, currentLinkIndex: 0, currentPinnedLinkId: "a",
    scopedLinkCandidates: () => notes, linkCandidateDisplayTitle: n => n.title,
    els: { linkSearchInput: { value: "同名" }, linkSearchList: { innerHTML: "", querySelector: () => null } } };
  const controller = new EditorRelationLinkController(host);
  controller.moveCandidate(1);
  assert.equal(controller.selectedCandidate().id, "b");
  assert.equal(host.currentLinkIndex, 1);
  controller.moveCandidate(-1);
  assert.equal(controller.selectedCandidate().id, "a");
});

test("closing the picker during save cannot release the insertion lock", async () => {
  let release, writes = 0, body = "正文";
  const saving = new Promise(resolve => { release = resolve; });
  const notes = [{ id: "source" }, { id: "target", title: "目标" }];
  const picker = { classList: { add() {}, remove() {} }, style: {} };
  const host = { state: { notes }, activeNote: () => notes[0], activeTab: () => ({ savedBody: body }),
    els: { linkPicker: picker }, manualLinkReturnSelection: { from: 2, to: 2 },
    normalizedSelectionRange: r => r, isWysiwygMode: () => false, getEditorValue: () => body,
    replaceEditorRange: (from, to, token) => { writes++; body = body.slice(0, from) + token + body.slice(to); },
    handleEditorInput() {}, focusEditor() {}, resetToolbarTransientButtons() {}, onStatus() {},
    setEditorSelectionRange() {}, scheduleEditorScrollRestore() {}, saveActiveNote: () => saving };
  const controller = new EditorRelationLinkController(host);
  const pending = controller.insertSelected("target");
  controller.close(); // The normal save path also closes transient pickers.
  assert.equal(host.isSubmittingLinkInsert, true);
  await controller.insertSelected("target");
  assert.equal(writes, 1);
  release(true);
  await pending;
  assert.equal(host.isSubmittingLinkInsert, false);
});

for (const change of ["query", "note", "vault", "picker"]) {
  test(`loading an existing target ignores a changed ${change}`, async () => {
    let resolve;
    const loading = new Promise(r => { resolve = r; });
    const note = { id: "source" };
    const host = { state: {}, activeNote: () => note, fetchNoteForResolution: () => loading,
      upsertApiNotes: () => assert.fail("Stale target must not enter current context") };
    const controller = new EditorRelationLinkController(host);
    controller.editingLink = { raw: "note_target#heading|别名" };
    const pending = controller.resolveEditingTarget();
    if (change === "query") controller.searchRevision++;
    if (change === "note") note.id = "other";
    if (change === "vault") host.state.noteMoveVaultScope = "other";
    if (change === "picker") controller.editingLink = null;
    resolve({ id: "note_target", title: "目标" });
    await pending;
    assert.equal(host.currentPinnedLinkId, undefined);
  });
}

test("remote search completion retains the candidate selected with arrows", async () => {
  const notes = [{ id: "a", title: "同名" }, { id: "b", title: "同名" }];
  let resolve;
  const loading = new Promise(r => { resolve = r; });
  const host = { state: { notes }, activeNote: () => ({ id: "source" }), searchNotesForResolution: () => loading,
    currentLinkCandidates: notes, currentLinkIndex: 0, scopedLinkCandidates: () => notes, linkCandidateDisplayTitle: n => n.title,
    els: { linkSearchInput: { value: "同名" }, linkSearchList: { innerHTML: "", querySelector: () => null } } };
  const controller = new EditorRelationLinkController(host);
  const pending = controller.searchCandidates("同名");
  controller.moveCandidate(1);
  resolve({ items: [] });
  await pending;
  assert.equal(controller.selectedCandidate().id, "b");
});

for (const change of ["query", "note", "vault"]) {
  test(`late link search results cannot overwrite the changed ${change}`, async () => {
    let resolve;
    const result = new Promise(r => { resolve = r; });
    const note = { id: "source" };
    const host = { state: {}, activeNote: () => note, searchNotesForResolution: () => result,
      upsertApiNotes: () => assert.fail("Stale results must not enter the current vault"), onStatus() {} };
    const controller = new EditorRelationLinkController(host);
    const pending = controller.searchCandidates("old");
    if (change === "query") await controller.searchCandidates("");
    if (change === "note") note.id = "other";
    if (change === "vault") host.state.noteMoveVaultScope = {};
    resolve({ items: [{ id: "target", title: "old" }] });
    await pending;
  });
}

for (const outcome of ["failed-save", "missing-link", "later-input", "note-switch"]) {
  test(`link insertion preserves editor state after ${outcome}`, async () => {
    let body = "# 当前\n\n前文 [[other#section|原别名]] 末尾";
    const before = body;
    const source = { id: "source" }, target = { id: "chosen", title: "目标" };
    const tab = { savedBody: before, body, dirty: false };
    const messages = [];
    const host = {
      state: { notes: [source, target] }, activeNote: () => source, activeTab: () => tab,
      manualLinkReturnSelection: { from: body.length, to: body.length },
      normalizedSelectionRange: range => range, getEditorValue: () => body, isWysiwygMode: () => false,
      replaceEditorRange: (from, to, token) => { body = body.slice(0, from) + token + body.slice(to); },
      handleEditorInput: () => { tab.body = body; tab.dirty = true; }, focusEditor() {},
      setEditorSelectionRange: () => assert.fail("Failed or changed input must not move the cursor"),
      scheduleEditorScrollRestore: () => assert.fail("Failed or changed input must not move the scroll"),
      onStatus: (message, tone) => messages.push({ message, tone }),
      saveActiveNote: async () => {
        if (outcome === "failed-save") return false;
        if (outcome === "later-input") { tab.savedBody = body; body += "继续输入"; }
        if (outcome === "note-switch") source.id = "other-note";
        return true;
      }
    };
    const controller = new EditorRelationLinkController(host);
    controller.close = () => {};
    controller.updateConfirmButton = () => {};
    await controller.insertSelected(target.id);
    assert.ok(body.startsWith(before));
    assert.ok(body.includes("[[chosen|目标]]"));
    assert.equal(tab.dirty, true);
    assert.equal(host.isSubmittingLinkInsert, false);
    if (["failed-save", "missing-link"].includes(outcome)) assert.equal(messages.at(-1).tone, "warn");
    if (outcome === "note-switch") assert.equal(messages.length, 0);
  });
}
