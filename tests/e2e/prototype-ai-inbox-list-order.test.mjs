import test from 'node:test';
import assert from 'node:assert/strict';
import {optionalPlaywright,startPrototypeStack,postJson,waitFor} from './prototype-copy-test-helpers.mjs';

test('an older inbox list response cannot hide actions for a newly selected filtered suggestion', async t => {
  if (process.env.RUN_BROWSER_E2E !== '1') { t.skip('Set RUN_BROWSER_E2E=1'); return; }
  const pw = await optionalPlaywright(t); if (!pw) return;
  const stack = await startPrototypeStack(t,pw); if (!stack) return;
  const {page,apiBase} = stack;
  let releaseOld, capturedOld, heldUrl = '', firstList = true;
  const oldGate = new Promise(resolve => { releaseOld = resolve; });
  const captured = new Promise(resolve => { capturedOld = resolve; });
  t.after(() => releaseOld());
  await page.route(/\/api\/v1\/ai\/inbox(?:\?|$)/, async route => {
    if (route.request().method() !== 'GET' || !firstList) return route.continue();
    firstList = false;
    heldUrl = route.request().url();
    const response = await route.fetch();
    capturedOld();
    await oldGate;
    await route.fulfill({response});
  });
  const rail = page.locator('.rail-btn[data-module="aiInbox"]');
  if (await rail.count()) await rail.click();
  else {
    await page.locator('#systemMessagesButton').click();
    await page.locator('#btnSystemMessageOpenAiInbox').click();
  }
  await captured;
  const created = await postJson(apiBase,'/api/v1/notes',{
    directoryId:'dir_original_default',noteType:'permanent',title:'新筛选的关联建议',
    body:'# 新筛选的关联建议\n\n较慢的旧列表不能覆盖我刚选择的笔记建议。'
  });
  assert.equal(created.status,201);
  const noteId = created.json.item.id;
  const analysis = await postJson(apiBase,`/api/v1/notes/${noteId}/ai-analysis`,{});
  assert.equal(analysis.status,200);
  const suggestionId = analysis.json.item.reviewItems.storedSuggestionIds[0];
  const artifact = analysis.json.item.reviewItems.artifacts.find(item => item.type === 'InsightCard' &&
    (item.payload?.fieldSuggestionId === suggestionId || item.payload?.fieldSuggestion?.id === suggestionId));
  assert.ok(artifact);assert.ok(suggestionId);
  await page.locator('#aiInboxSourceNoteFilter').fill(noteId);
  await page.locator('#btnAiInboxApplyFilters').click();
  await page.locator(`#aiInboxPanel .ai-inbox-list-pane [data-ai-inbox-artifact-id="${artifact.id}"]`).click();
  const reject = page.locator(`#aiInboxPanel .ai-inbox-detail-pane [data-ai-inbox-suggestion-status="rejected"][data-ai-inbox-suggestion-id="${suggestionId}"]`);
  await reject.waitFor({state:'visible'});
  const completed = page.waitForResponse(response => response.url() === heldUrl);
  releaseOld();
  await (await completed).finished();
  await page.waitForLoadState('networkidle');
  assert.equal(await reject.isVisible(),true,'The selected suggestion actions must survive the older list response');
  assert.equal(await page.locator('#aiInboxSourceNoteFilter').inputValue(),noteId);
  await reject.click();
  await waitFor(async () => {
    const response = await fetch(`${apiBase}/api/v1/ai-suggestions/${suggestionId}?canonical=true`);
    assert.equal(response.status,200);
    assert.equal((await response.json()).item.status,'rejected');
  });
});
