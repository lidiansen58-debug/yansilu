import test from "node:test";
import assert from "node:assert/strict";
import { writingAnalysisSystemMessageForResult } from "../../apps/web/src/prototype-system-messages.js";
import { readPrototypeAppSource, readPrototypeHtmlSource, readPrototypeWritingWorkspaceSource } from "./copy-source-helpers.mjs";

test("writing center exposes a book-level workbench between materials and drafts", async () => {
  const html = await readPrototypeHtmlSource();

  assert.match(html, /id="writingBookDesignSummary"/);
  assert.match(html, /id="writingBookStructure"/);
  assert.match(html, /id="writingBookPools"/);
  assert.match(html, /id="writingBookLocalIdeas"/);
  assert.match(html, /id="btnWritingLocalBookIdeas"/);
});

test("writing center derives book structure with parts, chapters, sections, and pools", async () => {
  const source = await readPrototypeAppSource();
  const writingWorkspaceSource = await readPrototypeWritingWorkspaceSource();

  assert.match(source, /function deriveWritingBookDesign/);
  assert.match(source, /function uniqueWritingBookPoolItems/);
  assert.match(source, /renderWritingBookDesign\(\);/);
  assert.match(writingWorkspaceSource, /evidence_note_ids: note\?\.id \? \[note\.id\] : \[\]/);
});

test("local book ideas are generated on device and do not mutate project automatically", async () => {
  const source = await readPrototypeAppSource();

  assert.match(source, /function deriveWritingLocalBookIdeas/);
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
  const source = await readPrototypeAppSource();

  assert.match(source, /function renderWritingStrongModelRequestDetail/);
  assert.match(source, /note_count/);
  assert.match(source, /const plannedQuestions = \[/);
  assert.match(source, /const notSent = \[/);
  assert.match(source, /plannedQuestions\.map/);
  assert.match(source, /notSent\.map/);
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
