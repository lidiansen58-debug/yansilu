import test from "node:test";
import assert from "node:assert/strict";
import { optionalPlaywright, startPrototypeStack, postJson, fetchJson, waitFor } from "./prototype-copy-test-helpers.mjs";

test("closing a committed composer before a failed final read ends sidebar loading and allows recovery", async t => {
  if (process.env.RUN_BROWSER_E2E !== "1") { t.skip("Set RUN_BROWSER_E2E=1"); return; }
  const pw = await optionalPlaywright(t);
  if (!pw) return;
  const stack = await startPrototypeStack(t, pw);
  if (!stack) return;
  const { page, apiBase } = stack;
  const create = async title => (await postJson(apiBase, "/api/v1/notes", {
    directoryId: "dir_original_default", body: `# ${title}\n\n独立的观点。`
  })).json.item;
  const source = await create("回读失败来源"), target = await create("已提交关联目标");
  await page.locator("#btnToggleSearch").click();
  await page.locator(`[data-search-note="${source.id}"]`).click();
  await page.waitForFunction(() => window.__prototypeEditor.semanticRelationsState === "loaded");
  await page.evaluate(({ source, target }) => {
    const editor = window.__prototypeEditor;
    editor.upsertApiNotes([source, target]);
    const refresh = editor.refreshSemanticRelations;
    editor.refreshSemanticRelations = function (...args) {
      window.__reviewFinalRelationRead = true;
      return refresh.apply(this, args);
    };
    editor.openPermanentRelationWorkspace({ noteId: source.id, targetNoteId: target.id,
      relationType: "supports", rationaleDraft: "这条关联的理由已经保存。" });
  }, { source, target });
  let release, entered;
  const held = new Promise(resolve => { release = resolve; });
  const started = new Promise(resolve => { entered = resolve; });
  t.after(() => release());
  const endpoint = `**/api/v1/notes/${source.id}/relations`;
  await page.route(endpoint, async route => {
    if (route.request().method() !== "GET" || !await page.evaluate(() => window.__reviewFinalRelationRead === true)) return route.continue();
    entered(); await held;
    await route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ error: { message: "final relation read unavailable" } }) });
  });
  const workspace = page.locator("[data-permanent-relation-workspace]");
  await workspace.locator('button[type="submit"]').click();
  await started;
  await workspace.locator('[data-permanent-relation-action="close"]').click();
  release();
  await page.waitForFunction(() => window.__prototypeEditor.semanticRelationsState === "error");
  assert.equal(await workspace.count(), 0);
  assert.match(await page.locator(`[data-note-relations-section][data-note-id="${source.id}"]`).innerText(), /关系读取失败/);
  await page.unroute(endpoint);
  await page.evaluate(sourceId => {
    const editor = window.__prototypeEditor;
    return editor.refreshSemanticRelations(sourceId, editor.relationsRequestSerial);
  }, source.id);
  await page.waitForFunction(() => window.__prototypeEditor.semanticRelationsState === "loaded");
  const links = (await fetchJson(apiBase, `/api/v1/notes/${source.id}/relations`)).json.item.outgoingLinks;
  assert.equal(links.filter(link => link.toNoteId === target.id).length, 1);
  const displayed = await page.evaluate(() => window.__prototypeEditor.currentSemanticRelations.outgoingLinks);
  assert.equal(displayed.filter(link => link.toNoteId === target.id).length, 1);
});

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
