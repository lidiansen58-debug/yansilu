import test from "node:test";
import assert from "node:assert/strict";
import { createWritingEntryRuntimeController } from "../../apps/web/src/writing-entry-runtime-controller.js";
import { persistWritingProjectForm } from "../../apps/web/src/writing-panel-events.js";
import { renderWritingScaffoldPreviewDom } from "../../apps/web/src/writing-scaffold-preview-panel.js";

const deferred = () => {
  let resolve;
  return { promise: new Promise(done => { resolve = done; }), resolve: value => resolve(value) };
};

for (const nextTab of ["outline", "draft"]) {
  test(`late writing entry preserves the newer ${nextTab} tab and generated project`, async () => {
    const gate = deferred(), started = deferred();
    const oldProject = { id: "p1", title: "Theme", scaffold_id: null };
    const writingState = { project: oldProject, projectFilters: {} };
    let tab = "theme";
    const controller = createWritingEntryRuntimeController(() => ({
      writingState, state: { module: "writing" },
      fetchWritingProject: async () => { started.resolve(); await gate.promise; return oldProject; },
      applyWritingTab: value => { tab = value; }
    }));
    const pending = controller.openWritingModule({ activeTab: "theme", statusMessage: "" });
    await started.promise;
    const generated = { ...oldProject, scaffold_id: "new-outline" };
    writingState.project = generated;
    tab = nextTab;
    gate.resolve();
    await pending;
    assert.equal(tab, nextTab);
    assert.equal(writingState.project, generated);
    assert.equal(writingState.loadingProjects, false);
  });
}

function formHarness() {
  const writingState = { project: { id: "p1", title: "Theme", goal: "Question", basket_note_ids: ["n1"] } };
  const fields = { writingTitle: { value: "Theme" }, writingGoal: { value: "Question" } };
  const writes = [], renders = [], statuses = [];
  let basket = ["n1"];
  const deps = { writingState, $: id => fields[id], parseWritingBasketIds: () => basket,
    syncWritingProject: async (id, payload) => {
      writes.push(payload);
      return { ...writingState.project, ...payload, basket_note_ids: payload.basketNoteIds, id };
    }, renderWritingPanel: () => renders.push(true), setStatus: message => statuses.push(message) };
  return { deps, fields, writes, renders, statuses, setBasket: value => { basket = value; } };
}

test("blur after a completed form save does not send another PATCH or rerender", async () => {
  const h = formHarness();
  await persistWritingProjectForm(h.deps);
  assert.equal(h.writes.length, 0);
  assert.equal(h.renders.length, 0);
  assert.equal(h.statuses.length, 0);
  h.fields.writingGoal.value = "Latest question";
  await persistWritingProjectForm(h.deps);
  await persistWritingProjectForm(h.deps);
  assert.equal(h.writes.length, 1);
  assert.equal(h.renders.length, 1);
  assert.equal(h.deps.writingState.project.goal, "Latest question");
});

test("a material-only change is still persisted without forcing unchanged form saves", async () => {
  const h = formHarness();
  h.setBasket(["n1", "n2"]);
  await persistWritingProjectForm(h.deps);
  assert.equal(h.writes.length, 1);
  assert.deepEqual(h.writes[0].basketNoteIds, ["n1", "n2"]);
});

test("history refresh keeps existing outline controls, focus, and unfinished typing", () => {
  let writes = 0, html = "";
  const heading = { dataset: { writingOutlineField: "heading", writingOutlineIndex: "0" }, value: "First" };
  const purpose = { dataset: { writingOutlineField: "purpose", writingOutlineIndex: "0" }, value: "Explain" };
  const root = { ownerDocument: { activeElement: heading },
    get innerHTML() { return html; }, set innerHTML(value) { writes++; html = value; },
    querySelectorAll: () => [heading, purpose] };
  const writingState = { project: { id: "p1" }, scaffold: { id: "s1", sections: [{ heading: "First", purpose: "Explain" }] } };
  const deps = { $: () => root, writingState, escapeHtml: String };
  renderWritingScaffoldPreviewDom(deps);
  heading.value = " First draft ";
  writingState.scaffold.sections[0].heading = heading.value;
  renderWritingScaffoldPreviewDom(deps);
  assert.equal(writes, 1);
  assert.equal(heading.value, " First draft ");
  assert.equal(root.ownerDocument.activeElement, heading);
  writingState.scaffold.sections[0].purpose = "Updated explanation";
  renderWritingScaffoldPreviewDom(deps);
  assert.equal(writes, 1);
  assert.equal(purpose.value, "Updated explanation");
  writingState.scaffold.sections.push({ heading: "Second", purpose: "More" });
  renderWritingScaffoldPreviewDom(deps);
  assert.equal(writes, 2, "A structural edit must render the added section");
  writingState.project = { id: "p2" };
  renderWritingScaffoldPreviewDom(deps);
  assert.equal(writes, 3, "A different project must replace the old outline");
});
