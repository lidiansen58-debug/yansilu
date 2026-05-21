import test from "node:test";
import assert from "node:assert/strict";
import { createWritingReadyPermanentNote, optionalPlaywright, postJson, putJson, startPrototypeStack, waitFor } from "./prototype-copy-test-helpers.mjs";

test("prototype scaffold preview empty states use 草稿骨架 wording", async (t) => {
  if (process.env.RUN_BROWSER_E2E !== "1") {
    t.skip("Set RUN_BROWSER_E2E=1 to enable browser e2e in local runs.");
    return;
  }

  const playwright = await optionalPlaywright(t);
  if (!playwright) return;

  const stack = await startPrototypeStack(t, playwright);
  if (!stack) return;
  const { apiBase, page } = stack;

  const note = await createWritingReadyPermanentNote(apiBase, {
    title: "Writing Empty Scaffold Note",
    body: "# Writing Empty Scaffold Note\n\nA confirmed note ready for project creation.",
    thesis: "Empty scaffold preview states should refer to 草稿骨架 instead of scaffold.",
    threeLineSummary: [
      "This note already has a reusable judgment.",
      "It matters because the scaffold preview empty state is still part of the writing-center continuity.",
      "It should not fall back to mixed English wording."
    ],
    boundaryOrCounterpoint: "This only makes sense once the project exists and a scaffold response is returned."
  });

  await page.evaluate((noteItem) => {
    window.__prototypeState.notes = [noteItem];
    window.__prototypeState.browserRootId = "dir_original_default";
    window.__prototypeState.selectedFolderId = "dir_original_default";
    window.__prototypeState.selectedFileId = noteItem.id;
  }, note.json.item);

  await page.evaluate(() => {
    const originalFetch = window.fetch.bind(window);
    window.fetch = async (...args) => {
      const response = await originalFetch(...args);
      const [input, init] = args;
      const url = String(typeof input === "string" ? input : input?.url || "");
      const method = String(init?.method || (typeof input === "object" && input ? input.method : "") || "GET").toUpperCase();
      if (method === "POST" && url.includes("/api/v1/draft-scaffolds")) {
        const json = await response.clone().json();
        if (json?.item) {
          json.item.sections = [];
          json.item.open_questions = [];
        }
        if (json?.export) {
          json.export.markdown = "# Empty Scaffold\n";
        }
        return new Response(JSON.stringify(json), {
          status: response.status,
          statusText: response.statusText,
          headers: response.headers
        });
      }
      return response;
    };
  });

  await page.locator('.rail-btn[data-module="writing"]').click();
  await page.click("#btnWritingUseCurrent");
  await page.fill("#writingTitle", "Empty Scaffold Project");
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
    const previewText = await page.locator("#writingScaffoldPreview").textContent();
    assert.match(String(previewText || ""), /当前草稿骨架还没有章节。/);
    assert.match(String(previewText || ""), /当前草稿骨架还没有开放问题。/);
    assert.doesNotMatch(String(previewText || ""), /当前 scaffold 还没有章节。/);
    assert.doesNotMatch(String(previewText || ""), /当前 scaffold 还没有开放问题。/);
  }, 10000);
});
