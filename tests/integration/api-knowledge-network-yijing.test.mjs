import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import fs from "node:fs/promises";
import os from "node:os";
import net from "node:net";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..", "..");
const FIXTURE_PATH = path.join(REPO_ROOT, "tests", "fixtures", "knowledge-network", "yijing-network.json");
const RICH_ACCEPTANCE_FIXTURE_PATH = path.join(REPO_ROOT, "tests", "fixtures", "acceptance", "yijing-rich-acceptance.json");
const SMART_NOTES_PRODUCT_THINKING_FIXTURE_PATH = path.join(
  REPO_ROOT,
  "tests",
  "fixtures",
  "demo-smart-notes-product-thinking",
  "demo.json"
);

async function makeTempDir(prefix) {
  return fs.mkdtemp(path.join(os.tmpdir(), prefix));
}

async function findFreePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.on("error", reject);
    server.listen(0, () => {
      const address = server.address();
      const port = typeof address === "object" ? address.port : 0;
      server.close(() => resolve(port));
    });
  });
}

async function waitForHealth(baseUrl) {
  const deadline = Date.now() + 5000;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${baseUrl}/health`);
      if (res.ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 80));
  }
  throw new Error("API server did not become healthy");
}

async function getJson(baseUrl, pathname) {
  const res = await fetch(`${baseUrl}${pathname}`);
  const json = await res.json();
  return { status: res.status, json };
}

async function postJson(baseUrl, pathname, body) {
  const res = await fetch(`${baseUrl}${pathname}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  const json = await res.json();
  return { status: res.status, json };
}

async function readYijingFixture() {
  return JSON.parse(await fs.readFile(FIXTURE_PATH, "utf8"));
}

async function readYijingRichAcceptanceFixture() {
  return JSON.parse(await fs.readFile(RICH_ACCEPTANCE_FIXTURE_PATH, "utf8"));
}

async function readSmartNotesProductThinkingFixture() {
  return JSON.parse(await fs.readFile(SMART_NOTES_PRODUCT_THINKING_FIXTURE_PATH, "utf8"));
}

function relationId(relation) {
  return `lnk_yijing_${relation.from}_${relation.to}_${relation.relationType}`.replace(/[^a-z0-9_-]+/gi, "_").slice(0, 96);
}

async function createYijingNetwork(baseUrl, vaultPath, fixture) {
  const noteRoot = path.join(vaultPath, "notes", "original");
  const createDir = await postJson(baseUrl, "/api/v1/directories", {
    title: fixture.title,
    parentDirectoryId: "dir_original_default",
    directoryType: "custom",
    fsPath: path.join(noteRoot, "yijing-knowledge-network"),
    maxNotes: 500
  });
  assert.equal(createDir.status, 201, JSON.stringify(createDir.json));
  const directoryId = createDir.json.item.id;

  const noteIdsByFixtureId = new Map();
  for (const note of fixture.notes) {
    const topicTags = note.expectedNetworkState === "unplaced" ? "" : "\n\n#易经 #情境判断训练";
    const createNote = await postJson(baseUrl, "/api/v1/notes", {
      directoryId,
      status: "draft",
      body: `# ${note.title}\n\n${note.claim}\n\n主题假设：${fixture.thesis}${topicTags}`
    });
    assert.equal(createNote.status, 201, JSON.stringify(createNote.json));
    noteIdsByFixtureId.set(note.id, createNote.json.item.id);
  }

  const relationIdsByFixtureId = new Map();
  for (const relation of fixture.relations) {
    const createRelation = await postJson(baseUrl, `/api/v1/notes/${encodeURIComponent(noteIdsByFixtureId.get(relation.from))}/relations`, {
      toNoteId: noteIdsByFixtureId.get(relation.to),
      relationType: relation.relationType,
      rationale: relation.rationale,
      insightQuestion: relation.insightQuestion,
      confidence: 1
    });
    assert.equal(createRelation.status, 201, JSON.stringify(createRelation.json));
    assert.equal(createRelation.json.item.fromNoteId, noteIdsByFixtureId.get(relation.from));
    assert.equal(createRelation.json.item.toNoteId, noteIdsByFixtureId.get(relation.to));
    assert.equal(createRelation.json.item.relationType, relation.relationType);
    assert.equal(createRelation.json.item.rationale, relation.rationale);
    assert.equal(createRelation.json.item.insightQuestion, relation.insightQuestion);
    assert.equal(createRelation.json.item.status, "confirmed");
    relationIdsByFixtureId.set(relationId(relation), createRelation.json.item.id);
  }
  return { directoryId, noteIdsByFixtureId, relationIdsByFixtureId };
}

function fixturePathToNoteIds(fixtureIds, noteIdsByFixtureId) {
  return fixtureIds.map((id) => noteIdsByFixtureId.get(id));
}

test("Yijing fixture builds and validates a semantic knowledge-network graph", async (t) => {
  const fixture = await readYijingFixture();
  const vaultPath = await makeTempDir("yansilu-yijing-network-vault-");
  const port = await findFreePort();
  const baseUrl = `http://127.0.0.1:${port}`;

  const child = spawn(process.execPath, ["apps/api/src/server.mjs"], {
    cwd: REPO_ROOT,
    env: {
      ...process.env,
      API_PORT: String(port),
      VAULT_PATH: vaultPath
    },
    stdio: ["ignore", "pipe", "pipe"]
  });

  t.after(() => child.kill());
  await waitForHealth(baseUrl);

  const { directoryId, noteIdsByFixtureId } = await createYijingNetwork(baseUrl, vaultPath, fixture);

  const graph = await getJson(baseUrl, `/api/v1/graph?scope=directory&directoryId=${encodeURIComponent(directoryId)}`);
  assert.equal(graph.status, 200, JSON.stringify(graph.json));
  assert.equal(graph.json.item.totalNodes, fixture.expected.nodeCount);
  assert.equal(graph.json.item.totalEdges, fixture.expected.edgeCount);
  assert.equal(graph.json.item.insights.supportingRelations.length, fixture.expected.supportingRelationCount);
  assert.equal(graph.json.item.insights.conflictingRelations.length, fixture.expected.conflictingRelationCount);
  assert.equal(graph.json.item.insights.untypedRelations.length, fixture.expected.untypedRelationCount);
  assert.equal(graph.json.item.insights.connectedComponentCount, fixture.expected.connectedComponentCount);

  const relationTypes = new Set(graph.json.item.edges.map((edge) => edge.relationType));
  for (const relationType of new Set(fixture.relations.map((relation) => relation.relationType))) {
    assert.ok(relationTypes.has(relationType), `missing relation type ${relationType}`);
  }

  const isolatedNoteId = noteIdsByFixtureId.get(fixture.expected.isolatedNode);
  const isolatedGap = graph.json.item.insights.bridgeGaps.find((gap) => gap.noteIds.includes(isolatedNoteId));
  assert.equal(isolatedGap?.gapType, "isolated_note");
  assert.deepEqual(isolatedGap.noteTitles, ["易经需要慢读"]);

  const yj05FixtureId = fixture.expected.currentNodeAssertions.node;
  const yj05Relations = await getJson(baseUrl, `/api/v1/notes/${encodeURIComponent(noteIdsByFixtureId.get(yj05FixtureId))}/relations`);
  assert.equal(yj05Relations.status, 200, JSON.stringify(yj05Relations.json));
  assert.deepEqual(yj05Relations.json.item.outgoingLinks, []);

  for (const [relationType, fixtureIds] of Object.entries(fixture.expected.currentNodeAssertions.incomingByType)) {
    const expectedSourceIds = fixturePathToNoteIds(fixtureIds, noteIdsByFixtureId).sort();
    const actualSourceIds = yj05Relations.json.item.backlinks
      .filter((link) => link.relationType === relationType)
      .map((link) => link.fromNoteId)
      .sort();
    assert.deepEqual(actualSourceIds, expectedSourceIds, `incoming ${relationType} links for ${yj05FixtureId}`);
  }

  for (const pathAssertion of fixture.expected.pathAssertions) {
    const pathResult = await getJson(
      baseUrl,
      `/api/v1/graph/path?fromNoteId=${encodeURIComponent(noteIdsByFixtureId.get(pathAssertion.from))}&toNoteId=${encodeURIComponent(
        noteIdsByFixtureId.get(pathAssertion.to)
      )}&directoryId=${encodeURIComponent(directoryId)}&maxDepth=${pathAssertion.maxDepth}`
    );
    assert.equal(pathResult.status, 200, JSON.stringify(pathResult.json));
    assert.equal(pathResult.json.item.found, true);
    assert.deepEqual(pathResult.json.item.path, fixturePathToNoteIds(pathAssertion.path, noteIdsByFixtureId));
  }

  const isolatedPath = await getJson(
    baseUrl,
    `/api/v1/graph/path?fromNoteId=${encodeURIComponent(isolatedNoteId)}&toNoteId=${encodeURIComponent(
      noteIdsByFixtureId.get("YJ-05")
    )}&directoryId=${encodeURIComponent(directoryId)}&maxDepth=8`
  );
  assert.equal(isolatedPath.status, 200, JSON.stringify(isolatedPath.json));
  assert.equal(isolatedPath.json.item.found, false);
  assert.deepEqual(isolatedPath.json.item.path, []);

  const tagNotes = await getJson(
    baseUrl,
    `/api/v1/tags/${encodeURIComponent("易经")}/notes?rootDirectoryId=${encodeURIComponent("dir_original_default")}`
  );
  assert.equal(tagNotes.status, 200, JSON.stringify(tagNotes.json));
  assert.equal(tagNotes.json.total, fixture.expected.connectedNodeCount);

  const weakRelation = await postJson(baseUrl, `/api/v1/notes/${encodeURIComponent(isolatedNoteId)}/relations`, {
    toNoteId: noteIdsByFixtureId.get("YJ-13"),
    relationType: "same_topic",
    rationale: "相关",
    status: "draft"
  });
  assert.equal(weakRelation.status, 201, JSON.stringify(weakRelation.json));
  assert.equal(weakRelation.json.item.rationaleQualityLevel, "empty");

  const reviewQueue = await getJson(
    baseUrl,
    `/api/v1/relations/review-queue?directoryId=${encodeURIComponent(directoryId)}&qualityLevels=empty,basic&limit=5`
  );
  assert.equal(reviewQueue.status, 200, JSON.stringify(reviewQueue.json));
  assert.ok(reviewQueue.json.items.some((item) => item.id === weakRelation.json.item.id));
  const weakReviewItem = reviewQueue.json.items.find((item) => item.id === weakRelation.json.item.id);
  assert.equal(weakReviewItem.reviewReason, "missing_rationale");
  assert.equal(weakReviewItem.reviewPriority, 0);
  assert.equal(weakReviewItem.source.id, isolatedNoteId);
  assert.equal(weakReviewItem.target.id, noteIdsByFixtureId.get("YJ-13"));
  assert.ok(reviewQueue.json.summary.byQualityLevel.empty >= 1);

  const deleteWeakRelation = await fetch(`${baseUrl}/api/v1/relations/${encodeURIComponent(weakRelation.json.item.id)}`, {
    method: "DELETE"
  });
  assert.equal(deleteWeakRelation.status, 200, JSON.stringify(await deleteWeakRelation.json()));

  const seedRelation = await postJson(baseUrl, `/api/v1/notes/${encodeURIComponent(isolatedNoteId)}/relations`, {
    toNoteId: noteIdsByFixtureId.get("YJ-13"),
    relationType: "complements",
    rationale: "卦序作为理解路径需要慢读才能显现。",
    insightQuestion: "慢读如何让卦序的理解路径浮现？",
    status: "draft"
  });
  assert.equal(seedRelation.status, 201, JSON.stringify(seedRelation.json));
  assert.equal(seedRelation.json.item.status, "draft");
  assert.equal(seedRelation.json.item.rationaleQualityLevel, "good");
  assert.equal(seedRelation.json.item.rationaleQualityScore, 0.67);

  const updatedSeedRelation = await fetch(`${baseUrl}/api/v1/relations/${encodeURIComponent(seedRelation.json.item.id)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      status: "confirmed",
      insightQuestion: "慢读如何让卦序从排列变成理解路径？"
    })
  });
  const updatedSeedRelationJson = await updatedSeedRelation.json();
  assert.equal(updatedSeedRelation.status, 200, JSON.stringify(updatedSeedRelationJson));
  assert.equal(updatedSeedRelationJson.item.status, "confirmed");
  assert.equal(updatedSeedRelationJson.item.insightQuestion, "慢读如何让卦序从排列变成理解路径？");
  assert.equal(updatedSeedRelationJson.item.rationaleQualityLevel, "good");

  const deleteSeedRelation = await fetch(`${baseUrl}/api/v1/relations/${encodeURIComponent(seedRelation.json.item.id)}`, {
    method: "DELETE"
  });
  const deleteSeedRelationJson = await deleteSeedRelation.json();
  assert.equal(deleteSeedRelation.status, 200, JSON.stringify(deleteSeedRelationJson));
  assert.equal(deleteSeedRelationJson.deleted, true);

  const isolatedRelations = await getJson(baseUrl, `/api/v1/notes/${encodeURIComponent(isolatedNoteId)}/relations`);
  assert.equal(isolatedRelations.status, 200, JSON.stringify(isolatedRelations.json));
  assert.deepEqual(isolatedRelations.json.item.outgoingLinks, []);
});

test("POST /api/v1/demo/knowledge-network/yijing seeds the Yijing fixture idempotently", async (t) => {
  const fixture = await readYijingFixture();
  const vaultPath = await makeTempDir("yansilu-yijing-demo-vault-");
  const port = await findFreePort();
  const baseUrl = `http://127.0.0.1:${port}`;

  const child = spawn(process.execPath, ["apps/api/src/server.mjs"], {
    cwd: REPO_ROOT,
    env: {
      ...process.env,
      API_PORT: String(port),
      VAULT_PATH: vaultPath
    },
    stdio: ["ignore", "pipe", "pipe"]
  });

  t.after(() => child.kill());
  await waitForHealth(baseUrl);

  const firstSeed = await postJson(baseUrl, "/api/v1/demo/knowledge-network/yijing", {});
  assert.equal(firstSeed.status, 200, JSON.stringify(firstSeed.json));
  assert.equal(firstSeed.json.item.kind, "prototype_demo_seed");
  assert.equal(firstSeed.json.item.demoOnly, true);
  assert.equal(firstSeed.json.item.sourceKind, "bundled_fixture");
  assert.equal(firstSeed.json.item.importLifecycle, "none");
  assert.equal(firstSeed.json.item.importRecordId, null);
  assert.equal(firstSeed.json.item.directoryId, "dir_demo_yijing_knowledge_network");
  assert.equal(firstSeed.json.item.summary.totalNodes, fixture.expected.nodeCount);
  assert.equal(firstSeed.json.item.summary.totalEdges, fixture.expected.edgeCount);
  assert.equal(firstSeed.json.item.summary.createdNotes, fixture.expected.nodeCount);
  assert.equal(firstSeed.json.item.summary.createdRelations, fixture.expected.edgeCount);

  const graph = await getJson(
    baseUrl,
    `/api/v1/graph?scope=directory&directoryId=${encodeURIComponent(firstSeed.json.item.directoryId)}`
  );
  assert.equal(graph.status, 200, JSON.stringify(graph.json));
  assert.equal(graph.json.item.totalNodes, fixture.expected.nodeCount);
  assert.equal(graph.json.item.totalEdges, fixture.expected.edgeCount);
  assert.equal(graph.json.item.insights.connectedComponentCount, fixture.expected.connectedComponentCount);

  const search = await getJson(
    baseUrl,
    `/api/v1/notes/search?q=${encodeURIComponent("YJ-16")}&rootDirectoryId=${encodeURIComponent("dir_original_default")}&limit=5`
  );
  assert.equal(search.status, 200, JSON.stringify(search.json));
  assert.equal(search.json.total, 1);
  assert.equal(search.json.items[0].id, firstSeed.json.item.noteIdsByFixtureId["YJ-16"]);
  assert.equal(search.json.items[0].directoryId, firstSeed.json.item.directoryId);

  const imports = await getJson(baseUrl, "/api/v1/imports");
  assert.equal(imports.status, 200, JSON.stringify(imports.json));
  assert.equal(imports.json.total, 0);
  assert.deepEqual(imports.json.items, []);

  const secondSeed = await postJson(baseUrl, "/api/v1/demo/knowledge-network/yijing", {});
  assert.equal(secondSeed.status, 200, JSON.stringify(secondSeed.json));
  assert.equal(secondSeed.json.item.kind, "prototype_demo_seed");
  assert.equal(secondSeed.json.item.demoOnly, true);
  assert.equal(secondSeed.json.item.summary.totalNodes, fixture.expected.nodeCount);
  assert.equal(secondSeed.json.item.summary.totalEdges, fixture.expected.edgeCount);
  assert.equal(secondSeed.json.item.summary.createdNotes, 0);
  assert.equal(secondSeed.json.item.summary.updatedNotes, fixture.expected.nodeCount);
  assert.equal(secondSeed.json.item.summary.createdRelations, 0);
  assert.equal(secondSeed.json.item.summary.updatedRelations, fixture.expected.edgeCount);
});

test("POST /api/v1/demo/acceptance/yijing-rich seeds the rich Yijing acceptance fixture", async (t) => {
  const fixture = await readYijingRichAcceptanceFixture();
  const vaultPath = await makeTempDir("yansilu-yijing-rich-demo-vault-");
  const port = await findFreePort();
  const baseUrl = `http://127.0.0.1:${port}`;

  const child = spawn(process.execPath, ["apps/api/src/server.mjs"], {
    cwd: REPO_ROOT,
    env: {
      ...process.env,
      API_PORT: String(port),
      VAULT_PATH: vaultPath
    },
    stdio: ["ignore", "pipe", "pipe"]
  });

  t.after(() => child.kill());
  await waitForHealth(baseUrl);

  const firstSeed = await postJson(baseUrl, "/api/v1/demo/acceptance/yijing-rich", {});
  assert.equal(firstSeed.status, 200, JSON.stringify(firstSeed.json));
  assert.equal(firstSeed.json.item.kind, "yijing_rich_acceptance_seed");
  assert.equal(firstSeed.json.item.demoOnly, true);
  assert.equal(firstSeed.json.item.sourceKind, "bundled_fixture");
  assert.equal(firstSeed.json.item.importLifecycle, "none");
  assert.equal(firstSeed.json.item.importRecordId, null);
  assert.equal(firstSeed.json.item.directoryId, "dir_yijing_rich_acceptance_original");
  assert.deepEqual(firstSeed.json.item.counts, fixture.counts);
  assert.equal(
    firstSeed.json.item.summary.createdNotes,
    fixture.counts.fleeting_notes + fixture.counts.literature_notes + fixture.counts.original_notes
  );
  assert.equal(firstSeed.json.item.summary.createdRelations, fixture.counts.relations);
  assert.equal(firstSeed.json.item.summary.createdIndexCards, fixture.counts.index_cards);
  assert.equal(firstSeed.json.item.summary.createdWritingProjects, fixture.counts.writing_projects);
  assert.equal(firstSeed.json.item.summary.createdDraftScaffolds, fixture.counts.writing_projects);

  const graph = await getJson(
    baseUrl,
    `/api/v1/graph?scope=directory&directoryId=${encodeURIComponent(firstSeed.json.item.directoryId)}`
  );
  assert.equal(graph.status, 200, JSON.stringify(graph.json));
  assert.equal(graph.json.item.totalNodes, fixture.counts.original_notes);
  assert.equal(graph.json.item.totalEdges, fixture.counts.relations);

  const indexes = await getJson(
    baseUrl,
    `/api/v1/index-cards?directoryId=${encodeURIComponent(firstSeed.json.item.directoryId)}&includeDescendants=false&limit=10`
  );
  assert.equal(indexes.status, 200, JSON.stringify(indexes.json));
  assert.equal(indexes.json.total, fixture.counts.index_cards);
  assert.deepEqual(
    indexes.json.items.map((item) => item.id).sort(),
    fixture.index_cards.map((item) => item.id).sort()
  );

  const projects = await getJson(baseUrl, "/api/v1/writing-projects?limit=10");
  assert.equal(projects.status, 200, JSON.stringify(projects.json));
  assert.equal(projects.json.total, fixture.counts.writing_projects);
  assert.ok(projects.json.items.every((item) => item.scaffold_id));

  const project = await getJson(baseUrl, "/api/v1/writing-projects/wp_yj_answer_machine");
  assert.equal(project.status, 200, JSON.stringify(project.json));
  assert.equal(project.json.item.title, "为什么《易经》不是答案机器");
  assert.equal(project.json.item.basket_note_ids.length, fixture.writing_projects[0].basketNoteIds.length);
  assert.equal(project.json.item.scaffold_id, "ds_wp_yj_answer_machine");

  const scaffold = await getJson(baseUrl, "/api/v1/draft-scaffolds/ds_wp_yj_answer_machine");
  assert.equal(scaffold.status, 200, JSON.stringify(scaffold.json));
  assert.equal(scaffold.json.item.sections.length, fixture.writing_projects[0].outline.length);
  assert.ok(scaffold.json.item.sections.every((section) => section.evidence_note_ids.length > 0));
  assert.ok(scaffold.json.item.sections.every((section) => section.source_trace_ids.length > 0));
  assert.match(scaffold.json.export.markdown, /这是一份写作方案和脚手架，不是完成稿/);

  const secondSeed = await postJson(baseUrl, "/api/v1/demo/acceptance/yijing-rich", {});
  assert.equal(secondSeed.status, 200, JSON.stringify(secondSeed.json));
  assert.equal(secondSeed.json.item.summary.createdNotes, 0);
  assert.equal(
    secondSeed.json.item.summary.updatedNotes,
    fixture.counts.fleeting_notes + fixture.counts.literature_notes + fixture.counts.original_notes
  );
  assert.equal(secondSeed.json.item.summary.createdRelations, 0);
  assert.equal(secondSeed.json.item.summary.updatedRelations, fixture.counts.relations);
  assert.equal(secondSeed.json.item.summary.createdIndexCards, 0);
  assert.equal(secondSeed.json.item.summary.updatedIndexCards, fixture.counts.index_cards);
  assert.equal(secondSeed.json.item.summary.createdWritingProjects, 0);
  assert.equal(secondSeed.json.item.summary.updatedWritingProjects, fixture.counts.writing_projects);
  assert.equal(secondSeed.json.item.summary.createdDraftScaffolds, 0);
  assert.equal(secondSeed.json.item.summary.updatedDraftScaffolds, fixture.counts.writing_projects);
});

test("POST /api/v1/demo/product-thinking/smart-notes seeds the smart notes product thinking demo", async (t) => {
  const fixture = await readSmartNotesProductThinkingFixture();
  const vaultPath = await makeTempDir("yansilu-smart-notes-demo-vault-");
  const port = await findFreePort();
  const baseUrl = `http://127.0.0.1:${port}`;

  const child = spawn(process.execPath, ["apps/api/src/server.mjs"], {
    cwd: REPO_ROOT,
    env: {
      ...process.env,
      API_PORT: String(port),
      VAULT_PATH: vaultPath
    },
    stdio: ["ignore", "pipe", "pipe"]
  });

  t.after(() => child.kill());
  await waitForHealth(baseUrl);

  const firstSeed = await postJson(baseUrl, "/api/v1/demo/product-thinking/smart-notes", {});
  assert.equal(firstSeed.status, 200, JSON.stringify(firstSeed.json));
  assert.equal(firstSeed.json.item.kind, "smart_notes_product_thinking_seed");
  assert.equal(firstSeed.json.item.demoOnly, true);
  assert.equal(firstSeed.json.item.sourceKind, "bundled_fixture");
  assert.equal(firstSeed.json.item.directoryId, "dir_demo_smart_notes_product_thinking_original");
  assert.deepEqual(firstSeed.json.item.counts, fixture.counts);

  const graph = await getJson(
    baseUrl,
    `/api/v1/graph?scope=directory&directoryId=${encodeURIComponent(firstSeed.json.item.directoryId)}`
  );
  assert.equal(graph.status, 200, JSON.stringify(graph.json));
  assert.ok(graph.json.item.totalNodes >= fixture.counts.permanent_notes);

  const indexes = await getJson(
    baseUrl,
    `/api/v1/index-cards?directoryId=${encodeURIComponent(firstSeed.json.item.directoryId)}&includeDescendants=false&limit=30`
  );
  assert.equal(indexes.status, 200, JSON.stringify(indexes.json));
  assert.equal(indexes.json.total, fixture.counts.index_cards);

  const projects = await getJson(baseUrl, "/api/v1/writing-projects?limit=10");
  assert.equal(projects.status, 200, JSON.stringify(projects.json));
  assert.equal(projects.json.total, fixture.counts.writing_projects);
});
