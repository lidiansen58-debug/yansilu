import test from "node:test";
import assert from "node:assert/strict";
import { readPrototypeAppSource, readPrototypeHtmlSource, readPrototypeWritingWorkspaceSource } from "./copy-source-helpers.mjs";

test("writing center exposes a book-level workbench between materials and drafts", async () => {
  const html = await readPrototypeHtmlSource();

  assert.match(html, /id="writingBookDesignSummary"/);
  assert.match(html, /id="writingBookStructure"/);
  assert.match(html, /id="writingBookPools"/);
  assert.match(html, /id="writingBookLocalIdeas"/);
  assert.match(html, /id="btnWritingLocalBookIdeas"[^>]*>本地生成 3 个书稿方向</);
  assert.match(html, /主线、部、章、节、案例池和反方池/);
});

test("writing center derives book structure with parts, chapters, sections, and pools", async () => {
  const source = await readPrototypeAppSource();
  const writingWorkspaceSource = await readPrototypeWritingWorkspaceSource();

  assert.match(source, /function deriveWritingBookDesign/);
  assert.match(source, /第一部/);
  assert.match(source, /第\$\{chapterIndex \+ 1\}章/);
  assert.match(writingWorkspaceSource, /节一：/);
  assert.match(source, /案例池/);
  assert.match(source, /反方池/);
  assert.match(source, /开放问题/);
  assert.match(source, /function uniqueWritingBookPoolItems/);
  assert.match(writingWorkspaceSource, /evidence_note_ids: note\?\.id \? \[note\.id\] : \[\]/);
  assert.match(source, /renderWritingBookDesign\(\);/);
});

test("local book ideas are generated on device and do not mutate project automatically", async () => {
  const source = await readPrototypeAppSource();

  assert.match(source, /function deriveWritingLocalBookIdeas/);
  assert.match(source, /function syncWritingLocalBookIdeasFromProject/);
  assert.match(source, /判断力训练型/);
  assert.match(source, /去神秘化解释型/);
  assert.match(source, /AI时代人生方法型/);
  assert.match(source, /\$\("btnWritingLocalBookIdeas"\)\?\.addEventListener\("click"/);
  assert.match(source, /不会上传材料，也不会自动写入项目/);
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
  assert.match(source, /使用笔记/);
  assert.match(source, /准备问模型什么/);
  assert.match(source, /不会发送 \/ 不会自动做/);
  assert.match(source, /不会发送未加入写作篮的其它笔记/);
  assert.match(source, /不会自动写入笔记、不会自动改图谱/);
});

test("strong model request package history does not interrupt when no artifacts are created", async () => {
  const source = await readPrototypeAppSource();
  const requestMessageStart = source.indexOf('id: `writing-ai-request:');
  const requestMessageEnd = source.indexOf('setStatus(`已准备 ${model} 写作分析请求包', requestMessageStart);
  const requestMessageBlock = source.slice(requestMessageStart, requestMessageEnd);

  assert.ok(requestMessageStart >= 0 && requestMessageEnd > requestMessageStart, "expected request-package system message block");
  assert.doesNotMatch(requestMessageBlock, /\{ interrupt: true \}/);
  assert.match(requestMessageBlock, /artifactCount: 0/);
});
