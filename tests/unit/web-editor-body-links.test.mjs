import test from "node:test";
import assert from "node:assert/strict";
import { bodyLinkLabelAtSelection, bodyLinkRangeAtSelection, bodyLinkTokenForNote } from "../../apps/web/src/editor-body-links.js";
import { EditorRelationLinkController } from "../../apps/web/src/editor-relation-link-controller.js";
import { normalizeToastuiWidgetMarkdown } from "../../apps/web/src/toastui-widget-markdown.js";

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

test("linking selected prose retains its words instead of replacing them with the target title", () => {
  const body = "前文 提炼出来的判断 后文";
  const label = bodyLinkLabelAtSelection(body, { from: 3, to: 10 });
  assert.equal(bodyLinkTokenForNote({ id: "target", title: "材料笔记" }, null, label), "[[target|提炼出来的判断]]");
  assert.equal(bodyLinkTokenForNote({ id: "target", title: "材料笔记" }, null, "  原话  "), "  [[target|原话]]  ");
  assert.equal(bodyLinkLabelAtSelection("[[旧链接]]", { from: 0, to: 7 }), "");
  assert.equal(bodyLinkLabelAtSelection("跨段\n文字", { from: 0, to: 5 }), "");
  assert.equal(bodyLinkLabelAtSelection("`代码`", { from: 0, to: 4 }), "");
  assert.equal(bodyLinkLabelAtSelection(body, { from: 3, to: 3 }), "");
});

test("link confirmation cannot replace an outdated selection after new editor input", async () => {
  let body = "前文 新输入 后文", canceled = false;
  const host = { state: { notes: [{ id: "target", title: "目标" }] }, activeNote: () => ({ id: "source" }),
    getEditorValue: () => body, onStatus: message => assert.match(message, /正文已变化/),
    replaceEditorRange: () => assert.fail("Must not overwrite changed text"), saveActiveNote: () => assert.fail("Must not save a stale replacement") };
  const controller = new EditorRelationLinkController(host);
  controller.returnContext = { noteId: "source", body: "前文 旧选区 后文" };
  controller.cancel = () => { canceled = true; };
  await controller.insertSelected("target");
  assert.equal(body, "前文 新输入 后文");
  assert.equal(canceled, true);
});

test("widget normalization preserves link identity and maps selections after links and tags", () => {
  const raw = "前文 $$widget0 [[target#段落|引用]]$$ 和 $$widget1 #标签$$ 后文";
  const normalized = normalizeToastuiWidgetMarkdown(raw, [raw.indexOf("引用"), raw.indexOf("后文"), raw.length]);
  assert.equal(normalized.value, "前文 [[target#段落|引用]] 和 #标签 后文");
  assert.deepEqual(normalized.offsets, [normalized.value.indexOf("引用"), normalized.value.indexOf("后文"), normalized.value.length]);
});

test("widget normalization leaves ordinary math and links unchanged", () => {
  const body = "$$x + y$$ 与 [[target|引用]] 和 #标签";
  assert.deepEqual(normalizeToastuiWidgetMarkdown(body, [0, body.length]), { value: body, offsets: [0, body.length] });
});

test("literal widget syntax inside code remains intact", () => {
  const body = "`$$widget0 #示例$$`\n\n```md\n$$widget1 [[target|代码示例]]$$\n```\n\n$$widget2 #正常标签$$";
  const normalized = normalizeToastuiWidgetMarkdown(body, [body.indexOf("代码示例")]);
  assert.equal(normalized.value, body.replace("$$widget2 #正常标签$$", "#正常标签"));
  assert.equal(normalized.offsets[0], body.indexOf("代码示例"));
});

for (const change of ["note", "vault"]) {
  test(`link confirmation ignores a picker opened in another ${change}`, async () => {
    let closed = false;
    const host = { state: { notes: [{ id: "target", title: "目标" }], noteMoveVaultScope: change === "vault" ? "new" : "old" },
      activeNote: () => ({ id: change === "note" ? "new" : "old" }), getEditorValue: () => "正文",
      onStatus: () => assert.fail("Do not show old-context feedback"),
      replaceEditorRange: () => assert.fail("Do not replace text in new context") };
    const controller = new EditorRelationLinkController(host);
    controller.returnContext = { noteId: "old", vaultScope: "old", body: "正文" };
    controller.close = () => { closed = true; };
    await controller.insertSelected("target");
    assert.equal(closed, true);
  });
}

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

for (const change of ["unchanged", "body", "note", "vault"]) {
  test(`canceling a picker restores only a current unchanged selection (${change})`, () => {
    let focused = 0, restored = null, scrolled = 0;
    const host = { state: { noteMoveVaultScope: change === "vault" ? "other" : "vault" },
      activeNote: () => ({ id: change === "note" ? "other" : "source" }),
      getEditorValue: () => change === "body" ? "继续输入" : "正文",
      focusEditor: () => focused++, setEditorSelectionRange: (from, to) => { restored = { from, to }; },
      scheduleEditorScrollRestore: () => scrolled++ };
    const controller = new EditorRelationLinkController(host);
    controller.returnContext = { noteId: "source", vaultScope: "vault", body: "正文", selection: { from: 1, to: 2 }, scroll: {} };
    controller.close = () => { controller.returnContext = null; };
    controller.cancel();
    assert.equal(focused, ["unchanged", "body"].includes(change) ? 1 : 0);
    assert.deepEqual(restored, change === "unchanged" ? { from: 1, to: 2 } : null);
    assert.equal(scrolled, change === "unchanged" ? 1 : 0);
  });
}

test("Enter confirms a pinned note even when the rendered search list is empty", async () => {
  const host = { currentPinnedLinkId: "chosen", currentLinkCandidates: [] };
  const controller = new EditorRelationLinkController(host);
  let inserted;
  controller.insertSelected = async id => { inserted = id; };
  await controller.confirmSelectedCandidate();
  assert.equal(inserted, "chosen");
});

test("choosing a target invalidates pending search and returns focus for Enter confirmation", async () => {
  const chosen = { id: "chosen", title: "目标" };
  let resolve, focused = 0;
  const pendingSearch = new Promise(r => { resolve = r; });
  const host = { state: { notes: [chosen] }, activeNote: () => ({ id: "source" }),
    currentLinkCandidates: [chosen], currentLinkIndex: 0, searchNotesForResolution: () => pendingSearch,
    upsertApiNotes: () => assert.fail("A chosen target must not be overwritten by pending search"),
    linkCandidateDisplayTitle: note => note.title,
    els: { linkSearchInput: { value: "目", focus: () => focused++ }, linkSearchList: { innerHTML: "" } } };
  const controller = new EditorRelationLinkController(host);
  controller.renderCandidates = () => {};
  const pending = controller.searchCandidates("目");
  controller.chooseCandidate(chosen.id);
  resolve({ items: [] });
  await pending;
  assert.equal(host.currentPinnedLinkId, chosen.id);
  assert.equal(focused, 1);
  assert.equal(host.els.linkSearchInput.value, chosen.title);
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
