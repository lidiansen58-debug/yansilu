import test from 'node:test';
import assert from 'node:assert/strict';
import { optionalPlaywright, startPrototypeStack, postJson, putJson, fetchJson, waitFor } from './prototype-copy-test-helpers.mjs';
import { openAiReviewWorkspace, filterAiReviewStatus, openAiReview, readAiReview } from './prototype-ai-review-flow-helpers.mjs';

const browserOptions = { skip: process.env.RUN_BROWSER_E2E !== '1' };

async function openPending(page, fixture, ids = [fixture.suggestionId]) {
  const response = page.waitForResponse(r => r.request().method() === 'GET' &&
    ids.some(id => new URL(r.url()).pathname === `/api/v1/ai-suggestions/${id}`));
  await page.locator('#settingsAiSuggestionsPanel .ai-inbox-list-pane .ai-inbox-item', { hasText: fixture.noteTitle }).click();
  const detail = await response;
  assert.equal(detail.status(), 200);
  assert.ok(ids.includes((await detail.json()).item.id));
  const modal = page.locator('#settingsAiSuggestionsPanel .ai-suggestion-modal');
  await modal.waitFor({ state: 'visible' });
  await modal.locator('[data-ai-suggestion-group-status="adopted_as_draft"]').waitFor({ state: 'visible' });
  return modal;
}

async function createDraftCase(t) {
  const playwright = await optionalPlaywright(t);
  if (!playwright) return;
  const stack = await startPrototypeStack(t, playwright);
  if (!stack) return;
  const created = await postJson(stack.apiBase, '/api/v1/notes', { directoryId: 'dir_original_default', noteType: 'permanent',
    title: '成组保存 AI 草稿', body: '# 成组保存 AI 草稿\n\n原正文与 [[原有链接]]。' });
  assert.equal(created.status, 201, JSON.stringify(created.json));
  const noteId = created.json.item.id;
  const proposed = await postJson(stack.apiBase, '/api/v1/ai-suggestions', { target: { type: 'permanent_note', id: noteId, field: 'thesis' },
    scope: 'note_field', content: { thesis: '草稿必须有实际内容，并保留人工核对的机会。' } });
  assert.equal(proposed.status, 201);
  const fixture = { noteId, noteTitle: created.json.item.title, suggestionId: proposed.json.item.id };
  const before = (await fetchJson(stack.apiBase, `/api/v1/notes/${noteId}`)).json.item;
  return { ...stack, fixture, before, proposed: proposed.json.item };
}

test('visible AI save draft writes the proposed field into the note without confirming human authorship', browserOptions, async t => {
  const playwright = await optionalPlaywright(t);
  if (!playwright) return;
  const stack = await startPrototypeStack(t, playwright);
  if (!stack) return;
  const { page, apiBase } = stack;
  const created = await postJson(apiBase, '/api/v1/notes', { directoryId: 'dir_original_default', noteType: 'permanent',
    title: '首次保存 AI 草稿', body: '# 首次保存 AI 草稿\n\n原正文与 [[原有链接]] 必须保留。' });
  assert.equal(created.status, 201, JSON.stringify(created.json));
  const noteId = created.json.item.id;
  const thesis = 'AI 整理应先进入可编辑草稿，再由作者核对。';
  const suggestion = await postJson(apiBase, '/api/v1/ai-suggestions', { target: { type: 'permanent_note', id: noteId, field: 'thesis' },
    scope: 'note_field', content: { thesis } });
  assert.equal(suggestion.status, 201, JSON.stringify(suggestion.json));
  const fixture = { noteId, noteTitle: created.json.item.title, suggestionId: suggestion.json.item.id };
  const route = `/api/v1/notes/${noteId}`;
  const before = (await fetchJson(apiBase, route)).json.item;
  await openAiReviewWorkspace(stack);
  await filterAiReviewStatus(page, 'suggested');
  const modal = await openPending(page, fixture);
  assert.equal(await modal.locator('[data-ai-suggestion-group-status="adopted_as_draft"]').getAttribute('data-ai-suggestion-ids'), fixture.suggestionId);
  await modal.locator('[data-ai-suggestion-group-status="adopted_as_draft"]').click();
  await waitFor(async () => assert.equal((await readAiReview(apiBase, fixture)).item.status, 'adopted_as_draft'));
  const saved = (await fetchJson(apiBase, route)).json.item;
  assert.equal(saved.thesis, thesis, 'visible draft action must save actual proposed content, not only review metadata');
  assert.equal(saved.body, before.body);
  assert.equal(saved.title, before.title);
  assert.deepEqual(saved.threeLineSummary, before.threeLineSummary);
  assert.equal(saved.distillationStatus, 'draft');
  assert.equal(saved.authorship.user_confirmed, false);
  assert.equal(saved.authorship.ai_assisted, true);
  assert.equal((await readAiReview(apiBase, fixture)).item.history.filter(event => event.toStatus === 'adopted_as_draft').length, 1);
  await filterAiReviewStatus(page, 'adopted_as_draft');
  const reopened = await openAiReview(page, fixture);
  await reopened.locator(`[data-ai-suggestion-open-note="${noteId}"]`).click();
  await page.waitForFunction(id => window.__prototypeEditor?.activeNote?.()?.id === id, noteId);
  await waitFor(async () => assert.equal(await page.evaluate(() => window.__prototypeEditor?.activeNote?.()?.thesis), thesis));
  assert.deepEqual((await fetchJson(apiBase, route)).json.item, saved);
});

test('visible group draft saves both proposed fields exactly once while preserving the original prose', browserOptions, async t => {
  const f = await createDraftCase(t);
  if (!f) return;
  const summary = ['先存成草稿。', '保留原正文和链接。', '由作者继续核对。'];
  const peer = await postJson(f.apiBase, '/api/v1/ai-suggestions', { target: { type: 'permanent_note', id: f.fixture.noteId, field: 'three_line_summary' },
    scope: 'note_field', content: { three_line_summary: summary } });
  assert.equal(peer.status, 201);
  await openAiReviewWorkspace(f);
  await filterAiReviewStatus(f.page, 'suggested');
  const modal = await openPending(f.page, f.fixture, [f.fixture.suggestionId, peer.json.item.id]);
  const ids = (await modal.locator('[data-ai-suggestion-group-status="adopted_as_draft"]').getAttribute('data-ai-suggestion-ids')).split(',');
  assert.deepEqual(new Set(ids), new Set([f.fixture.suggestionId, peer.json.item.id]));
  await modal.locator('[data-ai-suggestion-group-status="adopted_as_draft"]').click();
  await waitFor(async () => {
    for (const id of ids) {
      const review = (await fetchJson(f.apiBase, `/api/v1/ai-suggestions/${id}`)).json.item;
      assert.equal(review.status, 'adopted_as_draft');
      assert.equal(review.history.filter(event => event.toStatus === 'adopted_as_draft').length, 1);
    }
  });
  const saved = (await fetchJson(f.apiBase, `/api/v1/notes/${f.fixture.noteId}`)).json.item;
  assert.equal(saved.thesis, f.proposed.content.thesis);
  assert.deepEqual(saved.threeLineSummary, summary);
  assert.equal(saved.body, f.before.body);
  assert.deepEqual(saved.authorship, { user_confirmed: false, ai_assisted: true });
});

test('visible draft conflict retains the modal and pending proposal without overwriting newer human prose', browserOptions, async t => {
  const f = await createDraftCase(t);
  if (!f) return;
  const route = `/api/v1/notes/${f.fixture.noteId}`;
  await openAiReviewWorkspace(f);
  await filterAiReviewStatus(f.page, 'suggested');
  const modal = await openPending(f.page, f.fixture);
  const review = await readAiReview(f.apiBase, f.fixture);
  assert.equal((await putJson(f.apiBase, route, { body: f.before.body + '\n\n另一窗口保存的新段落。' })).status, 200);
  const later = (await fetchJson(f.apiBase, route)).json.item;
  const response = f.page.waitForResponse(r => r.request().method() === 'PATCH' &&
    new URL(r.url()).pathname === `/api/v1/ai-suggestions/${f.fixture.suggestionId}`);
  await modal.locator('[data-ai-suggestion-group-status="adopted_as_draft"]').click();
  assert.equal((await response).status(), 409);
  await waitFor(async () => {
    assert.equal(await modal.isVisible(), true);
    assert.match(await modal.innerText(), /未覆盖/);
    assert.ok((await modal.innerText()).includes(f.proposed.content.thesis));
    assert.equal(await modal.locator('[data-ai-suggestion-group-status="adopted_as_draft"]').isEnabled(), true);
  });
  assert.deepEqual((await fetchJson(f.apiBase, route)).json.item, later);
  const unchanged = await readAiReview(f.apiBase, f.fixture);
  assert.deepEqual(unchanged.item, review.item);
  assert.deepEqual(unchanged.artifact, review.artifact);
});
