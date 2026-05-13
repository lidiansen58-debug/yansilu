import path from "node:path";

import { createDirectory, listDirectories } from "./catalog-store.mjs";
import {
  createNoteInDirectory,
  createNoteRelation,
  getDirectoryGraph,
  getNoteById,
  moveNoteToDirectory,
  updateNoteContent,
  updateNoteRelation
} from "./note-catalog-store.mjs";
import { initVault } from "./vault.mjs";

export const YIJING_DEMO_DIRECTORY_ID = "dir_demo_yijing_knowledge_network";
export const YIJING_DEMO_FOLDER_NAME = "yijing-knowledge-network";

function slugPart(value = "") {
  return String(value || "")
    .trim()
    .replace(/[^a-z0-9_-]+/gi, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 48);
}

export function yijingDemoNoteId(fixtureNoteId) {
  const slug = slugPart(fixtureNoteId);
  return `pn_demo_yijing_${slug || "note"}`.slice(0, 96);
}

export function yijingDemoRelationId(relation = {}) {
  const from = slugPart(relation.from);
  const to = slugPart(relation.to);
  const type = slugPart(relation.relationType || "relation");
  return `lnk_demo_yijing_${from}_${to}_${type}`.slice(0, 96);
}

function assertYijingFixture(fixture = {}) {
  if (!fixture || typeof fixture !== "object") throw new Error("Yijing fixture is required.");
  if (!Array.isArray(fixture.notes) || !fixture.notes.length) throw new Error("Yijing fixture notes are required.");
  if (!Array.isArray(fixture.relations)) throw new Error("Yijing fixture relations are required.");
}

function yijingNoteBody(fixture, note) {
  const title = String(note?.title || note?.id || "Untitled").trim();
  const claim = String(note?.claim || "").trim();
  const thesis = String(fixture?.thesis || "").trim();
  const tags = note?.expectedNetworkState === "unplaced" ? "" : "\n\n#易经 #情境判断训练";
  const seedDirection = String(note?.seedDirection || "").trim();
  const seedLine = seedDirection ? `\n\n未来连接方向：${seedDirection}` : "";
  return `# ${title}\n\n${claim}\n\n主题假设：${thesis}${tags}${seedLine}\n`;
}

async function getExistingNote(vaultPath, noteId) {
  try {
    return await getNoteById(vaultPath, noteId);
  } catch {
    return null;
  }
}

async function ensureYijingDemoDirectory(vaultPath, fixture) {
  const root = path.resolve(vaultPath);
  const fsPath = path.join(root, "notes", "original", YIJING_DEMO_FOLDER_NAME);
  const existing = (await listDirectories(root, { includeHidden: true })).find((item) => item.id === YIJING_DEMO_DIRECTORY_ID);
  if (existing) return existing;
  return createDirectory(root, {
    id: YIJING_DEMO_DIRECTORY_ID,
    title: fixture.title || "易经知识网络案例",
    parentDirectoryId: "dir_original_default",
    directoryType: "custom",
    fsPath,
    maxNotes: 500
  });
}

async function upsertYijingDemoNote(vaultPath, directoryId, fixture, note, counters) {
  const noteId = yijingDemoNoteId(note.id);
  const body = yijingNoteBody(fixture, note);
  const existing = await getExistingNote(vaultPath, noteId);
  if (existing) {
    if (existing.directoryId !== directoryId) {
      await moveNoteToDirectory(vaultPath, noteId, directoryId);
    }
    counters.updatedNotes += 1;
    return updateNoteContent(vaultPath, noteId, {
      title: note.title,
      body,
      status: "draft",
      thesis: fixture.thesis,
      distillationStatus: "draft",
      originalityStatus: "pass",
      authorship: { user_confirmed: true, ai_assisted: false }
    });
  }

  counters.createdNotes += 1;
  return createNoteInDirectory(vaultPath, {
    id: noteId,
    directoryId,
    title: note.title,
    body,
    status: "draft",
    thesis: fixture.thesis,
    distillationStatus: "draft",
    originalityStatus: "pass",
    authorship: { user_confirmed: true, ai_assisted: false }
  });
}

async function upsertYijingDemoRelation(vaultPath, noteIdsByFixtureId, relation, counters) {
  const relationId = yijingDemoRelationId(relation);
  const fromNoteId = noteIdsByFixtureId.get(String(relation.from));
  const toNoteId = noteIdsByFixtureId.get(String(relation.to));
  if (!fromNoteId || !toNoteId) {
    throw new Error(`Yijing relation references unknown note: ${relation.from} -> ${relation.to}`);
  }

  const payload = {
    id: relationId,
    toNoteId,
    relationType: relation.relationType,
    rationale: relation.rationale,
    insightQuestion: relation.insightQuestion,
    createdBy: "user",
    confidence: relation.confidence ?? 1,
    status: "confirmed"
  };

  try {
    const item = await createNoteRelation(vaultPath, fromNoteId, payload);
    if (item?.created === false) {
      counters.updatedRelations += 1;
      return updateNoteRelation(vaultPath, item.id, payload);
    }
    counters.createdRelations += 1;
    return item;
  } catch (error) {
    const isExistingRelation =
      error?.code === "RELATION_DUPLICATE" || String(error?.message || "").includes("UNIQUE constraint failed");
    if (!isExistingRelation) throw error;
    const existingRelationId = error?.details?.relationId || relationId;
    counters.updatedRelations += 1;
    return updateNoteRelation(vaultPath, existingRelationId, payload);
  }
}

export async function seedYijingKnowledgeNetwork(vaultPath, fixture = {}) {
  if (!vaultPath) throw new Error("vaultPath is required");
  assertYijingFixture(fixture);
  const root = path.resolve(vaultPath);
  await initVault(root);

  const counters = {
    createdNotes: 0,
    updatedNotes: 0,
    createdRelations: 0,
    updatedRelations: 0
  };
  const directory = await ensureYijingDemoDirectory(root, fixture);
  const noteIdsByFixtureId = new Map();

  for (const note of fixture.notes) {
    const item = await upsertYijingDemoNote(root, directory.id, fixture, note, counters);
    noteIdsByFixtureId.set(String(note.id), item.id);
  }

  const relationIdsByFixtureId = new Map();
  for (const relation of fixture.relations) {
    const item = await upsertYijingDemoRelation(root, noteIdsByFixtureId, relation, counters);
    relationIdsByFixtureId.set(`${relation.from}->${relation.to}:${relation.relationType}`, item.id);
  }

  const graph = await getDirectoryGraph(root, directory.id);
  const focusFixtureId = fixture?.expected?.currentNodeAssertions?.node || fixture.notes[0]?.id || "";
  const firstNoteId = noteIdsByFixtureId.get(String(focusFixtureId)) || noteIdsByFixtureId.values().next().value || "";

  return {
    kind: "prototype_demo_seed",
    demoOnly: true,
    sourceKind: "bundled_fixture",
    importLifecycle: "none",
    importRecordId: null,
    fixtureId: fixture.id || "yijing-knowledge-network",
    title: fixture.title || "易经知识网络案例",
    directory,
    directoryId: directory.id,
    firstNoteId,
    noteIdsByFixtureId: Object.fromEntries(noteIdsByFixtureId.entries()),
    relationIdsByFixtureId: Object.fromEntries(relationIdsByFixtureId.entries()),
    summary: {
      notes: fixture.notes.length,
      relations: fixture.relations.length,
      ...counters,
      totalNodes: graph.totalNodes || 0,
      totalEdges: graph.totalEdges || 0,
      connectedComponentCount: graph.insights?.connectedComponentCount || 0,
      bridgeGapCount: Array.isArray(graph.insights?.bridgeGaps) ? graph.insights.bridgeGaps.length : 0
    }
  };
}
