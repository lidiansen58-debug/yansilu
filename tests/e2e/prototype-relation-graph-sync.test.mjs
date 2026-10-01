import test from "node:test";
import assert from "node:assert/strict";
import { optionalPlaywright, startPrototypeStack, postJson, fetchJson, waitFor } from "./prototype-copy-test-helpers.mjs";

for (const width of [1366, 390]) {
  test(`relation create, edit and delete repaint the visible graph (${width}px)`, async t => {
    if (process.env.RUN_BROWSER_E2E !== "1") { t.skip("Set RUN_BROWSER_E2E=1"); return; }
    const pw = await optionalPlaywright(t);
    if (!pw) return;
    const stack = await startPrototypeStack(t, pw);
    if (!stack) return;
    const { page, apiBase } = stack;
    const create = async title => (await postJson(apiBase, "/api/v1/notes", {
      directoryId: "dir_original_default", body: `# ${title}\n\n独立的观点。`
    })).json.item;
    const source = await create("图谱同步来源"), target = await create("图谱同步目标");
    await page.locator("#btnToggleSearch").click();
    await page.locator(`[data-search-note="${source.id}"]`).click();
    await page.waitForFunction(() => window.__prototypeEditor.semanticRelationsState === "loaded");
    await page.locator('.rail-btn[data-module="graph"]').click();
    await page.waitForFunction(() => window.__prototypeState.graphConnectivityReady === true);
    await page.setViewportSize({ width, height: 900 });
    const open = async (editingRelationId = "") => page.evaluate(({ source, target, editingRelationId }) => {
      const editor = window.__prototypeEditor;
      editor.upsertApiNotes([source, target]);
      // A sidebar route while the graph is visible must refresh the same canvas.
      editor.openPermanentRelationWorkspace({ noteId: source.id, targetNoteId: target.id,
        editingRelationId, relationType: "supports", rationaleDraft: "目标论据支持当前观点。", returnTo: "right-sidebar" });
    }, { source, target, editingRelationId });
    const workspace = page.locator("[data-permanent-relation-workspace]");
    const edges = page.locator(`#graphCanvas [data-edge-from="${source.id}"][data-edge-to="${target.id}"]`);
    await open();
    await workspace.locator('button[type="submit"]').click();
    await workspace.locator(".permanent-relation-result").waitFor();
    await waitFor(async () => assert.equal(await edges.count(), 1));
    assert.equal(await edges.first().getAttribute("data-edge-relation-type"), "supports");
    const read = async () => (await fetchJson(apiBase, `/api/v1/notes/${source.id}/relations`)).json.item.outgoingLinks;
    const relation = (await read()).find(item => item.toNoteId === target.id);
    assert.ok(relation?.id);

    await open(relation.id);
    await workspace.locator('[data-permanent-relation-type-choice="contradicts"]').click();
    await workspace.locator('textarea[name="rationale"]').fill("目标论据与当前观点存在冲突。");
    await workspace.locator('button[type="submit"]').click();
    await workspace.locator(".permanent-relation-result").waitFor();
    await waitFor(async () => assert.equal(await edges.first().getAttribute("data-edge-relation-type"), "contradicts"));

    // The API mutation succeeds even if the subsequent graph read fails.
    await open(relation.id);
    await workspace.locator('[data-permanent-relation-type-choice="qualifies"]').click();
    await workspace.locator('textarea[name="rationale"]').fill("目标论据限定当前观点的适用范围。");
    await page.route("**/api/v1/graph?*", route => route.fulfill({ status: 503, json: { error: "graph temporarily unavailable" } }));
    await workspace.locator('button[type="submit"]').click();
    await workspace.locator(".permanent-relation-result").waitFor();
    assert.equal(await page.evaluate(() => window.__prototypeEditor.permanentRelationWorkspaceState.saveState), "saved");
    assert.equal((await read()).find(item => item.id === relation.id)?.relationType, "qualifies");
    await page.unroute("**/api/v1/graph?*");
    await page.evaluate(() => window.__prototypeEditor.refreshDirectoryGraph());
    await waitFor(async () => assert.equal(await edges.first().getAttribute("data-edge-relation-type"), "qualifies"));

    await open(relation.id);
    page.once("dialog", dialog => dialog.accept());
    await workspace.locator(`[data-relation-action="delete"][data-relation-id="${relation.id}"]`).click();
    await waitFor(async () => {
      assert.equal(await edges.count(), 0);
      assert.ok(!(await read()).some(item => item.id === relation.id));
    });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
  });
}
