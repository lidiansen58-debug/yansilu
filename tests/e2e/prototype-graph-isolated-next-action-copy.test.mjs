import test from "node:test";
import assert from "node:assert/strict";
import { createGraphGuidanceFixture, closeGraphRelationComposer } from "./prototype-graph-guidance-flow-helpers.mjs";
import { fetchJson } from "./prototype-copy-test-helpers.mjs";

test("an isolated graph note opens relation work and cancellation does not start writing or save a relation", async t => {
  const f = await createGraphGuidanceFixture(t, "isolated");
  if (!f) return;
  const { page, notes, apiBase } = f;
  await page.locator('[data-graph-task-view="relations"]').click();
  const workbench = page.locator(".graph-workbench-panel:visible");
  await workbench.waitFor();
  assert.match(await workbench.innerText(), /暂未关联的判断/);
  await workbench.locator(`[data-graph-isolated-note="${notes[2].id}"]`).first().click();
  const composer = page.locator("[data-permanent-relation-workspace]:visible");
  await composer.waitFor();
  await composer.locator("[data-permanent-relation-target-search]").fill(notes[1].title);
  await composer.locator(`[data-permanent-relation-manual-target="${notes[1].id}"]`).click();
  assert.match(await composer.innerText(), /暂未关联的判断/);
  assert.match(await composer.innerText(), /支持判断的材料/);
  await composer.locator('[data-permanent-relation-type-choice="supports"]').click();
  await composer.locator('textarea[name="rationale"]').fill("这条独立判断能够补充已有材料，但还需要用户确认。");
  await closeGraphRelationComposer(composer);
  assert.deepEqual((await fetchJson(apiBase, `/api/v1/notes/${notes[2].id}/relations`)).json.item.outgoingLinks, []);
  await f.assertSourcesUnchanged(); await f.assertNoWriting();
});
