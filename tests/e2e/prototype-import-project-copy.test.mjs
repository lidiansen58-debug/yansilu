import test from "node:test";
import assert from "node:assert/strict";
import { optionalPlaywright, startPrototypeStack, waitFor } from "./prototype-copy-test-helpers.mjs";

async function openImportsModule(page) {
  await page.locator('.rail-btn[data-module="imports"]').click();
  await waitFor(async () => {
    const isActive = await page.locator('.rail-btn[data-module="imports"]').getAttribute("class");
    assert.match(String(isActive || ""), /active/);
    await page.locator("#importPanel:not(.hidden)").waitFor({ timeout: 500 });
    await page.locator("#importWorkspaceTabImport").waitFor({ timeout: 500 });
  }, 7000);
  await page.locator(".import-compat-details").evaluate((el) => {
    el.open = true;
  });
}

async function postJson(baseUrl, urlPath, body) {
  const response = await fetch(`${baseUrl}${urlPath}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  });
  const payload = await response.json();
  return { status: response.status, payload };
}

test("prototype import create-project action uses 项目 wording", async (t) => {
  if (process.env.RUN_BROWSER_E2E !== "1") {
    t.skip("Set RUN_BROWSER_E2E=1 to enable browser e2e in local runs.");
    return;
  }

  const playwright = await optionalPlaywright(t);
  if (!playwright) return;

  const stack = await startPrototypeStack(t, playwright);
  if (!stack) return;
  const { apiBase, page, webBase } = stack;
  const recordId = "imp_browser_project_copy";

  const created = await postJson(apiBase, "/api/v1/notes", {
    directoryId: "dir_original_default",
    body: "# Imported Project Copy Seed\n\nAn imported permanent note ready to become a project seed."
  });
  assert.equal(created.status, 201, JSON.stringify(created.payload));
  const noteId = created.payload.item.id;

  await page.goto(`${webBase}/prototype`, { waitUntil: "networkidle" });
  await openImportsModule(page);
  await page.evaluate(
    ({ noteId, recordId }) => {
      window.__prototypeImport?.showResult?.({
        stage: "confirm",
        importRecordId: recordId,
        status: "completed",
        result: {
          created: { sources: 0, literatureNotes: 0, permanentNotes: 1 },
          skipped: { conflicted: 0, invalid: 0 },
          selection: {
            mode: "subset",
            candidateIds: [noteId],
            totalCandidates: 1,
            selectedCandidates: 1,
            counts: { sources: 0, literatureNotes: 0, permanentNotes: 1 }
          },
          createdFiles: [{ noteId, noteType: "permanent", title: "Imported Project Copy Seed", path: `notes/original/${noteId}.md` }]
        }
      });
    },
    { noteId, recordId }
  );
  await page.waitForFunction(() => {
    const text = document.querySelector("#importResult")?.textContent || "";
    return text.includes('"stage": "confirm"') && text.includes("Imported Project Copy Seed");
  });

  await page.locator("#importOperationResultModal:not(.hidden)").waitFor();
  await page.locator('#importResult .result-card[data-result-stage="confirm"]').waitFor();
  const importResultText = await page.locator("#importResult").textContent();
  assert.match(String(importResultText || ""), /直接创建项目/);
  assert.doesNotMatch(String(importResultText || ""), /直接创建写作项目/);
  await page.locator('[data-import-writing-action="create-writing-project"]').click();

  await waitFor(async () => {
    const statusText = await page.locator("#statusText").textContent();
    assert.match(String(statusText || ""), /已从导入结果创建项目：wp_/);
    assert.doesNotMatch(String(statusText || ""), /已从导入结果创建写作项目/);
  }, 10000);
});
