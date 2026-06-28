import test from "node:test";
import assert from "node:assert/strict";
import { writingAnalysisSystemMessageForResult } from "../../apps/web/src/prototype-system-messages.js";
import {
  deriveWritingBookDesign,
  deriveWritingLocalBookIdeas,
  writingBookStructureStats
} from "../../apps/web/src/prototype-writing-workspace.js";
import {
  readPrototypeAppSource,
  readPrototypeHtmlSource,
  readPrototypeWritingWorkspaceSource,
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
  assert.match(panelControllerSource, /function renderWritingBookDesignDom/);
  assert.match(panelControllerSource, /renderWritingBookDesignDom\(deps\);/);
  assert.match(writingWorkspaceSource, /evidence_note_ids: note\?\.id \? \[note\.id\] : \[\]/);
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
  const source = await readPrototypeAppSource();

  assert.match(source, /function syncWritingLocalBookIdeasFromProject/);
  assert.match(source, /\$\("btnWritingLocalBookIdeas"\)\?\.addEventListener\("click"/);
  assert.doesNotMatch(source, /deriveWritingLocalBookIdeas\([^)]*\)\s*;\s*saveWritingProject/);
});

test("local book ideas reset on basket changes and sync when opening a project", async () => {
  const source = await readPrototypeAppSource();
  const continueStart = source.indexOf("function continueWritingEntry");
  const continueEnd = source.indexOf("function applyAiModelPackChange", continueStart);
  const populateStart = source.indexOf("function populateWritingFormFromProject");
  const populateEnd = source.indexOf("function currentWritingVersionNote", populateStart);
  const directBasketStart = source.indexOf("function addWritingBasketIds");
  const directBasketEnd = source.indexOf("function writingKnownNoteById", directBasketStart);

  assert.ok(continueStart >= 0 && continueEnd > continueStart, "expected continueWritingEntry() block");
  assert.ok(populateStart >= 0 && populateEnd > populateStart, "expected populateWritingFormFromProject() block");
  assert.ok(directBasketStart >= 0 && directBasketEnd > directBasketStart, "expected direct basket mutation block");
  assert.match(source.slice(continueStart, continueEnd), /resetWritingLocalBookIdeas\(\);/);
  assert.match(source.slice(populateStart, populateEnd), /syncWritingLocalBookIdeasFromProject\(project\);/);
  assert.match(source.slice(directBasketStart, directBasketEnd), /resetWritingProjectContextForBasketChange\(\);/);
  assert.match(source, /function resetWritingProjectContextForBasketChange/);
  assert.match(source, /function resetWritingProjectContextForBasketChange\(\) \{[\s\S]*resetWritingStrongModelState\(\);/);
  assert.match(source, /writingState\.localBookIdeas = normalized\.direction_ideas;/);
});

test("strong model request package shows included notes, questions, and exclusions", async () => {
  const panelControllerSource = await readWritingPanelControllerSource();

  assert.match(panelControllerSource, /function renderWritingStrongModelRequestDetailDom/);
  assert.match(panelControllerSource, /const plannedQuestions = \[/);
  assert.match(panelControllerSource, /const notSent = \[/);
  assert.match(panelControllerSource, /plannedQuestions\.map/);
  assert.match(panelControllerSource, /notSent\.map/);
});

test("strong model request package history does not interrupt when no artifacts are created", async () => {
  const source = await readPrototypeAppSource();
  const message = writingAnalysisSystemMessageForResult({
    projectId: "wp_1",
    noteIds: ["note-1"],
    artifactCount: 0,
    now: () => 123
  });

  assert.equal(message.id, "writing-ai-request:wp_1:123");
  assert.equal(message.artifactCount, 0);
  assert.equal(message.action, "");
  assert.match(source, /addSystemMessage\(systemMessage, artifactCount > 0 \? \{ interrupt: true \} : \{\}\)/);
});
