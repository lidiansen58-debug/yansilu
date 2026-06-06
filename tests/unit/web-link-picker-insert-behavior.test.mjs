import test from "node:test";
import assert from "node:assert/strict";

import { EditorPane } from "../../apps/web/src/components-editor-pane.js";
import { readComponentsEditorPaneSource } from "./copy-source-helpers.mjs";

test("link picker inserts plain wikilinks instead of inline relation comments", async () => {
  const source = await readComponentsEditorPaneSource();

  assert.match(source, /const token = `\[\[\$\{target\.title\}\]\]`;/);
  assert.doesNotMatch(source, /const annotation = reason/);
  assert.doesNotMatch(source, /<!-- rel:type=\$\{escapeHtml\(relationType\)\}/);
});

test("manual link picker hides the old relation-type and reason block at runtime", async () => {
  const source = await readComponentsEditorPaneSource();

  assert.ok(source.includes('const linkPickerMeta = this.els.linkRelationTypeSelect?.closest?.(".link-picker-meta");'));
  assert.ok(source.includes("if (linkPickerMeta) linkPickerMeta.hidden = true;"));
  assert.ok(source.includes('if (linkPickerGuidance?.classList?.contains("semantic-relation-quality-guidance")) linkPickerGuidance.hidden = true;'));
  assert.ok(source.includes("const linkSearchSpacer = this.els.linkSearchInput?.nextElementSibling;"));
  assert.ok(source.includes("this.els.linkSearchInput.parentNode?.insertBefore(this.els.linkSearchList, linkSearchSpacer);"));
  assert.ok(source.includes('if (linkSearchSpacer.tagName === "DIV" && !String(linkSearchSpacer.textContent || "").trim()) linkSearchSpacer.hidden = true;'));
});

test("closing transient pickers clears toolbar active and focus states", async () => {
  const source = await readComponentsEditorPaneSource();

  assert.ok(source.includes("resetToolbarTransientButtons() {"));
  assert.ok(source.includes("[this.els.insertLink, this.els.insertTag, this.els.insertImage].forEach((button) => {"));
  assert.ok(source.includes('button.classList.remove("active");'));
  assert.ok(source.includes("button.blur?.();"));
  assert.ok(source.includes("this.resetToolbarTransientButtons();"));
});

test("manual link picker renders a title-first autocomplete list", async () => {
  const source = await readComponentsEditorPaneSource();

  assert.match(source, /filter\(\(n\) => normalizeText\(n\.title\)\.includes\(q\)\)/);
  assert.match(source, /highlightMatch\(this\.linkCandidateDisplayTitle\(n\), q\)/);
  assert.match(source, /const list = q \? computed\.slice\(0, 50\) : \[\];/);
  assert.doesNotMatch(source, /picker-selection-state/);
  assert.doesNotMatch(source, /picker-preview/);
  assert.doesNotMatch(source, /picker-detail-row/);
});

test("cross-folder link candidates use a folder-prefixed display label", async () => {
  const source = await readComponentsEditorPaneSource();

  assert.ok(source.includes("compactFolderLabel(folderId) {"));
  assert.ok(source.includes("linkCandidateDisplayTitle(note) {"));
  assert.ok(source.includes("return `${this.compactFolderLabel(note.folderId)}/${targetTitle}`;"));
});

test("confirm button stays simple and only depends on selection state", async () => {
  const source = await readComponentsEditorPaneSource();

  assert.ok(source.includes("button.disabled = this.isSubmittingLinkInsert || !selectedNote;"));
  assert.ok(source.includes('button.textContent = "关联中...";'));
  assert.ok(source.includes('button.textContent = "关联";'));
  assert.doesNotMatch(source, /先写理由/);
  assert.doesNotMatch(source, /请先选择一条关联笔记/);
});

test("clicking a link picker candidate selects it without inserting immediately", async () => {
  const source = await readComponentsEditorPaneSource();

  assert.match(
    source,
    /this\.els\.linkSearchList\.addEventListener\("click", \(e\) => \{[\s\S]*this\.currentPinnedLinkId = String\(row\.dataset\.linkNoteId \|\| ""\)\.trim\(\);[\s\S]*this\.renderLinkCandidates\(this\.els\.linkSearchInput\.value, row\.dataset\.linkNoteId \|\| ""\);[\s\S]*this\.els\.linkSearchInput\.value = row\.textContent\?\.trim\(\) \|\| "";\s*this\.els\.linkSearchList\.innerHTML = "";/ 
  );
  assert.doesNotMatch(source, /void this\.insertSelectedLinkNote\(row\.dataset\.linkNoteId \|\| ""\);/);
});

test("Enter selects the highlighted candidate before the explicit associate action", async () => {
  const pane = Object.create(EditorPane.prototype);
  const rerenders = [];
  const linkSearchInput = { value: "perm" };
  const linkSearchList = { innerHTML: "" };
  let insertedNoteId = "";

  pane.currentLinkCandidates = [{ id: "pn_1", title: "Permanent note", folderId: "dir_original_default" }];
  pane.currentLinkIndex = 0;
  pane.currentPinnedLinkId = "";
  pane.currentLinkContext = null;
  pane.els = { linkSearchInput, linkSearchList };
  pane.renderLinkCandidates = (query, preferredId) => {
    rerenders.push({ query, preferredId });
  };
  pane.linkCandidateDisplayTitle = (note) => note.title;
  pane.insertSelectedLinkNote = async (noteId) => {
    insertedNoteId = noteId;
  };

  await pane.confirmSelectedLinkCandidate();

  assert.equal(insertedNoteId, "");
  assert.equal(pane.currentPinnedLinkId, "pn_1");
  assert.deepEqual(rerenders, [{ query: "perm", preferredId: "pn_1" }]);
  assert.equal(linkSearchInput.value, "Permanent note");
  assert.equal(linkSearchList.innerHTML, "");
});

test("manual link picker binds the explicit associate button to relation creation", async () => {
  const source = await readComponentsEditorPaneSource();

  assert.match(source, /this\.els\.confirmLinkInsert\?\.addEventListener\("click", \(\) => \{[\s\S]*const selectedId = String\(this\.currentPinnedLinkId \|\| ""\)\.trim\(\);[\s\S]*void this\.insertSelectedLinkNote\(selectedId\);/);
});

test("toolbar relation action reuses the inline [[ trigger flow", async () => {
  const source = await readComponentsEditorPaneSource();

  assert.match(
    source,
    /this\.els\.insertLink\.addEventListener\("click", \(\) => \{[\s\S]*this\.insertAtCursor\("\[\["\);[\s\S]*const inline = this\.detectInlineLinkContext\(\);[\s\S]*this\.openLinkPicker\("", \{ inlineContext: inline, focusInput: true \}\);/
  );
});

test("manual link picker uses a fixed support relation for quick association", async () => {
  const source = await readComponentsEditorPaneSource();

  assert.ok(source.includes('const relationType = "supports";'));
  assert.ok(source.includes('const rawReason = "手动确认关联。";'));
  assert.ok(source.includes('createdBy: "user"'));
});

test("manual link picker keeps duplicate-submit protection", async () => {
  const source = await readComponentsEditorPaneSource();

  assert.ok(source.includes("this.isSubmittingLinkInsert = false;"));
  assert.ok(source.includes("setLinkInsertSubmitting(nextSubmitting) {"));
  assert.ok(source.includes("if (this.isSubmittingLinkInsert) return;"));
  assert.ok(source.includes("this.setLinkInsertSubmitting(true);"));
  assert.ok(source.includes("this.setLinkInsertSubmitting(false);"));
});

test("manual link picker still detects existing wikilinks by resolved note id before inserting again", async () => {
  const source = await readComponentsEditorPaneSource();

  assert.ok(source.includes("hasResolvedLinkToNote(noteId, body = this.getEditorValue(), scopedNotes = this.scopedLinkCandidates()) {"));
  assert.ok(source.includes("return parseLinks(body).some((token) => this.resolveLinkToken(token, scopedNotes)?.note?.id === targetId);"));
  assert.ok(source.includes("const bodyAlreadyLinked = !inlineInsert && this.hasResolvedLinkToNote(target.id, currentBody);"));
  assert.ok(source.includes("} else if (bodyAlreadyLinked) {"));
});

test("inline relation trigger recognizes both [[ and full-width 【【 prefixes", async () => {
  const source = await readComponentsEditorPaneSource();

  assert.ok(source.includes('const asciiStart = left.lastIndexOf("[[");'));
  assert.ok(source.includes('const fullWidthStart = left.lastIndexOf("【【");'));
  assert.ok(source.includes('const lastClose = Math.max(left.lastIndexOf("]]"), left.lastIndexOf("】】"));'));
  assert.ok(source.includes("const explicitEmptyLinkTrigger = inline && !inline.query;"));
  assert.ok(source.includes("scheduleInlineLinkTriggerProbe() {"));
  assert.ok(source.includes('if (!["[[", "【【"].includes(trigger)) return;'));
  assert.ok(source.includes('if (!mod && (e.key === "[" || e.key === "【")) {'));
});

test("detectInlineLinkContext returns context for full-width 【【 input", () => {
  const pane = Object.create(EditorPane.prototype);
  pane.editorSelection = () => ({ from: 2, to: 2 });
  pane.getEditorValue = () => "【【";
  pane.isWysiwygMode = () => false;

  const inline = pane.detectInlineLinkContext();

  assert.deepEqual(inline, { start: 0, end: 2, query: "" });
});

test("quick association synchronizes both note endpoints as connected", async () => {
  const source = await readComponentsEditorPaneSource();

  assert.ok(source.includes("syncRelationNetworkConnected(...noteIds) {"));
  assert.ok(source.includes('if (note) note.relationNetworkStatus = "connected";'));
  assert.ok(source.includes('this.syncRelationNetworkConnected(this.activeNote()?.id || "", target.id);'));
});

test("manual link picker remembers the editor selection and scroll position for body insertion flows", async () => {
  const source = await readComponentsEditorPaneSource();

  assert.ok(source.includes("this.manualLinkReturnSelection = null;"));
  assert.ok(source.includes("this.manualLinkReturnScrollState = null;"));
  assert.ok(source.includes("normalizedSelectionRange(range) {"));
  assert.ok(source.includes("captureEditorScrollState() {"));
  assert.ok(source.includes("scheduleEditorScrollRestore(state) {"));
  assert.ok(source.includes("if (restoreSelection) this.setEditorSelectionRange(restoreSelection.from, restoreSelection.to);"));
});

test("link picker empty state stays concise", async () => {
  const source = await readComponentsEditorPaneSource();

  assert.ok(source.includes('<div class="picker-empty">没有匹配笔记</div>'));
});
