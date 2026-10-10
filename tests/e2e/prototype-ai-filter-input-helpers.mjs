import assert from "node:assert/strict";
import { fetchJson } from "./prototype-copy-test-helpers.mjs";
import { openAiReviewWorkspace } from "./prototype-ai-review-flow-helpers.mjs";

export async function runAiFilterWhileRefreshing(stack, fixture) {
  const { page, apiBase } = stack;
  const noteRoute = `/api/v1/notes/${fixture.noteId}`;
  const noteBefore = (await fetchJson(apiBase, noteRoute)).json.item;
  const detailRoute = `/api/v1/ai-suggestions/${fixture.suggestionId}?canonical=true`;
  const suggestionBefore = (await fetchJson(apiBase, detailRoute)).json.item;
  await openAiReviewWorkspace(stack);
  await page.locator('#aiSuggestionStatusFilter').waitFor({ state: 'visible' });
  await page.locator('#settingsAiSuggestionsPanel .ai-inbox-list-pane .ai-inbox-item', { hasText: fixture.noteTitle }).waitFor();
  let release, arrived, completed, failed, initialUrl, handlerError, timer;
  const gate = new Promise(resolve => { release = resolve; });
  const held = new Promise((resolve, reject) => { arrived = resolve; failed = reject; });
  const handled = new Promise(resolve => { completed = resolve; });
  const listRequests = [];
  const pattern = '**/api/v1/ai-suggestions?*';
  const handler = async route => {
    listRequests.push(route.request().url());
    if (initialUrl) return route.continue();
    initialUrl = route.request().url();
    try {
      const response = await route.fetch();
      assert.equal(response.status(), 200);
      assert.ok((await response.json()).items.some(item => item.id === fixture.suggestionId));
      arrived();
      await gate;
      await route.fulfill({ response });
    } catch (error) { handlerError = error; failed(error); }
    finally { completed(); }
  };
  await page.route(pattern, handler);
  try {
    await page.locator('#btnAiSuggestionsRefresh').click();
    await Promise.race([held, new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error('AI suggestion list refresh was not observed')), 12000);
    })]);
    clearTimeout(timer);
    const select = page.locator('#aiSuggestionStatusFilter');
    assert.notEqual(await select.inputValue(), 'edited', 'initial filter must differ from the user selection');
    await select.selectOption('edited');
    assert.equal(await select.inputValue(), 'edited');
    assert.equal(listRequests.length, 1, 'choosing the filter does not issue a query');
    const initialResponse = page.waitForResponse(response => response.url() === initialUrl && response.request().method() === 'GET');
    release();
    assert.equal((await initialResponse).status(), 200);
    await page.locator('#settingsAiSuggestionsPanel .ai-inbox-list-pane .ai-inbox-item', { hasText: fixture.noteTitle }).waitFor();
    assert.equal(await select.inputValue(), 'edited', 'background list render must retain the user filter choice');
    assert.equal(listRequests.length, 1, 'refresh completion does not implicitly apply the new filter');
    const filteredResponse = page.waitForResponse(response => response.request().method() === 'GET' &&
      new URL(response.url()).pathname === '/api/v1/ai-suggestions');
    await page.locator('#btnAiSuggestionsApplyFilters').click();
    const response = await filteredResponse;
    assert.equal(response.status(), 200);
    assert.equal(new URL(response.url()).searchParams.get('status'), 'edited');
    assert.equal(listRequests.length, 2, 'Apply issues exactly one filtered query');
    const items = (await response.json()).items;
    assert.ok(items.some(item => item.id === fixture.suggestionId));
    assert.ok(items.every(item => item.status === 'edited'));
    assert.equal(await select.inputValue(), 'edited');
    assert.deepEqual((await fetchJson(apiBase, noteRoute)).json.item, noteBefore);
    assert.deepEqual((await fetchJson(apiBase, detailRoute)).json.item, suggestionBefore);
  } finally {
    release(); clearTimeout(timer);
    if (initialUrl) await handled;
    await page.unroute(pattern, handler);
    if (handlerError) throw handlerError;
  }
}
