import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { optionalPlaywright, startPrototypeStack, postJson, fetchJson, waitFor } from "./prototype-copy-test-helpers.mjs";
import { captureWritingSources } from "./prototype-writing-topic-repair-flow-helpers.mjs";
import { createWritingScopeDirectory, createWritingScopeNote, openWritingScopeCandidates, visibleWritingCandidateIds } from "./prototype-writing-scope-flow-helpers.mjs";

test("a real graph theme carries only the three confirmed materials into writing and preserves its candidate scope", async t => {
  if (process.env.RUN_BROWSER_E2E !== "1") { t.skip("Set RUN_BROWSER_E2E=1"); return; }
  const pw = await optionalPlaywright(t);
  if (!pw) return;
  const stack = await startPrototypeStack(t, pw);
  if (!stack) return;
  const { page, apiBase, webBase } = stack;
  const directory = await createWritingScopeDirectory(stack, "图谱材料范围", "graph-writing-scope");
  const notes = [];
  for (const title of ["图谱中的判断", "支持依据甲", "支持依据乙", "筛选范围外的材料"]) notes.push(await createWritingScopeNote(stack, directory.id, title));
  for (const [index, target] of notes.slice(1).entries()) assert.equal((await postJson(apiBase, `/api/v1/notes/${notes[index < 2 ? 0 : 1].id}/relations`, {
    toNoteId: target.id, relationType: index < 2 ? "supports" : "qualifies", rationale: "通过明确的材料依据核对判断的成立条件。"
  })).status, 201);
  const wanted = notes.slice(0, 3).map(note => note.id).sort();
  const assertSourcesUnchanged = await captureWritingSources(stack, notes);
  let aiExecutions = 0;
  page.on("request", req => { if (req.method() === "POST" && new URL(req.url()).pathname === "/api/v1/writing/ai-analysis") aiExecutions++; });
  await page.goto(`${webBase}/prototype`, { waitUntil: "networkidle" });
  await page.locator('.rail-btn[data-action="quick-original"]').click();
  await page.locator(`.explorer-item[data-kind="folder"][data-id="${directory.id}"]`).click();
  await page.locator('.rail-btn[data-module="graph"]').click();
  await page.locator("#graphRelationTypeFilter:visible").selectOption("supports");
  await waitFor(async () => assert.deepEqual((await page.locator(".graph-map-node[data-node-id]").evaluateAll(nodes => nodes.map(node => node.getAttribute("data-node-id")))).sort(), notes.map(note => note.id).sort()));
  const node = page.locator(`.graph-map-node[data-node-id="${notes[0].id}"]`);
  await node.focus(); await node.press("Enter");
  const create = page.locator(".graph-selection-panel [data-graph-create-theme-index]");
  assert.deepEqual((await create.getAttribute("data-graph-theme-note-ids")).split(",").sort(), wanted);
  await create.click();
  const form = page.locator("[data-graph-theme-confirmation-form]");
  await form.waitFor({ state: "visible" });
  assert.deepEqual((await form.locator('input[name="noteId"]').evaluateAll(inputs => inputs.map(input => input.value))).sort(), wanted);
  const question = "哪些支持依据能够帮助核对自己的判断？";
  await page.locator("#graphThemeQuestion").fill(question);
  await form.getByRole("button", { name: "确认主题并继续", exact: true }).click();
  await page.locator("#writingTitle:visible").waitFor();
  const themes = (await fetchJson(apiBase, "/api/v1/index-cards?limit=50")).json.items;
  assert.equal(themes.length, 1);
  const theme = (await fetchJson(apiBase, `/api/v1/index-cards/${themes[0].id}`)).json.item;
  assert.deepEqual(theme.items.map(item => item.note_id).sort(), wanted);
  assert.equal(theme.central_question, question);
  await openWritingScopeCandidates(page);
  await waitFor(async () => assert.deepEqual(await visibleWritingCandidateIds(page), wanted));
  const screenshotDir = process.env.WRITING_SCOPE_SCREENSHOT_DIR;
  if (screenshotDir) {
    await fs.mkdir(screenshotDir, { recursive: true });
    await page.screenshot({ path: path.join(screenshotDir, "confirmed-scope-desktop.png"), fullPage: true });
  }
  const desktopViewport = page.viewportSize();
  for (const width of [320, 390, 768, desktopViewport.width]) {
    await page.setViewportSize({ width, height: 844 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true);
    assert.deepEqual(await visibleWritingCandidateIds(page), wanted);
    const drawerVisibility = await page.locator("#writingRelatedNotesPanel").evaluate(panel => {
      const bounds = panel.getBoundingClientRect();
      const hit = document.elementFromPoint(bounds.left + 16, bounds.top + 28);
      return { unobscured: panel.contains(hit), left: bounds.left, right: bounds.right, hit: hit?.className };
    });
    assert.equal(drawerVisibility.unobscured, true, `${width}px: ${JSON.stringify(drawerVisibility)}`);
    assert.ok(drawerVisibility.left >= 0 && drawerVisibility.right <= width + 1);
    const close = page.getByRole("button", { name: "关闭相关笔记", exact: true });
    const bounds = await close.boundingBox();
    assert.ok(bounds && bounds.width >= 44 && bounds.height >= 44 && bounds.x >= 0 && bounds.x + bounds.width <= width + 1, `${width}px: ${JSON.stringify(bounds)}`);
    assert.equal(await page.locator("#writingRelatedOverlay").evaluate(overlay => overlay.contains(document.elementFromPoint(16, 120))), true);
    if (screenshotDir) await page.screenshot({ path: path.join(screenshotDir, `confirmed-scope-${width}px.png`), fullPage: true });
  }
  await page.setViewportSize(desktopViewport);
  await page.getByRole("button", { name: "关闭相关笔记", exact: true }).focus();
  await page.keyboard.press("Enter");
  await page.locator("#writingRelatedNotesPanel").waitFor({ state: "hidden" });
  await openWritingScopeCandidates(page);
  assert.deepEqual(await visibleWritingCandidateIds(page), wanted);
  assert.equal(await page.locator(`#writingCandidateList article[data-writing-note-id="${notes[3].id}"]`).count(), 0);
  assert.deepEqual((await page.locator("#writingBasketList article[data-writing-note-id]").evaluateAll(cards => cards.map(card => card.getAttribute("data-writing-note-id")))).sort(), wanted);
  assert.deepEqual((await fetchJson(apiBase, "/api/v1/writing-projects?limit=50")).json.items, []);
  await page.locator("#writingRelatedNotesPanel [data-writing-related-close]").click();
  await page.locator("#btnWritingCreateScaffold").click();
  await page.locator("#writingScaffoldPanel:visible").waitFor();
  const projects = (await fetchJson(apiBase, "/api/v1/writing-projects?limit=50")).json.items;
  assert.equal(projects.length, 1); assert.deepEqual([...projects[0].basket_note_ids].sort(), wanted);
  await assertSourcesUnchanged(); assert.equal(aiExecutions, 0);
});
