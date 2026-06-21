import test from "node:test";
import assert from "node:assert/strict";

import { EditorPane } from "../../apps/web/src/components-editor-pane.js";
import { parseLinks } from "../../apps/web/src/prototype-store.js";
import { readEditorDomainSource, readPrototypeHtmlSource } from "./copy-source-helpers.mjs";

test("link picker inserts stable wikilinks instead of inline relation comments", async () => {
  const source = await readEditorDomainSource();

  assert.ok(source.includes("const token = wikilinkTokenForNote(target);"));
  assert.ok(source.includes('const target = String(note?.id || "").trim() || markdownPath || title;'));
  assert.ok(source.includes("return `[[${target}|${title}]]`;"));
  assert.doesNotMatch(source, /hasDuplicateTitle/);
  assert.doesNotMatch(source, /const annotation = reason/);
  assert.doesNotMatch(source, /<!-- rel:type=\$\{escapeHtml\(relationType\)\}/);
});

test("manual link picker shows relation fields while inline picker hides them", async () => {
  const source = await readEditorDomainSource();

  assert.ok(source.includes('const linkPickerMeta = this.els.linkRelationTypeSelect?.closest?.(".link-picker-meta");'));
  assert.ok(source.includes("if (linkPickerMeta) linkPickerMeta.hidden = inlineMode;"));
  assert.ok(source.includes('if (linkPickerGuidance?.classList?.contains("semantic-relation-quality-guidance")) linkPickerGuidance.hidden = inlineMode;'));
  assert.ok(source.includes("const linkSearchSpacer = this.els.linkSearchInput?.nextElementSibling;"));
  assert.ok(source.includes("this.els.linkSearchInput.parentNode?.insertBefore(this.els.linkSearchList, linkSearchSpacer);"));
  assert.ok(source.includes('if (linkSearchSpacer.tagName === "DIV" && !String(linkSearchSpacer.textContent || "").trim()) linkSearchSpacer.hidden = true;'));
});

test("closing transient pickers clears toolbar active and focus states", async () => {
  const source = await readEditorDomainSource();

  assert.ok(source.includes("resetToolbarTransientButtons() {"));
  assert.ok(source.includes("[this.els.insertLink, this.els.insertTag, this.els.insertImage].forEach((button) => {"));
  assert.ok(source.includes('button.classList.remove("active");'));
  assert.ok(source.includes("button.blur?.();"));
  assert.ok(source.includes("this.resetToolbarTransientButtons();"));
});

test("manual link picker renders a title-first autocomplete list", async () => {
  const source = await readEditorDomainSource();

  assert.match(source, /filter\(\(n\) => normalizeText\(n\.title\)\.includes\(q\)\)/);
  assert.match(source, /highlightMatch\(this\.linkCandidateDisplayTitle\(n\), q\)/);
  assert.match(source, /const list = q \? computed\.slice\(0, 50\) : \[\];/);
  assert.doesNotMatch(source, /picker-selection-state/);
  assert.doesNotMatch(source, /picker-preview/);
  assert.doesNotMatch(source, /picker-detail-row/);
});

test("cross-folder link candidates use a folder-prefixed display label", async () => {
  const source = await readEditorDomainSource();

  assert.ok(source.includes("compactFolderLabel(folderId) {"));
  assert.ok(source.includes("linkCandidateDisplayTitle(note) {"));
  assert.ok(source.includes("return `${this.compactFolderLabel(note.folderId)}/${targetTitle}`;"));
});

test("wikilink preview avoids low-value match and count metadata", async () => {
  const source = await readEditorDomainSource();

  assert.ok(source.includes('mode: "wikilink"'));
  assert.ok(source.includes('data-open-linked-note="${escapeHtml(note.id)}"'));
  assert.ok(source.includes("async openLinkedPreviewNote(noteId)"));
  assert.ok(source.includes("void this.openLinkedPreviewNote(linkedNoteButton.dataset.openLinkedNote);"));
  assert.ok(source.includes("正文里的这个链接指向这条笔记。"));
  assert.doesNotMatch(source, /已匹配/);
  assert.doesNotMatch(source, /重名匹配/);
  assert.doesNotMatch(source, /关联 \$\{links\.length\}/);
  assert.doesNotMatch(source, /标签 \$\{tags\.length\}/);
});

test("confirm button requires a target and manual relation reason", async () => {
  const source = await readEditorDomainSource();

  assert.ok(source.includes("const selectedNote = this.selectedLinkCandidate();"));
  assert.ok(source.includes("button.disabled = this.isSubmittingLinkInsert || !selectedNote || (manualMode && !reason);"));
  assert.ok(source.includes('button.textContent = "选择笔记";'));
  assert.ok(source.includes('button.textContent = "写一句理由";'));
  assert.ok(source.includes('button.textContent = "保存关联";'));
});

test("manual link picker keeps only information needed to save a relation", async () => {
  const html = await readPrototypeHtmlSource();
  const source = await readEditorDomainSource();

  assert.match(html, /<strong>建立笔记关联<\/strong>/);
  assert.match(html, /<label class="link-picker-search-label" for="linkSearchInput">要关联哪条笔记<\/label>/);
  assert.match(html, /<label for="linkRelationTypeSelect">它们是什么关系<\/label>/);
  assert.match(html, /<label for="linkReasonInput">为什么关联<\/label>/);
  assert.match(html, /<button class="mini-btn primary" id="btnConfirmLinkInsert" type="button" disabled>选择笔记<\/button>/);
  assert.match(html, /<option value="associated_with" selected>相关<\/option>/);
  assert.doesNotMatch(html, /<option value="appears_in_draft">/);
  assert.match(source, /const INLINE_LINK_RELATION_TYPES = \[[\s\S]*"associated_with",[\s\S]*"supports",[\s\S]*"complements",[\s\S]*"qualifies",[\s\S]*"contradicts",[\s\S]*"bridges"[\s\S]*\];/);
  assert.doesNotMatch(html, /AI 只提供关联建议/);
  assert.doesNotMatch(html, /不会替你确认关系/);
  assert.match(source, /this\.els\.linkSearchInput\.placeholder = "搜索笔记标题";/);
});

test("clicking a link picker candidate selects it without inserting immediately", async () => {
  const source = await readEditorDomainSource();

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
  const source = await readEditorDomainSource();

  assert.match(source, /this\.els\.confirmLinkInsert\?\.addEventListener\("click", \(\) => \{[\s\S]*this\.selectedLinkCandidate\(\)\?\.id[\s\S]*void this\.insertSelectedLinkNote\(selectedId\);/);
});

test("toolbar relation action opens manual picker without writing a stray wikilink trigger", async () => {
  const source = await readEditorDomainSource();
  const start = source.indexOf('this.els.insertLink.addEventListener("click", (event) => {');
  const end = source.indexOf("\n\n    this.els.insertImage", start);
  assert.ok(start >= 0 && end > start, "expected toolbar link handler");
  const body = source.slice(start, end);

  assert.ok(body.includes('this.openLinkPicker("", { anchorAtCursor: true, anchorRect, focusInput: true });'));
  assert.doesNotMatch(body, /insertAtCursor\("\[\["\)/);
  assert.doesNotMatch(body, /inlineContext: inline/);
});

test("toolbar relation picker anchors to the click target and flips inside the viewport", async () => {
  const source = await readEditorDomainSource();

  assert.ok(source.includes("const anchorRect = event.currentTarget?.getBoundingClientRect?.() || null;"));
  assert.ok(source.includes('this.openLinkPicker("", { anchorAtCursor: true, anchorRect, focusInput: true });'));
  assert.match(source, /positionFloatingPicker\(panel, width, options = \{\}\) \{/);
  assert.ok(source.includes("const rect = options.anchorRect || options.anchorElement?.getBoundingClientRect?.() || this.currentSelectionRect();"));
  assert.ok(source.includes("const openAbove = belowSpace < Math.min(naturalHeight, 180) && aboveSpace > belowSpace;"));
  assert.ok(source.includes("panel.style.maxHeight = `${Math.floor(availableHeight)}px`;"));
  assert.ok(source.includes("const explicitMaxHeight = Number.parseFloat(panel.style.maxHeight);"));
});

test("floating relation picker opens above a low cursor without leaving the viewport", () => {
  const pane = Object.create(EditorPane.prototype);
  const originalWindow = global.window;
  const panel = {
    classList: { add() {} },
    scrollHeight: 260,
    style: {}
  };

  global.window = { innerWidth: 800, innerHeight: 500, visualViewport: null };
  pane.currentSelectionRect = () => ({ left: 320, top: 455, bottom: 475 });

  try {
    pane.positionFloatingPicker(panel, 420);
  } finally {
    if (originalWindow === undefined) delete global.window;
    else global.window = originalWindow;
  }

  const top = Number.parseFloat(panel.style.top);
  const maxHeight = Number.parseFloat(panel.style.maxHeight);
  assert.equal(panel.style.width, "420px");
  assert.ok(top < 455);
  assert.ok(top >= 12);
  assert.ok(top + maxHeight <= 488);
});

test("floating relation picker can use the toolbar button rect as a fallback anchor", () => {
  const pane = Object.create(EditorPane.prototype);
  const originalWindow = global.window;
  const panel = {
    classList: { add() {} },
    scrollHeight: 180,
    style: {}
  };

  global.window = { innerWidth: 700, innerHeight: 500, visualViewport: null };
  pane.currentSelectionRect = () => ({ left: 15, top: 15, bottom: 24 });

  try {
    pane.positionFloatingPicker(panel, 320, {
      anchorRect: { left: 660, top: 100, bottom: 120 }
    });
  } finally {
    if (originalWindow === undefined) delete global.window;
    else global.window = originalWindow;
  }

  assert.equal(panel.style.width, "320px");
  assert.equal(panel.style.left, "368px");
  assert.ok(Number.parseFloat(panel.style.top) > 120);
});

test("manual link picker saves the user-confirmed relation type and rationale", async () => {
  const source = await readEditorDomainSource();

  assert.ok(source.includes("currentLinkRelationInput() {"));
  assert.ok(source.includes('const relationType = String(this.els.linkRelationTypeSelect?.value || "associated_with").trim() || "associated_with";'));
  assert.ok(source.includes('const reason = String(this.els.linkReasonInput?.value || "")'));
  assert.ok(source.includes("const { relationType, reason } = this.currentLinkRelationInput();"));
  assert.ok(source.includes("QUICK_WIKILINK_ASSOCIATION_MARKER,"));
  assert.ok(source.includes("saveOrUpgradeWikilinkRelationTransaction,"));
  assert.ok(source.includes("insightQuestion: QUICK_WIKILINK_ASSOCIATION_MARKER"));
  assert.ok(source.includes("confidence: 1"));
});

test("manual link picker keeps duplicate-submit protection", async () => {
  const source = await readEditorDomainSource();

  assert.ok(source.includes("this.isSubmittingLinkInsert = false;"));
  assert.ok(source.includes("setLinkInsertSubmitting(nextSubmitting) {"));
  assert.ok(source.includes("if (this.isSubmittingLinkInsert) return;"));
  assert.ok(source.includes("this.setLinkInsertSubmitting(true);"));
  assert.ok(source.includes("this.setLinkInsertSubmitting(false);"));
});

test("manual link picker still detects existing wikilinks by resolved note id before inserting again", async () => {
  const source = await readEditorDomainSource();

  assert.ok(source.includes("hasResolvedLinkToNote(noteId, body = this.getEditorValue(), scopedNotes = this.scopedLinkCandidates()) {"));
  assert.ok(source.includes("const resolved = this.resolveLinkToken(token, scopedNotes);"));
  assert.ok(source.includes("return resolved?.ambiguous !== true && resolved?.note?.id === targetId;"));
  assert.ok(source.includes("const editorBodyAlreadyLinked = !inlineInsert && this.hasResolvedLinkToNote(target.id, currentBody, scopedLinkNotes);"));
  assert.ok(source.includes("const savedBodyAlreadyLinked = !inlineInsert && this.hasResolvedLinkToNote(target.id, persistedSourceBody(), scopedLinkNotes);"));
  assert.ok(source.includes("const bodyAlreadyLinked = editorBodyAlreadyLinked;"));
  assert.ok(source.includes("} else if (bodyAlreadyLinked) {"));
});

test("inline relation trigger recognizes both [[ and full-width 【【 prefixes", async () => {
  const source = await readEditorDomainSource();

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
  const source = await readEditorDomainSource();

  assert.ok(source.includes("syncRelationNetworkConnected(...noteIds) {"));
  assert.ok(source.includes('if (note) note.relationNetworkStatus = "connected";'));
  assert.ok(source.includes("this.syncRelationNetworkConnected(sourceNoteId, target.id);"));
});

test("confirmed inline wikilink insertion also creates a formal note relation", async () => {
  const source = await readEditorDomainSource();
  const start = source.indexOf("async insertSelectedLinkNote(noteId) {");
  const end = source.indexOf("\n  moveLinkCandidate(step)", start);
  assert.ok(start >= 0 && end > start, "expected insertSelectedLinkNote body");
  const body = source.slice(start, end);

  assert.ok(body.includes('const sourceNoteId = String(sourceNote?.id || "").trim();'));
  assert.ok(body.includes("const transaction = await saveOrUpgradeWikilinkRelationTransaction({"));
  assert.ok(body.includes("fetchNoteRelations,"));
  assert.ok(body.includes("createNoteRelation,"));
  assert.ok(body.includes("updateNoteRelation,"));
  assert.ok(body.includes("isMarkdownWikilinkRelation"));
  assert.ok(body.includes("relationCreateResult = transaction.relation;"));
  assert.ok(body.includes('saveInsertedBody("inline-link-insert")'));
  assert.ok(body.includes("已插入关联笔记并建立正式关系"));
  const inlineBranch = body.slice(body.indexOf('saveInsertedBody("inline-link-insert")'));
  assert.ok(inlineBranch.indexOf('saveInsertedBody("inline-link-insert")') < inlineBranch.indexOf("await ensureFormalRelation();"));
});

test("link insertion does not create a formal relation until the wikilink save is verified", async () => {
  const source = await readEditorDomainSource();
  const start = source.indexOf("async insertSelectedLinkNote(noteId) {");
  const end = source.indexOf("\n  moveLinkCandidate(step)", start);
  assert.ok(start >= 0 && end > start, "expected insertSelectedLinkNote body");
  const body = source.slice(start, end);

  assert.ok(body.includes("const sourceTabId = String(this.activeTab()?.id || \"\").trim();"));
  assert.ok(body.includes("const persistedSourceBody = () => {"));
  assert.ok(body.includes("const savedBodyAlreadyLinked = !inlineInsert && this.hasResolvedLinkToNote(target.id, persistedSourceBody(), scopedLinkNotes);"));
  assert.ok(body.includes("const verifySavedLink = () => {"));
  assert.ok(body.includes("this.hasResolvedLinkToNote(target.id, savedBody, scopedLinkNotes);"));
  assert.ok(!body.includes("if (bodyAlreadyLinked) return true;"));
  assert.ok(body.includes("const saved = await this.saveActiveNote({ trigger, skipOriginalityCheck: true });"));
  assert.ok(body.includes("暂未建立正式关系"));
  assert.ok(body.indexOf("if (!savedBodyAlreadyLinked && !(await saveInsertedBody(\"link-insert\"))) return;") < body.indexOf("await ensureFormalRelation();"));
});

test("inline link picker keyboard handling survives focus leaving the editor host", async () => {
  const source = await readEditorDomainSource();

  assert.ok(source.includes("const targetIsEditor ="));
  assert.ok(source.includes("const targetIsPicker ="));
  assert.ok(source.includes("const targetIsEmptyPageFocus ="));
  assert.ok(source.includes("if (!targetIsEditor && !targetIsPicker && !targetIsEmptyPageFocus) return;"));
});

test("wysiwyg save reads the markdown editor instead of stale sync textarea", async () => {
  const source = await readEditorDomainSource();
  const start = source.indexOf("getEditorValue() {");
  const end = source.indexOf("\n  setEditorValue(value)", start);
  assert.ok(start >= 0 && end > start, "expected getEditorValue body");
  const body = source.slice(start, end);

  assert.match(body, /if \(this\.isStructuredWorkspaceActive\(\)\) \{/);
  assert.doesNotMatch(body, /if \(this\.isWysiwygMode\(\)\) \{\s*return String\(this\.els\.body\.value/);
  assert.match(body, /const editor = this\.markdownEditor && typeof this\.markdownEditor\.getValue === "function"[\s\S]*: this\.currentEditor\(\);/);
  assert.match(body, /const editorValue = String\(editor\.getValue\(\) \|\| ""\)/);
});

test("manual link picker remembers the editor selection and scroll position for body insertion flows", async () => {
  const source = await readEditorDomainSource();

  assert.ok(source.includes("this.manualLinkReturnSelection = null;"));
  assert.ok(source.includes("this.manualLinkReturnScrollState = null;"));
  assert.ok(source.includes("normalizedSelectionRange(range) {"));
  assert.ok(source.includes("captureEditorScrollState() {"));
  assert.ok(source.includes("scheduleEditorScrollRestore(state) {"));
  assert.ok(source.includes("if (restoreSelection) this.setEditorSelectionRange(restoreSelection.from, restoreSelection.to);"));
});

test("link picker empty state stays concise", async () => {
  const source = await readEditorDomainSource();

  assert.ok(source.includes('<div class="picker-empty">没有匹配笔记</div>'));
});

test("manual link picker resolves path wikilinks to a specific duplicate-title note", () => {
  const pane = Object.create(EditorPane.prototype);
  const candidates = [
    {
      id: "ln_path_target_special",
      title: "Alias Target",
      markdownPath: "notes/literature/special/Alias Target.md"
    },
    {
      id: "ln_path_target_other",
      title: "Alias Target",
      markdownPath: "notes/literature/other/Alias Target.md"
    }
  ];

  const resolved = pane.resolveLinkToken("special/Alias Target", candidates);
  const aliasResolved = pane.resolveLinkToken("notes/literature/special/Alias Target.md|Alias Target", candidates);
  const ambiguous = pane.resolveLinkToken("Alias Target", candidates);

  assert.equal(resolved.note.id, "ln_path_target_special");
  assert.equal(resolved.mode, "path");
  assert.equal(aliasResolved.note.id, "ln_path_target_special");
  assert.equal(aliasResolved.mode, "path");
  assert.equal(ambiguous.note.id, "ln_path_target_special");
  assert.equal(ambiguous.ambiguous, true);
});

test("manual link picker does not treat ambiguous title wikilinks as an existing resolved link", () => {
  const pane = Object.create(EditorPane.prototype);
  const candidates = [
    {
      id: "ln_duplicate_a",
      title: "Duplicate Title"
    },
    {
      id: "ln_duplicate_b",
      title: "Duplicate Title"
    }
  ];

  assert.equal(pane.hasResolvedLinkToNote("ln_duplicate_a", "[[Duplicate Title]]", candidates), false);
  assert.equal(pane.hasResolvedLinkToNote("ln_duplicate_b", "[[ln_duplicate_b|Duplicate Title]]", candidates), true);
});

test("parseLinks returns wikilink targets without aliases or anchors", () => {
  assert.deepEqual(parseLinks("[[special/Alias Target.md|Alias Target]] [[Other#Heading]] [[Block^abc]]"), [
    "special/Alias Target.md",
    "Other",
    "Block"
  ]);
});
