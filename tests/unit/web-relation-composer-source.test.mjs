import test from "node:test";
import assert from "node:assert/strict";
import { PermanentRelationComposerController } from "../../apps/web/src/permanent-relation-composer-controller.js";
import { EditorPane } from "../../apps/web/src/components-editor-pane.js";
import { currentRelationSnapshot } from "../../apps/web/src/relation-snapshot.js";
import { PermanentNoteSidebarController } from "../../apps/web/src/permanent-note-sidebar-controller.js";

for (const scenario of ["closed-failure", "open-failure", "closed-success", "superseded-failure"]) {
  test(`committed save settles sidebar display independently of the composer: ${scenario}`, async t => {
    const originalFetch = globalThis.fetch, originalFormData = globalThis.FormData;
    let releaseSidebar, releaseSavedRead, savedReadStarted;
    const heldSidebar = new Promise(resolve => { releaseSidebar = resolve; });
    const heldSavedRead = new Promise(resolve => { releaseSavedRead = resolve; });
    const started = new Promise(resolve => { savedReadStarted = resolve; });
    t.after(() => { releaseSidebar(); releaseSavedRead(); globalThis.fetch = originalFetch; globalThis.FormData = originalFormData; });
    let reads = 0, writes = 0, savedResult = null, displayedState = "loading";
    const stored = [];
    const response = item => new Response(JSON.stringify({ item }), { status: 200 });
    globalThis.FormData = class {
      get(key) { return { relationType: "supports", rationale: "A concrete reason", insightQuestion: "" }[key]; }
    };
    globalThis.fetch = async (_url, options = {}) => {
      if (options.method === "POST") {
        writes++;
        const link = { id: "saved", fromNoteId: "source", ...JSON.parse(options.body) };
        stored.push(link);
        return response(link);
      }
      const snapshot = structuredClone({ outgoingLinks: stored, backlinks: [] });
      const i = ++reads;
      if (i === 1) await heldSidebar;
      if (i === 3) {
        savedReadStarted(); await heldSavedRead;
        if (scenario !== "closed-success") throw new Error("saved snapshot read unavailable");
      }
      return response(snapshot);
    };
    const source = { id: "source" };
    const section = { getAttribute: () => source.id, outerHTML: "loading" };
    const host = {
      state: { module: "explorer", notes: [source, { id: "target" }] },
      permanentRelationWorkspaceState: { open: true, noteId: source.id, sourceNoteId: source.id,
        relationComposerSessionId: "one", selectedTargetNoteId: "target", relationType: "supports", rationale: "A concrete reason" },
      currentSemanticRelations: null, semanticRelationsState: "loading", relationsRequestSerial: 1,
      activeNote: () => source, activeTab: () => null, isActiveNoteId: id => id === source.id, vaultScope: () => "vault",
      syncPermanentRelationWorkspaceOverlay() {}, syncRelationNetworkConnected() {}, async refreshRelationNetworkStatuses() {},
      applyRelationNetworkStatusesFromRelations() {}, renderPreview() {}, setRelationFollowupSuggestion() {}, renderAll() {},
      refreshSemanticRelations: EditorPane.prototype.refreshSemanticRelations,
      shouldPreserveRelationSection: () => false,
      renderCurrentRelationSection(_id, options) { displayedState = options.relationState; return displayedState; },
      els: { result: { querySelector: () => section } },
      permanentSidebarController: () => ({ commitSavedRelationWorkspaceResult(result) { savedResult = result; } })
    };
    const sidebar = host.refreshSemanticRelations(source.id, 1);
    const save = new PermanentRelationComposerController(host).submit({});
    await started;
    if (scenario !== "open-failure") new PermanentNoteSidebarController(host).closeRelationWorkspace();
    if (scenario === "superseded-failure") await host.refreshSemanticRelations(source.id, 1);
    releaseSavedRead();
    await save;
    releaseSidebar();
    await sidebar;
    const expectedState = scenario.endsWith("success") || scenario === "superseded-failure" ? "loaded" : "error";
    assert.equal(writes, 1);
    assert.equal(host.semanticRelationsState, expectedState);
    assert.equal(displayedState, expectedState);
    assert.equal(section.outerHTML, expectedState);
    if (scenario === "open-failure") {
      assert.ok(savedResult);
      assert.match(savedResult.successMessage, /关联已保存/);
    } else assert.equal(host.permanentRelationWorkspaceState.open, false);
    // Recover through the ordinary sidebar read, without saving a second time.
    await host.refreshSemanticRelations(source.id, 1);
    assert.equal(host.semanticRelationsState, "loaded");
    assert.equal(displayedState, "loaded");
    assert.deepEqual(host.currentSemanticRelations.outgoingLinks, stored);
    assert.deepEqual(currentRelationSnapshot(host, source.id).outgoingLinks, stored);
    assert.equal(writes, 1);
  });
}

for (const outcome of ["cancel", "fail", "cancel-fail"]) {
  for (const sidebarFirst of [false, true]) {
    test(`initial sidebar load completes across preflight ${outcome}, sidebar finishes ${sidebarFirst ? "first" : "last"}`, async t => {
      const originalFetch = globalThis.fetch, originalFormData = globalThis.FormData;
      const releases = [], starts = [];
      const begun = [0, 1].map(i => new Promise(resolve => { starts[i] = resolve; }));
      const pending = [0, 1].map(i => new Promise(resolve => { releases[i] = resolve; }));
      t.after(() => { releases.forEach(release => release()); globalThis.fetch = originalFetch; globalThis.FormData = originalFormData; });
      let reads = 0, writes = 0, renders = 0;
      const relations = { outgoingLinks: [{ id: "existing", fromNoteId: "source", toNoteId: "other" }], backlinks: [] };
      globalThis.FormData = class {
        get(key) { return { relationType: "supports", rationale: "A concrete reason", insightQuestion: "" }[key]; }
      };
      globalThis.fetch = async (_url, options = {}) => {
        if (options.method === "POST") { writes++; throw new Error("unexpected write"); }
        const i = reads++;
        starts[i]();
        await pending[i];
        if (i === 1 && outcome.includes("fail")) throw new Error("preflight unavailable");
        return new Response(JSON.stringify({ item: relations }), { status: 200 });
      };
      const source = { id: "source" };
      const host = {
        state: { module: "explorer", notes: [source, { id: "target" }] },
        permanentRelationWorkspaceState: { open: true, noteId: source.id, sourceNoteId: source.id,
          relationComposerSessionId: "one", selectedTargetNoteId: "target", relationType: "supports", rationale: "A concrete reason" },
        currentSemanticRelations: null, semanticRelationsState: "loading", relationsRequestSerial: 1,
        activeNote: () => source, activeTab: () => null, isActiveNoteId: id => id === source.id, vaultScope: () => "vault",
        syncPermanentRelationWorkspaceOverlay() {}, applyRelationNetworkStatusesFromRelations() {},
        renderPreview() { renders++; }, els: {}
      };
      const sidebar = EditorPane.prototype.refreshSemanticRelations.call(host, source.id, 1);
      await begun[0];
      const save = new PermanentRelationComposerController(host).submit({});
      await begun[1];
      if (outcome.includes("cancel")) new PermanentNoteSidebarController(host).closeRelationWorkspace();
      if (sidebarFirst) { releases[0](); await sidebar; }
      releases[1]();
      await save;
      if (!sidebarFirst) { releases[0](); await sidebar; }
      assert.equal(writes, 0);
      assert.equal(host.semanticRelationsState, "loaded");
      assert.deepEqual(host.currentSemanticRelations, relations);
      assert.deepEqual(currentRelationSnapshot(host, source.id), relations);
      assert.equal(renders, 1);
      if (outcome.includes("cancel")) assert.equal(host.permanentRelationWorkspaceState.open, false);
      else assert.equal(host.permanentRelationWorkspaceState.saveState, "error");
    });
  }
}

for (const scenario of ["save-save", "sidebar-save", "save-sidebar", "sidebar-error-save"]) {
  test(`relation reads retain the newer snapshot when responses arrive out of order: ${scenario}`, async t => {
    const originalFetch = globalThis.fetch, originalFormData = globalThis.FormData;
    let releaseOldRead, oldReadStarted;
    const held = new Promise(resolve => { releaseOldRead = resolve; });
    const started = new Promise(resolve => { oldReadStarted = resolve; });
    t.after(() => { releaseOldRead(); globalThis.fetch = originalFetch; globalThis.FormData = originalFormData; });
    let readCount = 0;
    const stored = [];
    const oldIsSidebar = scenario.startsWith("sidebar");
    const response = item => new Response(JSON.stringify({ item }), { status: 200 });
    globalThis.FormData = class {
      get(key) { return { relationType: "supports", rationale: "A concrete reason", insightQuestion: "" }[key]; }
    };
    globalThis.fetch = async (_url, options = {}) => {
      if (options.method === "POST") {
        const link = { id: `r${stored.length + 1}`, fromNoteId: "source", ...JSON.parse(options.body) };
        stored.push(link);
        return response(link);
      }
      const snapshot = structuredClone({ outgoingLinks: stored, backlinks: [] });
      if (++readCount === (oldIsSidebar ? 1 : 2)) {
        oldReadStarted();
        await held;
        if (scenario === "sidebar-error-save") throw new Error("obsolete sidebar failure");
      }
      return response(snapshot);
    };
    const source = { id: "source" };
    const draft = (session, target) => ({ open: true, sourceNoteId: source.id, noteId: source.id,
      relationComposerSessionId: session, selectedTargetNoteId: target, relationType: "supports", rationale: "A concrete reason" });
    const host = {
      state: { module: "explorer", notes: [source, { id: "target1" }, { id: "target2" }] },
      permanentRelationWorkspaceState: draft("one", "target1"),
      currentSemanticRelations: { outgoingLinks: [], backlinks: [] }, relationsRequestSerial: 1,
      activeNote: () => source, activeTab: () => null, isActiveNoteId: id => id === source.id, vaultScope: () => "vault",
      syncPermanentRelationWorkspaceOverlay() {}, syncRelationNetworkConnected() {}, async refreshRelationNetworkStatuses() {},
      renderPreview() {}, setRelationFollowupSuggestion() {}, renderAll() {},
      applyRelationNetworkStatusesFromRelations() {}, els: {},
      refreshSemanticRelations: EditorPane.prototype.refreshSemanticRelations,
      permanentSidebarController: () => ({ commitSavedRelationWorkspaceResult() {} })
    };
    const controller = new PermanentRelationComposerController(host);
    const sidebarRead = () => EditorPane.prototype.refreshSemanticRelations.call(host, source.id, 1);
    const oldRequest = oldIsSidebar ? sidebarRead() : controller.submit({});
    await started;
    if (scenario === "save-sidebar") {
      stored.push({ id: "r2", fromNoteId: source.id, toNoteId: "target2", relationType: "supports" });
      await sidebarRead();
    } else {
      host.permanentRelationWorkspaceState = draft("two", "target2");
      await controller.submit({});
    }
    const expectedIds = stored.map(link => link.id);
    assert.deepEqual(host.currentSemanticRelations.outgoingLinks.map(link => link.id), expectedIds);
    releaseOldRead();
    await oldRequest;
    assert.deepEqual(host.currentSemanticRelations.outgoingLinks.map(link => link.id), expectedIds);
    assert.deepEqual(currentRelationSnapshot(host, source.id).outgoingLinks.map(link => link.id), expectedIds);
    assert.equal(host.semanticRelationsState, "loaded");
    assert.equal(host.permanentRelationWorkspaceState.relationComposerSessionId, scenario === "save-sidebar" ? "one" : "two");
  });
}

test("a redundant search change event preserves the newly selected target", () => {
  const draft = { manualQuery: "same query", selectedTargetNoteId: "selected" };
  const host = { permanentRelationWorkspaceState: draft };
  new PermanentRelationComposerController(host).queueManualSearch({ value: "same query" });
  assert.equal(host.permanentRelationWorkspaceState, draft);
  assert.equal(draft.selectedTargetNoteId, "selected");
});

for (const change of ["vault", "session", "note"]) {
  test(`editing target search clears the old choice immediately and cancels queued work after ${change} changes`, () => {
    let callback, vault = "vault-a", searches = 0;
    const submit = { disabled: false }, source = { id: "source" };
    const host = { state: { notes: [source] }, activeNote: () => source, vaultScope: () => vault,
      permanentRelationSearchSerial: 0, permanentRelationWorkspaceState: {
        sourceNoteId: source.id, noteId: source.id, relationComposerSessionId: "session-a", selectedTargetNoteId: "old-target"
      }, windowRef: { clearTimeout: () => {}, setTimeout: fn => { callback = fn; } },
      syncPermanentRelationManualResults: () => {}, permanentRelationWorkspaceElement: () => ({ querySelector: () => submit }) };
    const controller = new PermanentRelationComposerController(host);
    controller.refreshManualSearch = () => { searches++; };
    controller.queueManualSearch({ value: "new query" });
    assert.equal(host.permanentRelationWorkspaceState.selectedTargetNoteId, "");
    assert.equal(submit.disabled, true);
    if (change === "vault") vault = "vault-b";
    if (change === "session") host.permanentRelationWorkspaceState.relationComposerSessionId = "session-b";
    if (change === "note") host.permanentRelationWorkspaceState.sourceNoteId = "other";
    callback();
    assert.equal(searches, 0);
  });
}

test("a missing explicit relation source does not fall back to a different active note", () => {
  const active = { id: "active" };
  const host = { state: { notes: [active] }, activeNote: () => active,
    permanentRelationWorkspaceState: { sourceNoteId: "deleted-source" } };
  const controller = new PermanentRelationComposerController(host);
  assert.equal(controller.sourceNote(), null);
  host.permanentRelationWorkspaceState = {};
  assert.equal(controller.sourceNote(), active);
});

for (const fail of [false, true]) {
  test(`relation search ignores an old vault ${fail ? "error" : "result"} even when note and session ids match`, async t => {
    const originalFetch = globalThis.fetch;
    t.after(() => { globalThis.fetch = originalFetch; });
    let resolve, reject, entered;
    const held = new Promise((done, failed) => { resolve = done; reject = failed; });
    const started = new Promise(done => { entered = done; });
    globalThis.fetch = async () => { entered(); return held; };
    let scope = "vault-a";
    let inserted = 0;
    const note = { id: "source" };
    const host = { state: { notes: [note] }, activeNote: () => note, vaultScope: () => scope,
      permanentRelationSearchSerial: 0,
      permanentRelationWorkspaceState: { sourceNoteId: note.id, noteId: note.id, relationComposerSessionId: "same-session" },
      syncPermanentRelationManualResults: () => {}, relationTargetSearchRootId: () => "root",
      upsertApiNotes: () => { inserted++; } };
    const running = new PermanentRelationComposerController(host).refreshManualSearch("query");
    await started;
    scope = "vault-b";
    const currentDraft = { ...host.permanentRelationWorkspaceState, error: "", manualTargets: [{ id: "new-vault" }] };
    host.permanentRelationWorkspaceState = currentDraft;
    if (fail) reject(new Error("old vault error"));
    else resolve(new Response(JSON.stringify({ items: [{ id: "old-vault" }] }), { status: 200 }));
    await running;
    assert.equal(inserted, 0);
    assert.equal(host.permanentRelationWorkspaceState, currentDraft);
  });
}
