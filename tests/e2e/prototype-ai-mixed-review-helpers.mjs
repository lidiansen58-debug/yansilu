import assert from "node:assert/strict";
import { fetchJson, waitFor } from "./prototype-copy-test-helpers.mjs";
import { openAiReviewWorkspace, openAiReview, readAiReview } from "./prototype-ai-review-flow-helpers.mjs";

export async function runAiMixedGroupReview(stack, fixture) {
  const { page, apiBase } = stack;
  const original = (await fetchJson(apiBase, `/api/v1/notes/${fixture.noteId}`)).json.item;
  const listed = await fetchJson(apiBase, "/api/v1/ai-suggestions?canonical=true");
  const pending = listed.json.items.find(item => item.target?.id === fixture.noteId && item.status === "suggested");
  assert.ok(pending, "same note must retain its actual pending sibling");
  const pendingRoute = `/api/v1/ai-suggestions/${pending.id}?canonical=true`;
  const siblingBefore = (await fetchJson(apiBase, pendingRoute)).json.item;
  await openAiReviewWorkspace(stack);
  const listResponse = page.waitForResponse(response => response.request().method() === "GET" &&
    new URL(response.url()).pathname === "/api/v1/ai-suggestions" && !new URL(response.url()).searchParams.has("status"));
  await page.locator('#aiSuggestionStatusFilter').selectOption('all');
  await page.locator('#btnAiSuggestionsApplyFilters').click();
  const response = await listResponse;
  assert.equal(response.status(), 200);
  const items = (await response.json()).items;
  assert.equal(items.find(item => item.id === fixture.suggestionId).status, 'edited');
  assert.equal(items.find(item => item.id === pending.id).status, 'suggested');
  await page.locator('#settingsAiSuggestionsPanel .ai-inbox-list-pane .ai-inbox-item', { hasText: fixture.noteTitle }).waitFor();
  const modal = await openAiReview(page, fixture);
  const editor = modal.locator('#aiSuggestionContentEditor');
  await editor.waitFor({ state: 'visible', timeout: 5000 });
  assert.equal(await modal.locator('[data-ai-suggestion-group-status]').count(), 0);
  assert.equal(await modal.locator(`[data-ai-suggestion-id="${pending.id}"]`).count(), 1);
  const reviewed = "人工核对的观点应能确认，不受待处理概括影响。";
  await editor.fill(reviewed);
  await modal.locator('[data-ai-suggestion-status="confirmed"]').click();
  await waitFor(async () => {
    const review = await readAiReview(apiBase, fixture);
    assert.equal(review.item.status, 'confirmed');
    assert.equal(review.item.content.thesis, reviewed);
    const note = (await fetchJson(apiBase, `/api/v1/notes/${fixture.noteId}`)).json.item;
    assert.equal(note.thesis, reviewed);
    assert.equal(note.body, original.body);
    assert.deepEqual(note.threeLineSummary, original.threeLineSummary);
    assert.deepEqual(note.authorship, original.authorship);
  });
  const savedNote = (await fetchJson(apiBase, `/api/v1/notes/${fixture.noteId}`)).json.item;
  await modal.locator(`[data-ai-suggestion-id="${pending.id}"]`).click();
  await modal.locator('[data-ai-suggestion-group-status="rejected"]').waitFor({ state: 'visible' });
  assert.equal(await modal.locator('[data-ai-suggestion-group-status="rejected"]').getAttribute('data-ai-suggestion-ids'), pending.id);
  assert.equal(await modal.locator('[data-ai-suggestion-status="confirmed"]').count(), 0);
  assert.equal(await modal.locator('[data-ai-suggestion-status="edited"]').count(), 0);
  assert.deepEqual((await fetchJson(apiBase, pendingRoute)).json.item, siblingBefore);
  assert.deepEqual((await fetchJson(apiBase, `/api/v1/notes/${fixture.noteId}`)).json.item, savedNote);
}
