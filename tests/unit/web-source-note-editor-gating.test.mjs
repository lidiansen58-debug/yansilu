import test from "node:test";
import assert from "node:assert/strict";

import { EditorPane } from "../../apps/web/src/components-editor-pane.js";
import { createInitialState } from "../../apps/web/src/prototype-store.js";

function createClassList() {
  const classes = new Set();
  return {
    classes,
    add(...tokens) {
      tokens.forEach((token) => classes.add(token));
    },
    remove(...tokens) {
      tokens.forEach((token) => classes.delete(token));
    },
    toggle(token, force) {
      if (force === undefined) {
        if (classes.has(token)) {
          classes.delete(token);
          return false;
        }
        classes.add(token);
        return true;
      }
      if (force) classes.add(token);
      else classes.delete(token);
      return force;
    },
    contains(token) {
      return classes.has(token);
    }
  };
}

function createToolbarButtonStub() {
  const classList = createClassList();
  return {
    classList,
    dataset: {},
    disabled: false,
    title: "",
    ariaLabel: "",
    setAttribute(name, value) {
      this[name] = value;
    }
  };
}

function createOriginalityPanelStub() {
  return {
    classList: createClassList(),
    dataset: {}
  };
}

test("editor falls back to folder root when source notes are missing noteType", () => {
  const state = createInitialState();
  const pane = Object.create(EditorPane.prototype);
  pane.state = state;

  const fleeting = { id: "fn_missing", folderId: "dir_fleeting_default", noteType: "" };
  const literature = { id: "ln_missing", folderId: "dir_literature_default", noteType: "" };
  const permanent = { id: "pn_missing", folderId: "dir_original_default", noteType: "" };

  assert.equal(pane.isOriginalRecordableSource(fleeting), true);
  assert.equal(pane.isOriginalNote(fleeting), false);

  assert.equal(pane.isLiteratureWorkspaceActive(literature), false);
  assert.equal(pane.isOriginalRecordableSource(literature), true);
  assert.equal(pane.isOriginalNote(literature), false);

  assert.equal(pane.isOriginalNote(permanent), true);
});

test("editor follows the current folder root even when noteType metadata is stale", () => {
  const state = createInitialState();
  const pane = Object.create(EditorPane.prototype);
  pane.state = state;

  const literatureInLiteratureBox = { id: "ln_stale", folderId: "dir_literature_default", noteType: "permanent" };
  const fleetingInFleetingBox = { id: "fn_stale", folderId: "dir_fleeting_default", noteType: "permanent" };

  assert.equal(pane.isLiteratureWorkspaceActive(literatureInLiteratureBox), false);
  assert.equal(pane.isOriginalNote(literatureInLiteratureBox), false);
  assert.equal(pane.isOriginalRecordableSource(literatureInLiteratureBox), true);

  assert.equal(pane.isOriginalRecordableSource(fleetingInFleetingBox), true);
  assert.equal(pane.isOriginalNote(fleetingInFleetingBox), false);
});

test("editor keeps the permanent-note button visible for fleeting notes even when noteType is missing", () => {
  const state = createInitialState();
  const pane = Object.create(EditorPane.prototype);
  const button = createToolbarButtonStub();

  pane.state = state;
  pane.els = { recordPermanent: button };
  pane.activeNote = () => ({ id: "fn_missing", folderId: "dir_fleeting_default", noteType: "" });

  pane.renderRecordPermanentButton();

  assert.equal(button.disabled, false);
  assert.equal(button.classList.contains("hidden"), false);
  assert.equal(button.dataset.sourceNoteId, "fn_missing");
  assert.equal(button.title, "创建永久笔记");
  assert.equal(button["aria-label"], "创建永久笔记");
});

test("editor keeps related-panel access and inline insert for permanent notes in the plain editor", () => {
  const state = createInitialState();
  state.previewMode = "wysiwyg";
  const pane = Object.create(EditorPane.prototype);
  const insertLink = createToolbarButtonStub();
  const showRelated = createToolbarButtonStub();

  pane.state = state;
  pane.els = { insertLink, showRelated };
  pane.activeNote = () => ({ id: "pn_1", folderId: "dir_original_default", noteType: "" });

  pane.renderRelationToolbarButtons();

  assert.equal(insertLink.classList.contains("hidden"), false);
  assert.equal(insertLink.disabled, false);
  assert.equal(insertLink.title, "关联笔记 [[");
  assert.equal(showRelated.classList.contains("hidden"), false);
  assert.equal(showRelated.disabled, false);
});

test("editor hides relation actions for source notes", () => {
  const state = createInitialState();
  const pane = Object.create(EditorPane.prototype);
  const insertLink = createToolbarButtonStub();
  const showRelated = createToolbarButtonStub();

  pane.state = state;
  pane.els = { insertLink, showRelated };
  pane.activeNote = () => ({ id: "fn_1", folderId: "dir_fleeting_default", noteType: "" });

  pane.renderRelationToolbarButtons();

  assert.equal(insertLink.classList.contains("hidden"), true);
  assert.equal(insertLink.disabled, true);
  assert.equal(insertLink.title, "只有永久笔记才能关联其他笔记");
  assert.equal(showRelated.classList.contains("hidden"), true);
  assert.equal(showRelated.disabled, true);
});

test("editor inspector shows source-note promote flow instead of relation panels for fleeting notes", () => {
  const state = createInitialState();
  const pane = Object.create(EditorPane.prototype);
  let relationRefreshes = 0;
  let aiRefreshes = 0;

  pane.state = state;
  pane.els = {
    result: { innerHTML: "" },
    editorRelationsBelow: null
  };
  pane.activeNote = () => ({
    id: "fn_1",
    title: "随笔 A",
    folderId: "dir_fleeting_default",
    noteType: "",
    body: "# 随笔 A\n\n先记下一个想法。"
  });
  pane.activeTab = () => ({
    id: "tab_fn_1",
    body: "# 随笔 A\n\n先记下一个想法。",
    title: "随笔 A"
  });
  pane.buildLocalRelationSignals = () => ({ forward: [], backward: [], tagRelated: [] });
  pane.folderLabel = () => "随笔笔记盒";
  pane.refreshSemanticRelations = () => {
    relationRefreshes += 1;
  };
  pane.refreshNoteAiSuggestions = () => {
    aiRefreshes += 1;
  };
  pane.relationsRequestSerial = 0;
  pane.currentSemanticRelations = null;
  pane.semanticRelationsState = "idle";

  pane.renderRelated();

  assert.match(pane.els.result.innerHTML, /创建永久笔记/);
  assert.match(pane.els.result.innerHTML, /这里只有创建永久笔记的下一步；正式关联整理请在永久笔记里继续/);
  assert.match(pane.els.result.innerHTML, /随笔应定期清理，或沉淀为永久笔记/);
  assert.match(pane.els.result.innerHTML, /data-source-note-action="record-permanent"[\s\S]*>提炼为永久笔记</);
  assert.match(pane.els.result.innerHTML, /data-source-note-action="dismiss-fleeting-cleanup"[\s\S]*>标记稍后清理</);
  assert.match(pane.els.result.innerHTML, /选择保存位置/);
  assert.doesNotMatch(pane.els.result.innerHTML, /建立语义关系/);
  assert.equal(relationRefreshes, 0);
  assert.equal(aiRefreshes, 0);
  assert.equal(pane.semanticRelationsState, "idle");
});

test("fleeting cleanup prompt can be dismissed without mutating the note", () => {
  const state = createInitialState();
  const pane = Object.create(EditorPane.prototype);
  const note = {
    id: "fn_cleanup",
    title: "随笔清理",
    folderId: "dir_fleeting_default",
    noteType: "",
    body: "# 随笔清理\n\n一个稍后再处理的想法。"
  };

  pane.state = state;
  pane.activeNote = () => note;

  assert.equal(pane.shouldShowFleetingCleanupPrompt(note), true);
  assert.match(pane.renderSourceNoteFlowSection(note), /data-fleeting-cleanup-prompt/);

  pane.dismissFleetingCleanupPrompt(note);

  assert.equal(pane.shouldShowFleetingCleanupPrompt(note), false);
  assert.doesNotMatch(pane.renderSourceNoteFlowSection(note), /data-fleeting-cleanup-prompt/);
  assert.equal(note.body, "# 随笔清理\n\n一个稍后再处理的想法。");
});

test("editor suppresses originality notice for source notes", () => {
  const state = createInitialState();
  const pane = Object.create(EditorPane.prototype);
  const panel = createOriginalityPanelStub();
  panel.classList.add("hidden");
  const title = { textContent: "" };
  const body = { textContent: "" };

  pane.state = state;
  pane.els = {
    originalityNotice: panel,
    originalityNoticeTitle: title,
    originalityNoticeBody: body
  };
  pane.activeNote = () => ({ id: "fn_notice", folderId: "dir_fleeting_default", noteType: "" });

  pane.showOriginalityNotice("建议继续打磨", "warn", "这是一条测试提醒");

  assert.equal(panel.classList.contains("hidden"), true);
  assert.equal(title.textContent, "");
  assert.equal(body.textContent, "");
});

test("literature queue records keep folder-root literature notes even when noteType metadata is missing", () => {
  const state = createInitialState();
  const pane = Object.create(EditorPane.prototype);

  pane.state = state;
  pane.literatureQueueScopeDirectoryIds = () => new Set(["dir_literature_default"]);
  pane.literatureQueueRecord = (item) => ({
    note: item,
    lane: "pending",
    label: "待转述",
    tone: "warn",
    noteText: item.title || "",
    fields: {},
    excerpt: ""
  });

  state.notes = [
    {
      id: "ln_missing",
      title: "Missing Type Literature",
      folderId: "dir_literature_default",
      noteType: "",
      updatedAt: "2026-06-03T00:00:00.000Z"
    },
    {
      id: "fn_wrong_box",
      title: "Fleeting Note",
      folderId: "dir_fleeting_default",
      noteType: "",
      updatedAt: "2026-06-03T00:00:01.000Z"
    }
  ];

  const records = pane.literatureQueueRecords({ id: "ln_missing", folderId: "dir_literature_default", noteType: "" });

  assert.deepEqual(records.map((item) => item.note.id), ["ln_missing"]);
});

test("originality payload keeps linked literature sources by folder root when noteType is missing", () => {
  const state = createInitialState();
  const pane = Object.create(EditorPane.prototype);
  const literatureNote = {
    id: "ln_source",
    title: "Source Literature",
    folderId: "dir_literature_default",
    noteType: "",
    body: [
      "# Source Literature",
      "",
      "## 原文",
      "Quoted source passage.",
      "",
      "## 转述",
      "A paraphrased source point."
    ].join("\n")
  };

  pane.state = state;
  state.notes = [literatureNote];
  pane.getEditorValue = () => "# Permanent Claim\n\nMy claim cites [[Source Literature]].";
  pane.resolvePlanFromWindow = () => ({});
  pane.extractCoreClaimFromBody = (body) => body;

  const payload = pane.buildOriginalityPayload({
    id: "pn_claim",
    folderId: "dir_original_default",
    noteType: "permanent",
    body: ""
  });

  assert.deepEqual(payload.literature.map((item) => item.source_id), ["src_from_ln_source"]);
  assert.match(payload.literature[0].quote_text, /Quoted source passage/);
  assert.deepEqual(payload.permanent[0].citations, [{ source_id: "src_from_ln_source" }]);
});

test("originality payload resolves cross-box literature links by stable note id", () => {
  const state = createInitialState();
  const pane = Object.create(EditorPane.prototype);
  const literatureNote = {
    id: "ln_source_id",
    title: "Source By ID",
    folderId: "dir_literature_default",
    noteType: "literature",
    body: [
      "# Source By ID",
      "",
      "## 鍘熸枃",
      "Quoted source passage by id.",
      "",
      "## 杞堪",
      "A paraphrased source point."
    ].join("\n")
  };

  pane.state = state;
  state.notes = [literatureNote];
  pane.getEditorValue = () => "# Permanent Claim\n\nMy claim cites [[ln_source_id|Source By ID]].";
  pane.resolvePlanFromWindow = () => ({});
  pane.extractCoreClaimFromBody = (body) => body;

  const payload = pane.buildOriginalityPayload({
    id: "pn_claim",
    folderId: "dir_original_default",
    noteType: "permanent",
    body: ""
  });

  assert.deepEqual(payload.literature.map((item) => item.source_id), ["src_from_ln_source_id"]);
  assert.match(payload.literature[0].quote_text, /Quoted source passage by id/);
  assert.deepEqual(payload.permanent[0].citations, [{ source_id: "src_from_ln_source_id" }]);
});

test("originality payload skips ambiguous literature title links until the target is disambiguated", async () => {
  const state = createInitialState();
  const pane = Object.create(EditorPane.prototype);

  pane.state = state;
  state.notes = [
    {
      id: "ln_duplicate_a",
      title: "Duplicate Literature",
      folderId: "dir_literature_default",
      noteType: "literature",
      body: "# Duplicate Literature\n\nFirst duplicate passage."
    },
    {
      id: "ln_duplicate_b",
      title: "Duplicate Literature",
      folderId: "dir_literature_default",
      noteType: "literature",
      body: "# Duplicate Literature\n\nSecond duplicate passage."
    }
  ];
  pane.resolvePlanFromWindow = () => ({});
  pane.extractCoreClaimFromBody = (body) => body;

  pane.getEditorValue = () => "# Permanent Claim\n\nMy claim cites [[Duplicate Literature]].";
  const ambiguousPayload = await pane.buildHydratedOriginalityPayload({
    id: "pn_claim",
    folderId: "dir_original_default",
    noteType: "permanent",
    body: ""
  });

  assert.deepEqual(ambiguousPayload.literature, []);
  assert.deepEqual(ambiguousPayload.permanent[0].citations, []);

  pane.getEditorValue = () => "# Permanent Claim\n\nMy claim cites [[ln_duplicate_b|Duplicate Literature]].";
  const idPayload = await pane.buildHydratedOriginalityPayload({
    id: "pn_claim",
    folderId: "dir_original_default",
    noteType: "permanent",
    body: ""
  });

  assert.deepEqual(idPayload.literature.map((item) => item.source_id), ["src_from_ln_duplicate_b"]);
  assert.match(idPayload.literature[0].quote_text, /Second duplicate passage/);
});

test("hydrated originality payload fetches stable id literature that is not loaded", async () => {
  const state = createInitialState();
  const pane = Object.create(EditorPane.prototype);

  pane.state = state;
  state.notes = [];
  pane.getEditorValue = () => "# Permanent Claim\n\nMy claim cites [[ln_fetch_source|Fetched Source]].";
  pane.resolvePlanFromWindow = () => ({});
  pane.extractCoreClaimFromBody = (body) => body;
  pane.fetchNoteForResolution = async (noteId) => ({
    id: noteId,
    title: "Fetched Source",
    directoryId: "dir_literature_default",
    noteType: "literature",
    body: "# Fetched Source\n\nFetched source passage from full note."
  });

  const payload = await pane.buildHydratedOriginalityPayload({
    id: "pn_claim",
    folderId: "dir_original_default",
    noteType: "permanent",
    body: ""
  });

  assert.deepEqual(payload.literature.map((item) => item.source_id), ["src_from_ln_fetch_source"]);
  assert.match(payload.literature[0].quote_text, /Fetched source passage from full note/);
  assert.deepEqual(payload.permanent[0].citations, [{ source_id: "src_from_ln_fetch_source" }]);
});

test("hydrated originality payload replaces unloaded literature summaries with full bodies", async () => {
  const state = createInitialState();
  const pane = Object.create(EditorPane.prototype);

  pane.state = state;
  state.notes = [
    {
      id: "ln_summary_source",
      title: "Summary Source",
      folderId: "dir_literature_default",
      noteType: "literature",
      body: "# Summary Source\n\nShort list preview only.",
      bodyLoaded: false
    }
  ];
  pane.getEditorValue = () => "# Permanent Claim\n\nMy claim cites [[Summary Source]].";
  pane.resolvePlanFromWindow = () => ({});
  pane.extractCoreClaimFromBody = (body) => body;
  pane.fetchNoteForResolution = async (noteId) => ({
    id: noteId,
    title: "Summary Source",
    directoryId: "dir_literature_default",
    noteType: "literature",
    body: "# Summary Source\n\nFull literature passage that was not in the preview."
  });

  const payload = await pane.buildHydratedOriginalityPayload({
    id: "pn_claim",
    folderId: "dir_original_default",
    noteType: "permanent",
    body: ""
  });

  assert.deepEqual(payload.literature.map((item) => item.source_id), ["src_from_ln_summary_source"]);
  assert.match(payload.literature[0].quote_text, /Full literature passage that was not in the preview/);
  assert.doesNotMatch(payload.literature[0].quote_text, /Short list preview only/);
});

test("preview wikilink actions resolve cross-box stable note ids", async () => {
  const state = createInitialState();
  const pane = Object.create(EditorPane.prototype);
  let previewedNoteId = "";
  let previewOptions = null;
  let statusText = "";

  pane.state = state;
  state.notes = [
    {
      id: "pn_claim",
      title: "Permanent Claim",
      folderId: "dir_original_default",
      noteType: "permanent",
      body: "# Permanent Claim\n\n[[ln_source_id|Source By ID]]"
    },
    {
      id: "ln_source_id",
      title: "Source By ID",
      folderId: "dir_literature_default",
      noteType: "literature",
      body: "# Source By ID\n"
    }
  ];
  pane.activeNote = () => state.notes[0];
  pane.setInspectorVisible = () => {};
  pane.showNotePreviewInInspector = async (noteId, options = {}) => {
    previewedNoteId = noteId;
    previewOptions = options;
  };
  pane.onStatus = (message) => {
    statusText = message;
  };

  await pane.handleTokenAction("[[ln_source_id|Source By ID]]");

  assert.equal(previewedNoteId, "ln_source_id");
  assert.equal(previewOptions?.mode, "wikilink");
  assert.equal(previewOptions?.eyebrow, "正文链接");
  assert.equal(previewOptions?.ambiguous, false);
  assert.match(statusText, /Source By ID/);
});

test("editor keeps source mode when switching notes unless the tab explicitly prefers the plain editor", () => {
  const state = createInitialState();
  state.previewMode = "source";
  const pane = Object.create(EditorPane.prototype);
  const note = {
    id: "pn_default_wysiwyg",
    folderId: "dir_original_default",
    noteType: "",
    body: `# Structured note

## 核心观点

A stable claim.
`
  };
  const tab = {
    id: "tab_pn_default_wysiwyg",
    noteId: note.id,
    title: "Structured note",
    body: note.body,
    savedTitle: "Structured note",
    savedBody: note.body,
    dirty: false,
    preferPlainEditor: false
  };

  state.tabs = [tab];
  state.activeTabId = tab.id;
  pane.state = state;
  pane.lastFilledNoteId = "pn_previous";
  pane.els = {
    result: { innerHTML: "" },
    literatureWorkspace: { classList: createClassList() },
    markdownSplit: { classList: createClassList() },
    modeEdit: { classList: createClassList() },
    modeSplit: { classList: createClassList() }
  };
  pane.activeNote = () => note;
  pane.ensureTabAuthorshipState = () => ({ claim: "", confirmed: true, confirmedBody: "" });
  pane.renderEmptyEditorState = () => {};
  pane.setEditorValue = () => {};
  pane.renderLiteratureWorkspace = () => {};
  pane.renderRelated = () => {};
  pane.renderPreview = () => {};
  pane.renderPreviewVisibility = () => {};
  pane.renderInspectorVisibility = () => {};
  pane.renderSaveHint = () => {};
  pane.updateToolbarFormattingState = () => {};
  pane.applyPendingEditorFocus = () => {};

  pane.fillEditorFromTab();

  assert.equal(state.previewMode, "source");
  assert.equal(pane.lastFilledNoteId, note.id);
});

test("renderPreviewVisibility keeps an intentionally emptied textarea instead of reviving stale editor content", () => {
  const state = createInitialState();
  state.previewMode = "wysiwyg";
  const pane = Object.create(EditorPane.prototype);
  const split = { classList: createClassList() };
  const modeEdit = createToolbarButtonStub();
  const modeSplit = { classList: createClassList() };
  let nextEditorValue = "not-called";

  pane.state = state;
  pane.els = {
    body: { value: "" },
    markdownSplit: split,
    previewPanel: { classList: createClassList() },
    modeEdit,
    modeSplit
  };
  pane.activeNote = () => ({ id: "pn_empty", folderId: "dir_original_default", noteType: "" });
  pane.pendingEditorSelection = null;
  pane.richEditor = { getValue: () => "# Stale rich value", focus() {} };
  pane.markdownEditor = { getValue: () => "# Stale source value", focus() {} };
  pane.normalizedSelectionRangeForValue = () => null;
  pane.setEditorValue = (value) => {
    nextEditorValue = value;
  };
  pane.updateModeToggleButton = () => {};
  pane.renderLiteratureWorkspace = () => {};
  pane.renderContextualToolbarState = () => {};

  pane.renderPreviewVisibility();

  assert.equal(nextEditorValue, "");
  assert.equal(modeEdit.classList.contains("active"), false);
  assert.equal(split.classList.contains("editor-mode-wysiwyg"), true);
});

test("editor returns to wysiwyg once when a new tab explicitly prefers the plain editor", () => {
  const state = createInitialState();
  state.previewMode = "source";
  const pane = Object.create(EditorPane.prototype);
  const note = {
    id: "pn_plain_editor",
    folderId: "dir_original_default",
    noteType: "",
    body: `# Structured note

## 鏍稿績瑙傜偣

A stable claim.
`
  };
  const tab = {
    id: "tab_pn_plain_editor",
    noteId: note.id,
    title: "Structured note",
    body: note.body,
    savedTitle: "Structured note",
    savedBody: note.body,
    dirty: false,
    preferPlainEditor: true
  };

  state.tabs = [tab];
  state.activeTabId = tab.id;
  pane.state = state;
  pane.lastFilledNoteId = "pn_previous";
  pane.els = {
    result: { innerHTML: "" },
    literatureWorkspace: { classList: createClassList() },
    markdownSplit: { classList: createClassList() },
    modeEdit: { classList: createClassList() },
    modeSplit: { classList: createClassList() }
  };
  pane.activeNote = () => note;
  pane.ensureTabAuthorshipState = () => ({ claim: "", confirmed: true, confirmedBody: "" });
  pane.renderEmptyEditorState = () => {};
  pane.setEditorValue = () => {};
  pane.renderLiteratureWorkspace = () => {};
  pane.renderRelated = () => {};
  pane.renderPreview = () => {};
  pane.renderPreviewVisibility = () => {};
  pane.renderInspectorVisibility = () => {};
  pane.renderSaveHint = () => {};
  pane.updateToolbarFormattingState = () => {};
  pane.applyPendingEditorFocus = () => {};

  pane.fillEditorFromTab();

  assert.equal(state.previewMode, "wysiwyg");
  assert.equal(tab.preferPlainEditor, false);
});

test("saving a note does not repaint the visible editor after switching tabs", async () => {
  const state = createInitialState();
  const pane = Object.create(EditorPane.prototype);
  const noteA = {
    id: "note_a",
    title: "Note A",
    folderId: "dir_original_default",
    noteType: "permanent",
    status: "draft",
    body: "# Note A\n\nold"
  };
  const noteB = {
    id: "note_b",
    title: "Note B",
    folderId: "dir_original_default",
    noteType: "permanent",
    status: "draft",
    body: "# Note B\n\nbody"
  };
  const tabA = {
    id: "tab_note_a",
    noteId: noteA.id,
    title: noteA.title,
    body: "# Note A\n\nedited",
    savedTitle: noteA.title,
    savedBody: noteA.body,
    dirty: true,
    saveUiState: { mode: "dirty", message: "" }
  };
  const tabB = {
    id: "tab_note_b",
    noteId: noteB.id,
    title: noteB.title,
    body: noteB.body,
    savedTitle: noteB.title,
    savedBody: noteB.body,
    dirty: false,
    saveUiState: { mode: "saved", message: "" }
  };
  let visibleEditorValue = "";
  let savePayload = null;

  state.notes = [noteA, noteB];
  state.tabs = [tabA, tabB];
  state.activeTabId = tabA.id;
  pane.state = state;
  pane.els = {};
  pane.getEditorValue = () => tabA.body;
  pane.setEditorValue = (value) => {
    visibleEditorValue = value;
  };
  pane.onStatus = () => {};
  pane.renderSaveHint = () => {};
  pane.renderRelated = () => {};
  pane.renderTabs = () => {};
  pane.renderThinkingStatus = () => {};
  pane.writeDraft = () => {};
  pane.clearDraft = () => {};
  pane.runOriginalityCheck = async () => ({ status: "warning", similarity: 0 });
  pane.onStateChange = async (_reason, payload) => {
    savePayload = payload;
    state.activeTabId = tabB.id;
    return {
      id: noteA.id,
      title: "Note A",
      body: tabA.body,
      status: "draft"
    };
  };

  await pane.performSaveActiveNote();

  assert.equal(savePayload.noteId, noteA.id);
  assert.equal(state.activeTabId, tabB.id);
  assert.equal(visibleEditorValue, "");
  assert.equal(tabA.dirty, false);
  assert.equal(tabA.saveUiState.mode, "saved");
  assert.equal(tabB.body, noteB.body);
});

test("saving a note preserves edits typed while the save is still in flight", async () => {
  const state = createInitialState();
  const pane = Object.create(EditorPane.prototype);
  const note = {
    id: "note_inflight",
    title: "Inflight Note",
    folderId: "dir_original_default",
    noteType: "permanent",
    status: "draft",
    body: "# Inflight Note\n\nold"
  };
  const tab = {
    id: "tab_note_inflight",
    noteId: note.id,
    title: note.title,
    body: "# Inflight Note\n\nfirst edit",
    savedTitle: note.title,
    savedBody: note.body,
    dirty: true,
    saveUiState: { mode: "dirty", message: "" }
  };
  const drafts = [];
  let repaintedValue = "";
  let savedPayload = null;

  state.notes = [note];
  state.tabs = [tab];
  state.activeTabId = tab.id;
  pane.state = state;
  pane.els = {};
  pane.getEditorValue = () => tab.body;
  pane.setEditorValue = (value) => {
    repaintedValue = value;
  };
  pane.onStatus = () => {};
  pane.renderSaveHint = () => {};
  pane.renderRelated = () => {};
  pane.renderTabs = () => {};
  pane.renderThinkingStatus = () => {};
  pane.writeDraft = (draftTab) => {
    drafts.push(draftTab.body);
  };
  pane.clearDraft = () => {};
  pane.runOriginalityCheck = async () => {
    tab.body = "# Inflight Note\n\nsecond edit typed during save";
    tab.title = "Inflight Note";
    return { status: "warning", similarity: 0 };
  };
  pane.onStateChange = async (_reason, payload) => {
    savedPayload = payload;
    return {
      id: note.id,
      title: "Inflight Note",
      body: "# Inflight Note\n\nfirst edit",
      status: "draft"
    };
  };

  const result = await pane.performSaveActiveNote();

  assert.equal(result.id, note.id);
  assert.equal(savedPayload.noteId, note.id);
  assert.equal(tab.body, "# Inflight Note\n\nsecond edit typed during save");
  assert.equal(tab.savedBody, "# Inflight Note\n\nfirst edit");
  assert.equal(tab.dirty, true);
  assert.equal(tab.saveUiState.mode, "dirty");
  assert.deepEqual(drafts, ["# Inflight Note\n\nsecond edit typed during save"]);
  assert.equal(repaintedValue, "");
});

test("background autosave keeps its save state on the saved tab when selection changes", async () => {
  const state = createInitialState();
  const pane = Object.create(EditorPane.prototype);
  const noteA = {
    id: "note_autosave_a",
    title: "Autosave A",
    folderId: "dir_original_default",
    noteType: "permanent",
    status: "draft",
    body: "# Autosave A\n\nold"
  };
  const noteB = {
    id: "note_autosave_b",
    title: "Autosave B",
    folderId: "dir_original_default",
    noteType: "permanent",
    status: "draft",
    body: "# Autosave B\n\nbody"
  };
  const tabA = {
    id: "tab_note_autosave_a",
    noteId: noteA.id,
    title: noteA.title,
    body: "# Autosave A\n\nfirst edit",
    savedTitle: noteA.title,
    savedBody: noteA.body,
    dirty: true,
    saveUiState: { mode: "dirty", message: "" }
  };
  const tabB = {
    id: "tab_note_autosave_b",
    noteId: noteB.id,
    title: noteB.title,
    body: noteB.body,
    savedTitle: noteB.title,
    savedBody: noteB.body,
    dirty: false,
    saveUiState: { mode: "saved", message: "B stays put" }
  };

  state.notes = [noteA, noteB];
  state.tabs = [tabA, tabB];
  state.activeTabId = tabA.id;
  pane.state = state;
  pane.els = {};
  pane.renderSaveHint = () => {};
  pane.writeDraft = () => {};
  pane.clearDraft = () => {};
  pane.clearAutoSaveTimer = () => {};
  pane.scheduleAutoSave = () => {};
  pane.onStateChange = async () => {
    state.activeTabId = tabB.id;
    tabA.body = "# Autosave A\n\nsecond edit typed after switching back";
    return true;
  };

  await pane.autoSaveTabById(tabA.id, "switch-note");

  assert.equal(tabA.savedBody, "# Autosave A\n\nfirst edit");
  assert.equal(tabA.body, "# Autosave A\n\nsecond edit typed after switching back");
  assert.equal(tabA.dirty, true);
  assert.equal(tabA.saveUiState.mode, "dirty");
  assert.equal(tabB.saveUiState.mode, "saved");
  assert.equal(tabB.saveUiState.message, "B stays put");
});


test("editor preserves matched historical literature headings when structured fields save back", () => {
  const state = createInitialState();
  const pane = Object.create(EditorPane.prototype);
  const body = `# Historic Literature Note

## Metadata

- 标题：Source
- 作者：Author
- 年份：2025
- 页码 / 定位：p. 9
- DOI / ISBN / arXiv / URL / PDF：doi:10/history

## Quote

Original text

## Restatement

Old paraphrase

## Thesis Seed

Historical claim
`;
  const tab = {
    id: "tab_ln_historic",
    noteId: "ln_historic",
    body,
    savedBody: body,
    title: "Historic Literature Note",
    savedTitle: "Historic Literature Note",
    dirty: false
  };

  state.tabs = [tab];
  state.activeTabId = tab.id;
  pane.state = state;
  pane.resolveLiteratureSectionLabels = () => ({
    citation: "Source Card",
    originalText: "Excerpt",
    paraphrase: "My Paraphrase",
    supportsJudgment: "Claim Seed",
    question: "Open Question",
    boundary: "Constraints",
    whyKeep: "Why Keep"
  });
  pane.resolveLiteratureSectionLabelCandidates = () => [
    pane.resolveLiteratureSectionLabels(),
    {
      citation: "Metadata",
      originalText: "Quote",
      paraphrase: "Restatement",
      supportsJudgment: "Thesis Seed",
      question: "Tension",
      boundary: "Limits",
      whyKeep: "Worth Keeping"
    }
  ];
  pane.activeTab = () => tab;
  pane.activeNote = () => ({ id: "ln_historic", folderId: "dir_literature_default", noteType: "literature", body });
  pane.isLiteratureWorkspaceActive = () => true;
  pane.els = {
    literatureWorkspace: {},
    body: { value: body },
    literatureTitle: { value: "Historic Literature Note" },
    literatureOriginal: { value: "Original text" },
    literatureParaphrase: { value: "Updated paraphrase" },
    literatureWhyKeep: { value: "" },
    literatureSupportsJudgment: { value: "Historical claim" },
    literatureQuestion: { value: "" },
    literatureBoundary: { value: "" }
  };

  const parsed = pane.parseLiteratureBody(body);
  pane.rememberLiteratureWorkspaceParse(parsed, tab, body);

  const saved = pane.getEditorValue();
  assert.match(saved, /^## Metadata$/m);
  assert.match(saved, /^## Quote$/m);
  assert.match(saved, /^## Restatement$/m);
  assert.match(saved, /^## Thesis Seed$/m);
  assert.doesNotMatch(saved, /^## Source Card$/m);
  assert.doesNotMatch(saved, /^## My Paraphrase$/m);
  assert.match(saved, /Updated paraphrase/);
});

test("normalizePermanentBodyForSave drops empty scaffold sections and preserves unknown top-level sections", () => {
  const pane = Object.create(EditorPane.prototype);

  const normalized = pane.normalizePermanentBodyForSave(`# Permanent note

## 核心观点

A stable claim.

## 为什么成立

## 关联线索

- [[Related note]]

## 自定义问题

This custom section should stay top-level.
`);

  assert.match(normalized, /^# Permanent note/m);
  assert.match(normalized, /## 核心观点/);
  assert.match(normalized, /## 关联线索/);
  assert.match(normalized, /## 自定义问题/);
  assert.match(normalized, /This custom section should stay top-level\./);
  assert.doesNotMatch(normalized, /## 为什么成立/);
  assert.doesNotMatch(normalized, /## 补充内容/);
  assert.doesNotMatch(normalized, /### 自定义问题/);
});

test("renderPreviewVisibility keeps source markdown as the single source of truth when returning to plain wysiwyg mode", () => {
  const state = createInitialState();
  state.previewMode = "wysiwyg";
  const pane = Object.create(EditorPane.prototype);
  const split = { classList: createClassList() };
  const modeEdit = createToolbarButtonStub();
  const modeSplit = { classList: createClassList() };
  let nextEditorValue = "";

  pane.state = state;
  pane.els = {
    body: { value: "# Source truth\n\n## 关联线索\n\n- [[From source mode]]" },
    markdownSplit: split,
    previewPanel: { classList: createClassList() },
    modeEdit,
    modeSplit
  };
  pane.activeNote = () => ({ id: "pn_roundtrip", folderId: "dir_original_default", noteType: "" });
  pane.pendingEditorSelection = null;
  pane.richEditor = { getValue: () => "# Stale rich value\n\n* $$widget0 [[Wrong]]$$", focus() {} };
  pane.markdownEditor = { getValue: () => "# Source truth\n\n## 关联线索\n\n- [[From source mode]]", focus() {} };
  pane.normalizedSelectionRangeForValue = () => null;
  pane.setEditorValue = (value) => {
    nextEditorValue = value;
  };
  pane.updateModeToggleButton = () => {};
  pane.renderLiteratureWorkspace = () => {};
  pane.renderContextualToolbarState = () => {};

  pane.renderPreviewVisibility();

  assert.equal(nextEditorValue, "# Source truth\n\n## 关联线索\n\n- [[From source mode]]");
  assert.equal(modeEdit.classList.contains("active"), false);
  assert.equal(split.classList.contains("editor-mode-wysiwyg"), true);
});

test("renderPreviewVisibility prefers the synced textarea value over stale rich-editor content", () => {
  const state = createInitialState();
  state.previewMode = "wysiwyg";
  const pane = Object.create(EditorPane.prototype);
  const split = { classList: createClassList() };
  const modeEdit = createToolbarButtonStub();
  const modeSplit = { classList: createClassList() };
  let nextEditorValue = "";

  pane.state = state;
  pane.els = {
    body: { value: "# Source truth\n\n## 关联线索\n\n- [[From source mode]]" },
    markdownSplit: split,
    previewPanel: { classList: createClassList() },
    modeEdit,
    modeSplit
  };
  pane.activeNote = () => ({ id: "pn_roundtrip", folderId: "dir_original_default", noteType: "" });
  pane.pendingEditorSelection = null;
  pane.richEditor = { getValue: () => "# Stale rich value\n\n* $$widget0 [[Wrong]]$$", focus() {} };
  pane.markdownEditor = { getValue: () => "# Source truth\n\n## 关联线索\n\n- [[From source mode]]", focus() {} };
  pane.normalizedSelectionRangeForValue = () => null;
  pane.setEditorValue = (value) => {
    nextEditorValue = value;
  };
  pane.updateModeToggleButton = () => {};
  pane.renderLiteratureWorkspace = () => {};
  pane.renderContextualToolbarState = () => {};

  pane.renderPreviewVisibility();

  assert.equal(nextEditorValue, "# Source truth\n\n## 关联线索\n\n- [[From source mode]]");
  assert.equal(modeEdit.classList.contains("active"), false);
  assert.equal(split.classList.contains("editor-mode-wysiwyg"), true);
});

test("renderPreviewVisibility keeps source editor edits ahead of stale hidden textarea", () => {
  const state = createInitialState();
  state.previewMode = "source";
  const pane = Object.create(EditorPane.prototype);
  const split = { classList: createClassList() };
  const modeEdit = createToolbarButtonStub();
  const modeSplit = { classList: createClassList() };
  let nextEditorValue = "";

  pane.state = state;
  pane.els = {
    body: { value: "# 未命名笔记\n\nold template" },
    markdownSplit: split,
    previewPanel: { classList: createClassList() },
    modeEdit,
    modeSplit
  };
  pane.activeNote = () => ({ id: "pn_source_race", folderId: "dir_original_default", noteType: "" });
  pane.pendingEditorSelection = null;
  pane.richEditor = { getValue: () => "# Stale rich value", focus() {} };
  pane.markdownEditor = { getValue: () => "# Mode Guard Note\n\nBody before toggle.", focus() {} };
  pane.normalizedSelectionRangeForValue = () => null;
  pane.setEditorValue = (value) => {
    nextEditorValue = value;
  };
  pane.clearMarkdownSelectionOverride = () => {};
  pane.updateModeToggleButton = () => {};
  pane.renderLiteratureWorkspace = () => {};
  pane.renderContextualToolbarState = () => {};

  pane.renderPreviewVisibility();

  assert.equal(nextEditorValue, "# Mode Guard Note\n\nBody before toggle.");
  assert.equal(modeEdit.classList.contains("active"), true);
  assert.equal(split.classList.contains("editor-mode-source"), true);
});

test("source mode reads the dirty textarea when the code editor lags behind the active tab", () => {
  const state = createInitialState();
  state.previewMode = "source";
  const pane = Object.create(EditorPane.prototype);
  const tab = {
    id: "tab_source_lag",
    noteId: "pn_source_lag",
    body: "# Browser E2E note\n\nThis markdown note was edited through the prototype UI.",
    savedBody: "# 未命名笔记\n\nold template",
    dirty: true
  };
  state.tabs = [tab];
  state.activeTabId = tab.id;
  pane.state = state;
  pane.els = {
    body: { value: tab.body }
  };
  pane.markdownEditor = {
    getValue: () => tab.savedBody
  };
  pane.richEditor = null;

  assert.equal(pane.getEditorValue(), tab.body);
});

test("source mode accepts an empty dirty textarea when the code editor lags behind", () => {
  const state = createInitialState();
  state.previewMode = "source";
  const pane = Object.create(EditorPane.prototype);
  const tab = {
    id: "tab_source_empty",
    noteId: "pn_source_empty",
    body: "",
    savedBody: "# Old markdown\n\nThis should be removed.",
    dirty: true
  };
  state.tabs = [tab];
  state.activeTabId = tab.id;
  pane.state = state;
  pane.els = {
    body: { value: "" }
  };
  pane.markdownEditor = {
    getValue: () => tab.savedBody
  };
  pane.richEditor = null;

  assert.equal(pane.getEditorValue(), "");
});
