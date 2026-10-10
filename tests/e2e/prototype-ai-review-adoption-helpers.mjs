import assert from 'node:assert/strict';
import { openAiReviewWorkspace, filterAiReviewStatus, readAiReview } from './prototype-ai-review-flow-helpers.mjs';
import { noteSnapshot, openGroupReview } from './prototype-ai-review-continuity-helpers.mjs';

export async function runAiAdoptedReadOnly(stack, fixture) {
  const { page, apiBase } = stack;
  const original = await noteSnapshot(apiBase, fixture);
  const before = await readAiReview(apiBase, fixture);
  let mutations = 0;
  page.on('request', request => {
    const route = new URL(request.url()).pathname;
    if ((request.method() === 'PATCH' && route.startsWith('/api/v1/ai-suggestions/')) ||
      (request.method() === 'POST' && route.endsWith('/adopt-field-suggestion'))) mutations++;
  });
  await openAiReviewWorkspace(stack, { settleSettings: true });
  await filterAiReviewStatus(page, 'adopted_as_draft');
  let modal = await openGroupReview(page, fixture, [fixture.suggestionId]);
  const assertNoReadoption = async () => {
    assert.equal(await modal.locator('[data-ai-suggestion-status="adopted_as_draft"], [data-ai-suggestion-group-status="adopted_as_draft"]').count(), 0);
    assert.match(await modal.innerText(), /草稿已经放进笔记/);
    assert.equal(await modal.locator('[data-ai-suggestion-status="edited"]').isEnabled(), true);
  };
  await assertNoReadoption();
  await modal.locator('.ai-suggestion-modal-backdrop').click({ position: { x: 5, y: 5 } });
  await modal.waitFor({ state: 'hidden' });
  await page.locator('#btnAiSuggestionsRefresh').click();
  modal = await openGroupReview(page, fixture, [fixture.suggestionId]);
  await assertNoReadoption();
  assert.equal(mutations, 0);
  assert.deepEqual(await readAiReview(apiBase, fixture), before);
  assert.deepEqual(await noteSnapshot(apiBase, fixture), original);
}
