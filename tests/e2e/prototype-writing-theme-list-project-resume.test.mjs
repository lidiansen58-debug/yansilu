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

test("prototype theme index list shows and uses a direct resume-project action when a matching project already exists", async (t) => {
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
    title: "Theme List Resume A",
    body: "# Theme List Resume A\n\nA mature note for resuming an existing project from the theme list.",
    thesis: "The theme list should expose an existing project directly.",
    threeLineSummary: [
      "The theme list should expose an existing project directly.",
      "That matters because users should not have to open the theme detail just to resume work.",
      "The writing-center entry should stay continuous once a project already exists."
    ],
    boundaryOrCounterpoint: "This only matters once the theme already maps to a project."
  });

  const noteB = await createWritingReadyPermanentNote(apiBase, {
    title: "Theme List Resume B",
    body: "# Theme List Resume B\n\nA second note gives the theme enough structure for a project.",
    thesis: "A second note makes the theme project-ready.",
    threeLineSummary: [
      "A second note makes the theme project-ready.",
      "That matters because the list-level resume button should only appear for a real project path.",
      "It keeps list-level re-entry aligned with detail-level continuity."
    ],
    boundaryOrCounterpoint: "A single isolated note should not qualify for a resume-project entry."
  });

  const relation = await postJson(apiBase, `/api/v1/notes/${encodeURIComponent(noteA.json.item.id)}/relations`, {
    toNoteId: noteB.json.item.id,
    relationType: "supports",
    rationale: "These two notes already form the shared project-ready theme structure.",
    insightQuestion: "How should users resume this project from the theme list?",
    confidence: 1
  });
  assert.equal(relation.status, 201, JSON.stringify(relation.json));

  const theme = await postJson(apiBase, "/api/v1/index-cards", {
    directoryId: "dir_original_default",
    indexType: "topic",
    title: "Theme List Resume Index",
    summary: "A theme index used to verify direct resume-project entry from the list.",
    thesis: "The theme list should show a direct current-theme entry once the writing topic exists.",
    threeLineSummary: ["one", "two", "three"],
    centralQuestion: "How should a theme list expose an already-created project?",
    items: [
      { noteId: noteA.json.item.id, shortLabel: "A", rationale: "First note in the project-ready set." },
      { noteId: noteB.json.item.id, shortLabel: "B", rationale: "Second note in the project-ready set." }
    ]
  });
  assert.equal(theme.status, 201, JSON.stringify(theme.json));

  await page.goto(`${webBase}/prototype`, { waitUntil: "networkidle" });
  await page.locator('.rail-btn[data-module="writing"]').click();
  const topicA = page.locator('#writingThemeIndexList [data-writing-index-card-id]', { hasText: "Theme List Resume Index" });
  await topicA.locator('button.primary').click();
  await page.locator('#writingTitle:visible').waitFor();
  assert.equal(await page.locator('#writingTitle').inputValue(), "Theme List Resume Index");
  await page.locator('#btnWritingCreateScaffold').click();
  await page.locator('#writingScaffoldPanel:visible').waitFor();
  const first = (await fetchJson(apiBase, '/api/v1/writing-projects?limit=20')).json.items;
  assert.equal(first.length, 1);
  assert.ok(first[0].scaffold_id);

  await page.locator('[data-writing-sidebar-action="topics"]').click();
  const topicB = page.locator('#writingThemeIndexList [data-writing-index-card-id]', { hasText: "Theme List Resume Index" });
  await waitFor(async () => {
    assert.equal(await topicB.locator('[data-writing-index-action="resume-scaffold"]').isVisible(), true);
  });
  await topicB.locator('[data-writing-index-action="resume-scaffold"]').click();
  await page.locator('#writingScaffoldPanel:visible').waitFor();
  assert.equal(await page.locator('#writingTitle').inputValue(), first[0].title);
  const after = (await fetchJson(apiBase, '/api/v1/writing-projects?limit=20')).json.items;
  assert.equal(after.length, 1);
  assert.equal(after[0].id, first[0].id);
  assert.equal(after[0].scaffold_id, first[0].scaffold_id);
});
