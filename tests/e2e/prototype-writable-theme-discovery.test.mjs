import test from "node:test";
import assert from "node:assert/strict";
import {
  createWritingReadyPermanentNote,
  fetchJson,
  optionalPlaywright,
  postJson,
  startPrototypeStack,
  waitFor
} from "./prototype-copy-test-helpers.mjs";

test("prototype writing center discovers a writable theme suggestion and saves it after confirmation", async (t) => {
  if (process.env.RUN_BROWSER_E2E !== "1") {
    t.skip("Set RUN_BROWSER_E2E=1 to enable browser e2e in local runs.");
    return;
  }

  const playwright = await optionalPlaywright(t);
  if (!playwright) return;

  const stack = await startPrototypeStack(t, playwright);
  if (!stack) return;
  const { apiBase, page, webBase } = stack;

  const notes = [];
  for (const suffix of ["A", "B", "C"]) {
    const created = await createWritingReadyPermanentNote(apiBase, {
      title: `Discovery Theme ${suffix}`,
      body: `# Discovery Theme ${suffix}\n\nThis permanent note belongs to the same user-confirmed writable theme. #auto-theme`,
      thesis: `Discovery theme note ${suffix} explains why suggestions need user confirmation.`,
      threeLineSummary: [
        `Discovery theme note ${suffix} explains why suggestions need user confirmation.`,
        "The local rule should only produce an editable suggestion.",
        "The confirmed suggestion should become a theme index entry."
      ],
      boundaryOrCounterpoint: "The app must not create the theme automatically."
    });
    notes.push(created.json.item);
  }

  for (let index = 0; index < notes.length - 1; index += 1) {
    const relation = await postJson(apiBase, `/api/v1/notes/${encodeURIComponent(notes[index].id)}/relations`, {
      toNoteId: notes[index + 1].id,
      relationType: "supports",
      rationale: "These permanent notes support the same user-confirmed theme suggestion.",
      insightQuestion: "Why should automatic theme discovery stay confirm-first?",
      confidence: 1
    });
    assert.equal(relation.status, 201, JSON.stringify(relation.json));
  }

  await page.goto(`${webBase}/prototype`, { waitUntil: "networkidle" });
  await page.locator('.rail-btn[data-module="writing"]').click();
  await page.locator("#btnWritingDiscoverThemes").click();

  const suggestion = page.locator("[data-theme-discovery-suggestion-id]").first();
  await waitFor(async () => {
    assert.equal(await suggestion.isVisible(), true);
    const text = await suggestion.textContent();
    assert.match(String(text || ""), /可写主题建议/);
    assert.match(String(text || ""), /确认前|保存前|只是建议/);
  }, 10000);

  await suggestion.locator('[data-theme-discovery-field="title"]').fill("User Confirmed Discovery Theme");
  await suggestion.locator('[data-theme-discovery-field="centralQuestion"]').fill("Why must writable theme discovery stay confirm-first?");
  await suggestion.locator('[data-theme-discovery-field="membershipReason"]').fill("These notes all describe why automatic discovery should remain an editable suggestion.");
  await suggestion.locator('[data-theme-discovery-action="save"]').click();

  let savedIndex = null;
  await waitFor(async () => {
    const list = await fetchJson(apiBase, "/api/v1/index-cards?indexType=topic&limit=20");
    assert.equal(list.status, 200, JSON.stringify(list.json));
    savedIndex = list.json.items.find((item) => item.title === "User Confirmed Discovery Theme");
    assert.ok(savedIndex);
    assert.equal(savedIndex.central_question || savedIndex.centralQuestion, "Why must writable theme discovery stay confirm-first?");
    assert.ok((savedIndex.items || []).length >= 3);
  }, 10000);

  await waitFor(async () => {
    const detailTitle = await page.locator("#writingThemeDetailTitle").inputValue();
    const basketText = await page.locator("#writingBasketList").textContent();
    assert.equal(detailTitle, "User Confirmed Discovery Theme");
    assert.match(String(basketText || ""), /Discovery Theme A/);
    assert.match(String(basketText || ""), /Discovery Theme B|Discovery Theme C/);
    assert.ok(savedIndex.id);
  }, 10000);
});
