import assert from "node:assert/strict";
import { fetchJson, waitFor } from "./prototype-copy-test-helpers.mjs";
import { openAiReviewWorkspace, filterAiReviewStatus, openAiReview, readAiReview } from "./prototype-ai-review-flow-helpers.mjs";

async function request(apiBase, route, body) {
  const response = await fetch(apiBase + route, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  return { status: response.status, json: await response.json() };
}

export async function runAiReturnToEditor(stack, fixture) {
  const { page, apiBase } = stack;
  const noteRoute = `/api/v1/notes/${fixture.noteId}`;
  const original = (await fetchJson(apiBase, noteRoute)).json.item;
  await openAiReviewWorkspace(stack);
  await filterAiReviewStatus(page, 'adopted_as_draft');
  const modal = await openAiReview(page, fixture);
  await modal.locator(`[data-ai-suggestion-open-note="${fixture.noteId}"]`).click();
  await page.waitForFunction(id => window.__prototypeState?.module === 'explorer' &&
    window.__prototypeEditor?.activeNote?.()?.id === id, fixture.noteId);
  await waitFor(async () => assert.match(await page.locator('#statusText').innerText(), /已打开目标笔记/));
  assert.equal((await page.locator('#editorBody').inputValue()).trimEnd(), original.body.trimEnd());
  assert.deepEqual((await fetchJson(apiBase, noteRoute)).json.item, original);
  if (!await page.locator('#relatedPanel').isVisible()) await page.locator('#btnShowRelated').click();
  await page.locator('[data-permanent-workspace-tab="viewpoint"]').click();
  const thesis = '返回原笔记后，人工改写并确认这条观点。';
  await page.locator('textarea[name="thesis"]').fill(thesis);
  const reason = page.locator('textarea[name="thesisChangeReason"]');
  if (await reason.isVisible()) await reason.fill('用自己的判断重写采纳的建议，并记录修改依据。');
  await page.locator('[data-note-distillation-form] button[type="submit"]').click();
  await waitFor(async () => assert.equal((await fetchJson(apiBase, noteRoute)).json.item.thesis, thesis));
  await page.waitForFunction(value => window.__prototypeEditor?.activeNote?.()?.thesis === value, thesis);
  const saved = (await fetchJson(apiBase, noteRoute)).json.item;
  const originalParagraphs = original.body.slice(original.body.indexOf('\n\n') + 2).trimEnd();
  assert.ok(saved.body.includes(originalParagraphs), 'manual viewpoint save preserves the original paragraphs');
  await page.locator('[data-note-association-next="edit"]').click();
  const details = page.locator('.viewpoint-optional-details');
  if (!await details.evaluate(element => element.open)) await details.locator('summary').click();
  const card = page.locator(`[data-note-ai-suggestion-id="${fixture.suggestionId}"]`);
  await card.locator('[data-note-ai-suggestion-action="edited"]').click();
  await waitFor(async () => assert.equal((await readAiReview(apiBase, fixture)).item.status, 'edited'));
  await card.locator('[data-note-ai-suggestion-action="confirmed"]').click();
  await waitFor(async () => assert.equal((await readAiReview(apiBase, fixture)).item.status, 'confirmed'));
  assert.deepEqual((await fetchJson(apiBase, noteRoute)).json.item, saved);
  const review = await readAiReview(apiBase, fixture);
  assert.equal(review.item.content.thesis, thesis);
  assert.equal(review.artifact.payload.fieldSuggestion.status, 'confirmed');
}

export async function runAiStructuredInputValidation(stack, originalFixture) {
  const { page, apiBase } = stack;
  const content = { thesis: 'A structured viewpoint', evidence: ['Human evidence'], confidence: 0.7 };
  const created = await request(apiBase, '/api/v1/ai-suggestions', { target: { type: 'permanent_note', id: originalFixture.noteId, field: 'thesis' },
    scope: 'note_field', status: 'adopted_as_draft', content });
  assert.equal(created.status, 201, JSON.stringify(created.json));
  const fixture = { ...originalFixture, suggestionId: created.json.item.id };
  const noteRoute = `/api/v1/notes/${fixture.noteId}`;
  const originalNote = (await fetchJson(apiBase, noteRoute)).json.item;
  const originalReview = await readAiReview(apiBase, originalFixture);
  const before = await readAiReview(apiBase, fixture);
  const patches = [];
  page.on('request', req => {
    if (req.method() === 'PATCH' && new URL(req.url()).pathname.startsWith('/api/v1/ai-suggestions/')) patches.push(req);
  });
  await openAiReviewWorkspace(stack);
  await filterAiReviewStatus(page, 'adopted_as_draft');
  let modal = await openAiReview(page, fixture);
  let editor = modal.locator('#aiSuggestionContentEditor');
  assert.deepEqual(JSON.parse(await editor.inputValue()), content, 'structured content must open in a format the review parser can accept');
  await editor.fill('{not valid json}');
  await modal.locator('[data-ai-suggestion-status="edited"]').click();
  await waitFor(async () => assert.match(await modal.innerText(), /有效.*JSON/));
  assert.equal(await editor.inputValue(), '{not valid json}');
  assert.equal(patches.length, 0);
  assert.deepEqual(await readAiReview(apiBase, fixture), before);
  assert.deepEqual((await fetchJson(apiBase, noteRoute)).json.item, originalNote);
  const reviewed = { ...content, thesis: 'Human review of the structured viewpoint', confidence: 0.8 };
  await editor.fill(JSON.stringify(reviewed, null, 2));
  await modal.locator('[data-ai-suggestion-status="edited"]').click();
  await waitFor(async () => assert.equal((await readAiReview(apiBase, fixture)).item.status, 'edited'));
  assert.equal(patches.length, 1);
  assert.deepEqual((await readAiReview(apiBase, fixture)).item.content, reviewed);
  assert.deepEqual((await fetchJson(apiBase, noteRoute)).json.item, originalNote);
  await filterAiReviewStatus(page, 'edited');
  modal = await openAiReview(page, fixture);
  editor = modal.locator('#aiSuggestionContentEditor');
  assert.deepEqual(JSON.parse(await editor.inputValue()), reviewed);
  const edited = await readAiReview(apiBase, fixture);
  await editor.fill('{invalid confirmation}');
  await modal.locator('[data-ai-suggestion-status="confirmed"]').click();
  await waitFor(async () => assert.match(await modal.innerText(), /有效.*JSON/));
  assert.equal(await editor.inputValue(), '{invalid confirmation}');
  assert.equal(patches.length, 1);
  assert.deepEqual(await readAiReview(apiBase, fixture), edited);
  assert.deepEqual((await fetchJson(apiBase, noteRoute)).json.item, originalNote);
  assert.deepEqual(await readAiReview(apiBase, originalFixture), originalReview);
  await editor.fill(JSON.stringify(reviewed, null, 2));
  await modal.locator('[data-ai-suggestion-status="confirmed"]').click();
  await waitFor(async () => assert.equal((await readAiReview(apiBase, fixture)).item.status, 'confirmed'));
  assert.equal(patches.length, 2);
  assert.ok(patches.every(req => new URL(req.url()).pathname.endsWith('/' + fixture.suggestionId)));
  assert.deepEqual((await readAiReview(apiBase, fixture)).item.content, reviewed);
  const saved = (await fetchJson(apiBase, noteRoute)).json.item;
  assert.equal(saved.thesis, reviewed.thesis);
  assert.equal(saved.body, originalNote.body);
  assert.deepEqual(saved.threeLineSummary, originalNote.threeLineSummary);
  assert.deepEqual(saved.authorship, originalNote.authorship);
  const oldReview = await readAiReview(apiBase, originalFixture);
  assert.deepEqual(oldReview.item, originalReview.item);
  assert.deepEqual(oldReview.artifact, originalReview.artifact);
}
