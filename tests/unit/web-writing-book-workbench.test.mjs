import test from "node:test";
import assert from "node:assert/strict";
import {
  writingAnalysisSystemMessageDeliveryOptions,
  writingAnalysisSystemMessageForResult
} from "../../apps/web/src/prototype-system-messages.js";
import {
  handleWritingLocalBookIdeas
} from "../../apps/web/src/writing-panel-events.js";
import {
  currentWritingBookStructureForRuntime,
  deriveWritingBookDesign,
  deriveWritingLocalBookIdeas,
  resetWritingLocalBookIdeasState,
  syncWritingLocalBookIdeasFromProjectState,
  writingBookProjectAudienceForRuntime,
  writingBookProjectGoalForRuntime,
  writingBookProjectTitleForRuntime,
  writingBookStructureStats
} from "../../apps/web/src/prototype-writing-workspace.js";
import {
  readPrototypeHtmlSource,
  readWritingBookDesignPanelSource,
  readPrototypeWritingWorkspaceSource,
  readWritingStrongModelRequestPanelSource,
  readWritingPanelControllerSource
} from "./copy-source-helpers.mjs";

test("writing center exposes a book-level workbench between materials and drafts", async () => {
  const html = await readPrototypeHtmlSource();

  assert.match(html, /id="writingBookDesignSummary"/);
  assert.match(html, /id="writingBookStructure"/);
  assert.match(html, /id="writingBookPools"/);
  assert.match(html, /id="writingBookLocalIdeas"/);
  assert.match(html, /id="btnWritingLocalBookIdeas"/);
});

test("writing center derives book structure with parts, chapters, sections, and pools", async () => {
  const panelControllerSource = await readWritingPanelControllerSource();
  const bookDesignPanelSource = await readWritingBookDesignPanelSource();
  const writingWorkspaceSource = await readPrototypeWritingWorkspaceSource();
  const design = deriveWritingBookDesign({
    title: "AI时代易经与人生",
    audience: "知识工作者",
    notes: [
      { id: "n1", title: "易经不是答案", body: "易经 卦 变化", thesis: "变化判断" },
      { id: "n2", title: "AI 工作复盘", body: "AI 模型 工作 复盘", boundaryOrCounterpoint: "不能只做类比" },
      { id: "n3", title: "反方风险", body: "反方 风险 边界" }
    ],
    scaffold: {
      open_questions: ["还缺哪个案例？"],
      sections: [{ counterpoints: ["不要把模型当答案"] }]
    }
  });
  const stats = writingBookStructureStats(design);

  assert.equal(stats.partCount, 3);
  assert.ok(stats.chapterCount >= 3);
  assert.ok(stats.sectionCount >= 6);
  assert.ok(stats.caseCount >= 1);
  assert.ok(stats.counterargumentCount >= 1);
  assert.ok(stats.questionCount >= 1);
  assert.equal(design.reader, "知识工作者");
  assert.match(bookDesignPanelSource, /function renderWritingBookDesignDom/);
  assert.match(panelControllerSource, /from "\.\/writing-book-design-panel\.js"/);
  assert.match(panelControllerSource, /renderWritingBookDesignDom\(deps\);/);
  assert.match(writingWorkspaceSource, /evidence_note_ids: note\?\.id \? \[note\.id\] : \[\]/);
});

test("writing book runtime helpers resolve project fields and local idea overlays", () => {
  assert.equal(writingBookProjectTitleForRuntime({ projectTitle: "Project", inputTitle: "Input" }), "Project");
  assert.equal(writingBookProjectTitleForRuntime({ inputTitle: "Input" }), "Input");
  assert.equal(writingBookProjectTitleForRuntime({ fallbackTitle: "Fallback" }), "Fallback");
  assert.equal(writingBookProjectGoalForRuntime({ projectGoal: "Goal", inputGoal: "Input" }), "Goal");
  assert.equal(writingBookProjectAudienceForRuntime({ inputAudience: "Readers" }), "Readers");

  const structure = currentWritingBookStructureForRuntime({
    persistedStructure: {
      parts: [{ id: "p1", title: "Part One", chapters: [] }],
      direction_ideas: [{ title: "Persisted" }]
    },
    derivedDesign: {
      parts: [{ id: "derived", title: "Derived Part", chapters: [] }],
      direction_ideas: [{ title: "Derived" }]
    },
    localBookIdeas: [{ title: "Local", noteIds: ["n1"] }]
  });

  assert.deepEqual(structure.parts.map((part) => part.id), ["p1"]);
  assert.deepEqual(structure.direction_ideas.map((idea) => idea.title), ["Local"]);
  assert.deepEqual(structure.direction_ideas[0].note_ids, ["n1"]);

  const noOverlay = currentWritingBookStructureForRuntime({
    persistedStructure: {},
    derivedDesign: {
      parts: [{ id: "derived", title: "Derived Part", chapters: [] }],
      direction_ideas: [{ title: "Derived" }]
    },
    localBookIdeas: [{ title: "Local", noteIds: ["n1"] }],
    includeLocalIdeas: false
  });

  assert.deepEqual(noOverlay.parts.map((part) => part.id), ["derived"]);
  assert.deepEqual(noOverlay.direction_ideas.map((idea) => idea.title), ["Derived"]);
});

test("local book ideas are generated on device and do not mutate project automatically", () => {
  const ideas = deriveWritingLocalBookIdeas({
    title: "AI时代易经与人生",
    notes: [
      { id: "n1", title: "案例一" },
      { id: "n2", title: "案例二" }
    ]
  });

  assert.equal(ideas.length, 3);
  assert.deepEqual(ideas[0].noteIds, ["n1", "n2"]);
  assert.match(ideas[0].risk, /案例/);
});

test("local book idea generation stays separate from project persistence", async () => {
  const calls = [];
  const writingState = { project: null, localBookIdeas: [], localBookIdeasGeneratedAt: "" };
  await handleWritingLocalBookIdeas({
    writingState,
    writingBasketEntries: () => [{ id: "n1", title: "Note one" }, { id: "n2", title: "Note two" }],
    deriveWritingLocalBookIdeas: ({ notes }) => [{ title: "Local only", noteIds: notes.map((note) => note.id) }],
    updateWritingProjectBookStructure: async () => {
      calls.push("save-project");
      return null;
    },
    renderWritingPanel: () => calls.push("render"),
    setStatus: (_message, tone) => calls.push(["status", tone])
  });

  assert.deepEqual(writingState.localBookIdeas, [{ title: "Local only", noteIds: ["n1", "n2"] }]);
  assert.ok(writingState.localBookIdeasGeneratedAt);
  assert.equal(calls.includes("save-project"), false);
  assert.ok(calls.some((call) => Array.isArray(call) && call[0] === "status" && call[1] === "ok"));
});

test("local book ideas reset on basket changes and sync when opening a project", () => {
  const writingState = {
    localBookIdeas: [{ title: "Old", noteIds: ["n0"] }],
    localBookIdeasGeneratedAt: "old-time"
  };

  resetWritingLocalBookIdeasState(writingState);
  assert.deepEqual(writingState.localBookIdeas, []);
  assert.equal(writingState.localBookIdeasGeneratedAt, "");

  syncWritingLocalBookIdeasFromProjectState(writingState, {
    book_structure: {
      generated_at: "2026-01-01T00:00:00.000Z",
      direction_ideas: [{ title: "Idea", noteIds: ["n1"] }]
    }
  });
  assert.deepEqual(writingState.localBookIdeas, [{ id: "idea_1", title: "Idea", reader: "", promise: "", risk: "", note_ids: ["n1"] }]);
  assert.equal(writingState.localBookIdeasGeneratedAt, "2026-01-01T00:00:00.000Z");
});

test("strong model request package shows included notes, questions, and exclusions", async () => {
  const panelControllerSource = await readWritingPanelControllerSource();
  const strongModelRequestPanelSource = await readWritingStrongModelRequestPanelSource();

  assert.match(panelControllerSource, /from "\.\/writing-strong-model-request-panel\.js"/);
  assert.match(strongModelRequestPanelSource, /function renderWritingStrongModelRequestDetailDom/);
  assert.match(strongModelRequestPanelSource, /const plannedQuestions = \[/);
  assert.match(strongModelRequestPanelSource, /const notSent = \[/);
  assert.match(strongModelRequestPanelSource, /plannedQuestions\.map/);
  assert.match(strongModelRequestPanelSource, /notSent\.map/);
});

test("strong model request package history does not interrupt when no artifacts are created", () => {
  const message = writingAnalysisSystemMessageForResult({
    projectId: "wp_1",
    noteIds: ["note-1"],
    artifactCount: 0,
    now: () => 123
  });

  assert.equal(message.id, "writing-ai-request:wp_1:123");
  assert.equal(message.artifactCount, 0);
  assert.equal(message.action, "");
  assert.deepEqual(writingAnalysisSystemMessageDeliveryOptions({ artifactCount: 0 }), {});
  assert.deepEqual(writingAnalysisSystemMessageDeliveryOptions({ artifactCount: 2 }), { interrupt: true });
});
