import test from "node:test";
import assert from "node:assert/strict";
import { optionalPlaywright, startPrototypeStack, postJson, fetchJson, waitFor } from "./prototype-copy-test-helpers.mjs";

for (const width of [1366, 390]) {
test(`editing and deleting a chosen incoming relation preserves the other edge and survives a failed save (${width}px)`, async t => {
  if (process.env.RUN_BROWSER_E2E !== "1") { t.skip("Set RUN_BROWSER_E2E=1"); return; }
  const pw = await optionalPlaywright(t);
  if (!pw) return;
  const stack = await startPrototypeStack(t, pw);
  if (!stack) return;
  const { page, apiBase } = stack;
  const create = async title => (await postJson(apiBase, "/api/v1/notes", { directoryId: "dir_original_default", body: `# ${title}\n\n独立的观点。` })).json.item;
  const first = await create("关系甲"), second = await create("关系乙");
  const outgoing = (await postJson(apiBase, `/api/v1/notes/${first.id}/relations`, { toNoteId: second.id, relationType: "supports", rationale: "保留这条出向支持关系。" })).json.item;
  const incoming = (await postJson(apiBase, `/api/v1/notes/${second.id}/relations`, { toNoteId: first.id, relationType: "qualifies", rationale: "要编辑的入向限定关系。", status: "draft" })).json.item;
  const open = async () => {
    await page.locator("#btnToggleSearch").click();
    await page.locator(`[data-search-note="${first.id}"]`).click();
    if (!(await page.locator("#relatedPanel").isVisible())) await page.locator("#btnShowRelated").click();
    await page.locator('#relatedPanel [data-permanent-workspace-tab="relations"]:visible').click();
  };
  const edit = () => page.locator(`[data-relation-action="open-edit"][data-relation-id="${incoming.id}"]:visible`).first().click();
  await open();
  await page.setViewportSize({ width, height: 900 });
  await edit();
  const workspace = page.locator("[data-permanent-relation-workspace]");
  await workspace.waitFor({ state: "visible" });
  assert.equal(await workspace.locator('[data-relation-action="delete"]').getAttribute("data-relation-id"), incoming.id);
  await workspace.locator('[data-permanent-relation-type-choice="contradicts"]').click();
  await workspace.locator('textarea[name="rationale"]').fill("更新后的理由只应修改选中的入向关系。");
  const endpoint = `**/api/v1/relations/${incoming.id}`;
  await page.route(endpoint, route => route.request().method() === "PATCH" ? route.fulfill({ status: 200, json: { item: null } }) : route.continue());
  await workspace.locator('button[type="submit"]').click();
  await page.waitForFunction(() => window.__prototypeEditor.permanentRelationWorkspaceState.saveState === "error");
  await workspace.locator(".semantic-relation-form-error").waitFor();
  await workspace.locator('button[type="submit"]').scrollIntoViewIfNeeded();
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
  await page.screenshot({path: `output/note-editor-validation/relation-error-${width}.png`, fullPage:true});
  assert.equal(await workspace.locator('textarea[name="rationale"]').inputValue(), "更新后的理由只应修改选中的入向关系。");
  assert.equal(await page.locator(".permanent-relation-result").count(), 0);
  await page.unroute(endpoint);
  await workspace.locator('button[type="submit"]').click();
  await page.locator(".permanent-relation-result").waitFor();
  const read = async () => (await fetchJson(apiBase, `/api/v1/notes/${first.id}/relations`)).json.item;
  await waitFor(async () => {
    const links = await read();
    const retained = links.outgoingLinks.find(link => link.id === outgoing.id);
    const edited = links.backlinks.find(link => link.id === incoming.id);
    assert.equal(retained.relationType, "supports");
    assert.equal(retained.rationale, "保留这条出向支持关系。");
    assert.equal(edited.relationType, "contradicts");
    assert.equal(edited.status, "draft");
    assert.equal(edited.fromNoteId, second.id);
    assert.match(edited.rationale, /更新后的理由/);
  });
  await page.setViewportSize({ width: 1366, height: 900 });
  await page.reload({ waitUntil: "networkidle" });
  await open();
  await page.setViewportSize({ width, height: 900 });
  await edit();
  page.once("dialog", dialog => dialog.accept());
  await page.locator(`[data-permanent-relation-workspace] [data-relation-action="delete"][data-relation-id="${incoming.id}"]`).click();
  await waitFor(async () => {
    const links = await read();
    assert.ok(links.outgoingLinks.some(link => link.id === outgoing.id));
    assert.ok(!links.backlinks.some(link => link.id === incoming.id));
  });
});
}
