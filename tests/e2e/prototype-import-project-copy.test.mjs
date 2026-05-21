import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { optionalPlaywright, startPrototypeStack, waitFor } from "./prototype-copy-test-helpers.mjs";

async function openImportsModule(page) {
  await page.locator('.rail-btn[data-module="imports"]').click();
  await waitFor(async () => {
    const isActive = await page.locator('.rail-btn[data-module="imports"]').getAttribute("class");
    assert.match(String(isActive || ""), /active/);
    await page.locator("#importPanel:not(.hidden)").waitFor({ timeout: 500 });
  }, 7000);
  await page.locator("#importAdvanced").evaluate((el) => {
    el.open = true;
  });
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
  const { page, webBase, vaultPath } = stack;
  const recordId = "imp_browser_project_copy";
  const createdAt = new Date().toISOString();

  await fs.mkdir(path.join(vaultPath, "imports", "markdown"), { recursive: true });
  await fs.writeFile(
    path.join(vaultPath, "imports", "markdown", `${recordId}.preview.json`),
    JSON.stringify(
      {
        requestId: "browser_project_copy",
        payload: {},
        options: {},
        preview: {
          importRecordId: recordId,
          connector: "markdown",
          status: "preview",
          state: "preview",
          summary: { sources: 0, literatureNotes: 0, permanentNotes: 1, warnings: 0 },
          samples: {
            sourceIds: [],
            literatureNoteIds: [],
            permanentNoteIds: ["pn_browser_project_copy"]
          },
          warnings: [],
          originalityGuard: {
            plan: {
              warnThreshold: 0.6,
              blockThreshold: 0.8,
              requireCitationLocator: true,
              allowDraftOnWarning: true,
              blockOnBlocked: true
            },
            flaggedPermanentIds: [],
            evaluations: [
              {
                permanentId: "pn_browser_project_copy",
                similarity: 0.19,
                status: "pass",
                reasons: []
              }
            ]
          },
          createdAt,
          updatedAt: createdAt,
          payload: {},
          options: {}
        },
        candidates: {
          sources: [],
          literature: [],
          permanent: [
            {
              id: "pn_browser_project_copy",
              title: "Imported Project Copy Seed",
              core_claim: "An imported permanent note ready to become a project seed.",
              rationale: "",
              from_literature_note_ids: [],
              authorship: { user_confirmed: true, ai_assisted: false },
              originality_status: "pass",
              status: "active",
              tags: ["permanent", "project"],
              citations: [],
              created_at: createdAt,
              updated_at: createdAt,
              connector: "markdown",
              candidate_only: true
            }
          ],
          warnings: []
        }
      },
      null,
      2
    ),
    "utf8"
  );

  await page.goto(`${webBase}/prototype`, { waitUntil: "networkidle" });
  await openImportsModule(page);
  await page.fill("#importRecordId", recordId);
  await page.click("#btnImportRefresh");
  await page.waitForFunction(() => {
    const text = document.querySelector("#importResult")?.textContent || "";
    return text.includes('"stage": "record"') && text.includes("Imported Project Copy Seed");
  });

  await page.click("#btnImportConfirm");
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
