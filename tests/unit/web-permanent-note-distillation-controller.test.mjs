import test from "node:test";
import assert from "node:assert/strict";

import {
  applyPermanentNoteDistillationToNote,
  currentPermanentNoteDistillationPrefill,
  emptyPermanentNoteDistillationPrefill,
  normalizePermanentNoteDistillationPrefill,
  permanentNoteDistillationFormValues,
  permanentNoteViewpointBaseline,
  permanentNoteViewpointSourceCandidates,
  permanentNoteViewpointHasChanged
} from "../../apps/web/src/permanent-note-distillation-model.js";
import { PermanentNoteDistillationController } from "../../apps/web/src/permanent-note-distillation-controller.js";
import { syncDistillationEditorResult } from "../../apps/web/src/distillation-editor-result.js";
import { handleConfirmNoteDistillationStateChange, handleSaveNoteDistillationStateChange } from "../../apps/web/src/app-shell-distillation-state-actions.js";
import { renderPermanentNoteDistillationSection } from "../../apps/web/src/permanent-note-distillation-view.js";

function field(value = "") {
  return { value };
}

function distillationForm(values = {}) {
  const sourceInputs = (values.viewpointChangeSourceNoteIds || []).map((value) => ({ value, checked: true }));
  const fields = new Map([
    ['[name="thesis"]', field(values.thesis)],
    ['[name="originalThesis"]', field(values.originalThesis)],
    ['[name="startingQuestion"]', field(values.startingQuestion)],
    ['[name="thesisChangeReason"]', field(values.thesisChangeReason)],
    ['[name="summary1"]', field(values.summary1)],
    ['[name="summary2"]', field(values.summary2)],
    ['[name="summary3"]', field(values.summary3)],
    ['[name="boundaryOrCounterpoint"]', field(values.boundaryOrCounterpoint)],
    ['[name="distillationStatus"]', field(values.distillationStatus)]
  ]);
  if (Object.hasOwn(values, "title")) fields.set('[name="title"]', field(values.title));
  return {
    querySelector(selector) {
      return fields.get(selector) || null;
    },
    querySelectorAll(selector) {
      return selector === '[name="viewpointChangeSourceNoteIds"]:checked' ? sourceInputs : [];
    }
  };
}

test("adopting an AI draft refreshes its viewpoint baseline and preserves a human draft", () => {
  const note = { id: "pn1", thesis: "Before" };
  const tab = { noteId: note.id };
  let refreshed = 0;
  const controller = new PermanentNoteDistillationController({
    readTemplateVariantPreference: () => "", templateVariantPreferenceMeta: () => ({ key: "", label: "" }),
    activeTab: () => tab,
    refreshPermanentWorkspaceSnapshot: (item, activeTab) => {
      assert.equal(item, note);
      assert.equal(activeTab, tab);
      refreshed += 1;
    }
  });
  controller.setPrefill(note.id, { viewpointDraft: {
    thesis: "My pending judgment", originalThesis: "Before", boundaryOrCounterpoint: "My boundary"
  } });
  controller.applyAdoptedNote(note, { thesis: "Adopted suggestion" });
  const draft = controller.currentPrefill(note.id).viewpointDraft;
  assert.equal(note.thesis, "Adopted suggestion");
  assert.equal(draft.originalThesis, "Adopted suggestion");
  assert.equal(draft.thesis, "My pending judgment");
  assert.equal(draft.boundaryOrCounterpoint, "My boundary");
  assert.equal(refreshed, 1);
});

test("distillation model normalizes empty and remembered prefill state", () => {
  assert.deepEqual(currentPermanentNoteDistillationPrefill(null, "pn1"), emptyPermanentNoteDistillationPrefill("pn1"));

  const state = normalizePermanentNoteDistillationPrefill("pn1", {
    boundaryDraft: " boundary ",
    draftVariants: [
      { key: "default", label: "Default", boundaryDraft: "A" },
      { key: "product", label: "Product", boundaryDraft: "B" }
    ]
  }, {
    preferredTemplateVariant: "product",
    rememberedTemplateVariant: { key: "product", label: "Product" }
  });

  assert.equal(state.noteId, "pn1");
  assert.equal(state.boundaryDraft, "boundary");
  assert.equal(state.selectedTemplateVariant, "product");
  assert.equal(state.rememberedTemplateVariantLabel, "Product");
});

test("distillation form values keep thesis, boundary and confirmed status", () => {
  const values = permanentNoteDistillationFormValues(distillationForm({
    thesis: " Distilled thesis ",
    summary1: "One",
    summary2: "Two",
    summary3: "Three",
    boundaryOrCounterpoint: " Boundary ",
    distillationStatus: "confirmed"
  }));

  assert.deepEqual(values, {
    thesis: "Distilled thesis",
    originalThesis: "",
    startingQuestion: "",
    thesisChangeReason: "",
    viewpointChangeSourceNoteIds: [],
    threeLineSummary: ["One", "Two", "Three"],
    boundaryOrCounterpoint: "Boundary",
    distillationStatus: "confirmed"
  });
});

test("a user chosen title is trimmed, escaped and preserved as a pending draft", () => {
  const note = { id: "pn1", title: "Source title", noteType: "permanent" };
  const controller = new PermanentNoteDistillationController({ activeNote: () => note });
  controller.syncDraftFromForm(distillationForm({ title: '  My <claim> & "title"  ', thesis: "My judgment" }));
  assert.equal(controller.currentPrefill(note.id).viewpointDraft.title, 'My <claim> & "title"');
  const html = renderPermanentNoteDistillationSection(note, {
    noteType: "permanent", distillationPrefill: controller.currentPrefill(note.id)
  });
  assert.match(html, /name="title"[^>]*value="My &lt;claim&gt; &amp; &quot;title&quot;"/);
  assert.equal(note.title, "Source title");
});

test("an empty title blocks writes and focuses the title field", async () => {
  for (const method of ["handleForm", "confirm"]) {
    const form = distillationForm({ title: "  ", thesis: "My judgment" });
    let focused = 0;
    form.querySelector('[name="title"]').focus = () => { focused++; };
    const statuses = [];
    const controller = new PermanentNoteDistillationController({
      activeNote: () => ({ id: "pn1", noteType: "permanent" }), resolvedNoteType: () => "permanent",
      els: { result: { querySelector: () => form } }, onStatus: (...args) => statuses.push(args),
      autoSaveActiveNote: () => assert.fail("Empty title must not write"),
      onStateChange: () => assert.fail("Empty title must not write")
    });
    await controller[method](form);
    assert.equal(focused, 1);
    assert.deepEqual(statuses, [["请填写笔记标题", "warn"]]);
  }
});

test("a partial save refreshes the renamed draft but retains the form for retry", async () => {
  const note = { id: "pn1", title: "Before", noteType: "permanent" };
  const tab = { body: "# Before", savedBody: "# Before", savedFileRevision: "baseline" };
  const form = distillationForm({ title: "My title", thesis: "My viewpoint" });
  let body = tab.body;
  let payload;
  const controller = new PermanentNoteDistillationController({
    activeNote: () => note, activeTab: () => tab, resolvedNoteType: () => "permanent",
    autoSaveActiveNote: async () => true, isActiveNoteId: () => true,
    getEditorValue: () => body, fillEditorFromTab: () => { body = tab.body; },
    onStateChange: async (action, input) => {
      payload = input;
      tab.body = tab.savedBody = "# My title";
      return { id: note.id, title: "My title", body: tab.body, distillationSaveIncomplete: true };
    },
    renderThinkingStatus: () => assert.fail("Not confirmed"),
    permanentNoteWorkspace: () => ({ reset: () => assert.fail("Must retain draft") })
  });
  controller.syncDraftFromForm(form);
  await controller.handleForm(form);
  assert.equal(payload.title, "My title");
  assert.equal(payload.expectedRevision, "baseline");
  assert.equal(body, "# My title");
  assert.equal(controller.currentPrefill(note.id).viewpointDraft.title, "My title");
  assert.equal(controller.associationFollowup.current(note, ""), null);
});

test("explicit confirmation failure leaves the saved title visible in the editor", async () => {
  const note = { id: "pn1", title: "Before", noteType: "permanent" };
  const form = distillationForm({ title: "After", thesis: "My judgment" });
  let body = "# Before";
  const tab = { body, savedFileRevision: "baseline" };
  const actions = [];
  const controller = new PermanentNoteDistillationController({
    activeNote: () => note, activeTab: () => tab, resolvedNoteType: () => "permanent",
    els: { result: { querySelector: () => form } },
    autoSaveActiveNote: async () => true, isActiveNoteId: () => true,
    getEditorValue: () => body, fillEditorFromTab: () => { body = tab.body; },
    readTemplateVariantPreference: () => "", templateVariantPreferenceMeta: () => ({}),
    onStateChange: async (action, input) => {
      actions.push(action);
      if (action === "confirm-note-distillation") return false;
      assert.equal(input.title, "After");
      assert.equal(input.expectedRevision, "baseline");
      tab.body = "# After";
      return { id: note.id, title: "After", body: tab.body };
    },
    renderThinkingStatus: () => assert.fail("Not confirmed")
  });
  await controller.confirm();
  assert.equal(body, "# After");
  assert.deepEqual(actions, ["save-note-distillation", "confirm-note-distillation"]);
  assert.equal(controller.associationFollowup.current(note, ""), null);
});

test("viewpoint changes only require a reason after an existing thesis changes", () => {
  assert.equal(permanentNoteViewpointHasChanged("", "First viewpoint"), false);
  assert.equal(permanentNoteViewpointHasChanged("Same", "Same"), false);
  assert.equal(permanentNoteViewpointHasChanged("Before", "After"), true);
});

test("distillation controller refreshes the viewpoint-change requirement while typing", () => {
  const reason = { required: false };
  const changeField = {
    hidden: true,
    querySelector: (selector) => (selector === '[name="thesisChangeReason"]' ? reason : null)
  };
  const form = distillationForm({ thesis: "Updated viewpoint", originalThesis: "Earlier viewpoint" });
  const originalQuerySelector = form.querySelector.bind(form);
  form.querySelector = (selector) => selector === "[data-viewpoint-change-reason]" ? changeField : originalQuerySelector(selector);
  const controller = new PermanentNoteDistillationController({});

  const values = controller.refreshQuality(form);

  assert.equal(values.thesis, "Updated viewpoint");
  assert.equal(changeField.hidden, false);
  assert.equal(reason.required, true);
});

test("pending AI viewpoint keeps the confirmed baseline and exposes real source notes", () => {
  const note = {
    id: "pn1",
    thesis: "AI draft",
    pendingViewpointRevision: {
      previousThesis: "Confirmed viewpoint",
      thesis: "AI draft",
      sourceNoteIds: ["source-2"]
    }
  };
  const candidates = permanentNoteViewpointSourceCandidates(note, {
    outgoingLinks: [{ target: { id: "source-1", title: "Connected evidence" } }],
    backlinks: []
  }, [{ id: "source-2", title: "AI source" }]);

  assert.equal(permanentNoteViewpointBaseline(note), "Confirmed viewpoint");
  assert.deepEqual(candidates, [
    { id: "source-1", title: "Connected evidence", selected: false },
    { id: "source-2", title: "AI source", selected: true }
  ]);
});

test("dismissed relations are not offered as viewpoint-change sources", () => {
  const candidates = permanentNoteViewpointSourceCandidates({ id: "pn1" }, {
    outgoingLinks: [
      { status: "dismissed", target: { id: "dismissed", title: "Dismissed evidence" } },
      { status: "confirmed", target: { id: "confirmed", title: "Confirmed evidence" } }
    ],
    backlinks: []
  });

  assert.deepEqual(candidates, [
    { id: "confirmed", title: "Confirmed evidence", selected: false }
  ]);
});

test("backlink source candidates use the other note instead of the current note", () => {
  const candidates = permanentNoteViewpointSourceCandidates({ id: "current" }, {
    outgoingLinks: [],
    backlinks: [{
      fromNoteId: "source-note",
      toNoteId: "current",
      target: { id: "current", title: "Current note" },
      source: { id: "source-note", title: "Actual source note" }
    }]
  });

  assert.deepEqual(candidates, [{ id: "source-note", title: "Actual source note", selected: false }]);
});

test("unsaved viewpoint reason and source selection survive a controller rerender", () => {
  const note = { id: "pn1", thesis: "Confirmed viewpoint", noteType: "permanent" };
  const controller = new PermanentNoteDistillationController({ activeNote: () => note });
  controller.syncDraftFromForm(distillationForm({
    thesis: "Edited viewpoint",
    originalThesis: "Confirmed viewpoint",
    thesisChangeReason: "A counterexample changed my judgment.",
    viewpointChangeSourceNoteIds: ["source-1"],
    distillationStatus: "confirmed"
  }));

  assert.equal(note.thesis, "Confirmed viewpoint");

  const html = renderPermanentNoteDistillationSection(note, {
    noteType: "permanent",
    viewpointBaseline: permanentNoteViewpointBaseline(note),
    viewpointSourceCandidates: [{ id: "source-1", title: "Counterexample", selected: false }],
    distillationPrefill: controller.currentPrefill(note.id)
  });
  assert.match(html, /value="Confirmed viewpoint"/);
  assert.match(html, /A counterexample changed my judgment\./);
  assert.match(html, /value="source-1" checked/);
  assert.doesNotMatch(html, /data-viewpoint-change-reason hidden/);
});

test("saved pending viewpoint reason is restored while an intentionally cleared local draft stays empty", () => {
  const note = { id: "pending-note", thesis: "New judgment", pendingViewpointRevision: {
    previousThesis: "Old judgment", thesis: "New judgment", reason: "Evidence <changed> the scope.", sourceNoteIds: ["evidence"]
  } };
  const options = { noteType: "permanent", viewpointBaseline: permanentNoteViewpointBaseline(note),
    viewpointSourceCandidates: permanentNoteViewpointSourceCandidates(note, {}, [{ id: "evidence", title: "Actual evidence" }]) };
  const html = renderPermanentNoteDistillationSection(note, options);
  assert.match(html, /Evidence &lt;changed&gt; the scope\./);
  assert.match(html, /value="evidence" checked/);
  const edited = renderPermanentNoteDistillationSection(note, { ...options, distillationPrefill: { viewpointDraft: {
    thesis: note.thesis, originalThesis: "Old judgment", thesisChangeReason: "", viewpointChangeSourceNoteIds: []
  } } });
  assert.doesNotMatch(edited, /Evidence &lt;changed&gt;/);
  assert.match(edited, /name="thesisChangeReason"[^>]*><\/textarea>/);
  assert.doesNotMatch(edited, /value="evidence" checked/);
});

test("unsaved viewpoint drafts stay isolated per note", () => {
  const notes = {
    first: { id: "first", thesis: "First saved", noteType: "permanent" },
    second: { id: "second", thesis: "Second saved", noteType: "permanent" }
  };
  let active = notes.first;
  const controller = new PermanentNoteDistillationController({ activeNote: () => active });

  controller.syncDraftFromForm(distillationForm({
    thesis: "First draft",
    originalThesis: "First saved",
    thesisChangeReason: "First reason"
  }));
  active = notes.second;
  controller.syncDraftFromForm(distillationForm({
    thesis: "Second draft",
    originalThesis: "Second saved",
    thesisChangeReason: "Second reason"
  }));

  assert.equal(notes.first.thesis, "First saved");
  assert.equal(notes.second.thesis, "Second saved");
  assert.equal(controller.currentPrefill("first").viewpointDraft.thesis, "First draft");
  assert.equal(controller.currentPrefill("second").viewpointDraft.thesis, "Second draft");
});

test("unsaved viewpoint drafts clear when the vault changes", () => {
  const note = { id: "shared", thesis: "Saved viewpoint", noteType: "permanent" };
  let vaultScope = "vault-a";
  const controller = new PermanentNoteDistillationController({
    activeNote: () => note,
    vaultScope: () => vaultScope
  });

  controller.syncDraftFromForm(distillationForm({
    thesis: "Vault A draft",
    originalThesis: "Saved viewpoint",
    thesisChangeReason: "Only belongs to Vault A"
  }));
  assert.equal(controller.currentPrefill(note.id).viewpointDraft.thesis, "Vault A draft");

  vaultScope = "vault-b";
  assert.equal(controller.currentPrefill(note.id).viewpointDraft, null);
});

test("distillation view shows source choices only for a changed viewpoint", () => {
  const html = renderPermanentNoteDistillationSection({
    id: "pn1",
    thesis: "AI draft"
  }, {
    noteType: "permanent",
    viewpointBaseline: "Confirmed viewpoint",
    viewpointSourceCandidates: [{ id: "source-1", title: "Counterexample note", selected: true }]
  });

  assert.match(html, /哪些笔记影响了这次改变/);
  assert.match(html, /value="source-1" checked/);
  assert.match(html, /Counterexample note/);
  assert.doesNotMatch(html, /data-viewpoint-change-reason hidden/);
});

for (const aiAssisted of [false, true]) {
test(`distillation controller confirms authorship without erasing AI provenance (${aiAssisted})`, async () => {
  const note = { id: "pn1", title: "Note", status: "active", noteType: "permanent", authorship: { ai_assisted: aiAssisted } };
  const calls = [];
  const host = {
    activeNote: () => note,
    resolvedNoteType: () => "permanent",
    autoSaveActiveNote: async () => true,
    isActiveNoteId: (id) => id === note.id,
    onStateChange: async (action, payload) => {
      calls.push([action, payload]);
      return true;
    },
    renderThinkingStatus() {
      calls.push(["thinking"]);
    },
    permanentNoteWorkspace() {
      return {
        reset(noteId) {
          calls.push(["workspace-reset", noteId]);
        }
      };
    },
    renderRelated() {
      calls.push(["related"]);
    },
    readTemplateVariantPreference: () => "",
    templateVariantPreferenceMeta: () => ({ key: "", label: "" })
  };
  const controller = new PermanentNoteDistillationController(host);

  await controller.handleForm(distillationForm({
    thesis: "Thesis",
    originalThesis: "Earlier thesis",
    thesisChangeReason: "New evidence changed the judgment.",
    viewpointChangeSourceNoteIds: ["source-1"],
    summary1: "One",
    boundaryOrCounterpoint: "Boundary",
    distillationStatus: "confirmed"
  }));

  assert.equal(note.distillationStatus, "confirmed");
  assert.deepEqual(note.authorship, { ai_assisted: aiAssisted, user_confirmed: true });
  assert.equal(calls[0][0], "save-note-distillation");
  assert.deepEqual(calls[0][1].authorship, { user_confirmed: true, ai_assisted: aiAssisted });
  assert.equal(calls[0][1].commitViewpointChange, true);
  assert.deepEqual(calls[0][1].viewpointChangeSourceNoteIds, ["source-1"]);
  assert.deepEqual(calls.slice(-3), [["thinking"], ["workspace-reset", "pn1"], ["related"]]);
  assert.equal(controller.associationFollowup.current(note, "").thesis, "Thesis");
  assert.match(controller.renderSection(note), /观点已保存|data-note-association-next="associate"/);
});
}

test("distillation controller leaves note and writing status alone when save fails", async () => {
  const note = { id: "pn1", title: "Note", status: "active", noteType: "permanent" };
  const calls = [];
  const controller = new PermanentNoteDistillationController({
    activeNote: () => note,
    resolvedNoteType: () => "permanent",
    autoSaveActiveNote: async () => true,
    isActiveNoteId: (id) => id === note.id,
    onStateChange: async (action) => {
      calls.push([action]);
      return false;
    },
    renderThinkingStatus() {
      calls.push(["thinking"]);
    },
    renderRelated() {
      calls.push(["related"]);
    },
    readTemplateVariantPreference: () => "",
    templateVariantPreferenceMeta: () => ({ key: "", label: "" })
  });

  await controller.handleForm(distillationForm({
    thesis: "Thesis",
    summary1: "One",
    distillationStatus: "draft"
  }));

  assert.equal(note.thesis, undefined);
  assert.deepEqual(calls, [["save-note-distillation"]]);
  assert.equal(controller.associationFollowup.current(note, ""), null);
});

test("saving the current viewpoint refreshes the actual editor, without replacing newer typing", async () => {
  for (const typingDuringSave of [false, true]) {
    const note = { id: "pn1", noteType: "permanent" };
    const tab = { body: "old", savedBody: "old", dirty: false };
    let editorBody = "old";
    const warnings = [];
    let fills = 0;
    const controller = new PermanentNoteDistillationController({
      activeNote: () => note, resolvedNoteType: () => "permanent", isActiveNoteId: () => true,
      autoSaveActiveNote: async () => true,
      getEditorValue: () => editorBody,
      onStateChange: async () => {
        if (typingDuringSave) editorBody = "new typing";
        tab.body = tab.savedBody = "saved viewpoint";
        tab.dirty = false;
        return { id: note.id, body: tab.body };
      },
      fillEditorFromTab: () => { fills++; editorBody = tab.body; },
      updateActiveTabFromEditor: () => { tab.body = editorBody; tab.dirty = tab.body !== tab.savedBody; },
      onStatus: message => warnings.push(message),
      renderThinkingStatus: () => {}, renderRelated: () => {},
      readTemplateVariantPreference: () => "", templateVariantPreferenceMeta: () => ({})
    });
    await controller.handleForm(distillationForm({ thesis: "My own viewpoint" }));
    assert.equal(editorBody, typingDuringSave ? "new typing" : "saved viewpoint");
    assert.equal(tab.savedBody, "saved viewpoint");
    assert.equal(tab.dirty, typingDuringSave);
    assert.equal(fills, typingDuringSave ? 0 : 1);
    assert.equal(warnings.length, typingDuringSave ? 1 : 0);
  }
});

for (const action of ["save", "confirm"]) {
  test(`${action} retains typing during the preceding autosave through the real state actions`, async () => {
    const note = { id: "pn1", noteType: "permanent", title: "Note", body: "# Note\n\nSaved body", fileRevision: "saved" };
    const tab = { noteId: note.id, body: note.body, title: note.title, savedBody: note.body,
      savedTitle: note.title, savedFileRevision: note.fileRevision, dirty: false };
    const state = { notes: [note], tabs: [tab], noteMoveVaultScope: 1 };
    const form = distillationForm({ thesis: "Claim" });
    let editorBody = note.body, fills = 0;
    const warnings = [];
    const savedBody = `# Note\n\n## 提炼观点\n\nClaim\n\nSaved body`;
    const deps = { state, getVaultPath: () => "vault-a",
      updatePermanentNoteDistillation: async () => ({ ...note, thesis: "Claim", fileRevision: "draft" }),
      confirmPermanentNoteDistillation: async () => ({ ...note, thesis: "Claim", body: savedBody, fileRevision: "confirmed" }) };
    const controller = new PermanentNoteDistillationController({
      els: { result: { querySelector: () => form } },
      activeNote: () => note, activeTab: () => tab, resolvedNoteType: () => "permanent",
      isActiveNoteId: () => true, vaultScope: () => "vault-a",
      autoSaveActiveNote: async () => {
        editorBody += "\n\nNew text typed during autosave.";
        tab.body = editorBody;
        tab.dirty = true;
        return true;
      },
      getEditorValue: () => editorBody,
      fillEditorFromTab: () => { fills++; editorBody = tab.body; },
      updateActiveTabFromEditor: () => { tab.body = editorBody; tab.dirty = tab.body !== tab.savedBody; },
      onStateChange: (event, payload) => event === "save-note-distillation"
        ? handleSaveNoteDistillationStateChange(payload, deps) : handleConfirmNoteDistillationStateChange(payload, deps),
      onStatus: message => warnings.push(message), renderThinkingStatus: () => {}, renderRelated: () => {},
      readTemplateVariantPreference: () => "", templateVariantPreferenceMeta: () => ({})
    });
    if (action === "save") await controller.handleForm(form);
    else await controller.confirm();
    assert.match(editorBody, /New text typed during autosave/);
    assert.equal(tab.body, editorBody);
    assert.equal(tab.savedBody, savedBody);
    assert.equal(tab.savedFileRevision, "confirmed");
    assert.equal(tab.dirty, true);
    assert.match(editorBody, /## 提炼观点/);
    assert.ok(fills >= 1);
    assert.notEqual(tab.saveConflict, true);
  });
}

test("a refreshed body keeps keyboard focus in the open viewpoint panel without stealing outside focus", () => {
  for (const panelFocused of [false, true]) {
    let focuses = 0;
    const host = {
      els: { relatedPanel: { ownerDocument: { activeElement: {} }, contains: () => panelFocused } },
      getEditorValue: () => "old", fillEditorFromTab: () => {},
      permanentNoteWorkspace: () => ({ focusWorkspace: () => { focuses++; } })
    };
    syncDistillationEditorResult(host, { body: "saved" }, "old");
    assert.equal(focuses, 0, "An input still focused within the panel must retain focus");
    host.els.relatedPanel.contains = () => false;
    syncDistillationEditorResult(host, { body: "saved" }, "old", { panelFocused });
    assert.equal(focuses, panelFocused ? 1 : 0, "The save-time focus survives rendering that focuses the editor");
  }
});

test("typing a newer title while saving retains its draft and does not offer completion", async () => {
  const note = { id: "pn1", title: "Before", noteType: "permanent" };
  const initial = distillationForm({ title: "First title", thesis: "First judgment" });
  const warnings = [];
  const controller = new PermanentNoteDistillationController({
    activeNote: () => note, resolvedNoteType: () => "permanent", isActiveNoteId: () => true,
    autoSaveActiveNote: async () => true,
    onStateChange: async () => {
      controller.syncDraftFromForm(distillationForm({ title: "Newer title", thesis: "Newer judgment" }));
      note.thesis = "First judgment";
      return { id: note.id, title: "First title", body: "# First title" };
    },
    onStatus: message => warnings.push(message),
    renderThinkingStatus: () => assert.fail("Must not close the composing draft")
  });
  controller.syncDraftFromForm(initial);
  await controller.handleForm(initial);
  assert.equal(controller.currentPrefill(note.id).viewpointDraft.title, "Newer title");
  assert.equal(controller.currentPrefill(note.id).viewpointDraft.thesis, "Newer judgment");
  assert.equal(controller.currentPrefill(note.id).viewpointDraft.originalThesis, "First judgment");
  assert.equal(controller.associationFollowup.current(note, ""), null);
  assert.match(warnings.at(-1), /新输入的修改尚未保存/);
});

test("explicit confirmation also retains a later viewpoint draft", async () => {
  const note = { id: "pn1", title: "Saved", noteType: "permanent" };
  const controller = new PermanentNoteDistillationController({
    els: {},
    activeNote: () => note, resolvedNoteType: () => "permanent", isActiveNoteId: () => true,
    onStateChange: async () => {
      controller.syncDraftFromForm(distillationForm({ title: "Later", thesis: "Later claim" }));
      return { id: note.id, body: "# Saved" };
    },
    onStatus: message => assert.match(message, /新输入的修改尚未保存/),
    renderThinkingStatus: () => assert.fail("Must not discard the later draft")
  });
  await controller.confirm();
  assert.equal(controller.currentPrefill(note.id).viewpointDraft.title, "Later");
  assert.equal(controller.associationFollowup.current(note, ""), null);
});

test("a vault switch with the same active note ID cannot offer an old save result", async () => {
  const note = { id: "pn1", thesis: "Old", noteType: "permanent" };
  let scope = "vault-a";
  let renders = 0;
  const controller = new PermanentNoteDistillationController({
    activeNote: () => note, resolvedNoteType: () => "permanent", vaultScope: () => scope,
    autoSaveActiveNote: async () => true, isActiveNoteId: () => true,
    onStateChange: async () => { scope = "vault-b"; return true; },
    renderThinkingStatus: () => { renders++; }, renderRelated: () => { renders++; }
  });
  await controller.handleForm(distillationForm({ thesis: "New", originalThesis: "Old", thesisChangeReason: "Evidence", distillationStatus: "confirmed" }));
  assert.equal(note.thesis, "Old");
  assert.equal(renders, 0);
  assert.equal(controller.associationFollowup.current(note, "vault-b"), null);
});

test("distillation controller refreshes the editor after confirming into the body", async () => {
  const note = { id: "pn1", title: "Note", status: "active", noteType: "permanent" };
  const form = distillationForm({
    thesis: "Thesis",
    summary1: "One",
    summary2: "Two",
    summary3: "Three",
    distillationStatus: "draft"
  });
  const calls = [];
  const controller = new PermanentNoteDistillationController({
    activeNote: () => note,
    resolvedNoteType: () => "permanent",
    els: {
      result: {
        querySelector: (selector) => (selector === "[data-note-distillation-form]" ? form : null)
      }
    },
    autoSaveActiveNote: async () => true,
    isActiveNoteId: (id) => id === note.id,
    onStateChange: async (action) => {
      calls.push([action]);
      return action === "confirm-note-distillation" ? { id: note.id, body: "# Note\n\n## 提炼观点\n\nThesis\n" } : true;
    },
    fillEditorFromTab() {
      calls.push(["fill-editor"]);
    },
    renderThinkingStatus() {
      calls.push(["thinking"]);
    },
    renderRelated() {
      calls.push(["related"]);
    },
    readTemplateVariantPreference: () => "",
    templateVariantPreferenceMeta: () => ({ key: "", label: "" })
  });

  await controller.confirm();

  assert.deepEqual(calls, [
    ["save-note-distillation"],
    ["confirm-note-distillation"],
    ["fill-editor"],
    ["thinking"],
    ["related"]
  ]);
});
