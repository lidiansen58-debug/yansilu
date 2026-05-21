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
    distillationStatus: "confirmed",
    originalityStatus: "pass",
    authorship: { user_confirmed: true, ai_assisted: false },
    authorshipConfirmed: true,
    authorshipAiAssisted: false
  });
  assert.equal(updated.status, 200, JSON.stringify(updated.json));
  return updated;
}

test("prototype writing readiness status uses Chinese has_gaps label", async (t) => {
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
    title: "Writing Has Gaps Status Note",
    body: "# Writing Has Gaps Status Note\n\nA note with summary but no one-sentence judgment.",
    thesis: "",
    threeLineSummary: ["one", "two", "three"]
  });

  await page.evaluate((noteItem) => {
    window.__prototypeState.notes = [noteItem];
    window.__prototypeState.browserRootId = "dir_original_default";
    window.__prototypeState.selectedFolderId = "dir_original_default";
    window.__prototypeState.selectedFileId = noteItem.id;
  }, note.json.item);

  await page.locator('.rail-btn[data-module="writing"]').click();
  await page.click("#btnWritingUseCurrent");
  await page.fill("#writingTitle", "Has Gaps Project");
  await page.evaluate(() => {
    const button = document.querySelector("#btnWritingCreateProject");
    if (!(button instanceof HTMLButtonElement)) throw new Error("Create project button not found");
    button.disabled = false;
    button.click();
  });

  let projectId = "";
  await waitFor(async () => {
    const statusText = await page.locator("#statusText").textContent();
    const match = String(statusText || "").match(/wp_[a-z0-9]+/i);
    assert.ok(match);
    projectId = match[0];
  }, 10000);

  await page.evaluate(async ({ id, apiBase: baseUrl }) => {
    const response = await fetch(`${baseUrl}/api/v1/writing-projects/${encodeURIComponent(id)}/intent`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        intent: "Explain the missing one-sentence judgment.",
        desiredReaderTakeaway: "The reader should see the missing-thesis gap clearly."
      })
    });
    if (!response.ok) throw new Error(`intent patch failed: ${response.status}`);
  }, { id: projectId, apiBase });

  await page.click("#btnWritingCreateScaffold");
  await waitFor(async () => {
    const resultText = await page.locator("#writingResult").textContent();
    assert.match(String(resultText || ""), /- 状态: 仍有缺口/);
    assert.doesNotMatch(String(resultText || ""), /- 状态: has_gaps/);
  }, 10000);
});
