import test from "node:test";
import assert from "node:assert/strict";
import { optionalPlaywright, startPrototypeStack, postJson, fetchJson, waitFor } from "./prototype-copy-test-helpers.mjs";

for (const width of [1366, 390]) {
test(`graph AI candidates require confirmation and late responses preserve a new node selection (${width}px)`, async t => {
  if (process.env.RUN_BROWSER_E2E !== "1") { t.skip("Set RUN_BROWSER_E2E=1"); return; }
  const pw = await optionalPlaywright(t);
  if (!pw) return;
  const stack = await startPrototypeStack(t, pw);
  if (!stack) return;
  const { page, apiBase } = stack;
  const create = async title => (await postJson(apiBase, "/api/v1/notes", {
    directoryId: "dir_original_default", body: `# ${title}\n\n独立观点。`
  })).json.item;
  const source = await create("AI 关联来源"), target = await create("AI 推荐目标"), other = await create("迟到的推荐目标");
  await page.locator('.rail-btn[data-module="graph"]').click();
  await page.waitForFunction(() => window.__prototypeState.graphConnectivityReady === true);
  await page.setViewportSize({ width, height: 900 });
  let hold = false, release, entered;
  const held = new Promise(done => { release = done; });
  const started = new Promise(done => { entered = done; });
  t.after(() => release());
  await page.route("**/api/v1/graph/ai-analysis", async route => {
    const candidateTarget = hold ? other : target;
    if (hold) { entered(); await held; }
    await route.fulfill({ status: 200, json: { item: {
      analysis: { analysisMode: "local_graph_rule", relationCandidates: [{
        sourceNoteId: source.id, targetNoteId: candidateTarget.id, relationType: "supports",
        rationale: "目标的独立论据支持当前观点。", confidence: 0.8
      }], bridgeCandidates: [] }, reviewItems: { summary: { artifactCount: 1 } }
    } } });
  });
  assert.equal(await page.evaluate(id => window.__prototypeGraph.runAiConnectForNote(id), source.id), true);
  const workspace = page.locator("[data-permanent-relation-workspace]");
  await workspace.waitFor({ state: "visible" });
  const read = async () => (await fetchJson(apiBase, `/api/v1/notes/${source.id}/relations`)).json.item.outgoingLinks;
  assert.equal((await read()).length, 0);
  assert.match(await workspace.innerText(), /AI 推荐目标/);
  assert.match(await workspace.locator('textarea[name="rationale"]').inputValue(), /独立论据/);
  await workspace.locator('button[type="submit"]').click();
  await page.waitForFunction(() => {
    const draft = window.__prototypeEditor.permanentRelationWorkspaceState;
    return draft.saveState === "saved" || draft.error;
  }, null, { timeout: 8000 }).catch(async error => {
    throw new Error(`${error.message}\n${JSON.stringify(await page.evaluate(() => ({
      draft: window.__prototypeEditor.permanentRelationWorkspaceState,
      active: window.__prototypeEditor.activeNote()?.id,
      module: window.__prototypeState.module
    })))}`);
  });
  assert.equal(await page.evaluate(() => window.__prototypeEditor.permanentRelationWorkspaceState.error), "");
  await workspace.locator(".permanent-relation-result").waitFor();
  assert.ok((await read()).some(link => link.toNoteId === target.id && link.relationType === "supports"));
  await workspace.locator('[data-permanent-relation-action="complete"]').click();
  hold = true;
  await page.evaluate(id => { window.__heldAiConnect = window.__prototypeGraph.runAiConnectForNote(id); }, source.id);
  await started;
  await page.locator(`#graphCanvas .graph-map-node[data-node-id="${target.id}"]`).click();
  await page.locator(".graph-selection-panel", { hasText: target.title }).waitFor();
  release();
  assert.equal(await page.evaluate(() => window.__heldAiConnect), false);
  await waitFor(async () => assert.equal(await workspace.count(), 0));
  assert.ok(await page.locator(".graph-selection-panel", { hasText: target.title }).isVisible());
  assert.ok(!(await read()).some(link => link.toNoteId === other.id));
});
}
