import assert from "node:assert/strict";
import { optionalPlaywright, startPrototypeStack, fetchJson, waitFor } from "./prototype-copy-test-helpers.mjs";
import { createWritingScopeDirectory } from "./prototype-writing-scope-flow-helpers.mjs";

// Synthetic DTOs isolate dense-canvas presentation; real note/relation workflows
// are covered separately by prototype-graph-guidance-flow-helpers.mjs.
function createDenseGraphFixture(nodeCount = 132) {
  const nodes = Array.from({ length: nodeCount }, (_, index) => ({
    id: `star-${index + 1}`,
    title: `Star Note ${index + 1}`,
    noteType: "original",
    directoryId: "dir_original_default",
    folderId: "dir_original_default"
  }));
  const edges = [];
  for (let index = 0; index < nodeCount; index += 1) {
    const from = nodes[index];
    const to = nodes[(index + 1) % nodeCount];
    edges.push({
      id: `edge-ring-${index + 1}`,
      fromNoteId: from.id,
      toNoteId: to.id,
      fromTitle: from.title,
      toTitle: to.title,
      relationType: index % 7 === 0 ? "bridges" : index % 5 === 0 ? "contradicts" : "supports",
      rationale: "A mocked relation used to exercise dense graph rendering.",
      status: "confirmed",
      createdBy: "user"
    });
  }
  for (let index = 0; index < 36; index += 1) {
    const from = nodes[index];
    const to = nodes[(index * 7 + 19) % nodeCount];
    edges.push({
      id: `edge-cross-${index + 1}`,
      fromNoteId: from.id,
      toNoteId: to.id,
      fromTitle: from.title,
      toTitle: to.title,
      relationType: index % 3 === 0 ? "contradicts" : "supports",
      rationale: "A mocked cross-cluster relation used to exercise density reduction.",
      status: "confirmed",
      createdBy: "user"
    });
  }
  return {
    directoryTitle: "Starfield Test Graph",
    nodes,
    edges,
    insights: {
      bridgeGaps: [
        {
          key: "gap-1",
          type: "disconnected_cluster",
          title: "Bridge candidate",
          noteIds: ["star-2", "star-3"],
          targetNoteIds: ["star-40", "star-41"],
          reason: "Two clusters are close enough to warrant a bridge check."
        }
      ],
      untypedRelations: []
    }
  };
}

async function mockGraphEndpoints(page, graph = createDenseGraphFixture()) {
  await page.route("**/api/v1/graph?*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ item: graph })
    });
  });
  await page.route("**/api/v1/graph/conflicts?*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ conflicts: [] })
    });
  });
  await page.route("**/api/v1/relations/review-queue?*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        total: 2,
        items: [
          {
            id: "review-1",
            fromTitle: "Star Note 4",
            toTitle: "Star Note 21",
            relationType: "supports",
            rationale: ""
          }
        ]
      })
    });
  });
}

export async function startGraphPresentationStack(t) {
  if (process.env.RUN_BROWSER_E2E !== "1") { t.skip("Set RUN_BROWSER_E2E=1"); return null; }
  const pw = await optionalPlaywright(t);
  return pw ? startPrototypeStack(t, pw) : null;
}

export async function openPresentationGraph(stack) {
  const directory = await createWritingScopeDirectory(stack, "图谱显示压力", "graph-presentation");
  const graph = createDenseGraphFixture();
  graph.directoryTitle = directory.title;
  for (const node of graph.nodes) { node.directoryId = directory.id; node.folderId = directory.id; }
  await mockGraphEndpoints(stack.page, graph);
  await stack.page.goto(`${stack.webBase}/prototype`, { waitUntil: "networkidle" });
  await stack.page.locator('.rail-btn[data-action="quick-original"]').click();
  await stack.page.locator(`.explorer-item[data-kind="folder"][data-id="${directory.id}"]`).click();
  await stack.page.locator('.rail-btn[data-module="graph"]').click();
  await waitFor(async () => assert.equal(await stack.page.locator("#graphCanvas .graph-map-node").count(), graph.nodes.length));
  return { graph, directory };
}

export async function assertPresentationDoesNotWrite(stack) {
  for (const endpoint of ["/api/v1/index-cards?limit=50", "/api/v1/writing-projects?limit=50"]) assert.deepEqual((await fetchJson(stack.apiBase, endpoint)).json.items, []);
}
