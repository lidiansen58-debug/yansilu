import test from "node:test";
import assert from "node:assert/strict";

import {
  buildWritingPanelState,
  normalizeWritingBookStructure,
  normalizeWritingProjectTitleSeed,
  suggestedThemeIndexTitle,
  suggestedWritingProjectTitle,
  uniqueWritingBookPoolItems,
  writingBookMatchesAny,
  writingBookPlainText,
  writingBookSectionFromNote,
  writingBookShortText,
  writingBookStructureStats,
  writingSourceIndexSummary,
  writingThemeLabels,
  writingThemeSummary
} from "../../apps/web/src/prototype-writing-workspace.js";

const notesById = new Map([
  ["n1", { id: "n1", title: "Alpha", tags: ["thinking"], body: "" }],
  ["n2", { id: "n2", title: "Beta", tags: [], body: "#graph #writing" }],
  ["n3", { id: "n3", title: "Gamma", tags: [], body: "" }]
]);

const noteById = (id) => notesById.get(id) || null;
const parseTags = (body) => [...String(body || "").matchAll(/#([A-Za-z0-9_-]+)/g)].map((match) => match[1]);

test("writing workspace helpers derive project titles from note lookup", () => {
  assert.match(normalizeWritingProjectTitleSeed("Alpha"), /Alpha/);
  assert.match(suggestedWritingProjectTitle(["n1"], { noteById }), /Alpha/);
  assert.match(suggestedWritingProjectTitle(["n1", "n2"], { noteById }), /Alpha/);
});

test("writing workspace helpers derive theme labels from tags before titles", () => {
  assert.deepEqual(writingThemeLabels([noteById("n1"), noteById("n2")], { parseTags }), ["thinking", "graph", "writing"]);
  assert.deepEqual(writingThemeLabels([noteById("n3")], { parseTags }), ["Gamma"]);
  assert.match(writingThemeSummary([noteById("n1"), noteById("n2")], { parseTags }), /thinking/);
});

test("writing workspace helpers summarize source indexes and theme index titles", () => {
  const themeIndexById = (id) => ({ id, title: `Index ${id}` });

  assert.match(writingSourceIndexSummary(["idx1", "idx2", "idx3"], { themeIndexById }), /Index idx1/);
  assert.match(suggestedThemeIndexTitle(["n1", "n2"], { noteById, parseTags }), /thinking/);
});

test("writing panel state builder derives candidates readiness buttons and topline metrics", () => {
  const calls = [];
  const panel = buildWritingPanelState({
    selectedNote: { id: "n1", title: "Alpha" },
    scopeFolder: { name: "Folder" },
    scopeRoot: { name: "Root" },
    allCandidates: [noteById("n1"), noteById("n2")],
    basketEntries: [noteById("n1")],
    basketIds: ["n1"],
    sourceIndexSummary: "Index"
  }, {
    writingState: undefined,
    planWritingCandidateFocus: ({ candidateNoteIds, focusedNoteIds, focusedScopeLabel }) => {
      calls.push(["focus", candidateNoteIds, focusedNoteIds, focusedScopeLabel]);
      return {
        usingFocusedScope: true,
        scopeLabel: focusedScopeLabel,
        noteIds: ["n2", "missing"],
        addActionLabel: "Add visible"
      };
    },
    writingKnownNoteById: noteById,
    isWritingEligibleNote: (note) => note.id !== "missing",
    parseWritingBasketIds: () => ["n1"],
    writingRelationCountsReady: () => true,
    writingRelationCountsErrored: () => false,
    deriveBasketWritingReadiness: () => ({ level: "project_ready", status: "Ready", hint: "Can create" }),
    describeWritingProjectEntryState: (input) => ({ ...input, canCreateProject: true, actionLabel: "Create project", status: "Project ready" }),
    describeWritingProjectPreflight: () => ({ level: "ready", status: "Ready", hint: "" }),
    isWritingStrongModelReady: () => true,
    describeWritingStrongModelStatus: () => ({ status: "Strong ready", hint: "Use strong model", buttonLabel: "Run strong" }),
    currentWritingContinuationEntry: () => ({ action: "resume" }),
    writingOpenDraftButtonState: ({ hasDraft, draftContinuation }) => ({ disabled: hasDraft, text: draftContinuation ? "Resume draft" : "Open draft" }),
    writingScaffoldButtonState: () => ({ disabled: false, text: "Create scaffold" }),
    writingStrongModelButtonState: ({ basketCount, strongModelReady }) => ({ disabled: !strongModelReady, text: `Run ${basketCount}` })
  });

  assert.equal(panel.currentLabel, "Alpha (n1)");
  assert.equal(panel.scopeLabel, "Root / Folder");
  assert.deepEqual(panel.candidates.map((note) => note.id), ["n2"]);
  assert.equal(panel.relationCountsReady, true);
  assert.equal(panel.projectEntry.canCreateProject, true);
  assert.equal(panel.strongModelReady, true);
  assert.equal(panel.openDraftButtonState.text, "Resume draft");
  assert.equal(panel.scaffoldButtonState.text, "Create scaffold");
  assert.equal(panel.strongModelButtonState.text, "Run 1");
  assert.deepEqual(panel.toplineMetrics.map((metric) => metric.label), ["写作篮", "项目", "草稿"]);
  assert.deepEqual(calls[0][1], ["n1", "n2"]);
});

test("writing book helpers normalize text, sections, pools, and stats", () => {
  const note = {
    id: "n1",
    title: "Alpha",
    thesis: "A clear claim",
    boundaryOrCounterpoint: "A useful boundary",
    threeLineSummary: ["one", "two"],
    body: "Long body"
  };
  const structure = normalizeWritingBookStructure({
    schemaVersion: 2,
    parts: [
      {
        title: "Part",
        chapters: [
          {
            title: "Chapter",
            noteIds: ["n1"],
            sections: ["Section one", { title: "Section two", noteIds: ["n2"], role: "case" }]
          }
        ]
      }
    ],
    pools: {
      cases: [{ title: "Case", noteIds: ["n1"] }],
      counters: ["Counter"],
      questions: ["Question"]
    },
    directionIdeas: [{ title: "Idea", noteIds: ["n1"] }]
  });

  assert.match(writingBookPlainText(note), /A clear claim/);
  assert.equal(writingBookShortText("alpha beta", 5), "alpha...");
  assert.equal(writingBookMatchesAny("Alpha beta", ["BETA"]), true);
  assert.equal(writingBookSectionFromNote(note)[0].evidence_note_ids[0], "n1");
  assert.deepEqual(uniqueWritingBookPoolItems([{ title: "Case", noteIds: ["n1"] }, { title: "Case", note_ids: ["n1"] }]), [
    { title: "Case", note_ids: ["n1"], role: "" }
  ]);
  assert.equal(structure.schema_version, 2);
  assert.equal(structure.parts[0].chapters[0].sections.length, 2);
  assert.equal(structure.pools.counterarguments[0].title, "Counter");
  assert.equal(structure.direction_ideas[0].title, "Idea");
  assert.deepEqual(writingBookStructureStats(structure), {
    partCount: 1,
    chapterCount: 1,
    sectionCount: 2,
    caseCount: 1,
    counterargumentCount: 1,
    questionCount: 1
  });
});
