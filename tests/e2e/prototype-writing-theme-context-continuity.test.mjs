import test from "node:test";
import assert from "node:assert/strict";
import { optionalPlaywright, fetchJson, postJson, putJson, startPrototypeStack, waitFor } from "./prototype-copy-test-helpers.mjs";

async function createWritingReadyPermanentNote(baseUrl, payload = {}) {
  const authorship = payload.authorship || { user_confirmed: true, ai_assisted: false };
  const created = await postJson(baseUrl, "/api/v1/notes", {
    directoryId: payload.directoryId || "dir_original_default",
    title: payload.title,
    body: payload.body,
    thesis: payload.thesis,
    threeLineSummary: payload.threeLineSummary,
    distillationStatus: "draft",
    boundaryOrCounterpoint: payload.boundaryOrCounterpoint
  });
  assert.equal(created.status, 201, JSON.stringify(created.json));

  const noteId = created.json.item.id;
  const updated = await putJson(baseUrl, `/api/v1/notes/${encodeURIComponent(noteId)}`, {
    title: payload.title || created.json.item.title,
    body: payload.body || created.json.item.body,
    status: "active",
    thesis: payload.thesis,
    threeLineSummary: payload.threeLineSummary,
    distillationStatus: payload.distillationStatus || "confirmed",
    originalityStatus: "pass",
    authorship,
    authorshipConfirmed: true,
    authorshipAiAssisted: Boolean(authorship.ai_assisted),
    boundaryOrCounterpoint: payload.boundaryOrCounterpoint
  });
  assert.equal(updated.status, 200, JSON.stringify(updated.json));
  return updated;
}

test("prototype writing keeps distinct themes with the same notes isolated and resumes each existing outline", async (t) => {
  if (process.env.RUN_BROWSER_E2E !== "1") {
    t.skip("Set RUN_BROWSER_E2E=1 to enable browser e2e in local runs.");
    return;
  }

  const playwright = await optionalPlaywright(t);
  if (!playwright) return;

  const stack = await startPrototypeStack(t, playwright);
  if (!stack) return;
  const { apiBase, page, webBase } = stack;

  const noteA = await createWritingReadyPermanentNote(apiBase, {
    title: "Theme Continuity A",
    body: "# Theme Continuity A\n\nA mature note for theme continuity testing.",
    thesis: "Switching theme cards with the same notes should keep project-entry context warm.",
    threeLineSummary: [
      "Switching theme cards with the same notes should keep project-entry context warm.",
      "That matters because theme entry should feel like one continuous writing surface.",
      "It should not fall back to loading when the underlying note set is unchanged."
    ],
    boundaryOrCounterpoint: "This only matters once the notes are already project-ready."
  });

  const noteB = await createWritingReadyPermanentNote(apiBase, {
    title: "Theme Continuity B",
    body: "# Theme Continuity B\n\nA second mature note keeps the theme project-ready.",
    thesis: "The second mature note keeps the shared theme entry project-ready.",
    threeLineSummary: [
      "The second mature note keeps the shared theme entry project-ready.",
      "That matters because continuity should preserve a ready state, not re-derive it from scratch.",
      "The writing center should stay on project creation once the structure is already sufficient."
    ],
    boundaryOrCounterpoint: "A single isolated note should not qualify for this continuity path."
  });

  const relation = await postJson(apiBase, `/api/v1/notes/${encodeURIComponent(noteA.json.item.id)}/relations`, {
    toNoteId: noteB.json.item.id,
    relationType: "supports",
    rationale: "These two notes already form one shared theme structure.",
    insightQuestion: "What stable question should persist while switching theme cards?",
    confidence: 1
  });
  assert.equal(relation.status, 201, JSON.stringify(relation.json));

  const themeA = await postJson(apiBase, "/api/v1/index-cards", {
    directoryId: "dir_original_default",
    indexType: "topic",
    title: "Theme Continuity Index A",
    summary: "The first theme card for the same note pair.",
    thesis: "Theme continuity should preserve project readiness across equivalent theme cards.",
    threeLineSummary: ["one", "two", "three"],
    centralQuestion: "How should equivalent theme cards preserve writing continuity?",
    items: [
      { noteId: noteA.json.item.id, shortLabel: "A", rationale: "First note in the shared set." },
      { noteId: noteB.json.item.id, shortLabel: "B", rationale: "Second note in the shared set." }
    ]
  });
  assert.equal(themeA.status, 201, JSON.stringify(themeA.json));

  const themeB = await postJson(apiBase, "/api/v1/index-cards", {
    directoryId: "dir_original_default",
    indexType: "topic",
    title: "Theme Continuity Index B",
    summary: "A second theme card pointing at the same note pair.",
    thesis: "Equivalent theme cards should not reset ready context.",
    threeLineSummary: ["one", "two", "three"],
    centralQuestion: "How should equivalent theme cards preserve writing continuity?",
    items: [
      { noteId: noteA.json.item.id, shortLabel: "A", rationale: "First note in the shared set." },
      { noteId: noteB.json.item.id, shortLabel: "B", rationale: "Second note in the shared set." }
    ]
  });
  assert.equal(themeB.status, 201, JSON.stringify(themeB.json));

  await page.goto(`${webBase}/prototype`, { waitUntil: "networkidle" });
  await page.locator('.rail-btn[data-module="writing"]').click();
  const topicA = page.locator('#writingThemeIndexList [data-writing-index-card-id]', { hasText: "Theme Continuity Index A" });
  await topicA.locator('button').click();
  await page.locator('#writingTitle:visible').waitFor();
  assert.equal(await page.locator('#writingTitle').inputValue(), "Theme Continuity Index A");
  await page.locator('#btnWritingCreateScaffold').click();
  await page.locator('#writingScaffoldPanel:visible').waitFor();
  const first = (await fetchJson(apiBase, '/api/v1/writing-projects?limit=20')).json.items;
  assert.equal(first.length, 1);
  assert.ok(first[0].scaffold_id);

  await page.locator('[data-writing-sidebar-action="topics"]').click();
  const topicB = page.locator('#writingThemeIndexList [data-writing-index-card-id]', { hasText: "Theme Continuity Index B" });
  await topicB.locator('[data-writing-index-action="use"]').click();
  await page.locator('#writingTitle:visible').waitFor();
  assert.equal(await page.locator('#writingTitle').inputValue(), "Theme Continuity Index B");
  await page.locator('#btnWritingCreateScaffold').click();
  await page.locator('#writingScaffoldPanel:visible').waitFor();
  let after;
  await waitFor(async () => {
    after = (await fetchJson(apiBase, '/api/v1/writing-projects?limit=20')).json.items;
    assert.equal(after.length, 2);
    assert.ok(after.find(project => project.id !== first[0].id)?.scaffold_id);
  });
  const original = after.find(project => project.id === first[0].id);
  const second = after.find(project => project.id !== first[0].id);
  assert.equal(original.scaffold_id, first[0].scaffold_id);
  assert.deepEqual(original.related_index_ids, [themeA.json.item.id]);
  assert.deepEqual(second.related_index_ids, [themeB.json.item.id]);
  await page.locator('[data-writing-sidebar-action="topics"]').click();
  await topicA.locator('[data-writing-index-action="resume-scaffold"]').click();
  await page.locator('#writingScaffoldPanel:visible').waitFor();
  assert.equal(await page.locator('#writingTitle').inputValue(), first[0].title);
  assert.equal((await fetchJson(apiBase, '/api/v1/writing-projects?limit=20')).json.items.length, 2);
});
