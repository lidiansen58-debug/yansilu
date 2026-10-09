import test from "node:test";
import assert from "node:assert/strict";
import { optionalPlaywright, postJson, putJson, startPrototypeStack, waitFor } from "./prototype-copy-test-helpers.mjs";

async function createNeedsDistillationPermanentNote(baseUrl, payload = {}) {
  const authorship = payload.authorship || { user_confirmed: true, ai_assisted: false };
  const created = await postJson(baseUrl, "/api/v1/notes", {
    directoryId: payload.directoryId || "dir_original_default",
    title: payload.title,
    body: payload.body,
    thesis: payload.thesis,
    threeLineSummary: payload.threeLineSummary,
    distillationStatus: "draft"
  });
  assert.equal(created.status, 201, JSON.stringify(created.json));
  const noteId = created.json.item.id;
  const updated = await putJson(baseUrl, `/api/v1/notes/${encodeURIComponent(noteId)}`, {
    title: payload.title || created.json.item.title,
    body: payload.body || created.json.item.body,
    status: "active",
    thesis: payload.thesis,
    threeLineSummary: payload.threeLineSummary,
    distillationStatus: payload.distillationStatus || "draft",
    originalityStatus: "pass",
    authorship,
    authorshipConfirmed: true,
    authorshipAiAssisted: Boolean(authorship.ai_assisted),
    boundaryOrCounterpoint: payload.boundaryOrCounterpoint || ""
  });
  assert.equal(updated.status, 200, JSON.stringify(updated.json));
  return updated;
}

async function ensureNoteMode(page) {
  const alreadyNoteMode = await page.evaluate(() =>
    document.querySelector("#markdownSplit")?.classList.contains("editor-mode-wysiwyg")
  ).catch(() => false);
  if (alreadyNoteMode) return;
  const modeButton = page.locator("#btnModeToggle");
  if (!(await modeButton.isVisible().catch(() => false))) return;
  await modeButton.click();
  await page.waitForFunction(() => {
    const split = document.querySelector("#markdownSplit");
    const host = document.querySelector("#wysiwygHost");
    if (!split || !host) return false;
    return split.classList.contains("editor-mode-wysiwyg") && window.getComputedStyle(host).display !== "none";
  });
}

test("prototype needs-distillation copy points toward viewpoint distillation", async (t) => {
  if (process.env.RUN_BROWSER_E2E !== "1") {
    t.skip("Set RUN_BROWSER_E2E=1 to enable browser e2e in local runs.");
    return;
  }

  const playwright = await optionalPlaywright(t);
  if (!playwright) return;

  const stack = await startPrototypeStack(t, playwright);
  if (!stack) return;
  const { apiBase, page, webBase } = stack;

  const note = await createNeedsDistillationPermanentNote(apiBase, {
    title: "Needs Distillation Copy Note",
    body: "# Needs Distillation Copy Note\n\nA note with a thesis but still draft distillation.",
    thesis: "A reusable judgment still needs confirmation before the user enters the writing center.",
    threeLineSummary: [
      "A reusable judgment still needs confirmation.",
      "That matters because the main-path copy should not send draft viewpoints to writing too early.",
      "The route should point to viewpoint distillation before the writing center."
    ],
    distillationStatus: "draft",
    authorship: {
      user_confirmed: true,
      ai_assisted: false
    }
  });

  await page.goto(`${webBase}/prototype?note=${encodeURIComponent(note.json.item.id)}`, { waitUntil: "networkidle" });
  await page.waitForFunction(
    (noteId) => Array.isArray(window.__prototypeState?.notes) && window.__prototypeState.notes.some((item) => item?.id === noteId),
    note.json.item.id
  );
  await page.locator('[data-action="quick-original"]').click();
  await page.locator(`.explorer-item[data-kind="file"][data-id="${note.json.item.id}"]`).click();
  await ensureNoteMode(page);
  await page.locator("#btnShowRelated").click();
  const panel = page.locator("#resultArea");
  await waitFor(async () => {
    assert.match(await panel.innerText(), /当前观点/);
    assert.equal(await panel.getByRole("button", { name: "保存当前观点", exact: true }).isVisible(), true);
    assert.doesNotMatch(await panel.innerText(), /进入写作中心/);
  });
});
