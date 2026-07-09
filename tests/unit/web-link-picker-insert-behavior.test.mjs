import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

import { EditorPane } from "../../apps/web/src/components-editor-pane.js";
import { EditorRelationLinkController } from "../../apps/web/src/editor-relation-link-controller.js";
import {
  editorRelationLinkCandidatePreviewText,
  editorRelationLinkCandidates,
  editorRelationLinkConfirmState,
  editorRelationLinkEntrySource,
  normalizeEditorRelationLinkInput,
  renderEditorRelationLinkCandidateList
} from "../../apps/web/src/editor-relation-link-model.js";
import { parseLinks } from "../../apps/web/src/prototype-store.js";
import {
  QUICK_WIKILINK_ASSOCIATION_MARKER,
  saveOrUpgradeWikilinkRelationTransaction
} from "../../apps/web/src/relation-save-transaction.js";
import { RELATION_ENTRY_SOURCES } from "../../apps/web/src/relation-entry-route.js";
import { readEditorDomainSource, readPrototypeHtmlSource } from "./copy-source-helpers.mjs";

async function readEditorRelationLinkControllerSource() {
  return fs.readFile(new URL("../../apps/web/src/editor-relation-link-controller.js", import.meta.url), "utf8");
}

async function readEditorRelationHelpersSource() {
  return fs.readFile(new URL("../../apps/web/src/editor-relation-helpers.js", import.meta.url), "utf8");
}

async function readEditorLinkPickerSource() {
  return fs.readFile(new URL("../../apps/web/src/editor-link-picker.js", import.meta.url), "utf8");
}

test("link picker inserts stable wikilinks instead of inline relation comments", async () => {
  const source = await readEditorRelationLinkControllerSource();
  const linkPickerSource = await readEditorLinkPickerSource();

  assert.ok(source.includes("const token = wikilinkTokenForNote(target);"));
  assert.ok(linkPickerSource.includes('const target = String(note?.id || "").trim() || markdownPath || title;'));
  assert.ok(linkPickerSource.includes("return `[[${target}|${title}]]`;"));
  assert.doesNotMatch(linkPickerSource, /hasDuplicateTitle/);
  assert.doesNotMatch(source, /const annotation = reason/);
  assert.doesNotMatch(source, /<!-- rel:type=\$\{escapeHtml\(relationType\)\}/);
});

test("editor link picker shows relation fields for both inline and toolbar entry", async () => {
  const source = await readEditorRelationLinkControllerSource();
  const css = await fs.readFile(new URL("../../apps/web/src/prototype.css", import.meta.url), "utf8");

  assert.ok(source.includes('const linkPickerMeta = host.els.linkRelationTypeSelect?.closest?.(".link-picker-meta");'));
  assert.ok(source.includes("if (linkPickerMeta) linkPickerMeta.hidden = false;"));
  assert.ok(source.includes('if (linkPickerGuidance?.classList?.contains("semantic-relation-quality-guidance")) linkPickerGuidance.hidden = false;'));
  assert.ok(source.includes("const linkSearchSpacer = host.els.linkSearchInput?.nextElementSibling;"));
  assert.ok(source.includes("host.els.linkSearchInput.parentNode?.insertBefore(host.els.linkSearchList, linkSearchSpacer);"));
  assert.ok(source.includes('if (linkSearchSpacer.tagName === "DIV" && !String(linkSearchSpacer.textContent || "").trim()) linkSearchSpacer.hidden = true;'));
  assert.doesNotMatch(css, /\.panel\.inline-picker\s+\.link-picker-meta\s*\{\s*display:\s*none\b/);
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
  const notes = [
    { id: "b", title: "Beta relation" },
    { id: "a", title: "Alpha relation" },
    { id: "x", title: "Unrelated" },
    ...Array.from({ length: 60 }, (_, index) => ({ id: `extra-${index}`, title: `relation ${index}` }))
  ];

  const result = editorRelationLinkCandidates({
    query: "relation",
    candidates: notes,
    preferredId: "extra-2",
    displayTitle: (note) => note.title
  });

  assert.equal(result.list.length, 50);
  assert.equal(result.selectedId, "extra-2");
  assert.equal(result.list[result.selectedIndex].id, "extra-2");
  assert.match(result.html, /data-link-note-id="extra-2"/);
  assert.match(result.html, /<mark class="picker-mark">relation<\/mark>/);
  assert.doesNotMatch(result.html, /picker-selection-state/);
  assert.doesNotMatch(result.html, /picker-preview/);
  assert.doesNotMatch(result.html, /picker-detail-row/);
});

test("cross-folder link candidates use a folder-prefixed display label", async () => {
  const source = await readEditorDomainSource();

  assert.ok(source.includes("compactFolderLabel(folderId) {"));
  assert.ok(source.includes("linkCandidateDisplayTitle(note) {"));
  assert.ok(source.includes("return `${this.compactFolderLabel(note.folderId)}/${targetTitle}`;"));
});

test("wikilink preview avoids low-value match and count metadata", async () => {
  const source = await readEditorDomainSource();
  const css = await fs.readFile(new URL("../../apps/web/src/prototype.css", import.meta.url), "utf8");
  const preview = editorRelationLinkCandidatePreviewText({
    title: "Preview target",
    body: "[[Other|alias]] explains the useful claim.\n\n#tag"
  });

  assert.ok(source.includes('mode: "wikilink"'));
  assert.ok(source.includes('data-open-linked-note="${escapeHtml(note.id)}"'));
  assert.ok(source.includes("async openLinkedPreviewNote(noteId)"));
  assert.ok(source.includes("void this.openLinkedPreviewNote(linkedNoteButton.dataset.openLinkedNote);"));
  assert.ok(source.includes("async resolvePreviewLinkToken(tokenValue"));
  assert.ok(source.includes("await searchNotes({ query, excludeNoteId: this.activeNote()?.id || \"\", limit: 8 })"));
  assert.ok(source.includes("for (const candidatePath of markdownReferencePathCandidates(query))"));
  assert.ok(source.includes("data-close-note-peek"));
  assert.ok(source.includes(">编辑笔记</button>"));
  assert.doesNotMatch(source, /data-open-linked-note="\$\{escapeHtml\(note\.id\)\}">打开笔记/);
  assert.doesNotMatch(source, /正文里的这个链接指向这条笔记。/);
  assert.doesNotMatch(source, /快速查看这条笔记内容/);
  assert.doesNotMatch(source, /存在重名<\/span>/);
  assert.doesNotMatch(source, /const refreshed = this\.resolveLinkToken\(tokenValue,/);
  assert.doesNotMatch(source, /return \{ note: items\[0\], ambiguous: items\.length > 1, mode: "search" \};/);
  assert.match(css, /\.note-peek-actions \{[\s\S]*justify-content: space-between;/);
  assert.match(css, /\.inspector-panel:has\(\.note-peek-section\) \{[\s\S]*width: min\(620px, calc\(100vw - 120px\)\);/);
  assert.match(css, /\.inspector-panel:has\(\.note-peek-section\) > \.panel-head \{[\s\S]*display: none;/);
  assert.equal(preview, "alias explains the useful claim.");
  assert.doesNotMatch(source, /已匹配/);
  assert.doesNotMatch(source, /重名匹配/);
  assert.doesNotMatch(source, /关联 \$\{links\.length\}/);
  assert.doesNotMatch(source, /标签 \$\{tags\.length\}/);
});

test("confirm button requires a target and relation reason for inline and toolbar entry", async () => {
  assert.equal(editorRelationLinkConfirmState({ isSubmitting: true, selectedNote: { id: "a" }, reason: "reason" }).disabled, true);
  assert.equal(editorRelationLinkConfirmState({ selectedNote: null, reason: "reason" }).disabled, true);
  assert.equal(editorRelationLinkConfirmState({ selectedNote: { id: "a" }, reason: "" }).disabled, true);

  const ready = editorRelationLinkConfirmState({ selectedNote: { id: "a" }, reason: "clear reason" });
  assert.equal(ready.disabled, false);
  assert.match(ready.label, /保存|淇濆瓨/);
});

test("manual link picker keeps only information needed to save a relation", async () => {
  const html = await readPrototypeHtmlSource();
  const source = await readEditorRelationLinkControllerSource();
  const helperSource = await readEditorRelationHelpersSource();

  assert.match(html, /<strong>建立笔记关联<\/strong>/);
  assert.match(html, /<label class="link-picker-search-label" for="linkSearchInput">要关联哪条笔记<\/label>/);
  assert.match(html, /<label for="linkRelationTypeSelect">它们是什么关系<\/label>/);
  assert.match(html, /<label for="linkReasonInput">为什么关联<\/label>/);
  assert.match(html, /<button class="mini-btn primary" id="btnConfirmLinkInsert" type="button" disabled>选择笔记<\/button>/);
  assert.match(html, /<option value="associated_with" selected>相关<\/option>/);
  assert.doesNotMatch(html, /<option value="appears_in_draft">/);
  assert.match(helperSource, /const INLINE_LINK_RELATION_TYPES = \[[\s\S]*"associated_with",[\s\S]*"supports",[\s\S]*"complements",[\s\S]*"qualifies",[\s\S]*"contradicts",[\s\S]*"bridges"[\s\S]*\];/);
  assert.doesNotMatch(html, /AI 只提供关联建议/);
  assert.doesNotMatch(html, /不会替你确认关系/);
  assert.match(source, /host\.els\.linkSearchInput\.placeholder = "搜索笔记标题";/);
});

test("selecting a link picker candidate pins it without inserting immediately", async () => {
  const rendered = [];
  let insertedNoteId = "";
  const host = {
    currentLinkCandidates: [{ id: "pn_1", title: "Permanent note" }],
    currentLinkIndex: 0,
    currentPinnedLinkId: "",
    isSubmittingLinkInsert: false,
    state: { notes: [] },
    els: {
      linkSearchInput: { value: "perm" },
      linkSearchList: {
        innerHTML: "",
        querySelector: () => null
      },
      confirmLinkInsert: { disabled: true, textContent: "" },
      linkReasonInput: { value: "clear reason" }
    },
    scopedLinkCandidates: () => host.currentLinkCandidates,
    linkCandidateDisplayTitle: (note) => note.title,
    insertSelectedLinkNote: async (noteId) => {
      insertedNoteId = noteId;
    }
  };
  const controller = new EditorRelationLinkController(host);
  controller.renderCandidates = (query, preferredId) => {
    rendered.push({ query, preferredId });
  };

  await controller.confirmSelectedCandidate();

  assert.equal(insertedNoteId, "");
  assert.equal(host.currentPinnedLinkId, "pn_1");
  assert.deepEqual(rendered, [{ query: "perm", preferredId: "pn_1" }]);
  assert.equal(host.els.linkSearchInput.value, "Permanent note");
  assert.equal(host.els.linkSearchList.innerHTML, "");
});

test("Enter selects the highlighted candidate before the explicit associate action", async () => {
  const pane = Object.create(EditorPane.prototype);
  const rerenders = [];
  const linkSearchInput = { value: "perm" };
  const linkSearchList = { innerHTML: "", querySelector: () => null };
  let insertedNoteId = "";

  pane.currentLinkCandidates = [{ id: "pn_1", title: "Permanent note", folderId: "dir_original_default" }];
  pane.currentLinkIndex = 0;
  pane.currentPinnedLinkId = "";
  pane.currentLinkContext = null;
  pane.state = { notes: [] };
  pane.els = { linkSearchInput, linkSearchList };
  pane.scopedLinkCandidates = () => {
    rerenders.push({ query: linkSearchInput.value, preferredId: pane.currentPinnedLinkId });
    return pane.currentLinkCandidates;
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

test("inline link picker Enter also selects before the explicit associate action", async () => {
  const pane = Object.create(EditorPane.prototype);
  const rerenders = [];
  const linkSearchInput = { value: "perm" };
  const linkSearchList = { innerHTML: "", querySelector: () => null };
  let insertedNoteId = "";

  pane.currentLinkCandidates = [{ id: "pn_inline", title: "Inline target", folderId: "dir_original_default" }];
  pane.currentLinkIndex = 0;
  pane.currentPinnedLinkId = "";
  pane.currentLinkContext = { start: 0, end: 2, query: "" };
  pane.state = { notes: [] };
  pane.els = { linkSearchInput, linkSearchList };
  pane.scopedLinkCandidates = () => {
    rerenders.push({ query: linkSearchInput.value, preferredId: pane.currentPinnedLinkId });
    return pane.currentLinkCandidates;
  };
  pane.linkCandidateDisplayTitle = (note) => note.title;
  pane.insertSelectedLinkNote = async (noteId) => {
    insertedNoteId = noteId;
  };
  pane.updateLinkPickerConfirmButton = () => {};

  await pane.confirmSelectedLinkCandidate();

  assert.equal(insertedNoteId, "");
  assert.equal(pane.currentPinnedLinkId, "pn_inline");
  assert.deepEqual(rerenders, [{ query: "perm", preferredId: "pn_inline" }]);
  assert.equal(linkSearchInput.value, "Inline target");
  assert.equal(linkSearchList.innerHTML, "");
});

test("manual link picker confirm button reflects selected target and reason", () => {
  const host = {
    currentPinnedLinkId: "pn_1",
    currentLinkCandidates: [{ id: "pn_1", title: "Permanent note" }],
    currentLinkIndex: 0,
    isSubmittingLinkInsert: false,
    state: { notes: [] },
    els: {
      confirmLinkInsert: { disabled: true, textContent: "" },
      linkReasonInput: { value: "clear reason" }
    }
  };
  const controller = new EditorRelationLinkController(host);

  controller.updateConfirmButton();
  assert.equal(host.els.confirmLinkInsert.disabled, false);
  assert.match(host.els.confirmLinkInsert.textContent, /保存|淇濆瓨/);

  host.els.linkReasonInput.value = "";
  controller.updateConfirmButton();
  assert.equal(host.els.confirmLinkInsert.disabled, true);
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

test("floating relation picker panel scrolls within computed short viewport height", async () => {
  const source = await readEditorDomainSource();
  const css = await fs.readFile(new URL("../../apps/web/src/prototype.css", import.meta.url), "utf8");
  const floatingPanelRule = css.match(/\.panel\.floating\s*\{[^}]*\}/)?.[0] || "";

  assert.ok(source.includes("panel.style.maxHeight = `${Math.floor(availableHeight)}px`;"));
  assert.match(floatingPanelRule, /overflow-y:\s*auto;/);
  assert.match(floatingPanelRule, /overscroll-behavior:\s*contain;/);
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
  const normalized = normalizeEditorRelationLinkInput({
    relationType: " supports ",
    reason: ` first\n\nsecond -- ${"x".repeat(320)}`
  });

  assert.equal(normalized.relationType, "supports");
  assert.equal(normalized.reason.includes("\n"), false);
  assert.equal(normalized.reason.includes("--"), false);
  assert.ok(normalized.reason.length <= 280);
  assert.match(normalized.reason, /^first second - -/);
  assert.equal(editorRelationLinkEntrySource(true), RELATION_ENTRY_SOURCES.INLINE_WIKILINK);
  assert.equal(editorRelationLinkEntrySource(false), RELATION_ENTRY_SOURCES.TOOLBAR_RELATION);
});

test("manual link picker keeps duplicate-submit protection", async () => {
  const source = await readEditorDomainSource();
  const controllerSource = await readEditorRelationLinkControllerSource();

  assert.ok(controllerSource.includes("host.isSubmittingLinkInsert = false;"));
  assert.ok(source.includes("setLinkInsertSubmitting(nextSubmitting) {"));
  assert.ok(controllerSource.includes("if (host.isSubmittingLinkInsert) return;"));
  assert.ok(controllerSource.includes("this.setSubmitting(true);"));
  assert.ok(controllerSource.includes("this.setSubmitting(false);"));
});

test("manual link picker still detects existing wikilinks by resolved note id before inserting again", async () => {
  const pane = Object.create(EditorPane.prototype);
  const candidates = [
    {
      id: "target",
      title: "Target Note",
      markdownPath: "notes/permanent/Target Note.md"
    }
  ];

  assert.equal(pane.hasResolvedLinkToNote("target", "[[Target Note]]", candidates), true);
  assert.equal(pane.hasResolvedLinkToNote("target", "[[notes/permanent/Target Note.md|Target Note]]", candidates), true);
  assert.equal(pane.hasResolvedLinkToNote("other", "[[Target Note]]", candidates), false);
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
  const pane = Object.create(EditorPane.prototype);
  pane.state = {
    graphConnectedNoteIds: new Set(),
    notes: [{ id: "source" }, { id: "target" }]
  };

  pane.syncRelationNetworkConnected("source", "target");

  assert.equal(pane.state.graphConnectedNoteIds.has("source"), true);
  assert.equal(pane.state.graphConnectedNoteIds.has("target"), true);
  assert.equal(pane.state.notes.find((note) => note.id === "source").relationNetworkStatus, "connected");
  assert.equal(pane.state.notes.find((note) => note.id === "target").relationNetworkStatus, "connected");
});

test("confirmed wikilink association upgrades to a formal relation transaction", async () => {
  const calls = [];
  const transaction = await saveOrUpgradeWikilinkRelationTransaction(
    {
      noteId: "source",
      targetNoteId: "target",
      relationType: "associated_with",
      rationale: "clear quick association reason"
    },
    {
      fetchNoteRelations: async () => ({
        outgoingLinks: [{ id: "wiki-1", toNoteId: "target", rationale: "markdown_wikilink" }]
      }),
      createNoteRelation: async () => {
        calls.push(["create"]);
        return { id: "new" };
      },
      updateNoteRelation: async (relationId, payload) => {
        calls.push(["update", relationId, payload]);
        return { id: relationId, created: false, ...payload };
      }
    }
  );

  assert.equal(transaction.ok, true);
  assert.equal(transaction.upgradedWikilink, true);
  assert.deepEqual(calls.map((call) => call[0]), ["update"]);
  assert.equal(calls[0][1], "wiki-1");
  assert.equal(calls[0][2].insightQuestion, QUICK_WIKILINK_ASSOCIATION_MARKER);
  assert.equal(calls[0][2].confidence, 1);
});

test("invalid quick association does not call relation persistence", async () => {
  const calls = [];
  const transaction = await saveOrUpgradeWikilinkRelationTransaction(
    {
      noteId: "source",
      targetNoteId: "target",
      relationType: "associated_with",
      rationale: ""
    },
    {
      fetchNoteRelations: async () => {
        calls.push(["fetch"]);
        return { outgoingLinks: [] };
      },
      createNoteRelation: async () => {
        calls.push(["create"]);
        return { id: "new" };
      },
      updateNoteRelation: async () => {
        calls.push(["update"]);
        return { id: "updated" };
      }
    }
  );

  assert.equal(transaction.ok, false);
  assert.equal(transaction.reason, "missing_rationale");
  assert.deepEqual(calls, []);
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
  const controllerSource = await readEditorRelationLinkControllerSource();

  assert.ok(controllerSource.includes("host.manualLinkReturnSelection = null;"));
  assert.ok(controllerSource.includes("host.manualLinkReturnScrollState = null;"));
  assert.ok(source.includes("normalizedSelectionRange(range) {"));
  assert.ok(source.includes("captureEditorScrollState() {"));
  assert.ok(source.includes("scheduleEditorScrollRestore(state) {"));
  assert.ok(controllerSource.includes("if (restoreSelection) host.setEditorSelectionRange(restoreSelection.from, restoreSelection.to);"));
});

test("link picker empty state stays concise", async () => {
  const html = renderEditorRelationLinkCandidateList({ list: [], query: "missing" });

  assert.match(html, /picker-empty/);
  assert.match(html, /没有匹配笔记/);
  assert.doesNotMatch(html, /picker-preview|picker-detail-row/);
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

test("linked preview edit opens through the host note route", async () => {
  const opened = [];
  const pane = Object.assign(Object.create(EditorPane.prototype), {
    loadNoteForPreview: async () => ({ id: "note-target", title: "Target note" }),
    onOpenNote: async (noteId, options) => {
      opened.push({ noteId, options });
      return true;
    },
    openNoteTab: () => {
      throw new Error("host open route should handle the edit action");
    },
    onStateChange: () => {
      throw new Error("host open route should trigger the full render");
    },
    onStatus: () => {}
  });

  await pane.openLinkedPreviewNote("note-target");

  assert.deepEqual(opened, [{ noteId: "note-target", options: { preferTitleSelection: false } }]);
});

test("parseLinks returns wikilink targets without aliases or anchors", () => {
  assert.deepEqual(parseLinks("[[special/Alias Target.md|Alias Target]] [[Other#Heading]] [[Block^abc]]"), [
    "special/Alias Target.md",
    "Other",
    "Block"
  ]);
});
