import test from "node:test";
import assert from "node:assert/strict";
import { createWritingReadyPermanentNote, optionalPlaywright, postJson, putJson, startPrototypeStack, waitFor } from "./prototype-copy-test-helpers.mjs";

test("prototype writing project flow keeps core 项目 / 草稿骨架 wording", async (t) => {
  if (process.env.RUN_BROWSER_E2E !== "1") {
    t.skip("Set RUN_BROWSER_E2E=1 to enable browser e2e in local runs.");
    return;
  }

  const playwright = await optionalPlaywright(t);
  if (!playwright) return;

  const stack = await startPrototypeStack(t, playwright);
  if (!stack) return;
  const { apiBase, page } = stack;

  const target = await createWritingReadyPermanentNote(apiBase, {
    title: "Project Flow Target",
    body: "# Project Flow Target\n\nA durable target note.",
    thesis: "A target note helps the source note become ready for project creation.",
    threeLineSummary: [
      "The target note already has a reusable judgment.",
      "It matters because the source note should not remain isolated.",
      "It helps the source note move beyond basket-only readiness."
    ],
    distillationStatus: "confirmed",
    boundaryOrCounterpoint: "This target note is only useful when its relation is explicit."
  });

  const source = await createWritingReadyPermanentNote(apiBase, {
    title: "Project Flow Note",
    body: "# Project Flow Note\n\n[[Project Flow Target]]\n\nA confirmed note with one explicit relation and a boundary.",
    thesis: "A durable note should become project-ready once boundary and relation are both explicit.",
    threeLineSummary: [
      "The note has a reusable judgment.",
      "It matters because project creation should happen after basket entry, not before.",
      "It should still wait for richer theme signals before strong-model analysis."
    ],
    distillationStatus: "confirmed",
    boundaryOrCounterpoint: "This readiness only makes sense after at least one explicit relation is added."
  });

  const relation = await postJson(apiBase, `/api/v1/notes/${encodeURIComponent(source.json.item.id)}/relations`, {
    toNoteId: target.json.item.id,
    relationType: "supports",
    rationale: "The target note strengthens the source note enough to justify project creation.",
    insightQuestion: "What is still missing before this turns into strong-model-ready material?",
    confidence: 1
  });
  assert.equal(relation.status, 201, JSON.stringify(relation.json));

  await page.evaluate((noteItem) => {
    window.__prototypeState.notes = [noteItem];
    window.__prototypeState.browserRootId = "dir_original_default";
    window.__prototypeState.selectedFolderId = "dir_original_default";
    window.__prototypeState.selectedFileId = noteItem.id;
  }, source.json.item);

  await page.locator('.rail-btn[data-module="writing"]').click();
  await page.click("#btnWritingUseCurrent");
  await page.fill("#writingTitle", "Project Flow Browser");
  await page.evaluate(() => {
    const button = document.querySelector("#btnWritingCreateProject");
    if (!(button instanceof HTMLButtonElement)) throw new Error("Create project button not found");
    button.disabled = false;
    button.click();
  });

  await waitFor(async () => {
    const statusText = await page.locator("#statusText").textContent();
    assert.match(String(statusText || ""), /项目已创建：wp_/);
  }, 10000);

  await page.click("#btnWritingCreateScaffold");
  await waitFor(async () => {
    const resultText = await page.locator("#writingResult").textContent();
    assert.match(String(resultText || ""), /草稿骨架/);
    assert.match(String(resultText || ""), /写作意图/);
    assert.match(String(resultText || ""), /读者收获/);
    assert.match(String(resultText || ""), /应该尽早亮出来自「Project Flow Note」的哪条分歧、反例或边界？/);
    assert.doesNotMatch(String(resultText || ""), /Writing intent/);
    assert.doesNotMatch(String(resultText || ""), /Reader takeaway/);
    assert.doesNotMatch(String(resultText || ""), /Which disagreement or limit from \"Project Flow Note\" should surface early\?/);
  }, 10000);
});
