import test from "node:test";
import assert from "node:assert/strict";
import { optionalPlaywright, startPrototypeStack, postJson } from "./prototype-copy-test-helpers.mjs";

test("graph relation followup cancels on note switch and opens normally after a fresh request", async t => {
  if (process.env.RUN_BROWSER_E2E !== "1") { t.skip("Set RUN_BROWSER_E2E=1"); return; }
  const pw = await optionalPlaywright(t);
  if (!pw) return;
  const stack = await startPrototypeStack(t, pw);
  if (!stack) return;
  const { page, apiBase } = stack;
  const create = async title => (await postJson(apiBase, "/api/v1/notes", {
    directoryId: "dir_original_default", body: `# ${title}\n\n独立观点。`
  })).json.item;
  const source = await create("后续来源"), target = await create("后续目标");
  const relation = (await postJson(apiBase, `/api/v1/notes/${source.id}/relations`, {
    toNoteId: target.id, relationType: "supports", rationale: "明确的支持依据。"
  })).json.item;
  let release, entered;
  const held = new Promise(done => { release = done; });
  const started = new Promise(done => { entered = done; });
  t.after(() => release());
  await page.route(`**/api/v1/notes/${source.id}/relations`, async route => {
    entered(); await held;
    const response = await route.fetch();
    await route.fulfill({ response });
  });
  const followup = () => page.evaluate(({ source, target, relation }) => {
    window.__prototypeEditor.upsertApiNotes([source, target]);
    window.__prototypeGraph.openFollowupNote(source.id, "relations-edit", {
      relationId: relation.id, targetNoteId: target.id, relationType: "supports"
    });
  }, { source, target, relation });
  await followup();
  await started;
  await page.evaluate(id => window.__prototypeGraph.openNoteById(id), target.id);
  await page.waitForFunction(id => window.__prototypeEditor.activeNote()?.id === id &&
    window.__prototypeEditor.semanticRelationsState === "loaded", target.id);
  release();
  await page.waitForTimeout(350);
  assert.equal(await page.locator("[data-permanent-relation-workspace]").count(), 0);
  assert.equal(await page.evaluate(() => window.__prototypeEditor.activeNote()?.id), target.id);
  await page.unroute(`**/api/v1/notes/${source.id}/relations`);
  await followup();
  await page.locator("[data-permanent-relation-workspace]").waitFor();
  assert.equal(await page.evaluate(() => window.__prototypeEditor.permanentRelationWorkspaceState.editingRelationId), relation.id);
  assert.equal(await page.locator("[data-permanent-relation-workspace]").getAttribute("data-note-id"), source.id);
});
