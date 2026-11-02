import test from "node:test";
import assert from "node:assert/strict";
import { seedSmartNotesProductThinking } from "../../scripts/seed-smart-notes-product-thinking.mjs";
import { fetchJson, optionalPlaywright, postJson, startPrototypeStack } from "./prototype-copy-test-helpers.mjs";

for (const width of [1366, 390]) {
  test(`theme relation filtering preserves visible details and clears filtered relations at ${width}px`, { timeout: 60000 }, async t => {
    if (process.env.RUN_BROWSER_E2E !== "1") { t.skip("Set RUN_BROWSER_E2E=1"); return; }
    const pw = await optionalPlaywright(t); if (!pw) return;
    const stack = await startPrototypeStack(t, pw, {
      prepareVault: vault => seedSmartNotesProductThinking(vault),
      beforeNavigate: page => page.setViewportSize({ width, height: 900 })
    });
    if (!stack) return;
    const { page, apiBase, webBase } = stack;
    const source = "PERM-THEME-INDEX-IS-ENTRY", target = "PERM-WRITING-CENTER-FROM-CONFIRMED-NOTES";
    const created = await postJson(apiBase, `/api/v1/notes/${source}/relations`, {
      toNoteId: target, relationType: "belongs_to_topic", rationale: "这条笔记是这个写作问题的相关材料。"
    });
    assert.equal(created.status, 201, JSON.stringify(created.json));
    const graph = (await fetchJson(apiBase, "/api/v1/graph?scope=directory&directoryId=dir_original_default&includeDescendants=true")).json.item;
    const topic = graph.edges.find(edge => edge.fromNoteId === source && edge.toNoteId === target && edge.relationType === "belongs_to_topic");
    const support = graph.edges.find(edge => edge.relationType === "supports");
    assert.ok(topic?.id); assert.ok(support?.id);
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.goto(`${webBase}/prototype`, { waitUntil: "networkidle" });
    await page.locator('.rail-btn[data-module="graph"]').click();
    await page.waitForFunction(() => window.__prototypeState.graphConnectivityReady);
    const filter = page.locator("#graphRelationTypeFilter");
    assert.match(await filter.locator('option[value="index"]').innerText(), /主题关系/);

    const note = page.locator(`.graph-map-node[data-node-id="${source}"]`);
    await note.focus(); await note.press("Enter");
    await page.locator(".graph-selection-panel.is-node:visible").waitFor();
    await filter.selectOption("index");
    assert.equal(await page.locator(`.graph-map-node.is-selected[data-node-id="${source}"]`).count(), 1);
    assert.equal(await page.locator(".graph-selection-panel.is-node:visible").count(), 1);
    assert.equal(await page.locator(".graph-workbench-panel:visible").count(), 0, "Read one detail at a time");
    await page.locator("[data-graph-selection-close]").click();
    assert.equal(await page.locator(".graph-selection-panel:visible").count(), 0);
    await page.locator('[data-graph-task-view="themes"]').click();
    assert.equal(await page.locator(".graph-workbench-panel:visible").count(), 1, "The theme task still opens its materials");

    for (const edge of [topic, support]) {
      await page.locator('[data-graph-task-view="structure"]').click();
      const relation = page.locator(`.graph-map-edge-group[data-edge-id="${edge.id}"]`);
      await relation.focus(); await relation.press("Enter");
      await page.locator(".graph-selection-panel.is-edge:visible").waitFor();
      await filter.selectOption("index");
      const visible = edge === topic;
      assert.equal(await page.locator(".graph-selection-panel.is-edge:visible").count(), Number(visible));
      assert.equal(await page.locator(`.graph-map-edge-group.is-selected[data-edge-id="${edge.id}"]`).count(), Number(visible));
      assert.equal(await page.locator(".graph-workbench-panel:visible").count(), Number(!visible));
    }
    assert.deepEqual(errors, []);
  });
}
