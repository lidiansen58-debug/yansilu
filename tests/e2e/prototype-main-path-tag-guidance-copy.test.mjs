import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { optionalPlaywright, postJson, putJson, startPrototypeStack, waitFor } from "./prototype-copy-test-helpers.mjs";

async function createWritingReadyPermanentNote(baseUrl, payload = {}) {
  const authorship = payload.authorship || { user_confirmed: true, ai_assisted: false };
  const created = await postJson(baseUrl, "/api/v1/notes", {
    directoryId: payload.directoryId,
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

test("prototype main-path tag-only guidance asks to build a real relation from tag overlap", async (t) => {
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
    title: "Main Path Tag Guidance Scope",
    parentDirectoryId: "dir_original_default",
    directoryType: "custom",
    fsPath: path.join(vaultPath, "notes", "original", "main-path-tag-guidance-scope"),
    maxNotes: 500
  });
  assert.equal(directory.status, 201, JSON.stringify(directory.json));
  const directoryId = directory.json.item.id;

  const noteA = await createWritingReadyPermanentNote(apiBase, {
    directoryId,
    title: "Tag Guidance Source",
    body: "# Tag Guidance Source\n\nA confirmed note that only overlaps with another note by tag.\n\n#product-judgment",
    thesis: "Tag overlap alone should not be treated like a real network connection.",
    threeLineSummary: [
      "Tag overlap alone should not be treated like a real network connection.",
      "That matters because the note is not truly connected yet.",
      "The next step should ask for a relation, not pretend the theme is already formed."
    ],
    boundaryOrCounterpoint: "This only matters after the note has already been confirmed."
  });

  await createWritingReadyPermanentNote(apiBase, {
    directoryId,
    title: "Tag Guidance Neighbor",
    body: "# Tag Guidance Neighbor\n\nAnother confirmed note that shares only a tag.\n\n#product-judgment",
    thesis: "Shared tags can hint at a theme, but they do not replace an explicit reason.",
    threeLineSummary: [
      "Shared tags can hint at a theme.",
      "That matters because the graph should still ask why the notes belong together.",
      "A later project needs real relation logic, not only clustering."
    ],
    boundaryOrCounterpoint: "This only matters after the note has already been confirmed."
  });

  await page.goto(`${webBase}/prototype`, { waitUntil: "networkidle" });
  await page.locator(`.explorer-item[data-kind="folder"][data-id="${directoryId}"]`).click();
  await page.locator('.explorer-item[data-kind="file"]', { hasText: "Tag Guidance Source" }).click();
  await ensureNoteMode(page);
  await page.locator("#btnShowRelated").click();

  await waitFor(async () => {
    const mainPathText = await page.locator("[data-note-main-path-section]").textContent();
    assert.match(String(mainPathText || ""), /别只停在标签重合/);
    assert.match(String(mainPathText || ""), /标签上的接近/);
    assert.match(String(mainPathText || ""), /从标签里补关系/);
    assert.doesNotMatch(String(mainPathText || ""), /补关系，不要让它孤立/);
  }, 10000);

  const relationButtonText = await page.locator('[data-note-main-route-action="relations"]').first().textContent();
  assert.match(String(relationButtonText || ""), /从标签里补关系/);
});
