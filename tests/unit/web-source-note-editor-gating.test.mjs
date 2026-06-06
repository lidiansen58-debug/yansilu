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
  assert.match(button.title, /永久笔记/);
});

test("editor keeps related-panel access and inline insert for permanent notes in the shared editor", () => {
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
  assert.match(pane.els.result.innerHTML, /只有永久笔记才会显示关联与主路径/);
  assert.match(pane.els.result.innerHTML, /先选永久笔记盒目录/);
  assert.doesNotMatch(pane.els.result.innerHTML, /建立语义关系/);
  assert.equal(relationRefreshes, 0);
  assert.equal(aiRefreshes, 0);
  assert.equal(pane.semanticRelationsState, "idle");
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
  pane.getEditorValue = () => "# Permanent Claim\n\nMy claim cites [[Source Literature]].";
  pane.scopedLinkCandidates = () => [literatureNote];
  pane.resolveLinkToken = (token, scoped) => ({
    note: scoped.find((item) => item.title === token) || null
  });
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

test("editor keeps permanent notes in the shared editor by default", () => {
  const state = createInitialState();
  state.previewMode = "wysiwyg";
  const pane = Object.create(EditorPane.prototype);

  pane.state = state;
  pane.els = {
    permanentWorkspace: { classList: createClassList() },
    literatureWorkspace: { classList: createClassList() },
    markdownSplit: { classList: createClassList() },
    modeEdit: { classList: createClassList() },
    modeSplit: { classList: createClassList() }
  };
  pane.activeNote = () => ({ id: "pn_structured", folderId: "dir_original_default", noteType: "" });

  pane.renderPermanentWorkspace();

  assert.equal(pane.isPermanentWorkspaceActive(), false);
  assert.equal(pane.els.permanentWorkspace.classList.contains("hidden"), true);
  assert.equal(pane.els.markdownSplit.classList.contains("hidden"), false);
});

test("editor falls back to source markdown panel for permanent notes in source mode", () => {
  const state = createInitialState();
  state.previewMode = "source";
  const pane = Object.create(EditorPane.prototype);

  pane.state = state;
  pane.els = {
    permanentWorkspace: { classList: createClassList() },
    literatureWorkspace: { classList: createClassList() },
    markdownSplit: { classList: createClassList() },
    modeEdit: { classList: createClassList() },
    modeSplit: { classList: createClassList() }
  };
  pane.activeNote = () => ({ id: "pn_source", folderId: "dir_original_default", noteType: "" });

  pane.renderPermanentWorkspace();

  assert.equal(pane.isPermanentWorkspaceActive(), false);
  assert.equal(pane.els.permanentWorkspace.classList.contains("hidden"), true);
  assert.equal(pane.els.markdownSplit.classList.contains("hidden"), false);
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

test.skip("renderPreviewVisibility keeps source markdown as the single source of truth when returning to structured permanent mode", () => {
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
  pane.renderPermanentWorkspace = () => {};
  pane.renderLiteratureWorkspace = () => {};
  pane.renderContextualToolbarState = () => {};

  pane.renderPreviewVisibility();

  assert.equal(nextEditorValue, "# Source truth\n\n## 关联线索\n\n- [[From source mode]]");
  assert.equal(modeEdit.classList.contains("active"), false);
  assert.equal(split.classList.contains("editor-mode-wysiwyg"), true);
});

test("renderPreviewVisibility keeps the rich editor as the source of truth in shared permanent-note mode", () => {
  const state = createInitialState();
  state.previewMode = "wysiwyg";
  const pane = Object.create(EditorPane.prototype);
  const split = { classList: createClassList() };
  const modeEdit = createToolbarButtonStub();
  const modeSplit = { classList: createClassList() };
  let nextEditorValue = "";

  pane.state = state;
  pane.els = {
    body: { value: "# Source truth\n\n## Related clues\n\n- [[From source mode]]" },
    markdownSplit: split,
    previewPanel: { classList: createClassList() },
    modeEdit,
    modeSplit
  };
  pane.activeNote = () => ({ id: "pn_roundtrip", folderId: "dir_original_default", noteType: "" });
  pane.pendingEditorSelection = null;
  pane.richEditor = { getValue: () => "# Stale rich value\n\n* $$widget0 [[Wrong]]$$", focus() {} };
  pane.markdownEditor = { getValue: () => "# Source truth\n\n## Related clues\n\n- [[From source mode]]", focus() {} };
  pane.normalizedSelectionRangeForValue = () => null;
  pane.setEditorValue = (value) => {
    nextEditorValue = value;
  };
  pane.updateModeToggleButton = () => {};
  pane.renderPermanentWorkspace = () => {};
  pane.renderLiteratureWorkspace = () => {};
  pane.renderContextualToolbarState = () => {};

  pane.renderPreviewVisibility();

  assert.equal(nextEditorValue, "# Stale rich value\n\n* $$widget0 [[Wrong]]$$");
  assert.equal(modeEdit.classList.contains("active"), false);
  assert.equal(split.classList.contains("editor-mode-wysiwyg"), true);
});
