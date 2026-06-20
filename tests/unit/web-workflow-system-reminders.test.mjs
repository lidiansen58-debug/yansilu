import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const currentFile = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(currentFile), "../..");

function readRepoFile(...segments) {
  return fs.readFileSync(path.join(repoRoot, ...segments), "utf8");
}

function workflowOpenerSource() {
  const source = readRepoFile("apps/web/src/prototype-app.js");
  const start = source.indexOf("async function openRecordPermanentWorkflowFromCurrentNote");
  const end = source.indexOf("function openGraphFollowupNote", start);
  assert.ok(start >= 0 && end > start, "expected workflow opener helpers to exist");
  return source.slice(start, end);
}

function createWorkflowOpenerContext(overrides = {}) {
  const calls = [];
  const statuses = [];
  const context = {
    calls,
    statuses,
    Date,
    Promise,
    window: {
      setTimeout: (callback) => setTimeout(callback, 0)
    },
    state: {
      notes: [{ id: "source-1" }, { id: "note-1" }]
    },
    editor: { els: {} },
    closeSystemMessages: () => calls.push(["closeSystemMessages"]),
    openNoteRelationEditor: () => true,
    openGraphFollowupNote: () => true,
    handleStateChange: async () => false,
    graphState: {},
    renderGraphPanel: () => {},
    selectWritingThemeIndex: async (indexCardId) => ({ id: indexCardId }),
    ensureNotesLoaded: async () => {},
    searchNotes: async () => ({ items: [] }),
    writingKnownNoteById: (id) => ({ id, noteType: "permanent", status: "active", authorship: { user_confirmed: true } }),
    isWritingEligibleNote: () => true,
    continueWritingEntry: () => null,
    suggestedWritingProjectTitle: () => "主题笔记入口",
    openWritingModule: async () => true,
    activateModule: (module) => calls.push(["activateModule", module]),
    openNoteById: () => true,
    setStatus: (message, type, options) => statuses.push({ message, type, options }),
    ...overrides
  };
  const openWorkflow = vm.runInNewContext(`${workflowOpenerSource()}\nopenSystemMessageWorkflow;`, context);
  return { openWorkflow, context, calls, statuses };
}

test("workflow system messages persist routing metadata and completion state", () => {
  const source = readRepoFile("apps/web/src/prototype-app.js");
  const start = source.indexOf("function normalizeSystemMessage(item = {}) {");
  const end = source.indexOf("function readStoredSystemMessages()", start);

  assert.ok(start >= 0 && end > start, "expected normalizeSystemMessage() to exist");
  const helper = source.slice(start, end);

  assert.match(helper, /const workflowRoute = item\.workflowRoute/);
  assert.match(helper, /graphSelectionKind: String\(item\.workflowRoute\.graphSelectionKind/);
  assert.match(helper, /category: String\(item\.category \|\| ""\)\.trim\(\)/);
  assert.match(helper, /sourceNoteId: String\(item\.sourceNoteId \|\| item\.source_note_id \|\| ""\)\.trim\(\)/);
  assert.match(helper, /targetNoteId: String\(item\.targetNoteId \|\| item\.target_note_id \|\| ""\)\.trim\(\)/);
  assert.match(helper, /dedupeKey: String\(item\.dedupeKey \|\| item\.dedupe_key \|\| ""\)\.trim\(\)/);
  assert.match(helper, /resolvedAt: String\(item\.resolvedAt \|\| item\.resolved_at \|\| ""\)\.trim\(\)/);
  assert.match(helper, /\.\.\.\(workflowRoute \? \{ workflowRoute \} : \{\}\)/);
});

test("completed workflow system messages no longer expose executable actions", () => {
  const source = readRepoFile("apps/web/src/prototype-app.js");
  const start = source.indexOf("function systemMessageActionLabel(message = {}) {");
  const end = source.indexOf("function renderSystemMessages()", start);

  assert.ok(start >= 0 && end > start, "expected systemMessageActionLabel() to exist");
  const helper = source.slice(start, end);

  assert.match(helper, /if \(message\.resolvedAt\) return ""/);
  assert.match(helper, /if \(message\.actionLabel\) return message\.actionLabel/);
  assert.ok(
    helper.indexOf("if (message.resolvedAt) return") < helper.indexOf("if (message.actionLabel) return message.actionLabel"),
    "completed messages should suppress labels before custom action labels are considered"
  );
  assert.ok(
    helper.indexOf("if (message.actionLabel) return message.actionLabel") < helper.indexOf('if (message.action === "open-note-workflow") return "打开并处理"'),
    "custom workflow labels should stay more specific than the generic fallback"
  );
});

test("reactivated workflow system messages become unread again", () => {
  const source = readRepoFile("apps/web/src/prototype-app.js");
  const start = source.indexOf("function upsertSystemMessage(message = {}, { interrupt = false, preserveRead = true } = {}) {");
  const end = source.indexOf("function resolveSystemMessageByDedupeKey", start);

  assert.ok(start >= 0 && end > start, "expected upsertSystemMessage() to exist");
  const helper = source.slice(start, end);

  assert.match(helper, /const reactivated = Boolean\(existing\?\.resolvedAt && !requested\.resolvedAt\)/);
  assert.match(helper, /read: reactivated \? false : preserveRead && existing \? existing\.read === true : requested\.read === true/);
});

test("save-after source-note reminders are mirrored into system messages", () => {
  const source = readRepoFile("apps/web/src/prototype-app.js");

  assert.match(source, /function sourcePromotionWorkflowMessageForNote\(note = null, suggestion = null\)/);
  assert.match(source, /category: "source-promotion"/);
  assert.match(source, /action: "open-note-workflow"/);
  assert.match(source, /const focus = "record-permanent"/);
  assert.match(source, /workflowRoute: \{[\s\S]*?focus,/);
  assert.match(source, /function syncSourcePromotionSystemMessageForNote\(note = null, suggestion = null\)/);
  assert.match(source, /return resolveSystemMessageByDedupeKey\(dedupeKey\)/);

  const saveStart = source.indexOf('  if (reason === "save-note") {');
  const saveEnd = source.indexOf('  if (reason === "note-move") {', saveStart);
  const saveSource = source.slice(saveStart, saveEnd);
  assert.match(saveSource, /const suggestion = showSaveAiSuggestionForNote\(note\);/);
  assert.match(saveSource, /syncSourcePromotionSystemMessageForNote\(note, suggestion\);/);

  const createStart = source.indexOf('  if (reason === "record-original-from-note" || reason === "create-original-from-literature") {');
  const createEnd = source.indexOf('  if (reason === "run-note-ai-analysis") {', createStart);
  const createSource = source.slice(createStart, createEnd);
  assert.match(createSource, /sourceNote\.generatedOriginalNoteId = note\.id;/);
  assert.match(createSource, /syncSourcePromotionSystemMessageForNote\(sourceNote\);/);
});

test("workflow system message actions open the precise note follow-up route", () => {
  const source = readRepoFile("apps/web/src/prototype-app.js");
  const start = source.indexOf("async function openSystemMessageWorkflow(message = {}) {");
  const end = source.indexOf("function openGraphFollowupNote", start);

  assert.ok(start >= 0 && end > start, "expected openSystemMessageWorkflow() to exist");
  const helper = source.slice(start, end);

  assert.match(helper, /focus === "relations"/);
  assert.match(helper, /openNoteRelationEditor\(noteId, \{ source: route\.source \|\| "system-message" \}\)/);
  assert.match(helper, /await resolveSystemMessageWorkflowNoteId\(message\)/);
  assert.match(helper, /focus === "boundary"/);
  assert.match(helper, /openGraphFollowupNote\(noteId, "isolate-hold"/);
  assert.match(helper, /focus === "distillation"/);
  assert.match(helper, /handleStateChange\("open-note-main-route"/);
  assert.match(helper, /return Boolean\(opened\)/);
  assert.match(helper, /focus === "graph"/);
  assert.match(helper, /action: "graph"/);
  assert.match(helper, /graphWorkflowSelectionForNote\(noteId, route\)/);
  assert.match(helper, /focus === "writing"/);
  assert.match(helper, /await selectWritingThemeIndex\(indexCardId\)/);
  assert.match(helper, /await openWritingModule\(\{ statusMessage: ".*?", preserveFocusedCandidateScope: true \}\)/);
  assert.match(helper, /focus === "record-permanent"/);
  assert.match(helper, /return openRecordPermanentWorkflowFromCurrentNote\(\)/);

  const modalStart = source.indexOf('$("systemMessageModal")?.addEventListener("click"');
  const modalEnd = source.indexOf('$("distillationPanel")?.addEventListener', modalStart);
  const modalHandler = source.slice(modalStart, modalEnd);
  assert.match(modalHandler, /action === "open-note-workflow"/);
  assert.match(modalHandler, /await openSystemMessageWorkflow\(message \|\| \{\}\)/);
});

test("workflow system message actions can recover old messages by quoted note title", async () => {
  const loadedNotes = [];
  const { openWorkflow, calls } = createWorkflowOpenerContext({
    state: { notes: loadedNotes },
    ensureNotesLoaded: async (ids) => {
      for (const id of ids) {
        if (id === "note-from-search" && !loadedNotes.some((note) => note.id === id)) {
          loadedNotes.push({ id, title: "图谱的价值在于看见支撑、冲突和缺口" });
        }
      }
    },
    searchNotes: async ({ query }) => ({
      items: query === "图谱的价值在于看见支撑、冲突和缺口"
        ? [{ id: "note-from-search", title: "图谱的价值在于看见支撑、冲突和缺口" }]
        : []
    }),
    openNoteRelationEditor: (noteId, options) => {
      calls.push(["openNoteRelationEditor", noteId, options]);
      return true;
    }
  });

  const opened = await openWorkflow({
    title: "图谱的价值在于看见支撑、冲突和缺口 还没有进入图谱",
    body: "“图谱的价值在于看见支撑、冲突和缺口”已经是一条永久笔记，但没有显式关系。",
    workflowRoute: { focus: "relations", source: "system-message" }
  });

  assert.equal(opened, true);
  assert.deepEqual(calls[0], ["closeSystemMessages"]);
  assert.equal(calls[1][0], "openNoteRelationEditor");
  assert.equal(calls[1][1], "note-from-search");
});

test("graph workflow system messages reopen connected notes as graph nodes", async () => {
  const { openWorkflow, calls, context } = createWorkflowOpenerContext({
    handleStateChange: async (reason, payload) => {
      calls.push(["handleStateChange", reason, payload]);
      return true;
    },
    graphState: {
      item: {
        edges: [{ fromNoteId: "note-1", toNoteId: "note-2" }]
      }
    },
    renderGraphPanel: () => calls.push(["renderGraphPanel"]),
    openNoteRelationEditor: () => assert.fail("graph workflow should not open relation editor"),
    openNoteById: () => assert.fail("graph workflow should not open explorer note directly")
  });

  const opened = await openWorkflow({
    noteId: "note-1",
    workflowRoute: { focus: "graph", source: "graph-ai-connect", graphSelectionKind: "node" }
  });

  assert.equal(opened, true);
  assert.deepEqual(calls[0], ["closeSystemMessages"]);
  assert.equal(calls[1][0], "handleStateChange");
  assert.equal(calls[1][1], "open-note-main-route");
  assert.equal(calls[1][2].noteId, "note-1");
  assert.equal(calls[1][2].action, "graph");
  assert.equal(context.graphState.selection.kind, "node");
  assert.equal(context.graphState.selection.nodeId, "note-1");
  assert.deepEqual(calls[2], ["renderGraphPanel"]);
});

test("graph route restores the note directory before refreshing the graph", () => {
  const source = readRepoFile("apps/web/src/prototype-app.js");
  const start = source.indexOf('  if (reason === "open-note-main-route") {');
  const end = source.indexOf('    if (action === "writing") {', start);
  assert.ok(start >= 0 && end > start, "expected open-note-main-route handler");
  const handler = source.slice(start, end);

  assert.match(handler, /const noteFolderId = String\(note\.folderId \|\| note\.directoryId \|\| ""\)\.trim\(\)/);
  assert.match(handler, /state\.browserRootId = rootBoxIdFromFolder\(state, noteFolderId\)/);
  assert.match(handler, /state\.selectedFolderId = noteFolderId/);
  assert.match(handler, /await syncNotesForDirectory\(noteFolderId\)/);
  assert.ok(
    handler.indexOf("state.selectedFolderId = noteFolderId") < handler.indexOf("await refreshDirectoryGraph()"),
    "graph refresh should happen after the note directory is restored"
  );
});

test("theme workflow system messages can reopen by index card without a loaded source note", async () => {
  const { openWorkflow, calls } = createWorkflowOpenerContext({
    state: { notes: [] },
    selectWritingThemeIndex: async (indexCardId) => {
      calls.push(["selectWritingThemeIndex", indexCardId]);
      return { id: indexCardId };
    },
    openWritingModule: async (options) => {
      calls.push(["openWritingModule", options]);
      return true;
    },
    openNoteRelationEditor: () => assert.fail("writing workflow should not require a loaded source note"),
    openGraphFollowupNote: () => assert.fail("writing workflow should not open graph followup"),
    openNoteById: () => assert.fail("writing workflow should not open an editor note")
  });

  const opened = await openWorkflow({
    noteId: "not-loaded",
    workflowRoute: { focus: "writing", indexCardId: "idx_theme_1", source: "graph-theme-index" }
  });

  assert.equal(opened, true);
  assert.deepEqual(calls[0], ["closeSystemMessages"]);
  assert.deepEqual(calls[1], ["selectWritingThemeIndex", "idx_theme_1"]);
  assert.equal(calls[2][0], "openWritingModule");
  assert.deepEqual(calls[3], ["selectWritingThemeIndex", "idx_theme_1"]);
});

test("workflow system message actions fail before routing when the note is gone", async () => {
  const { openWorkflow, calls } = createWorkflowOpenerContext({
    state: { notes: [] },
    openNoteRelationEditor: () => assert.fail("missing note should not open relation workflow"),
    openGraphFollowupNote: () => assert.fail("missing note should not open graph followup"),
    openNoteById: () => assert.fail("missing note should not open editor route")
  });

  const opened = await openWorkflow({
    noteId: "deleted-note",
    workflowRoute: { focus: "relations" }
  });

  assert.equal(opened, false);
  assert.deepEqual(calls, []);
});

test("record-permanent workflow waits for an actionable toolbar button before reporting success", async () => {
  let elapsed = 0;
  let clicked = false;
  let contextRef;
  const { openWorkflow, context } = createWorkflowOpenerContext({
    Date: { now: () => elapsed },
    window: {
      setTimeout: (callback, delay = 0) => {
        elapsed += Number(delay || 0);
        if (elapsed >= 50 && !contextRef.editor.els.recordPermanent) {
          contextRef.editor.els.recordPermanent = {
            disabled: false,
            click: () => {
              clicked = true;
            }
          };
        }
        callback();
      }
    }
  });
  contextRef = context;

  const opened = await openWorkflow({
    noteId: "source-1",
    workflowRoute: { focus: "record-permanent" }
  });

  assert.equal(opened, true);
  assert.equal(clicked, true);
});

test("record-permanent workflow returns false when the toolbar action stays unavailable", async () => {
  let elapsed = 0;
  const { openWorkflow, context, statuses } = createWorkflowOpenerContext({
    Date: { now: () => elapsed },
    window: {
      setTimeout: (callback, delay = 0) => {
        elapsed += Number(delay || 0);
        callback();
      }
    }
  });
  context.editor.els.recordPermanent = { disabled: true, click: () => assert.fail("disabled action should not be clicked") };

  const opened = await openWorkflow({
    noteId: "source-1",
    workflowRoute: { focus: "record-permanent" }
  });

  assert.equal(opened, false);
  assert.equal(statuses.at(-1)?.type, "warn");
  assert.match(statuses.at(-1)?.message || "", /不能创建永久笔记/);
});

test("distillation workflow reports the actual route-open result", async () => {
  const { openWorkflow: failedOpen } = createWorkflowOpenerContext({
    handleStateChange: async () => false
  });
  const failed = await failedOpen({
    noteId: "note-1",
    workflowRoute: { focus: "distillation", mode: "distillation" }
  });
  assert.equal(failed, false);

  const { openWorkflow: successfulOpen } = createWorkflowOpenerContext({
    handleStateChange: async () => true
  });
  const successful = await successfulOpen({
    noteId: "note-1",
    workflowRoute: { focus: "distillation", mode: "distillation" }
  });
  assert.equal(successful, true);
});

test("isolated confirmed permanent notes are reported as actionable relation reminders", () => {
  const appSource = readRepoFile("apps/web/src/prototype-app.js");
  const helperStart = appSource.indexOf("function relationNetworkWorkflowMessageForNote(note = null, overview = {}) {");
  const helperEnd = appSource.indexOf("function syncRelationNetworkSystemMessageForNote", helperStart);
  const helper = appSource.slice(helperStart, helperEnd);

  assert.match(helper, /distillationStatusOf\(note\) !== "confirmed"/);
  assert.match(helper, /explicitRelationCount > 0/);
  assert.match(helper, /resolved: true, dedupeKey/);
  assert.match(helper, /category: "relation-network"/);
  assert.match(helper, /actionLabel: "关联一条笔记"/);
  assert.match(helper, /focus: "relations"/);

  const componentSource = readRepoFile("apps/web/src/components-editor-pane.js");
  assert.match(componentSource, /notifyWorkflowReminder/);
  assert.match(componentSource, /this\.notifyWorkflowReminder = typeof notifyWorkflowReminder === "function" \? notifyWorkflowReminder : \(\) => \{\}/);
  assert.match(componentSource, /this\.notifyWorkflowReminder\(\{ kind: "relation-network", note, overview \}\)/);

  const editorStart = appSource.indexOf("const editor = new EditorPane({");
  const editorEnd = appSource.indexOf("});\nwindow.__prototypeEditor", editorStart);
  const editorConfig = appSource.slice(editorStart, editorEnd);
  assert.match(editorConfig, /notifyWorkflowReminder: \(event = \{\}\) => \{/);
  assert.match(editorConfig, /syncRelationNetworkSystemMessageForNote\(event\.note, event\.overview\)/);
});
