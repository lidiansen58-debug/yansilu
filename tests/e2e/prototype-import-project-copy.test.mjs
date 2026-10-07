import test from "node:test";
import assert from "node:assert/strict";
import { optionalPlaywright, startPrototypeStack, postJson, fetchJson } from "./prototype-copy-test-helpers.mjs";

test("a permanent-only receipt leads to ordinary organizing without silently creating a writing project", async (t) => {
  if (process.env.RUN_BROWSER_E2E !== "1") {
    t.skip("Set RUN_BROWSER_E2E=1 to enable browser e2e in local runs.");
    return;
  }

  const playwright = await optionalPlaywright(t);
  if (!playwright) return;

  const stack = await startPrototypeStack(t, playwright);
  if (!stack) return;
  const { apiBase, page } = stack;

  const created = await postJson(apiBase, "/api/v1/notes", {
    directoryId: "dir_original_default",
    body: "# 待整理的观点\n\n这条记录仍需要用户核对判断和依据。"
  });
  assert.equal(created.status, 201, JSON.stringify(created.json));
  const id = created.json.item.id;
  await page.reload({ waitUntil: "networkidle" });
  await page.locator('.rail-btn[data-module="settings"]').click();
  await page.locator('[data-settings-item="import-export"]').click();
  // Presentation coverage for a permanent-only receipt; real default import is covered separately.
  await page.evaluate(id => window.__prototypeImport.showResult({
    stage: "confirm", status: "completed", importRecordId: "receipt-presentation",
    result: { createdFiles: [{ noteId: id, noteType: "permanent" }] }
  }), id);
  const next = page.locator('#importResult [data-import-writing-action="open-today"]');
  await next.waitFor();
  assert.equal(await page.locator("#importResult [data-import-writing-action]:visible").count(), 1);
  assert.equal(await next.innerText(), "去首页整理");
  await next.click();
  assert.equal(await page.locator("#importOperationResultModal").isVisible(), false);
  assert.match(await page.locator('.rail-btn[data-module="today"]').getAttribute("class"), /active/);
  await page.locator('.rail-btn[data-module="settings"]').click();
  assert.equal(await page.locator("#importOperationResultModal").isVisible(), false);
  const projects = await fetchJson(apiBase, "/api/v1/writing-projects?limit=20");
  assert.equal(projects.json.items.length, 0);
  const note = await fetchJson(apiBase, `/api/v1/notes/${id}`);
  assert.equal(note.json.item.authorship.user_confirmed, false);
});
