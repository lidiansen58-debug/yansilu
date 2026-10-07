import test from "node:test";
import assert from "node:assert/strict";
import { createWritingProjectRuntimeController } from "../../apps/web/src/writing-project-runtime-controller.js";
import { createWritingThemeProjectRuntime } from "../../apps/web/src/writing-theme-project-runtime.js";

function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

for (const origin of ["basket", "theme", "import"]) {
  for (const phase of origin === "basket" ? ["create", "refresh"] : ["hydrate", "create", "refresh"]) {
    for (const change of ["vault", "scope", "revision", "project", "theme", "basket"]) {
      for (const outcome of ["success", "failure"]) {
      test(`${origin} project ignores ${phase} ${outcome} after ${change} changes`, async () => {
        const waiting = deferred(), entered = deferred(), effects = [];
        let vault = "original-vault", basket = ["n1"], posts = 0;
        const state = { noteMoveVaultScope: {} };
        const writingState = { projectOpenRevision: 1, selectedThemeIndexId: "theme-1", sourceIndexIds: [] };
        const project = { id: "new-project", title: "Article", basket_note_ids: ["n1"] };
        const pause = async stage => { if (stage === phase) { entered.resolve(); await waiting.promise; } };
        const deps = {
          state, writingState, getVaultPath: () => vault, parseWritingBasketIds: () => basket,
          $: id => ({ value: id === "writingTitle" ? "Article" : "" }),
          ensureNotesLoaded: async () => pause("hydrate"),
          useThemeIndexAsWritingEntry: async (id, options) => {
            await pause("hydrate"); options.assertCurrent?.();
            writingState.projectOpenRevision++; writingState.selectedThemeIndexId = id;
            options.onEntryApplied?.();
            return { indexCard: { id, title: "Theme" }, noteIds: ["n1"] };
          },
          beginWritingEntry: () => { writingState.projectOpenRevision++; writingState.selectedThemeIndexId = ""; },
          createWritingProject: async payload => {
            posts++; await pause("create");
            assert.equal(payload.expectedVaultPath, "original-vault"); return project;
          },
          loadWritingProjectsList: async () => pause("refresh"),
          loadWritingScaffoldVersions: async () => effects.push("scaffolds"),
          loadWritingDraftVersions: async () => effects.push("drafts"),
          openWritingModule: async () => { await pause("refresh"); },
          renderWritingPanel: () => effects.push("render"), setStatus: () => effects.push("status"),
          showWritingResult: () => effects.push("result"), populateWritingFormFromProject: () => effects.push("form"),
          syncWritingLocalBookIdeasFromProject: () => effects.push("ideas"),
          normalizeWritingProjectTitleSeed: value => value,
          deriveWritingProjectIntent: () => "intent", deriveWritingProjectTakeaway: () => "takeaway",
          suggestedWritingProjectTitle: () => "Article",
          importState: { lastResultPayload: { stage: "confirm", result: { createdFiles: [{ noteId: "n1", noteType: "permanent" }] } } }
        };
        const runtime = origin === "theme" ? createWritingThemeProjectRuntime(deps)
          : createWritingProjectRuntimeController(() => deps);
        const pending = origin === "theme" ? runtime.createWritingProjectFromThemeIndex("theme-1")
          : origin === "import" ? runtime.createWritingProjectFromImportedPermanentNotes()
          : runtime.createWritingProjectFromCurrentBasket();
        const guarded = pending.catch(error => { assert.equal(error.code, "WRITING_CONTEXT_CHANGED"); });
        await entered.promise;
        if (change === "vault") vault = "other-vault";
        if (change === "scope") state.noteMoveVaultScope = {};
        if (change === "revision") writingState.projectOpenRevision++;
        if (change === "project") writingState.project = { id: "other-project", title: "User's article" };
        if (change === "theme") writingState.selectedThemeIndexId = "other-theme";
        if (change === "basket") basket = ["n2"];
        const snapshot = structuredClone(writingState), before = effects.length;
        delete snapshot.projectCreationPending;
        if (outcome === "failure") waiting.reject(new Error("Old operation failed"));
        else waiting.resolve();
        await guarded;
        assert.equal(writingState.projectCreationPending, undefined, "A finished creation must release its pending state");
        assert.deepEqual(writingState, snapshot);
        assert.equal(effects.length, before, "No late status, navigation, form or history update");
        if (phase === "hydrate") assert.equal(posts, 0);
      });
      }
    }
  }
}

for (const origin of ["basket", "theme", "import"]) {
  test(`${origin} project creation keeps and persists edits made while the POST is pending`, async () => {
    const entered = deferred(), waiting = deferred(), patches = [];
    const fields = Object.fromEntries(["Title", "Goal", "Audience", "Tone"].map(field => [`writing${field}`, { value: `Original ${field}` }]));
    fields.writingAudience.selectionStart = null;
    fields.writingAudience.selectionEnd = null;
    fields.writingAudience.setSelectionRange = () => { throw new Error("Hidden inputs do not support selection ranges"); };
    const writingState = { selectedThemeIndexId: "theme-1", sourceIndexIds: [] };
    const projectFrom = payload => ({ id: "project-1", title: payload.title, goal: payload.goal, audience: payload.audience,
      tone: payload.tone, basket_note_ids: ["n1"], related_index_ids: ["theme-1"] });
    const deps = {
      $: id => fields[id], writingState, state: {}, getVaultPath: () => "original-vault", parseWritingBasketIds: () => ["n1"],
      createWritingProject: async payload => { entered.resolve(); await waiting.promise; return projectFrom(payload); },
      syncWritingProject: async (id, payload) => { assert.equal(id, "project-1"); patches.push(payload); return projectFrom(payload); },
      useThemeIndexAsWritingEntry: async (id, options) => { options.assertCurrent(); options.onEntryApplied(); return { indexCard: { id, title: "Theme" }, noteIds: ["n1"] }; },
      ensureNotesLoaded: async () => {}, beginWritingEntry: () => {}, suggestedWritingProjectTitle: () => "Original Title",
      normalizeWritingProjectTitleSeed: value => value, deriveWritingProjectIntent: () => "intent", deriveWritingProjectTakeaway: () => "takeaway",
      populateWritingFormFromProject: project => { for (const [field, key] of [["Title", "title"], ["Goal", "goal"], ["Audience", "audience"], ["Tone", "tone"]]) fields[`writing${field}`].value = project[key] || ""; },
      loadWritingProjectsList: async () => {}, loadWritingScaffoldVersions: async () => {}, loadWritingDraftVersions: async () => {},
      syncWritingLocalBookIdeasFromProject: () => {}, showWritingResult: () => {}, renderWritingPanel: () => {}, openWritingModule: async () => {}, setStatus: () => {},
      importState: { lastResultPayload: { stage: "confirm", result: { createdFiles: [{ noteId: "n1", noteType: "permanent" }] } } }
    };
    const runtime = origin === "theme" ? createWritingThemeProjectRuntime(deps) : createWritingProjectRuntimeController(() => deps);
    const pending = origin === "theme" ? runtime.createWritingProjectFromThemeIndex("theme-1")
      : origin === "import" ? runtime.createWritingProjectFromImportedPermanentNotes() : runtime.createWritingProjectFromCurrentBasket();
    await entered.promise;
    fields.writingTitle.value = "New title";
    fields.writingGoal.value = "New question";
    fields.writingAudience.value = "";
    fields.writingTone.value = "  New tone  ";
    waiting.resolve();
    await pending;
    assert.equal(writingState.project.title, "New title");
    assert.equal(writingState.project.goal, "New question");
    assert.equal(writingState.project.audience, "");
    assert.equal(writingState.project.tone, "New tone");
    assert.equal(fields.writingGoal.value, "New question");
    assert.equal(fields.writingTone.value, "  New tone  ");
    assert.equal(patches.length, 1);
    assert.equal(patches[0].expectedVaultPath, "original-vault");
  });
}
