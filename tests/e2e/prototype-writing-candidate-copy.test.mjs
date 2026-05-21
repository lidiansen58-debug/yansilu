import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { optionalPlaywright, postJson, putJson, startPrototypeStack, waitFor } from "./prototype-copy-test-helpers.mjs";

async function createWritingReadyPermanentNote(baseUrl, directoryId, title) {
  const created = await postJson(baseUrl, "/api/v1/notes", {
    directoryId,
    title,
    body: `# ${title}\n\nA permanent note ready for writing candidates.`,
    thesis: `${title} should appear in the writing candidate summary.`,
    threeLineSummary: [
      `${title} should appear in the writing candidate summary.`,
      "That matters because the summary should use the same 加入写作篮 wording as the buttons.",
      "It helps the current directory summary stay consistent with the rest of the writing center."
    ],
    distillationStatus: "draft"
  });
  assert.equal(created.status, 201, JSON.stringify(created.json));
  const noteId = created.json.item.id;
  const updated = await putJson(baseUrl, `/api/v1/notes/${encodeURIComponent(noteId)}`, {
    title,
    body: `# ${title}\n\nA permanent note ready for writing candidates.`,
    status: "active",
    thesis: `${title} should appear in the writing candidate summary.`,
    threeLineSummary: [
      `${title} should appear in the writing candidate summary.`,
      "That matters because the summary should use the same 加入写作篮 wording as the buttons.",
      "It helps the current directory summary stay consistent with the rest of the writing center."
    ],
    distillationStatus: "confirmed",
    originalityStatus: "pass",
    authorship: { user_confirmed: true, ai_assisted: false },
    authorshipConfirmed: true,
    authorshipAiAssisted: false,
    boundaryOrCounterpoint: "Only use this note when the surrounding question is clear."
  });
  assert.equal(updated.status, 200, JSON.stringify(updated.json));
  return updated;
}

test("prototype writing candidate summary uses 加入写作篮 wording", async (t) => {
  if (process.env.RUN_BROWSER_E2E !== "1") {
    t.skip("Set RUN_BROWSER_E2E=1 to enable browser e2e in local runs.");
    return;
  }

  const playwright = await optionalPlaywright(t);
  if (!playwright) return;

  const stack = await startPrototypeStack(t, playwright);
  if (!stack) return;
  const { apiBase, page, webBase, vaultPath } = stack;

  const directory = await postJson(apiBase, "/api/v1/directories", {
    title: "Writing Candidate Copy Scope",
    parentDirectoryId: "dir_original_default",
    directoryType: "custom",
    fsPath: path.join(vaultPath, "notes", "original", "writing-candidate-copy-scope"),
    maxNotes: 500
  });
  assert.equal(directory.status, 201, JSON.stringify(directory.json));
  const directoryId = directory.json.item.id;

  await createWritingReadyPermanentNote(apiBase, directoryId, "Candidate Copy Note A");
  await createWritingReadyPermanentNote(apiBase, directoryId, "Candidate Copy Note B");

  await page.goto(`${webBase}/prototype`, { waitUntil: "networkidle" });
  await page.locator(`.explorer-item[data-kind="folder"][data-id="${directoryId}"]`).click();
  await page.locator('.rail-btn[data-module="writing"]').click();
  await page.waitForFunction(() => !document.querySelector("#writingPanel")?.classList.contains("hidden"));

  await waitFor(async () => {
    const summaryText = await page.locator("#writingCandidateSummary").textContent();
    assert.match(String(summaryText || ""), /加入写作篮/);
    assert.doesNotMatch(String(summaryText || ""), /进入写作篮/);
  }, 10000);
});
