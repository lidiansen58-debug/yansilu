import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { optionalPlaywright, postJson, startPrototypeStack, waitFor } from "./prototype-copy-test-helpers.mjs";

test("prototype graph interpretation uses 写作中心 wording", async (t) => {
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
    title: "Graph Copy Scope",
    parentDirectoryId: "dir_original_default",
    directoryType: "custom",
    fsPath: path.join(vaultPath, "notes", "original", "graph-copy-scope"),
    maxNotes: 500
  });
  assert.equal(graphDirectory.status, 201, JSON.stringify(graphDirectory.json));
  const graphDirectoryId = graphDirectory.json.item.id;

  const targetNote = await postJson(apiBase, "/api/v1/notes", {
    directoryId: graphDirectoryId,
    body: "# Graph copy target\n\nThis note should be visible in the graph."
  });
  assert.equal(targetNote.status, 201);

  const sourceNote = await postJson(apiBase, "/api/v1/notes", {
    directoryId: graphDirectoryId,
    body: "# Graph copy source\n\nThis note links to [[Graph copy target]] and should create one graph edge."
  });
  assert.equal(sourceNote.status, 201);

  await page.goto(`${webBase}/prototype`, { waitUntil: "networkidle" });
  await page.locator(`.explorer-item[data-kind="folder"][data-id="${graphDirectoryId}"]`).click();
  await page.locator('.rail-btn[data-module="graph"]').click();

  await waitFor(async () => {
    await page.waitForSelector("#graphCanvas .graph-node", { timeout: 500 });
    const interpretationText = await page.locator(".graph-map-interpretation").textContent();
    assert.match(String(interpretationText || ""), /进入写作中心/);
    assert.doesNotMatch(String(interpretationText || ""), /进入写作。/);
  }, 10000);
});
