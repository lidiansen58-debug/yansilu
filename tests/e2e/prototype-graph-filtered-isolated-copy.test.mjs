import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { optionalPlaywright, postJson, putJson, startPrototypeStack, waitFor } from "./prototype-copy-test-helpers.mjs";

async function createWritingReadyPermanentNote(baseUrl, directoryId, title, bodyText) {
  const created = await postJson(baseUrl, "/api/v1/notes", {
    directoryId,
    title,
    body: `# ${title}\n\n${bodyText}`,
    thesis: `${title} participates in graph focus guidance.`,
    threeLineSummary: [
      `${title} participates in graph focus guidance.`,
      "That matters because the graph should keep focused relation work readable.",
      "Unrelated isolated notes should not hijack the current note workflow."
    ],
    distillationStatus: "draft",
    boundaryOrCounterpoint: "This only matters after the notes are mature enough for graph follow-up."
  });
  assert.equal(created.status, 201, JSON.stringify(created.json));
  const noteId = created.json.item.id;
  const updated = await putJson(baseUrl, `/api/v1/notes/${encodeURIComponent(noteId)}`, {
    title,
    body: `# ${title}\n\n${bodyText}`,
    status: "active",
    thesis: `${title} participates in graph focus guidance.`,
    threeLineSummary: [
      `${title} participates in graph focus guidance.`,
      "That matters because the graph should keep focused relation work readable.",
      "Unrelated isolated notes should not hijack the current note workflow."
    ],
    distillationStatus: "confirmed",
    originalityStatus: "pass",
    authorship: { user_confirmed: true, ai_assisted: false },
    authorshipConfirmed: true,
    authorshipAiAssisted: false,
    boundaryOrCounterpoint: "This only matters after the notes are mature enough for graph follow-up."
  });
  assert.equal(updated.status, 200, JSON.stringify(updated.json));
  return updated;
}

test("prototype graph focus keeps full relation workbench while canvas relation filter narrows the map", async (t) => {
  if (process.env.RUN_BROWSER_E2E !== "1") {
    t.skip("Set RUN_BROWSER_E2E=1 to enable browser e2e in local runs.");
    return;
  }

  const playwright = await optionalPlaywright(t);
  if (!playwright) return;

  const stack = await startPrototypeStack(t, playwright);
  if (!stack) return;
  const { apiBase, page, vaultPath, webBase } = stack;

  const graphDirectory = await postJson(apiBase, "/api/v1/directories", {
    title: "Graph Focus Scope",
    parentDirectoryId: "dir_original_default",
    directoryType: "custom",
    fsPath: path.join(vaultPath, "notes", "original", "graph-focus-scope"),
    maxNotes: 500
  });
  assert.equal(graphDirectory.status, 201, JSON.stringify(graphDirectory.json));
  const graphDirectoryId = graphDirectory.json.item.id;

  const noteA = await createWritingReadyPermanentNote(
    apiBase,
    graphDirectoryId,
    "Filtered Graph A",
    "This note connects to multiple visible partners in the focused relation slice."
  );
  const noteB = await createWritingReadyPermanentNote(
    apiBase,
    graphDirectoryId,
    "Filtered Graph B",
    "This note stays visible after filtering to same-topic relations."
  );
  const noteC = await createWritingReadyPermanentNote(
    apiBase,
    graphDirectoryId,
    "Filtered Graph C",
    "This note should remain in the right workbench even when the canvas filter hides its edge."
  );
  await createWritingReadyPermanentNote(
    apiBase,
    graphDirectoryId,
    "Hidden Isolated Graph Note",
    "This note stays outside the current focused relation slice."
  );

  const sameTopicRelation = await postJson(apiBase, `/api/v1/notes/${encodeURIComponent(noteA.json.item.id)}/relations`, {
    toNoteId: noteB.json.item.id,
    relationType: "same_topic",
    rationale: "These two notes form one visible focused relation slice.",
    insightQuestion: "Should the current focused slice still be blocked by an unrelated isolated note?",
    confidence: 1
  });
  assert.equal(sameTopicRelation.status, 201, JSON.stringify(sameTopicRelation.json));

  const supportsRelation = await postJson(apiBase, `/api/v1/notes/${encodeURIComponent(noteA.json.item.id)}/relations`, {
    toNoteId: noteC.json.item.id,
    relationType: "supports",
    rationale: "This second relation should stay visible in the workbench even when the canvas is filtered.",
    insightQuestion: "Does the current note still need both relations in view for follow-up work?",
    confidence: 1
  });
  assert.equal(supportsRelation.status, 201, JSON.stringify(supportsRelation.json));

  await page.goto(`${webBase}/prototype`, { waitUntil: "networkidle" });
  await page.locator(`.explorer-item[data-kind="folder"][data-id="${graphDirectoryId}"]`).click();
  await page.locator('.rail-btn[data-module="graph"]').click();

  await waitFor(async () => {
    const summary = await page.locator("#graphSummary").textContent();
    assert.match(String(summary || ""), /4\s*条永久笔记/);
    assert.match(String(summary || ""), /2\s*条关系/);
  }, 10000);

  await page.locator(`#graphCanvas .graph-map-node[data-node-id="${noteA.json.item.id}"]`).click();

  await waitFor(async () => {
    const panelText = await page.locator("#graphPanel").textContent();
    assert.match(String(panelText || ""), /Filtered Graph A/);
    assert.match(String(panelText || ""), /Filtered Graph B/);
    assert.match(String(panelText || ""), /Filtered Graph C/);
    assert.doesNotMatch(String(panelText || ""), /加入笔记网络|未入星系笔记整理详情/);
    assert.equal(await page.locator(".graph-relation-workspace-card").count(), 2);
  }, 10000);

  await page.locator("#graphRelationTypeFilter").selectOption("same_topic");

  await waitFor(async () => {
    assert.equal(await page.locator("#graphRelationTypeFilter").inputValue(), "same_topic");
    assert.equal(await page.locator("#graphCanvas .graph-map-edge-group").count(), 1);

    const panelText = await page.locator("#graphPanel").textContent();
    assert.match(String(panelText || ""), /Filtered Graph A/);
    assert.match(String(panelText || ""), /Filtered Graph B/);
    assert.match(String(panelText || ""), /Filtered Graph C/);
    assert.doesNotMatch(String(panelText || ""), /加入笔记网络|未入星系笔记整理详情/);
    assert.equal(await page.locator(".graph-relation-workspace-card").count(), 2);
  }, 10000);
});
