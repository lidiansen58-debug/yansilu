import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { optionalPlaywright, startPrototypeStack, fetchJson, waitFor } from "./prototype-copy-test-helpers.mjs";

test("current six-step short practice saves three human judgments, a relation, a draft and an exported article", async t => {
  if (process.env.RUN_BROWSER_E2E !== "1") { t.skip("Set RUN_BROWSER_E2E=1"); return; }
  const pw = await optionalPlaywright(t);
  if (!pw) return;
  const stack = await startPrototypeStack(t, pw);
  if (!stack) return;
  const { page, apiBase, webBase } = stack;
  await page.goto(`${webBase}/prototype?demo=smart-notes-product-thinking`, { waitUntil: 'networkidle' });
  const startStep = async key => {
    if (!(await page.locator('[data-smart-notes-demo-guide]').isVisible())) await page.locator('[data-action="quick-original"]').click();
    await page.locator(`[data-smart-notes-demo-guide] [data-sidebar-flow-step-key="${key}"]`).click();
    await page.waitForFunction(key => Boolean(window.__prototypeState.smartNotesDemoPendingSteps?.[key]), key);
  };
  const completed = key => waitFor(async () => assert.ok(await page.evaluate(key => window.__prototypeState.smartNotesDemoCompletedSteps.includes(key), key)));
  for (const [key, id, thesis] of [
    ['practice-explain', 'PERM-PRACTICE-EXPLAIN', '用自己的话解释材料，可以发现尚未理解的地方。'],
    ['practice-reuse', 'PERM-PRACTICE-REUSE', '留下带理由和适用条件的判断，比只复制资料更有助于复用。'],
    ['practice-write', 'PERM-PRACTICE-WRITE', '阅读中的判断需要经过组织和解释，才能帮助写作。']
  ]) {
    await startStep(key);
    await page.locator('[data-note-distillation-form]:visible').waitFor();
    await page.locator('textarea[name="thesis"]').fill(thesis);
    if (await page.locator('textarea[name="thesisChangeReason"]').isVisible()) await page.locator('textarea[name="thesisChangeReason"]').fill('根据示例材料，用自己的话重新表达判断。');
    if (!await page.locator('.viewpoint-optional-details').evaluate(el => el.open)) await page.locator('.viewpoint-optional-details > summary').click();
    await page.locator('textarea[name="summary1"]').fill(thesis);
    await page.locator('textarea[name="summary2"]').fill('亲自解释和核对材料，能让理解中的缺口暴露出来。');
    await page.locator('textarea[name="summary3"]').fill('可用于讨论阅读如何形成写作素材。');
    await page.locator('textarea[name="boundaryOrCounterpoint"]').fill('仍需检查具体材料和初学者的适用条件。');
    await page.locator('[data-note-distillation-form] button[type="submit"]').click();
    await completed(key);
    assert.equal((await fetchJson(apiBase, `/api/v1/notes/${id}`)).json.item.thesis, thesis);
  }
  await startStep('practice-relation');
  const workspace = page.locator('[data-permanent-relation-workspace]');
  await workspace.waitFor({ state: 'visible' });
  await workspace.locator('[data-permanent-relation-target-search]').fill('怎样留下可复用');
  await workspace.locator('[data-permanent-relation-manual-target="PERM-PRACTICE-REUSE"]').click();
  await workspace.locator('[data-permanent-relation-type-choice="supports"]').click();
  await workspace.locator('textarea[name="rationale"]').fill('解释材料形成自己的判断，使笔记保留可复用的理由和条件。');
  await workspace.locator('button[type="submit"]').click();
  await completed('practice-relation');
  await workspace.locator('[data-permanent-relation-action="complete"]').click();
  await startStep('practice-draft');
  await page.locator('#writingScaffoldPanel:visible').waitFor();
  await page.locator('#btnWritingStartDraft').click();
  const body = '# 阅读如何帮助写作\n\n亲自解释能检验理解。把理由和边界留在判断里，再组织这些观点，才能形成可复用的正文。';
  await page.locator('#writingDraftEditor:visible').fill(body);
  await page.locator('#btnWritingSaveDraft').click();
  await completed('practice-draft');
  await startStep('practice-export');
  await page.locator('#writingDraftEditor:visible').waitFor();
  const out = await fs.mkdtemp(path.join(os.tmpdir(), 'yansilu-beta-short-export-'));
  await page.locator('#writingMoreMenu > summary').click();
  const response = page.waitForResponse(r => r.url().endsWith('/api/v1/exports/article'));
  await page.locator('#btnWritingExportArticle').click();
  await page.locator('[data-text-input-field]:visible').fill(out);
  await page.locator('[data-text-input-confirm]:visible').click();
  const result = await (await response).json();
  assert.equal(result.status, 'completed');
  assert.match(await fs.readFile(result.articlePath, 'utf8'), /亲自解释能检验理解/);
  await completed('practice-export');
  await page.reload({ waitUntil: 'networkidle' });
  await page.locator('[data-action="quick-original"]').click();
  assert.equal(await page.evaluate(() => window.__prototypeState.smartNotesDemoCompletedSteps.length), 6);
  assert.match(await page.locator('[data-smart-notes-demo-guide]').innerText(), /已完成/);
});
