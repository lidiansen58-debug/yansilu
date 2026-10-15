import test from "node:test";
import assert from "node:assert/strict";
import { createGraphGuidanceFixture, selectGraphNode, openGraphRelationComposer, closeGraphRelationComposer } from "./prototype-graph-guidance-flow-helpers.mjs";

test("a sparse graph keeps theme creation disabled until at least three related materials are available", async t => {
  const f = await createGraphGuidanceFixture(t, "sparse");
  if (!f) return;
  const { page, notes } = f;
  const panel = await selectGraphNode(page, notes[0].id);
  assert.equal(await panel.locator(".graph-relation-workspace-card").count(), 1);
  assert.match(await panel.innerText(), /至少选择 3 条相关笔记/);
  assert.equal(await panel.locator("[data-graph-create-theme-index]").isDisabled(), true);
  assert.deepEqual((await panel.locator("[data-graph-create-theme-index]").getAttribute("data-graph-theme-note-ids")).split(",").sort(), notes.slice(0, 2).map(note => note.id).sort());
  const composer = await openGraphRelationComposer(page, panel);
  await composer.locator("[data-permanent-relation-target-search]").fill(notes[2].title);
  await composer.locator(`[data-permanent-relation-manual-target="${notes[2].id}"]`).click();
  await composer.locator('textarea[name="rationale"]').fill("补充第三条材料前，先核对它与当前判断的关系。");
  await closeGraphRelationComposer(composer);
  await f.assertSourcesUnchanged(); await f.assertNoWriting();
});
