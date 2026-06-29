import test from "node:test";
import assert from "node:assert/strict";
import { optionalPlaywright, postJson, putJson, startPrototypeStack, waitFor } from "./prototype-copy-test-helpers.mjs";

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
    thesis: "The theme list should show a direct current-project entry once the project exists.",
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
  await page.locator('#writingThemeIndexList .writing-note-card', { hasText: "Theme List Resume Index" }).click();
  await page.waitForFunction(() => {
    const button = document.querySelector('[data-writing-theme-action="create-project"]');
    return Boolean(button) && button.disabled === false;
  }, null, { timeout: 10000 });
  await page.click('[data-writing-theme-action="create-project"]');

  await waitFor(async () => {
    const statusText = await page.locator("#statusText").textContent();
    assert.match(String(statusText || ""), /已从主题创建项目：wp_/);
  }, 10000);

  await page.locator('.rail-btn[data-module="writing"]').click();

  await waitFor(async () => {
    const cardText = await page.locator('#writingThemeIndexList .writing-note-card', { hasText: "Theme List Resume Index" }).textContent();
    assert.match(String(cardText || ""), /当前项目：wp_/);
    assert.match(String(cardText || ""), /继续当前项目/);
  }, 10000);

  await page.locator('#writingThemeIndexList .writing-note-card', { hasText: "Theme List Resume Index" }).locator('[data-writing-index-action="resume-project"]').click();

  await waitFor(async () => {
    const statusText = await page.locator("#statusText").textContent();
    assert.match(String(statusText || ""), /已(?:从主题索引)?继续当前项目：wp_/);
  }, 10000);
});
