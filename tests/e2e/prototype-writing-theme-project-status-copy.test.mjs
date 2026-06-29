import test from "node:test";
import assert from "node:assert/strict";
import { createWritingReadyPermanentNote, optionalPlaywright, postJson, putJson, startPrototypeStack, waitFor } from "./prototype-copy-test-helpers.mjs";

test("prototype theme create-project status uses 项目 wording", async (t) => {
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
    title: "Theme Project Status Claim",
    body: "# Theme Project Status Claim\n\nA mature theme entry should use the same project wording as the rest of the writing center.",
    thesis: "Theme entry should report project creation with the same 项目 wording used elsewhere.",
    threeLineSummary: [
      "Theme entry should report project creation consistently.",
      "That matters because the writing center should not switch terminology mid-flow.",
      "It should use 项目 wording once the create-project path succeeds."
    ],
    distillationStatus: "confirmed",
    boundaryOrCounterpoint: "This only applies after the theme really reaches project-ready status."
  });

  const noteB = await createWritingReadyPermanentNote(apiBase, {
    title: "Theme Project Status Support",
    body: "# Theme Project Status Support\n\nA second mature note gives the theme enough structure to create a project.",
    thesis: "A second structured note makes the theme project-ready.",
    threeLineSummary: [
      "A second note adds the missing structure.",
      "That matters because theme creation should depend on structure, not naming drift.",
      "It unlocks the same create-project path as the basket route."
    ],
    distillationStatus: "confirmed",
    boundaryOrCounterpoint: "A single isolated note should still stop before project creation."
  });

  const relation = await postJson(apiBase, `/api/v1/notes/${encodeURIComponent(noteA.json.item.id)}/relations`, {
    toNoteId: noteB.json.item.id,
    relationType: "supports",
    rationale: "The support note gives the theme enough explicit structure to justify project creation.",
    insightQuestion: "What should the theme call this step once project creation succeeds?",
    confidence: 1
  });
  assert.equal(relation.status, 201, JSON.stringify(relation.json));

  const theme = await postJson(apiBase, "/api/v1/index-cards", {
    directoryId: "dir_original_default",
    indexType: "topic",
    title: "Theme Project Status Index",
    summary: "A theme entry used to verify the create-project status wording.",
    thesis: "Theme create-project should surface 项目 wording after success.",
    threeLineSummary: [
      "Theme create-project should surface 项目 wording.",
      "That keeps the success feedback aligned with the rest of the writing center.",
      "It avoids switching back to 写作项目 after the project already exists."
    ],
    centralQuestion: "How should the theme path describe project creation success?",
    items: [
      { noteId: noteA.json.item.id, shortLabel: "claim", rationale: "Sets the naming claim." },
      { noteId: noteB.json.item.id, shortLabel: "support", rationale: "Adds the missing project-ready structure." }
    ]
  });
  assert.equal(theme.status, 201, JSON.stringify(theme.json));

  await page.goto(`${webBase}/prototype`, { waitUntil: "networkidle" });
  await page.locator('.rail-btn[data-module="writing"]').click();
  await page.locator('#writingThemeIndexList .writing-note-card', { hasText: "Theme Project Status Index" }).click();
  await page.waitForFunction(() => {
    const value = document.querySelector("#writingThemeDetailTitle")?.value || "";
    return value.includes("Theme Project Status Index");
  }, null, { timeout: 10000 });

  await page.waitForFunction(() => {
    const button = document.querySelector('[data-writing-theme-action="create-project"]');
    return Boolean(button && !button.hasAttribute("disabled"));
  }, null, { timeout: 10000 });

  await page.click('[data-writing-theme-action="create-project"]');

  await waitFor(async () => {
    const detailText = await page.locator("#writingThemeDetail").textContent();
    assert.match(String(detailText || ""), /写作中心入口/);
    assert.doesNotMatch(String(detailText || ""), /可续接的写作入口|当前主题入口/);

    const statusText = await page.locator("#statusText").textContent();
    assert.match(String(statusText || ""), /已从主题创建项目：wp_/);
    assert.doesNotMatch(String(statusText || ""), /已从主题创建写作项目/);
  }, 10000);
});
