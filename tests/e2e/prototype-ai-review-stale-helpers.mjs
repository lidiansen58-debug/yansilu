import assert from 'node:assert/strict';
import { waitFor } from './prototype-copy-test-helpers.mjs';
import { openAiReviewWorkspace, filterAiReviewStatus, openAiReview, readAiReview } from './prototype-ai-review-flow-helpers.mjs';
import { noteSnapshot, reviewRow, reviewModal } from './prototype-ai-review-continuity-helpers.mjs';

export async function runAiStaleReview(stack, slow, fast) {
  const { page, apiBase } = stack;
  const originalSlow = await readAiReview(apiBase, slow);
  const originalNotes = await Promise.all([slow, fast].map(f => noteSnapshot(apiBase, f)));
  await openAiReviewWorkspace(stack, { settleSettings: true });
  await filterAiReviewStatus(page, 'adopted_as_draft');
  let releaseSlow, releaseEdit, arrivedSlow, arrivedEdit, completedSlow, completedEdit;
  const slowGate = new Promise(resolve => { releaseSlow = resolve; });
  const editGate = new Promise(resolve => { releaseEdit = resolve; });
  let sawSlow = false, sawEdit = false;
  arrivedSlow = () => { sawSlow = true; };
  arrivedEdit = () => { sawEdit = true; };
  const slowDone = new Promise(resolve => { completedSlow = resolve; });
  const editDone = new Promise(resolve => { completedEdit = resolve; });
  let edits = 0, routeError;
  const slowPattern = `${apiBase}/api/v1/ai-suggestions/${slow.suggestionId}?canonical=true`;
  const fastPattern = `${apiBase}/api/v1/ai-suggestions/${fast.suggestionId}?canonical=true`;
  const slowHandler = async route => {
    try {
      const response = await route.fetch();
      assert.equal(response.status(), 200);
      arrivedSlow(); await slowGate; await route.fulfill({ response });
    } catch (error) { routeError = error; arrivedSlow(); }
    finally { completedSlow(); }
  };
  const fastHandler = async route => {
    if (route.request().method() !== 'PATCH') return route.continue();
    edits++;
    try {
      const response = await route.fetch();
      assert.equal(response.status(), 200);
      arrivedEdit(); await editGate; await route.fulfill({ response });
    } catch (error) { routeError = error; arrivedEdit(); }
    finally { completedEdit(); }
  };
  await page.route(slowPattern, slowHandler);
  await page.route(fastPattern, fastHandler);
  try {
    await reviewRow(page, slow).click();
    await waitFor(async () => assert.equal(sawSlow, true), 12000);
    const modal = reviewModal(page);
    await modal.locator('.ai-suggestion-modal-backdrop').click({ position: { x: 5, y: 5 } });
    await modal.waitFor({ state: 'hidden' });
    await openAiReview(page, fast);
    const lateResponse = page.waitForResponse(r => r.request().method() === 'GET' && new URL(r.url()).pathname.endsWith('/' + slow.suggestionId));
    releaseSlow(); await lateResponse; await slowDone;
    if (routeError) throw routeError;
    await waitFor(async () => {
      assert.ok((await modal.locator('h2').innerText()).includes(fast.noteTitle));
      assert.equal(await modal.locator('#aiSuggestionContentEditor').inputValue(), (await readAiReview(apiBase, fast)).item.content[fast.targetField]);
      assert.equal(await modal.locator(`[data-ai-suggestion-open-note="${slow.noteId}"]`).count(), 0);
    });
    const text = '双击只保存一次，并始终属于当前审阅的笔记。';
    await modal.locator('#aiSuggestionContentEditor').fill(text);
    const button = modal.locator('[data-ai-suggestion-status="edited"]');
    await button.dblclick();
    await waitFor(async () => assert.equal(sawEdit, true), 12000);
    if (routeError) throw routeError;
    assert.equal(await button.isDisabled(), true);
    assert.equal(edits, 1);
    releaseEdit(); await editDone;
    if (routeError) throw routeError;
    await waitFor(async () => {
      const detail = await readAiReview(apiBase, fast);
      assert.equal(detail.item.status, 'edited');
      assert.equal(detail.item.content[fast.targetField], text);
      assert.equal(detail.item.history.filter(e => e.toStatus === 'edited').length, 1);
    });
    await modal.waitFor({ state: 'hidden' });
    assert.deepEqual(await readAiReview(apiBase, slow), originalSlow);
    assert.deepEqual(await Promise.all([slow, fast].map(f => noteSnapshot(apiBase, f))), originalNotes);
    await filterAiReviewStatus(page, 'edited');
    const reopened = await openAiReview(page, fast);
    assert.equal(await reopened.locator('#aiSuggestionContentEditor').inputValue(), text);
    assert.equal(edits, 1);
  } finally {
    releaseSlow(); releaseEdit();
    await page.unroute(slowPattern, slowHandler);
    await page.unroute(fastPattern, fastHandler);
  }
}
