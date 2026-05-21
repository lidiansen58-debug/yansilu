import test from "node:test";
import assert from "node:assert/strict";
import { optionalPlaywright, postJson, putJson, startPrototypeStack, waitFor } from "./prototype-copy-test-helpers.mjs";

async function createPermanentNote(baseUrl, payload = {}) {
  const created = await postJson(baseUrl, "/api/v1/notes", {
    directoryId: "dir_original_default",
    title: payload.title,
    body: payload.body,
    thesis: payload.thesis,
    threeLineSummary: payload.threeLineSummary,
    distillationStatus: "draft"
  });
  assert.equal(created.status, 201, JSON.stringify(created.json));

  const noteId = created.json.item.id;
  const updated = await putJson(baseUrl, `/api/v1/notes/${encodeURIComponent(noteId)}`, {
    title: payload.title,
    body: payload.body,
    status: "active",
    thesis: payload.thesis,
    threeLineSummary: payload.threeLineSummary,
    distillationStatus: payload.distillationStatus,
    originalityStatus: "pass",
    authorship: { user_confirmed: true, ai_assisted: false },
    authorshipConfirmed: true,
    authorshipAiAssisted: false
  });
  assert.equal(updated.status, 200, JSON.stringify(updated.json));
  return updated;
}

test("prototype confirmed-distillation warning uses Chinese copy in scaffold result", async (t) => {
  if (process.env.RUN_BROWSER_E2E !== "1") {
    t.skip("Set RUN_BROWSER_E2E=1 to enable browser e2e in local runs.");
    return;
  }

  const playwright = await optionalPlaywright(t);
  if (!playwright) return;

  const stack = await startPrototypeStack(t, playwright);
  if (!stack) return;
  const { apiBase, page } = stack;

  const note = await createPermanentNote(apiBase, {
    title: "Writing Confirmed Distillation Warning Note",
    body: "# Writing Confirmed Distillation Warning Note\n\nA note that is still not confirmed.",
    thesis: "A note still missing confirmed distillation should show a Chinese warning.",
    threeLineSummary: ["one", "two", "three"],
    distillationStatus: "draft"
  });

  await page.evaluate((noteItem) => {
    window.__prototypeState.notes = [noteItem];
    window.__prototypeState.browserRootId = "dir_original_default";
    window.__prototypeState.selectedFolderId = "dir_original_default";
    window.__prototypeState.selectedFileId = noteItem.id;
  }, note.json.item);

  await page.locator('.rail-btn[data-module="writing"]').click();
  await page.click("#btnWritingUseCurrent");
  await page.fill("#writingTitle", "Confirmed Distillation Warning Project");
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
    assert.match(String(resultText || ""), /还有 1 条写作篮笔记需要补齐一句话判断与三句话提纯确认。/);
    assert.doesNotMatch(String(resultText || ""), /basket notes still need confirmed thesis and three-line distillation\./);
    assert.doesNotMatch(String(resultText || ""), /thesis 与三句话提纯确认/);
  }, 10000);
});
