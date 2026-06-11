import test from "node:test";
import assert from "node:assert/strict";
import { optionalPlaywright, startPrototypeStack, waitFor } from "./prototype-copy-test-helpers.mjs";

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

async function openMockedGraph(page, webBase) {
  await page.goto(`${webBase}/prototype`, { waitUntil: "networkidle" });
  await page.locator('.rail-btn[data-module="graph"]').click();
  await waitFor(async () => {
    assert.ok(await page.locator("#graphCanvas .graph-map-panel").isVisible());
    assert.ok((await page.locator("#graphCanvas .graph-map-node").count()) > 80);
  }, 10000);
}

test("prototype graph research navigator opens cluster and bright-star explanations", async (t) => {
  if (process.env.RUN_BROWSER_E2E !== "1") {
    t.skip("Set RUN_BROWSER_E2E=1 to enable browser e2e in local runs.");
    return;
  }

  const playwright = await optionalPlaywright(t);
  if (!playwright) return;

  const stack = await startPrototypeStack(t, playwright);
  if (!stack) return;
  const { page, webBase } = stack;

  await mockGraphEndpoints(page);
  await openMockedGraph(page, webBase);

  await waitFor(async () => {
    assert.ok(await page.locator(".graph-research-navigator").isVisible());
    const copy = await page.locator(".graph-research-navigator").textContent();
    assert.match(copy || "", /研究导航/);
    assert.match(copy || "", /主要星系/);
  }, 3000);

  await page.locator('.graph-research-card[data-graph-select-cluster]').first().click();
  await waitFor(async () => {
    assert.ok(await page.locator(".graph-selection-panel.is-cluster").isVisible());
    const copy = await page.locator(".graph-selection-panel.is-cluster").textContent();
    assert.match(copy || "", /星系摘要/);
    assert.match(copy || "", /下一步问题/);
  }, 3000);

  await page.locator("[data-graph-selection-close]").click();
  await waitFor(async () => {
    assert.ok(await page.locator(".graph-research-navigator").isVisible());
  }, 3000);

  await page.locator('.graph-research-card[data-graph-select-node]').first().click();
  await waitFor(async () => {
    assert.ok(await page.locator(".graph-selection-panel.is-node").isVisible());
    const copy = await page.locator(".graph-selection-panel.is-node").textContent();
    assert.match(copy || "", /笔记角色/);
    assert.match(copy || "", /接下来可以问/);
  }, 3000);

  await page.locator(".graph-map-edge-group[data-edge-from]").first().focus();
  await page.keyboard.press("Enter");
  await waitFor(async () => {
    assert.ok(await page.locator(".graph-selection-panel.is-edge").isVisible());
    const copy = await page.locator(".graph-selection-panel.is-edge").textContent();
    assert.match(copy || "", /关系复核/);
    assert.match(copy || "", /复核问题/);
  }, 3000);
});

test("prototype graph starfield workbench, density hint, and zoom controls stay interactive", async (t) => {
  if (process.env.RUN_BROWSER_E2E !== "1") {
    t.skip("Set RUN_BROWSER_E2E=1 to enable browser e2e in local runs.");
    return;
  }

  const playwright = await optionalPlaywright(t);
  if (!playwright) return;

  const stack = await startPrototypeStack(t, playwright);
  if (!stack) return;
  const { page, webBase } = stack;

  await mockGraphEndpoints(page);
  await openMockedGraph(page, webBase);

  await waitFor(async () => {
    assert.ok(await page.locator(".graph-density-hint").isVisible());
  }, 3000);

  await page.locator('[data-graph-workbench-entry="clues"]').click();
  await waitFor(async () => {
    assert.ok(await page.locator(".graph-workbench-panel").isVisible());
    assert.equal(await page.locator('[data-graph-workbench-entry="clues"]').getAttribute("aria-pressed"), "true");
  }, 3000);

  await page.locator("[data-graph-workbench-close]").click();
  await waitFor(async () => {
    assert.equal(await page.locator(".graph-workbench-panel").count(), 0);
    assert.equal(await page.locator('[data-graph-workbench-entry="clues"]').getAttribute("aria-pressed"), "false");
  }, 3000);

  const svg = page.locator(".graph-map-svg").first();
  assert.equal(await svg.getAttribute("data-graph-zoom"), "fit");
  await page.locator('[data-graph-zoom-step="1"]').click();
  await waitFor(async () => {
    assert.equal(await svg.getAttribute("data-graph-zoom"), "read");
  }, 3000);
  await page.locator('[data-graph-zoom-step="-1"]').click();
  await waitFor(async () => {
    assert.equal(await svg.getAttribute("data-graph-zoom"), "fit");
  }, 3000);
});

test("prototype graph density hint auto-dismisses after ten seconds", async (t) => {
  if (process.env.RUN_BROWSER_E2E !== "1") {
    t.skip("Set RUN_BROWSER_E2E=1 to enable browser e2e in local runs.");
    return;
  }

  const playwright = await optionalPlaywright(t);
  if (!playwright) return;

  const stack = await startPrototypeStack(t, playwright);
  if (!stack) return;
  const { page, webBase } = stack;

  await mockGraphEndpoints(page);
  await openMockedGraph(page, webBase);
  await waitFor(async () => {
    assert.ok(await page.locator(".graph-density-hint").isVisible());
  }, 3000);

  await waitFor(async () => {
    assert.equal(await page.locator(".graph-density-hint").count(), 0);
  }, 12000, 250);
});

test("prototype graph AI analysis reopens the follow-up workbench after it was hidden", async (t) => {
  if (process.env.RUN_BROWSER_E2E !== "1") {
    t.skip("Set RUN_BROWSER_E2E=1 to enable browser e2e in local runs.");
    return;
  }

  const playwright = await optionalPlaywright(t);
  if (!playwright) return;

  const stack = await startPrototypeStack(t, playwright);
  if (!stack) return;
  const { page, webBase } = stack;

  await mockGraphEndpoints(page);
  await page.route("**/api/v1/graph/ai-analysis", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        item: {
          analysis: {
            topicCandidates: [{ title: "Candidate topic" }],
            relationCandidates: [{ fromNoteId: "star-1", toNoteId: "star-6" }],
            bridgeCandidates: [{ noteIds: ["star-1"], targetNoteIds: ["star-30"] }],
            isolatedNotes: []
          },
          reviewItems: {
            summary: {
              artifactCount: 3,
              topicCandidateCount: 1,
              relationCandidateCount: 1,
              bridgeCandidateCount: 1,
              isolatedNoteCount: 0
            }
          }
        }
      })
    });
  });

  await openMockedGraph(page, webBase);
  await page.locator('[data-graph-workbench-entry="questions"]').click();
  await waitFor(async () => {
    assert.ok(await page.locator(".graph-workbench-panel").isVisible());
  }, 3000);
  await page.locator("[data-graph-workbench-close]").click();
  await waitFor(async () => {
    assert.equal(await page.locator(".graph-workbench-panel").count(), 0);
  }, 3000);

  await page.locator('[data-graph-workbench-entry="clues"]').click();
  await page.locator("details[data-graph-section='ai-analysis'] summary").click();
  await page.locator("[data-run-graph-ai-analysis]").click();

  await waitFor(async () => {
    assert.equal(await page.locator('[data-graph-workbench-entry="questions"]').getAttribute("aria-pressed"), "true");
    assert.ok(await page.locator(".graph-workbench-panel").isVisible());
    const summaryText = await page.locator(".graph-workbench-panel").textContent();
    assert.match(String(summaryText || ""), /Candidate topic/);
    assert.match(String(summaryText || ""), /Star Note 1/);
  }, 5000);
});

test("prototype smart notes demo startup resets graph presentation controls", async (t) => {
  if (process.env.RUN_BROWSER_E2E !== "1") {
    t.skip("Set RUN_BROWSER_E2E=1 to enable browser e2e in local runs.");
    return;
  }

  const playwright = await optionalPlaywright(t);
  if (!playwright) return;

  const stack = await startPrototypeStack(t, playwright);
  if (!stack) return;
  const { page, webBase } = stack;

  await page.addInitScript(() => {
    window.localStorage.setItem("yansilu:graph:relation-type-filter", "all");
    window.localStorage.setItem("yansilu:graph:focus-depth", "all");
  });

  await page.goto(`${webBase}/prototype?demo=smart-notes-product-thinking`, { waitUntil: "networkidle" });
  await waitFor(async () => {
    const statusText = await page.locator("#statusText").textContent();
    assert.match(String(statusText || ""), /Smart Notes/);
  }, 20000);

  await page.locator('.rail-btn[data-module="graph"]').click();
  await waitFor(async () => {
    assert.equal(await page.locator("#graphRelationTypeFilter").inputValue(), "meaningful");
    assert.equal(await page.locator(".graph-map-svg").first().getAttribute("data-graph-zoom"), "fit");
    assert.equal(await page.locator(".graph-workbench-panel").count(), 0);
  }, 10000);
});
