import test from "node:test";
import assert from "node:assert/strict";
import { optionalPlaywright, fetchJson, startPrototypeStack, waitFor } from "./prototype-copy-test-helpers.mjs";

test("prototype empty writing entry accepts one thought without creating a project on desktop and mobile", async t => {
  if (process.env.RUN_BROWSER_E2E !== "1") { t.skip("Set RUN_BROWSER_E2E=1"); return; }
  const playwright = await optionalPlaywright(t);
  if (!playwright) return;
  const stack = await startPrototypeStack(t, playwright);
  if (!stack) return;
  const { page, apiBase } = stack;
  await page.locator('.rail-btn[data-module="writing"]').click();
  await page.locator("#writingPanel:visible").waitFor();
  await page.locator("#writingThemeIndexList").getByText("从一个问题或自己的想法开始写。", { exact: true }).waitFor();
  for (const width of [1280, 320]) {
    await page.setViewportSize({ width, height: 860 });
    if (!await page.locator("#writingThemeIndexList").isVisible()) {
      const mobilePicker = page.locator('[data-writing-topic-picker]:visible');
      if (await mobilePicker.count()) await mobilePicker.click();
      else await page.locator('[data-writing-sidebar-action="topics"]').click();
    }
    assert.match(await page.locator("#writingThemeIndexList").innerText(), /从一个问题或自己的想法开始写。/);
    await page.locator("#btnWritingSaveThemeIndex").click();
    await page.locator("#writingTitle:visible").waitFor();
    assert.equal(await page.locator('[data-text-input-field]:visible').count(), 0);
    assert.equal(await page.locator("#writingWorkbenchActive").isVisible(), true);
    assert.equal(await page.locator("#btnWritingCreateProject").isVisible(), false);
    const text = await page.locator("#writingPanel").innerText();
    assert.doesNotMatch(text, /草稿骨架|写作篮|scaffold|wp_|pn_/);
    await page.locator('#writingPanel [data-writing-related-open]').click();
    await page.locator("#writingRelatedNotesPanel:visible").waitFor();
    if (!await page.locator("#writingCandidateDetails").evaluate(details => details.open)) {
      await page.locator("#writingCandidateDetails > summary").click();
    }
    assert.equal(await page.locator('#writingCandidateList [data-writing-action="add"]').count(), 0);
    assert.match(await page.locator("#writingCandidateList").innerText(), /没有可用的永久笔记/);
    await page.locator('#writingRelatedNotesPanel [data-writing-related-close]').click();
    assert.equal(await page.locator("#writingRelatedNotesPanel").isVisible(), false);
    const size = await page.evaluate(() => ({ viewport: document.documentElement.clientWidth, content: document.documentElement.scrollWidth }));
    assert.ok(size.content <= size.viewport + 1, `Writing entry overflows at ${width}px`);
  }
  assert.deepEqual((await fetchJson(apiBase, "/api/v1/writing-projects?limit=50")).json.items, []);
});
