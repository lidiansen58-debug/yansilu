import test from "node:test";
import assert from "node:assert/strict";

import { readComponentsEditorPaneSource, readPrototypeHtmlSource } from "./copy-source-helpers.mjs";

test("link picker inserts plain wikilinks instead of inline relation comments", async () => {
  const source = await readComponentsEditorPaneSource();

  assert.match(source, /const token = `\[\[\$\{target\.title\}\]\]`;/);
  assert.doesNotMatch(source, /const annotation = reason/);
  assert.doesNotMatch(source, /<!-- rel:type=\$\{escapeHtml\(relationType\)\}/);
});

test("clicking a link picker candidate pins the selection instead of inserting immediately", async () => {
  const source = await readComponentsEditorPaneSource();

  assert.match(
    source,
    /this\.els\.linkSearchList\.addEventListener\("click", \(e\) => \{[\s\S]*this\.currentPinnedLinkId = String\(row\.dataset\.linkNoteId \|\| ""\)\.trim\(\);[\s\S]*this\.renderLinkCandidates\(this\.els\.linkSearchInput\.value, row\.dataset\.linkNoteId \|\| ""\);[\s\S]*this\.focusManualLinkReasonInput\(\);[\s\S]*\}\);/
  );
  assert.doesNotMatch(source, /void this\.insertSelectedLinkNote\(row\.dataset\.linkNoteId \|\| ""\);/);
});

test("manual link picker moves focus to the reason field after a candidate is pinned", async () => {
  const source = await readComponentsEditorPaneSource();

  assert.match(source, /focusManualLinkReasonInput\(\) \{/);
  assert.match(source, /if \(this\.currentLinkContext \|\| !this\.els\.linkReasonInput\) return;/);
  assert.match(source, /this\.els\.linkReasonInput\.focus\(\);/);
  assert.match(source, /this\.els\.linkReasonInput\.setSelectionRange\?\.\(value\.length, value\.length\);/);
});

test("link picker keeps only the pinned candidate visible and marks it as selected", async () => {
  const source = await readComponentsEditorPaneSource();

  assert.match(source, /const pinnedNote = selectedId/);
  assert.match(source, /const list = pinnedNote \? \[pinnedNote\] : computed;/);
  assert.ok(source.includes('picker-selection-state">已选中</span>'));
});

test("link picker confirm button reflects selection, reason, and submit state", async () => {
  const source = await readComponentsEditorPaneSource();

  assert.ok(source.includes("updateLinkPickerConfirmButton() {"));
  assert.ok(source.includes("const requiresReason = !this.currentLinkContext;"));
  assert.ok(source.includes('const hasReason = !requiresReason || String(this.els.linkReasonInput?.value || "").trim().length > 0;'));
  assert.ok(source.includes("const bodyAlreadyLinked = !this.currentLinkContext && selectedNote ? this.hasResolvedLinkToNote(selectedNote.id) : false;"));
  assert.ok(source.includes("button.disabled = this.isSubmittingLinkInsert || !selectedNote || !hasReason;"));
  assert.ok(
    source.includes('button.textContent = selectedNote ? `正在插入：${selectedNote.title || selectedNote.id}` : "正在插入...";')
  );
  assert.ok(source.includes("先写理由，再插入"));
  assert.ok(source.includes("正文已有链接，先写理由"));
  assert.ok(source.includes("正文已有链接，补建关系"));
  assert.ok(source.includes("插入：${selectedNote.title || selectedNote.id}"));
});

test("manual link picker refreshes confirm state from reason input and locks duplicate submit", async () => {
  const source = await readComponentsEditorPaneSource();

  assert.ok(source.includes("this.isSubmittingLinkInsert = false;"));
  assert.ok(source.includes("setLinkInsertSubmitting(nextSubmitting) {"));
  assert.ok(source.includes('this.els.linkReasonInput?.addEventListener("input", () => {'));
  assert.ok(source.includes("if (this.isSubmittingLinkInsert) return;"));
  assert.ok(source.includes("this.setLinkInsertSubmitting(true);"));
  assert.ok(source.includes("this.setLinkInsertSubmitting(false);"));
});

test("manual link picker surfaces three distinct duplicate-feedback states", async () => {
  const source = await readComponentsEditorPaneSource();

  assert.ok(source.includes("manualLinkInsertOutcome(bodyAlreadyLinked, reusedRelation) {"));
  assert.ok(source.includes('if (bodyAlreadyLinked && reusedRelation) return "body-and-relation-existed";'));
  assert.ok(source.includes('if (bodyAlreadyLinked) return "body-only-existed";'));
  assert.ok(source.includes('if (reusedRelation) return "relation-only-existed";'));
  assert.ok(source.includes("manualLinkInsertFeedback(target, outcome) {"));
  assert.ok(source.includes("正文已有链接，语义关系也已存在"));
  assert.ok(source.includes("正文已有链接，已补建语义关系"));
  assert.ok(source.includes("已插入正文链接，现有语义关系已复用"));
  assert.ok(source.includes("正文链接与现有语义关系均已复用。"));
  assert.ok(source.includes("正文链接已保留，并补建语义关系。"));
  assert.ok(source.includes("正文链接已插入，现有语义关系已复用。"));
});

test("manual link picker detects existing wikilinks by resolved note id before inserting again", async () => {
  const source = await readComponentsEditorPaneSource();

  assert.ok(source.includes("hasResolvedLinkToNote(noteId, body = this.getEditorValue(), scopedNotes = this.scopedLinkCandidates()) {"));
  assert.ok(source.includes("return parseLinks(body).some((token) => this.resolveLinkToken(token, scopedNotes)?.note?.id === targetId);"));
  assert.ok(source.includes("const bodyAlreadyLinked = !inlineInsert && this.hasResolvedLinkToNote(target.id, currentBody);"));
  assert.ok(source.includes("} else if (bodyAlreadyLinked) {"));
});

test("pinned link candidate expands a summary preview and explicit location details", async () => {
  const source = await readComponentsEditorPaneSource();
  const html = await readPrototypeHtmlSource();

  assert.ok(source.includes('const preview = pinned ? this.linkCandidatePreviewText(n) : "";'));
  assert.ok(source.includes('const location = pinned ? this.linkCandidateLocationText(n) : "";'));
  assert.ok(source.includes("正文里已经有这条链接，提交时只会补建或复用关系。"));
  assert.ok(source.includes('<span class="picker-preview">${escapeHtml(preview)}</span>'));
  assert.ok(source.includes('<span class="picker-duplicate-hint">${escapeHtml(duplicateHint)}</span>'));
  assert.ok(source.includes('<span class="picker-detail-label">目录位置</span>'));
  assert.ok(source.includes("linkCandidatePreviewText(note) {"));
  assert.ok(source.includes("linkCandidateLocationText(note) {"));
  assert.ok(html.includes(".picker-duplicate-hint {"));
  assert.ok(html.includes(".picker-preview {"));
  assert.ok(html.includes(".picker-detail-row {"));
});

test("confirm button prewarns when the selected note is already linked in the body", async () => {
  const source = await readComponentsEditorPaneSource();

  assert.ok(source.includes("const bodyAlreadyLinked = !this.currentLinkContext && selectedNote ? this.hasResolvedLinkToNote(selectedNote.id) : false;"));
  assert.ok(source.includes("正文已有链接，先写理由"));
  assert.ok(source.includes("正文已有链接，补建关系"));
});

test("link picker empty state suggests retrying the search or creating a note", async () => {
  const source = await readComponentsEditorPaneSource();

  assert.ok(source.includes('<div class="picker-empty">当前目录下没有匹配笔记，换个关键词或先新建笔记。</div>'));
});

test("manual link picker removes relation source and keeps AI as recommendation-only copy", async () => {
  const source = await readComponentsEditorPaneSource();
  const html = await readPrototypeHtmlSource();

  assert.doesNotMatch(source, /linkManagerSelect/);
  assert.doesNotMatch(html, /id="linkManagerSelect"/);
  assert.ok(source.includes('createdBy: "user"'));
  assert.ok(html.includes("关联类型（你确认）"));
  assert.ok(html.includes("AI 只提供关联建议，最终会按你的确认写入正式关系。"));
  assert.ok(html.includes("手动建立的关联默认记为自己，AI 只负责给出建议，不会替你确认关系。"));
  assert.ok(source.includes("已按你的确认插入关联笔记"));
});

test("manual link picker remembers the editor selection and restores the caret after insert", async () => {
  const source = await readComponentsEditorPaneSource();

  assert.ok(source.includes("this.manualLinkReturnSelection = null;"));
  assert.ok(source.includes("this.manualLinkReturnScrollState = null;"));
  assert.ok(source.includes("normalizedSelectionRange(range) {"));
  assert.ok(source.includes("this.manualLinkReturnSelection = inlineMode ? null : this.normalizedSelectionRange(this.editorSelection());"));
  assert.ok(
    source.includes(
      "const manualSelection = !inlineInsert\n      ? this.normalizedSelectionRange(this.manualLinkReturnSelection) || this.normalizedSelectionRange(this.editorSelection())\n      : null;"
    )
  );
  assert.ok(source.includes("if (restoreSelection) this.setEditorSelectionRange(restoreSelection.from, restoreSelection.to);"));
});

test("manual link picker also remembers and restores editor scroll position after insert", async () => {
  const source = await readComponentsEditorPaneSource();

  assert.ok(source.includes("editorScrollNodes() {"));
  assert.ok(source.includes("captureEditorScrollState() {"));
  assert.ok(source.includes("restoreEditorScrollState(state) {"));
  assert.ok(source.includes("scheduleEditorScrollRestore(state) {"));
  assert.ok(source.includes("this.manualLinkReturnScrollState = inlineMode ? null : this.captureEditorScrollState();"));
  assert.ok(source.includes("const manualScrollState = !inlineInsert ? this.manualLinkReturnScrollState : null;"));
  assert.ok(source.includes("this.scheduleEditorScrollRestore(manualScrollState);"));
});

test("closing and reopening the manual link picker resets pinned selection and draft input state", async () => {
  const source = await readComponentsEditorPaneSource();

  assert.ok(source.includes('this.currentPinnedLinkId = "";'));
  assert.ok(source.includes("this.manualLinkReturnSelection = inlineMode ? null : this.normalizedSelectionRange(this.editorSelection());"));
  assert.ok(source.includes("this.manualLinkReturnSelection = null;"));
  assert.ok(source.includes("this.manualLinkReturnScrollState = null;"));
  assert.ok(source.includes("this.isSubmittingLinkInsert = false;"));
  assert.ok(source.includes('if (this.els.linkReasonInput) this.els.linkReasonInput.value = "";'));
  assert.ok(source.includes("this.updateLinkPickerConfirmButton();"));
});

test("autosave keeps transient pickers open while explicit save still closes them", async () => {
  const source = await readComponentsEditorPaneSource();

  assert.ok(source.includes('async autoSaveTabById(tabId, trigger = "idle") {'));
  assert.ok(source.includes("if (!options?.autoSave) {\n      this.closeLinkPicker();\n      this.closeTagPicker();\n    }"));
});

test("preview mode switches clamp restored selection to the current body and resync markdown override", async () => {
  const source = await readComponentsEditorPaneSource();

  assert.ok(source.includes("normalizedSelectionRangeForValue(value, range) {"));
  assert.ok(source.includes("const normalizedPendingSelection = this.normalizedSelectionRangeForValue(content, pendingSelection);"));
  assert.ok(source.includes("else if (normalizedPendingSelection) this.setMarkdownSelectionOverride(normalizedPendingSelection.from, normalizedPendingSelection.to);"));
  assert.ok(source.includes("if (normalizedPendingSelection) {\n          this.setEditorSelectionRange(normalizedPendingSelection.from, normalizedPendingSelection.to);\n        }"));
  assert.ok(source.includes("this.pendingEditorSelection = this.isLiteratureWorkspaceActive()\n      ? null\n      : this.normalizedSelectionRangeForValue(latestValue, this.editorSelection());"));
});

test("setEditorSelectionRange also clamps out-of-bounds cursor restores against current content", async () => {
  const source = await readComponentsEditorPaneSource();

  assert.ok(source.includes("const normalized = this.normalizedSelectionRangeForValue(this.getEditorValue(), { from, to });"));
  assert.ok(source.includes("const start = normalized?.from ?? 0;"));
  assert.ok(source.includes("const end = normalized?.to ?? start;"));
});

test("title blur saves immediately instead of bouncing through delayed switch-tab refresh", async () => {
  const source = await readComponentsEditorPaneSource();

  assert.ok(source.includes("maybeSaveOnTitleBlur() {"));
  assert.ok(source.includes("this.renderTabs();"));
  assert.ok(source.includes('void this.saveActiveNote({ autoSave: true, trigger: "title-blur", skipOriginalityCheck: true });'));
  assert.doesNotMatch(source, /setTimeout\(\(\) => \{[\s\S]*onStateChange\("switch-tab"\)[\s\S]*trigger: "title-blur"/);
});

test("placeholder title state is resynced from the current body after draft restore and later edits", async () => {
  const source = await readComponentsEditorPaneSource();

  assert.ok(source.includes("function noteUsesPlaceholderTitle(title = \"\") {"));
  assert.ok(source.includes("placeholderTitleArmed: noteUsesPlaceholderTitle(titleFromBody(n.body))"));
  assert.ok(source.includes("this.maybeRestoreDraft(t, n);\n      this.syncPlaceholderTitleArmed(t);"));
  assert.ok(source.includes("this.syncPlaceholderTitleArmed(tab);"));
  assert.doesNotMatch(source, /if \(!this\.isLiteratureWorkspaceActive\(\) && this\.isWysiwygMode\(\) && tab\.placeholderTitleArmed\) \{/);
});

test("untitled placeholder text is normalized before title-delta dirty checks and blur saves", async () => {
  const source = await readComponentsEditorPaneSource();

  assert.ok(source.includes("function normalizedNoteTitleText(title = \"\") {"));
  assert.ok(source.includes("const savedTitle = normalizedNoteTitleText(tab.savedTitle);"));
  assert.ok(source.includes("const currentTitle = normalizedNoteTitleText(tab.title);"));
  assert.ok(source.includes("if (normalizedNoteTitleText(tab.title) === normalizedNoteTitleText(tab.savedTitle)) return;"));
});

test("dirty detection normalizes line endings and trailing blank lines before triggering saves", async () => {
  const source = await readComponentsEditorPaneSource();

  assert.ok(source.includes("function normalizedBodyTextForDirtyCheck(body = \"\") {"));
  assert.ok(source.includes('.replace(/\\r\\n/g, "\\n")'));
  assert.ok(source.includes('.replace(/\\n+$/g, "");'));
  assert.ok(source.includes("const savedBody = normalizedBodyTextForDirtyCheck(tab.savedBody);"));
  assert.ok(source.includes("const currentBody = normalizedBodyTextForDirtyCheck(tab.body);"));
  assert.ok(source.includes("tab.dirty = savedBody !== currentBody || savedTitle !== currentTitle;"));
});

test("placeholder-title focus uses the markdown placeholder range as the source of truth in both editors", async () => {
  const source = await readComponentsEditorPaneSource();

  assert.ok(source.includes("placeholderTitleSelectionRange() {"));
  assert.ok(source.includes("const markdownRange = this.placeholderTitleSelectionRange();"));
  assert.ok(source.includes("this.setMarkdownSelectionOverride(markdownRange.from, markdownRange.to);"));
  assert.ok(source.includes("normalizedNoteTitleText(titleText) !== UNTITLED_NOTE_TITLE"));
  assert.ok(source.includes("this.setEditorSelectionRange(markdownRange.from, markdownRange.to);"));
});
