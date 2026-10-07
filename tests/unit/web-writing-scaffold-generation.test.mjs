import test from "node:test";
import assert from "node:assert/strict";
import { runWritingScaffoldGeneration, captureWritingScaffoldContext } from "../../apps/web/src/writing-scaffold-generation.js";
import { handleWritingCreateScaffoldClick } from "../../apps/web/src/writing-panel-events.js";

for (const failed of [false, true]) {
  test(`scaffold generation rejects overlapping actions and clears pending after ${failed ? "failure" : "success"}`, async () => {
    const writingState = {};
    let release;
    const gate = new Promise(resolve => { release = resolve; });
    let calls = 0, renders = 0;
    const deps = { writingState, renderWritingPanel: () => { renders++; assert.equal(writingState.scaffoldGenerationPending, false); } };
    const action = async () => { calls++; await gate; if (failed) throw new Error("unavailable"); return "saved"; };
    const first = runWritingScaffoldGeneration(deps, action);
    assert.equal(writingState.scaffoldGenerationPending, true);
    assert.equal(await runWritingScaffoldGeneration(deps, action), null);
    assert.equal(calls, 1);
    release();
    if (failed) await assert.rejects(first, /unavailable/);
    else assert.equal(await first, "saved");
    assert.equal(writingState.scaffoldGenerationPending, false);
    assert.equal(renders, 1);
    assert.equal(await runWritingScaffoldGeneration(deps, () => "retry"), "retry");
  });
}

for (const failed of [false, true]) for (const change of ["project", "revision", "vault", "scope"]) {
  test(`late scaffold ${failed ? "failure" : "success"} leaves the changed ${change} workspace intact`, async () => {
    const writingState = { project: { id: "p1" }, projectOpenRevision: 1 };
    const state = { noteMoveVaultScope: 1 };
    let vault = "first-vault", release;
    const gate = new Promise(resolve => { release = resolve; });
    const mutations = [];
    const pending = handleWritingCreateScaffoldClick({ writingState, state, getVaultPath: () => vault,
      createDraftScaffold: async (id, _note, options) => {
        assert.equal(id, "p1"); assert.equal(options.expectedVaultPath, "first-vault");
        await gate;
        if (failed) throw new Error("old-context failure");
        return { item: { id: "old-scaffold", sections: [] }, export: { markdown: "old outline" } };
      }, showWritingResult: result => mutations.push(result), applyWritingTab: tab => mutations.push(tab),
      setStatus: message => mutations.push(message) });
    if (change === "project") writingState.project = { id: "p2" };
    if (change === "revision") writingState.projectOpenRevision++;
    if (change === "vault") vault = "second-vault";
    if (change === "scope") state.noteMoveVaultScope++;
    const current = { id: "current-scaffold" };
    writingState.scaffold = current;
    writingState.scaffoldMarkdown = "current outline";
    release(); await pending;
    assert.equal(writingState.scaffold, current);
    assert.equal(writingState.scaffoldMarkdown, "current outline");
    assert.deepEqual(mutations, []);
    assert.equal(writingState.scaffoldGenerationPending, false);
  });
}

for (const change of ["project", "revision", "vault", "scope"]) {
  test(`scaffold results cannot follow a changed ${change}`, () => {
    const writingState = { project: { id: "p1" }, projectOpenRevision: 1 };
    const state = { noteMoveVaultScope: 1 };
    let vault = "first-vault";
    const current = captureWritingScaffoldContext({ writingState, state, getVaultPath: () => vault }, "p1");
    assert.equal(current(), true);
    if (change === "project") writingState.project = { id: "p2" };
    if (change === "revision") writingState.projectOpenRevision++;
    if (change === "vault") vault = "second-vault";
    if (change === "scope") state.noteMoveVaultScope++;
    assert.equal(current(), false);
  });
}

for (const result of ["cancelled", "late-project", "vault-failure", "context-failure"]) {
  test(`scaffold preparation stops after ${result} without generating or reporting stale feedback`, async () => {
    let release, vault = "original", generations = 0;
    const waiting = new Promise(resolve => { release = resolve; });
    const state = { noteMoveVaultScope: {} }, writingState = { selectedThemeIndexId: "theme" };
    const statuses = [];
    const pending = handleWritingCreateScaffoldClick({ state, writingState, getVaultPath: () => vault,
      createWritingProjectFromThemeIndex: async () => {
        await waiting;
        if (result === "cancelled") return null;
        if (result.endsWith("failure")) throw Object.assign(new Error("Old failure"), {
          code: result === "context-failure" ? "WRITING_CONTEXT_CHANGED" : "NETWORK_ERROR"
        });
        return { id: "old-project" };
      }, createDraftScaffold: async () => { generations++; return {}; }, setStatus: text => statuses.push(text) });
    if (result === "vault-failure") vault = "other";
    if (result === "late-project") writingState.project = { id: "user-project" };
    release(); await pending;
    assert.equal(generations, 0);
    assert.deepEqual(statuses, []);
    assert.equal(writingState.scaffoldGenerationPending, false);
  });
}
