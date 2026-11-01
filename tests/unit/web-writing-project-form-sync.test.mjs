import test from "node:test";
import assert from "node:assert/strict";
import { createWritingProjectKeepingForm, syncWritingProjectForm } from "../../apps/web/src/writing-project-form-sync.js";
import { captureWritingProjectCreationContext } from "../../apps/web/src/writing-project-creation-context.js";

for (const firstSave of [false, true]) test(`late title response retains a completed ${firstSave ? "first binding" : "article save"}`, async () => {
  const { deps, fields, setBasket } = harness();
  const gate = deferred(), entered = deferred();
  setBasket([]);
  Object.assign(deps.writingState.project, { entry_mode: "manual", basket_note_ids: [],
    draft_note_id: firstSave ? null : "article", draft_note: firstSave ? null : { id: "article", body: "Old body", fileRevision: "old" } });
  const before = deps.writingState.project;
  fields.writingTitle.value = "Latest title";
  deps.syncWritingProject = async (id, payload) => {
    entered.resolve(); await gate.promise;
    return { ...before, ...payload, id, draft_note: firstSave ? null : { id: "article" } };
  };
  const pending = syncWritingProjectForm(deps);
  await entered.promise;
  // The independent draft controller has completed while metadata is in flight.
  deps.writingState.project = { ...before, draft_note_id: "article",
    draft_note: { id: "article", body: "New body", fileRevision: "new" } };
  gate.resolve();
  const saved = await pending;
  assert.equal(saved.draft_note_id, "article");
  assert.equal(saved.draft_note.body, "New body");
  assert.equal(saved.draft_note.fileRevision, "new");
  assert.equal(saved.title, "Latest title");
});

test("title sync retains the opened article baseline when the API returns only a summary", async () => {
  const { deps, fields, setBasket } = harness();
  setBasket([]);
  Object.assign(deps.writingState.project, { entry_mode: "manual", basket_note_ids: [], draft_note_id: "n",
    draft_note: { id: "n", body: "Original body", fileRevision: "opened-revision" } });
  fields.writingTitle.value = "Changed title";
  deps.syncWritingProject = async (id, payload) => ({ ...deps.writingState.project, ...payload, id, draft_note: { id: "n", title: "Summary only" } });
  const saved = await syncWritingProjectForm(deps);
  assert.equal(saved.title, "Changed title");
  assert.equal(saved.draft_note.body, "Original body");
  assert.equal(saved.draft_note.fileRevision, "opened-revision");
});

function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
function harness() {
  const fields = Object.fromEntries(["Title", "Goal", "Audience", "Tone"].map(field => [`writing${field}`, { value: `Old ${field}` }]));
  let vault = "first", basket = ["n1"];
  const deps = { state: { noteMoveVaultScope: {} }, writingState: { project: { id: "p1", title: "Old Title", goal: "Old Goal", audience: "Old Audience", tone: "Old Tone" }, projectOpenRevision: 1 },
    $: id => fields[id], getVaultPath: () => vault, parseWritingBasketIds: () => basket };
  return { deps, fields, setVault: value => { vault = value; }, setBasket: value => { basket = value; } };
}

test("serialized form saves include edits made during a previous save, including intentional empty fields", async () => {
  const { deps, fields } = harness(), entered = deferred(), gate = deferred(), writes = [];
  deps.syncWritingProject = async (id, payload) => {
    writes.push(payload);
    if (writes.length === 1) { entered.resolve(); await gate.promise; }
    return { ...deps.writingState.project, ...payload, id };
  };
  fields.writingGoal.value = "First new question";
  const first = syncWritingProjectForm(deps);
  await entered.promise;
  fields.writingGoal.value = "Latest question";
  fields.writingAudience.value = "";
  fields.writingTone.value = "";
  const second = syncWritingProjectForm(deps, { force: true });
  gate.resolve();
  assert.equal((await first).goal, "Latest question");
  assert.equal((await second).goal, "Latest question");
  assert.equal(writes.length, 2);
  assert.equal(writes[1].audience, "");
  assert.equal(writes[1].tone, "");
  assert.equal(writes[1].expectedVaultPath, "first");
  assert.equal(deps.writingState.projectFormSync, undefined);
});

for (const failure of ["network", "empty-title"]) {
  test(`creation ${failure} preserves the actual created project and input for a safe retry`, async () => {
    const { deps, fields } = harness(), waiting = deferred(), entered = deferred();
    deps.writingState.project = null;
    let creations = 0, writes = 0;
    deps.createWritingProject = async payload => { creations++; entered.resolve(); await waiting.promise; return { id: "created", ...payload }; };
    deps.syncWritingProject = async (id, payload) => { writes++; throw new Error("Connection unavailable"); };
    const pending = createWritingProjectKeepingForm(deps, captureWritingProjectCreationContext(deps), {
      title: "Old Title", goal: "Old Goal", audience: "Old Audience", tone: "Old Tone"
    });
    await entered.promise;
    fields.writingGoal.value = "My latest question";
    fields.writingTitle.value = failure === "empty-title" ? "" : "My latest title";
    waiting.resolve();
    await assert.rejects(pending, failure === "empty-title" ? /请填写文章题目/ : /Connection unavailable/);
    assert.equal(deps.writingState.project.id, "created");
    assert.equal(fields.writingGoal.value, "My latest question");
    assert.equal(deps.writingState.projectCreationPending, undefined);
    fields.writingTitle.value = "My latest title";
    deps.syncWritingProject = async (id, payload) => ({ ...deps.writingState.project, ...payload, id });
    assert.equal((await syncWritingProjectForm(deps)).goal, "My latest question");
    assert.equal(creations, 1);
    assert.equal(writes, failure === "empty-title" ? 0 : 1);
  });
}

for (const change of ["vault", "scope", "revision", "project", "theme", "basket"]) for (const failed of [false, true]) {
  test(`form save ignores ${failed ? "failure" : "success"} after ${change} changes`, async () => {
    const { deps, fields, setVault, setBasket } = harness(), gate = deferred(), entered = deferred();
    deps.syncWritingProject = async (id, payload) => { entered.resolve(); await gate.promise; return { id, ...payload }; };
    fields.writingGoal.value = "Old request question";
    const pending = syncWritingProjectForm(deps);
    const guarded = assert.rejects(pending, error => error.code === "WRITING_CONTEXT_CHANGED");
    await entered.promise;
    const joined = assert.rejects(syncWritingProjectForm(deps), error => error.code === "WRITING_CONTEXT_CHANGED");
    if (change === "vault") setVault("second");
    if (change === "scope") deps.state.noteMoveVaultScope = {};
    if (change === "revision") deps.writingState.projectOpenRevision++;
    if (change === "project") deps.writingState.project = { id: "p2", title: "Current project" };
    if (change === "theme") deps.writingState.selectedThemeIndexId = "other-theme";
    if (change === "basket") setBasket(["n2"]);
    const current = deps.writingState.project;
    fields.writingGoal.value = "Current context input";
    if (failed) gate.reject(new Error("Old transport failure"));
    else gate.resolve();
    await guarded;
    await joined;
    assert.equal(deps.writingState.project, current);
    assert.equal(fields.writingGoal.value, "Current context input");
    assert.equal(deps.writingState.projectFormSync, undefined);
  });
}
