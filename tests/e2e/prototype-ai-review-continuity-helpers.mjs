import assert from 'node:assert/strict';
import { fetchJson, waitFor } from './prototype-copy-test-helpers.mjs';
import { openAiReviewWorkspace, filterAiReviewStatus, openAiReview, readAiReview } from './prototype-ai-review-flow-helpers.mjs';

export const reviewRow = (page, fixture) => page.locator('#settingsAiSuggestionsPanel .ai-inbox-list-pane .ai-inbox-item', { hasText: fixture.noteTitle });
export const reviewModal = page => page.locator('#settingsAiSuggestionsPanel .ai-suggestion-modal');
export async function noteSnapshot(apiBase, fixture) {
  const result = await fetchJson(apiBase, `/api/v1/notes/${fixture.noteId}`);
  assert.equal(result.status, 200);
  return result.json.item;
}
export async function pendingReviews(apiBase, fixture) {
  const result = await fetchJson(apiBase, '/api/v1/ai-suggestions?canonical=true&limit=50');
  assert.equal(result.status, 200);
  const items = result.json.items.filter(item => item.target?.id === fixture.noteId && item.status === 'suggested');
  assert.ok(items.length);
  return items;
}
export async function openGroupReview(page, fixture, ids) {
  const pending = page.waitForResponse(r => r.request().method() === 'GET' && ids.some(id => new URL(r.url()).pathname === `/api/v1/ai-suggestions/${id}`));
  await reviewRow(page, fixture).click();
  const response = await pending;
  const detail = await response.json();
  assert.equal(response.status(), 200, JSON.stringify(detail));
  assert.equal(detail.item.target.id, fixture.noteId);
  assert.ok(ids.includes(detail.item.id));
  const modal = reviewModal(page);
  await modal.waitFor({ state: 'visible' });
  await waitFor(async () => assert.ok((await modal.locator('h2').innerText()).includes(fixture.noteTitle)));
  return modal;
}
async function rejectGroup(stack, fixture, items) {
  const { page, apiBase } = stack;
  const ids = items.map(item => item.id);
  const modal = await openGroupReview(page, fixture, ids);
  const button = modal.locator('[data-ai-suggestion-group-status="rejected"]');
  assert.deepEqual(new Set((await button.getAttribute('data-ai-suggestion-ids')).split(',')), new Set(ids));
  await button.click();
  await waitFor(async () => {
    for (const id of ids) {
      const detail = await readAiReview(apiBase, { ...fixture, suggestionId: id });
      assert.equal(detail.item.status, 'rejected');
      assert.equal(detail.item.history.filter(entry => entry.toStatus === 'rejected').length, 1);
      assert.equal(detail.artifact.status, 'ignored');
      assert.equal(detail.artifact.payload.fieldSuggestion.status, 'rejected');
    }
  });
  await modal.waitFor({ state: 'hidden' });
  await waitFor(async () => assert.equal(await reviewRow(page, fixture).count(), 0));
  return ids;
}
async function inspectRejected(page, fixture, ids) {
  const modal = await openGroupReview(page, fixture, ids);
  await waitFor(async () => assert.match(await modal.innerText(), /已忽略|已经忽略/));
  assert.equal(await modal.locator('[data-ai-suggestion-status], [data-ai-suggestion-group-status], [data-ai-suggestion-content-editor]').count(), 0);
  assert.equal(await modal.locator(`[data-ai-suggestion-open-note="${fixture.noteId}"]`).count(), 1);
  return modal;
}

export async function runAiRejectedReview(stack, fixture, { refresh = false } = {}) {
  const { apiBase, page } = stack;
  const original = await noteSnapshot(apiBase, fixture);
  const items = await pendingReviews(apiBase, fixture);
  await openAiReviewWorkspace(stack, { settleSettings: true });
  await filterAiReviewStatus(page, 'suggested');
  const ids = await rejectGroup(stack, fixture, items);
  const saved = await Promise.all(ids.map(suggestionId => readAiReview(apiBase, { ...fixture, suggestionId })));
  await filterAiReviewStatus(page, 'rejected');
  if (refresh) await page.locator('#btnAiSuggestionsRefresh').click();
  await inspectRejected(page, fixture, ids);
  assert.deepEqual(await noteSnapshot(apiBase, fixture), original);
  const current = await Promise.all(ids.map(suggestionId => readAiReview(apiBase, { ...fixture, suggestionId })));
  assert.deepEqual(current, saved);
  const artifact = await fetchJson(apiBase, `/api/v1/ai/inbox/${fixture.artifactId}?canonical=true`);
  assert.equal(artifact.status, 200);
  assert.equal(artifact.json.canonical.artifact.status, 'ignored');
  assert.equal(artifact.json.canonical.suggestion.status, 'rejected');
}

export async function runAiPendingContinuity(stack, first, second) {
  const { page, apiBase } = stack;
  const originals = await Promise.all([first, second].map(f => noteSnapshot(apiBase, f)));
  const groups = await Promise.all([first, second].map(f => pendingReviews(apiBase, f)));
  await openAiReviewWorkspace(stack, { settleSettings: true });
  await filterAiReviewStatus(page, 'suggested');
  const firstIds = await rejectGroup(stack, first, groups[0]);
  await reviewRow(page, second).waitFor({ state: 'visible' });
  assert.equal(await reviewModal(page).count(), 0, 'completed modal must not keep the removed suggestion visible');
  const secondIds = await rejectGroup(stack, second, groups[1]);
  assert.equal(await page.locator('#settingsAiSuggestionsPanel .ai-inbox-list-pane .ai-inbox-item').count(), 0);
  assert.match(await page.locator('#settingsAiSuggestionsPanel').innerText(), /现在没有待处理|没有符合筛选/);
  await filterAiReviewStatus(page, 'rejected');
  const modal = await inspectRejected(page, first, firstIds);
  await modal.locator('.ai-suggestion-modal-backdrop').click({ position: { x: 5, y: 5 } });
  await inspectRejected(page, second, secondIds);
  assert.deepEqual(await Promise.all([first, second].map(f => noteSnapshot(apiBase, f))), originals);
}

export async function runAiEditedContinuity(stack, first, second) {
  const { page, apiBase } = stack;
  const originals = await Promise.all([first, second].map(f => noteSnapshot(apiBase, f)));
  const reviews = await Promise.all([first, second].map(f => readAiReview(apiBase, f)));
  await openAiReviewWorkspace(stack, { settleSettings: true });
  await filterAiReviewStatus(page, 'edited');
  for (const [index, fixture] of [first, second].entries()) {
    const modal = await openAiReview(page, fixture);
    assert.equal(await modal.locator('#aiSuggestionContentEditor').inputValue(), reviews[index].item.content.thesis);
    await modal.locator('[data-ai-suggestion-status="confirmed"]').click();
    await waitFor(async () => assert.equal((await readAiReview(apiBase, fixture)).item.status, 'confirmed'));
    await modal.waitFor({ state: 'hidden' });
    await waitFor(async () => assert.equal(await reviewRow(page, fixture).count(), 0));
    const saved = await noteSnapshot(apiBase, fixture);
    assert.equal(saved.thesis, reviews[index].item.content.thesis);
    assert.equal(saved.body, originals[index].body);
    assert.deepEqual(saved.threeLineSummary, originals[index].threeLineSummary);
    assert.deepEqual(saved.authorship, originals[index].authorship);
    if (index === 0) {
      await reviewRow(page, second).waitFor({ state: 'visible' });
      assert.deepEqual((await readAiReview(apiBase, second)).item, reviews[1].item);
      assert.deepEqual(await noteSnapshot(apiBase, second), originals[1]);
    }
  }
  assert.equal(await reviewModal(page).count(), 0);
  assert.equal(await page.locator('#settingsAiSuggestionsPanel .ai-inbox-list-pane .ai-inbox-item').count(), 0);
  assert.match(await page.locator('#settingsAiSuggestionsPanel').innerText(), /现在没有待处理|没有符合筛选/);
}
