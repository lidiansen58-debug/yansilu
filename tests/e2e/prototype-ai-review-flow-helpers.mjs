import assert from "node:assert/strict";
import { fetchJson, putJson, waitFor } from "./prototype-copy-test-helpers.mjs";

export async function openAiReviewWorkspace({ page, webBase }, { settleSettings = false } = {}) {
  await page.goto(`${webBase}/prototype`, { waitUntil: "networkidle" });
  await page.locator('.rail-btn[data-module="settings"]').click();
  if (settleSettings) await page.waitForFunction(() => document.querySelector('#statusText')?.textContent === '已打开设置');
  await page.locator('[data-settings-item="automation"]').click();
  await page.locator("#settingsAiSuggestionsPanel").waitFor({ state: "visible" });
}

export async function filterAiReviewStatus(page, status) {
  await page.locator("#aiSuggestionStatusFilter").selectOption(status);
  await page.locator("#btnAiSuggestionsApplyFilters").click();
}

export async function openAiReview(page, fixture) {
  const row = page.locator("#settingsAiSuggestionsPanel .ai-inbox-list-pane .ai-inbox-item", { hasText: fixture.noteTitle });
  const detailResponse = page.waitForResponse(response => response.request().method() === "GET" &&
    new URL(response.url()).pathname === `/api/v1/ai-suggestions/${fixture.suggestionId}`);
  await row.click();
  const response = await detailResponse;
  const detail = await response.json();
  assert.equal(response.status(), 200, JSON.stringify(detail));
  assert.equal(detail.item.id, fixture.suggestionId);
  assert.equal(detail.item.target.id, fixture.noteId);
  const modal = page.locator("#settingsAiSuggestionsPanel .ai-suggestion-modal");
  await modal.waitFor({ state: "visible" });
  await waitFor(async () => {
    assert.ok((await modal.locator("h2").innerText()).includes(fixture.noteTitle));
    assert.equal(await modal.locator(`#aiSuggestionContentEditor, [data-ai-suggestion-id="${fixture.suggestionId}"], [data-ai-suggestion-open-note="${fixture.noteId}"]`).count() > 0, true, await modal.innerHTML());
  });
  return modal;
}

export async function readAiReview(apiBase, fixture) {
  const response = await fetchJson(apiBase, `/api/v1/ai-suggestions/${fixture.suggestionId}?canonical=true`);
  assert.equal(response.status, 200);
  // Transport envelopes change on every read; retain all persisted review and provenance fields.
  const { requestId, timestamp, ...review } = response.json;
  return review;
}

export async function runAiReviewedLifecycle(stack, fixture) {
  const { page, apiBase } = stack;
  const originalNote = (await fetchJson(apiBase, `/api/v1/notes/${fixture.noteId}`)).json.item;
  await openAiReviewWorkspace(stack);
  await filterAiReviewStatus(page, "adopted_as_draft");
  let modal = await openAiReview(page, fixture);
  const editor = modal.locator("#aiSuggestionContentEditor");
  await editor.waitFor({ state: "visible" });
  assert.equal(await modal.locator('[data-ai-suggestion-status="confirmed"]').count(), 0);
  const editedThesis = "人工改写后的判断需要先核对原笔记，再明确确认写入。";
  await editor.fill(editedThesis);
  await modal.locator('[data-ai-suggestion-status="edited"]').click();
  await waitFor(async () => {
    const reviewed = await readAiReview(apiBase, fixture);
    assert.equal(reviewed.item.status, "edited");
    assert.equal(reviewed.item.content[fixture.targetField], editedThesis);
    assert.equal(reviewed.item.history.filter(entry => entry.toStatus === "edited").length, 1);
  });
  await modal.waitFor({ state: "hidden" });
  await filterAiReviewStatus(page, "edited");
  modal = await openAiReview(page, fixture);
  assert.equal(await modal.locator("#aiSuggestionContentEditor").inputValue(), editedThesis);
  await modal.locator('[data-ai-suggestion-status="confirmed"]').click();
  await waitFor(async () => {
    const reviewed = await readAiReview(apiBase, fixture);
    assert.equal(reviewed.item.status, "confirmed");
    assert.equal(reviewed.item.content[fixture.targetField], editedThesis);
    assert.equal(reviewed.canonical.latest_review_event.event_type, "confirmed");
    assert.equal(reviewed.item.history.filter(entry => entry.toStatus === "confirmed").length, 1);
  });
  await modal.waitFor({ state: "hidden" });
  await openAiReviewWorkspace(stack);
  await filterAiReviewStatus(page, "confirmed");
  modal = await openAiReview(page, fixture);
  await waitFor(async () => assert.ok((await modal.innerText()).includes(editedThesis)));
  assert.equal(await modal.locator("[data-ai-suggestion-content-editor]").count(), 0);
  assert.equal(await modal.locator("[data-ai-suggestion-status]").count(), 0);
  await modal.locator(`[data-ai-suggestion-open-note="${fixture.noteId}"]`).click();
  await waitFor(async () => {
    assert.equal(await page.locator("#editorWorkspace").isVisible(), true);
    assert.equal(await page.evaluate(() => window.__prototypeEditor.activeNote()?.id), fixture.noteId);
    assert.ok((await page.locator("#wysiwygHost:visible").innerText()).includes(fixture.noteTitle));
  });
  const current = (await fetchJson(apiBase, `/api/v1/notes/${fixture.noteId}`)).json.item;
  assert.equal(current.body, originalNote.body);
  assert.equal(current.thesis, editedThesis);
  assert.equal(current.authorship.user_confirmed, originalNote.authorship.user_confirmed);
}

export async function runAiReviewReopenContinuity(stack, fixture) {
  const { page, apiBase } = stack;
  const before = await readAiReview(apiBase, fixture);
  let mutations = 0;
  page.on("request", request => { if (request.method() === "PATCH" && request.url().includes("/api/v1/ai-suggestions/")) mutations++; });
  await openAiReviewWorkspace(stack);
  await filterAiReviewStatus(page, "adopted_as_draft");
  let modal = await openAiReview(page, fixture);
  const originalContent = before.item.content[fixture.targetField];
  await waitFor(async () => assert.equal(await modal.locator("#aiSuggestionContentEditor").inputValue(), originalContent));
  await modal.locator(".ai-suggestion-modal-backdrop").click({ position: { x: 5, y: 5 } });
  await modal.waitFor({ state: "hidden" });
  await page.locator("#btnAiSuggestionsRefresh").click();
  await filterAiReviewStatus(page, "confirmed");
  assert.equal(await page.locator("#settingsAiSuggestionsPanel .ai-inbox-list-pane .ai-inbox-item", { hasText: fixture.noteTitle }).count(), 0);
  await filterAiReviewStatus(page, "adopted_as_draft");
  modal = await openAiReview(page, fixture);
  await waitFor(async () => assert.equal(await modal.locator("#aiSuggestionContentEditor").inputValue(), originalContent));
  await openAiReviewWorkspace(stack);
  await filterAiReviewStatus(page, "adopted_as_draft");
  modal = await openAiReview(page, fixture);
  await waitFor(async () => assert.equal(await modal.locator("#aiSuggestionContentEditor").inputValue(), originalContent));
  assert.equal(mutations, 0);
  assert.deepEqual(await readAiReview(apiBase, fixture), before);
}

export async function runAiReviewConflict(stack, fixture) {
  const { page, apiBase } = stack;
  const before = await readAiReview(apiBase, fixture);
  const original = (await fetchJson(apiBase, `/api/v1/notes/${fixture.noteId}`)).json.item;
  await openAiReviewWorkspace(stack);
  await filterAiReviewStatus(page, "edited");
  const modal = await openAiReview(page, fixture);
  const draft = "这段尚未写入的人工改写必须在冲突后保留。";
  const editor = modal.locator("#aiSuggestionContentEditor");
  await editor.fill(draft);
  const external = await putJson(apiBase, `/api/v1/notes/${fixture.noteId}`, { body: original.body + "\n\n另一窗口的新正文。" });
  assert.equal(external.status, 200, JSON.stringify(external.json));
  const changed = (await fetchJson(apiBase, `/api/v1/notes/${fixture.noteId}`)).json.item;
  const response = page.waitForResponse(r => r.request().method() === "PATCH" && r.url().includes(`/ai-suggestions/${fixture.suggestionId}`));
  await modal.locator('[data-ai-suggestion-status="confirmed"]').click();
  assert.equal((await response).status(), 409);
  await waitFor(async () => {
    assert.equal(await modal.isVisible(), true);
    assert.match(await modal.innerText(), /未覆盖/);
    assert.equal(await editor.inputValue(), draft);
    assert.equal(await modal.locator('[data-ai-suggestion-status="confirmed"]').isEnabled(), true);
  });
  assert.deepEqual((await fetchJson(apiBase, `/api/v1/notes/${fixture.noteId}`)).json.item, changed);
  const after = await readAiReview(apiBase, fixture);
  assert.deepEqual(after.item, before.item);
  assert.deepEqual(after.artifact, before.artifact);
}
