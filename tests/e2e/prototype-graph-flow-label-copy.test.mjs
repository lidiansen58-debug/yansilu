import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { optionalPlaywright, postJson, startPrototypeStack, waitFor } from "./prototype-copy-test-helpers.mjs";

test("prototype graph flow relation label uses 进入草稿 wording", async (t) => {
  if (process.env.RUN_BROWSER_E2E !== "1") {
    t.skip("Set RUN_BROWSER_E2E=1 to enable browser e2e in local runs.");
    return;
  }

  const playwright = await optionalPlaywright(t);
  if (!playwright) return;

  const stack = await startPrototypeStack(t, playwright);
  if (!stack) return;
  const { apiBase, page, webBase, vaultPath } = stack;

  const graphDirectory = await postJson(apiBase, "/api/v1/directories", {
    title: "Graph Flow Label Scope",
    parentDirectoryId: "dir_original_default",
    directoryType: "custom",
    fsPath: path.join(vaultPath, "notes", "original", "graph-flow-label-scope"),
    maxNotes: 500
  });
  assert.equal(graphDirectory.status, 201, JSON.stringify(graphDirectory.json));
  const graphDirectoryId = graphDirectory.json.item.id;

  const sourceNote = await postJson(apiBase, "/api/v1/notes", {
    directoryId: graphDirectoryId,
    body: "# Draft Flow Source\n\nThis note should show a flow relation in the graph."
  });
  assert.equal(sourceNote.status, 201);

  const targetNote = await postJson(apiBase, "/api/v1/notes", {
    directoryId: graphDirectoryId,
    body: "# Draft Flow Target\n\nThis note represents a draft-stage writing destination."
  });
  assert.equal(targetNote.status, 201);

  const relation = await postJson(apiBase, `/api/v1/notes/${encodeURIComponent(sourceNote.json.item.id)}/relations`, {
    toNoteId: targetNote.json.item.id,
    relationType: "appears_in_draft",
    rationale: "This note should appear in the draft flow as supporting material.",
    confidence: 1
  });
  assert.equal(relation.status, 201, JSON.stringify(relation.json));

  await page.goto(`${webBase}/prototype`, { waitUntil: "networkidle" });
  await page.locator(`.explorer-item[data-kind="folder"][data-id="${graphDirectoryId}"]`).click();
  await page.locator('.rail-btn[data-module="graph"]').click();

  await waitFor(async () => {
    const graphText = await page.locator("#graphPanel").textContent();
    assert.match(String(graphText || ""), /进入草稿/);
    assert.doesNotMatch(String(graphText || ""), /appears_in_draft: "进入写作"|类型：进入写作/);
  }, 10000);
});
