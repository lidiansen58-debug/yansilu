import test from "node:test";
import assert from "node:assert/strict";
import { optionalPlaywright, startPrototypeStack, postJson, fetchJson, waitFor } from "./prototype-copy-test-helpers.mjs";

test("closing and reopening a composer during a committed save preserves the new draft and reconciles the graph", async t => {
  if (process.env.RUN_BROWSER_E2E !== "1") { t.skip("Set RUN_BROWSER_E2E=1"); return; }
  const pw = await optionalPlaywright(t);
  if (!pw) return;
  const stack = await startPrototypeStack(t, pw);
  if (!stack) return;
  const { page, apiBase } = stack;
  const create = async title => (await postJson(apiBase, "/api/v1/notes", {
    directoryId: "dir_original_default", body: `# ${title}\n\n独立的观点。`
  })).json.item;
  const source = await create("异步关联来源"), target = await create("已保存目标"), other = await create("新草稿目标");
  await page.locator("#btnToggleSearch").click();
  await page.locator(`[data-search-note="${source.id}"]`).click();
  await page.waitForFunction(() => window.__prototypeEditor.semanticRelationsState === "loaded");
  await page.locator('.rail-btn[data-module="graph"]').click();
  await page.waitForFunction(() => window.__prototypeState.graphConnectivityReady === true);
  const workspace = page.locator("[data-permanent-relation-workspace]");
  const open = async (chosen, relationId = "", rationale = "旧草稿保存的理由。") => page.evaluate(({ source, target, other, chosen, relationId, rationale }) => {
    const editor = window.__prototypeEditor;
    editor.upsertApiNotes([source, target, other]);
    editor.openPermanentRelationWorkspace({ noteId: source.id, targetNoteId: chosen.id,
      editingRelationId: relationId, relationType: "supports", rationaleDraft: rationale, returnTo: "graph" });
  }, { source, target, other, chosen, relationId, rationale });

  let relationId = "";
  for (const method of ["POST", "PATCH"]) {
    const endpoint = method === "POST" ? `**/api/v1/notes/${source.id}/relations` : `**/api/v1/relations/${relationId}`;
    let release;
    const released = new Promise(resolve => { release = resolve; });
    let held;
    const committed = new Promise(resolve => { held = resolve; });
    t.after(() => release());
    await page.route(endpoint, async route => {
      if (route.request().method() !== method) return route.continue();
      const response = await route.fetch();
      held();
      await released;
      await route.fulfill({ response });
    });
    await open(target, relationId);
    if (method === "PATCH") await workspace.locator('[data-permanent-relation-type-choice="contradicts"]').click();
    await workspace.locator('button[type="submit"]').click();
    await committed;
    await workspace.locator('[data-permanent-relation-action="close"]').click();
    await open(other, "", "新草稿的理由必须保留。");
    const newSession = await page.evaluate(() => window.__prototypeEditor.permanentRelationWorkspaceState.relationComposerSessionId);
    release();
    const expectedType = method === "POST" ? "supports" : "contradicts";
    await waitFor(async () => {
      const edge = page.locator(`#graphCanvas [data-edge-from="${source.id}"][data-edge-to="${target.id}"]`).first();
      assert.equal(await edge.getAttribute("data-edge-relation-type"), expectedType);
      const links = (await fetchJson(apiBase, `/api/v1/notes/${source.id}/relations`)).json.item.outgoingLinks;
      const saved = links.find(item => item.toNoteId === target.id);
      assert.equal(saved.relationType, expectedType);
      relationId = saved.id;
    });
    const state = await page.evaluate(() => window.__prototypeEditor.permanentRelationWorkspaceState);
    assert.equal(state.relationComposerSessionId, newSession);
    assert.equal(state.selectedTargetNoteId, other.id);
    assert.equal(state.result, null);
    assert.equal(await workspace.locator('textarea[name="rationale"]').inputValue(), "新草稿的理由必须保留。");
    await page.unroute(endpoint);
    await workspace.locator('[data-permanent-relation-action="close"]').click();
  }
});
