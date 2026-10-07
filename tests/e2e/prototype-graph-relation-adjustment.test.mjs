import test from "node:test";
import assert from "node:assert/strict";
import { optionalPlaywright, startPrototypeStack, postJson, fetchJson, waitFor } from "./prototype-copy-test-helpers.mjs";

for (const width of [1366, 390]) {
  test(`saved graph edge adjusts the existing relation without creating a duplicate (${width}px)`, async t => {
    if (process.env.RUN_BROWSER_E2E !== "1") { t.skip("Set RUN_BROWSER_E2E=1"); return; }
    const pw = await optionalPlaywright(t);
    if (!pw) return;
    const stack = await startPrototypeStack(t, pw);
    if (!stack) return;
    const { page, apiBase } = stack;
    const create = async title => (await postJson(apiBase, "/api/v1/notes", {
      directoryId: "dir_original_default", body: `# ${title}\n\n独立观点。`
    })).json.item;
    const source = await create("调整来源"), target = await create("调整目标");
    const saved = await postJson(apiBase, `/api/v1/notes/${source.id}/relations`, {
      toNoteId: target.id, relationType: "supports", rationale: "最初的支持依据。", insightQuestion: "在哪些条件下成立？"
    });
    assert.equal(saved.status, 201);
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.setViewportSize({ width, height: 900 });
    await page.locator('.rail-btn[data-module="graph"]').click();
    await page.waitForFunction(() => window.__prototypeState.graphConnectivityReady);
    const edge = page.locator(`.graph-map-edge-group[data-edge-id="${saved.json.item.id}"]`);
    await edge.focus();
    await edge.press("Enter");
    const panel = page.locator(".graph-selection-panel");
    await panel.getByText('更多检查', { exact: true }).focus();
    await panel.getByText('更多检查', { exact: true }).press('Enter');
    await panel.locator('[data-graph-relation-adjustment="change-type"]').click();
    assert.match(await panel.textContent(), /当前处理方向/);
    await panel.locator("[data-graph-open-relation-form]").click();
    const composer = page.locator("[data-permanent-relation-workspace]");
    await composer.waitFor();
    assert.equal(await composer.locator('textarea[name="rationale"]').inputValue(), "最初的支持依据。");
    assert.equal(await composer.locator('input[name="insightQuestion"]').inputValue(), "在哪些条件下成立？");
    assert.equal(await page.evaluate(() => window.__prototypeEditor.permanentRelationWorkspaceState.editingRelationId), saved.json.item.id);
    await composer.locator('[data-permanent-relation-type-choice="qualifies"]').click();
    await composer.locator('textarea[name="rationale"]').fill("仅在明确的边界条件下成立。");
    await composer.locator('button[type="submit"]').click();
    await composer.locator(".permanent-relation-result").waitFor();
    await waitFor(async () => {
      const read = await fetchJson(apiBase, `/api/v1/notes/${source.id}/relations`);
      const matching = read.json.item.outgoingLinks.filter(item => item.toNoteId === target.id);
      assert.equal(matching.length, 1);
      assert.equal(matching[0].id, saved.json.item.id);
      assert.equal(matching[0].relationType, "qualifies");
      assert.equal(matching[0].rationale, "仅在明确的边界条件下成立。");
      assert.equal(matching[0].insightQuestion, "在哪些条件下成立？");
      assert.equal(await edge.getAttribute("data-edge-relation-type"), "qualifies");
    });
    await composer.locator('[data-permanent-relation-action="close"]').click();
    await edge.focus();
    await edge.press("Enter");
    await panel.locator("[data-graph-open-relation-form]").click();
    const deleted = await fetch(`${apiBase}/api/v1/relations/${saved.json.item.id}`, { method: "DELETE" });
    assert.ok(deleted.ok);
    await composer.locator('button[type="submit"]').click();
    await waitFor(async () => {
      assert.match(await composer.textContent(), /这条关系已不存在/);
      const read = await fetchJson(apiBase, `/api/v1/notes/${source.id}/relations`);
      assert.equal(read.json.item.outgoingLinks.filter(item => item.toNoteId === target.id).length, 0);
    });
    assert.deepEqual(errors, []);
  });
}
