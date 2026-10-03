import test from "node:test";
import assert from "node:assert/strict";
import { createWritingThemeProjectRuntime } from "../../apps/web/src/writing-theme-project-runtime.js";
import { normalizeWritingProjectTitleSeed } from "../../apps/web/src/prototype-writing-workspace.js";

function harness(selectedThemeIndexId) {
  const fields = { writingTitle: { value: "我的文章项目" }, writingGoal: { value: "我的问题" }, writingAudience: { value: "自己的读者" }, writingTone: { value: "" } };
  const writingState = { selectedThemeIndexId };
  const payloads = [];
  const runtime = createWritingThemeProjectRuntime({
    $: (id) => fields[id], writingState, normalizeWritingProjectTitleSeed,
    useThemeIndexAsWritingEntry: async (id) => {
      fields.writingTitle.value = "新主题默认题目";
      fields.writingGoal.value = "新主题默认问题";
      fields.writingAudience.value = "默认读者";
      fields.writingTone.value = "默认语气";
      writingState.selectedThemeIndexId = id;
      return { indexCard: { id, title: fields.writingTitle.value }, noteIds: ["note-1"] };
    },
    currentWritingBookStructure: () => { throw new Error("Theme articles must not adopt suggested book chapters"); }, writingKnownNoteById: () => ({ id: "note-1", title: "真实来源" }),
    deriveWritingProjectIntent: ({ goal }) => goal, deriveWritingProjectTakeaway: () => "读者收获",
    createWritingProject: async (payload) => { payloads.push(payload); return { id: "project-1", ...payload }; },
    syncWritingLocalBookIdeasFromProject: () => {}, populateWritingFormFromProject: () => {}, showWritingResult: () => {},
    loadWritingProjectsList: async () => {}, loadWritingScaffoldVersions: async () => {}, loadWritingDraftVersions: async () => {}, renderWritingPanel: () => {}
  });
  return { runtime, payloads };
}

test("first outline project keeps the current theme's manually edited form before entry resets it", async () => {
  const { runtime, payloads } = harness("theme-1");
  await runtime.createWritingProjectFromThemeIndex("theme-1");
  assert.equal(payloads[0].title, "我的文章项目");
  assert.equal(payloads[0].goal, "我的问题");
  assert.equal(payloads[0].audience, "自己的读者");
  assert.equal(payloads[0].tone, "");
  assert.deepEqual(payloads[0].relatedIndexIds, ["theme-1"]);
  assert.deepEqual(payloads[0].bookStructure, { schema_version: 1, parts: [] });
});

test("creating from a different theme never carries the previous theme's edited form", async () => {
  const { runtime, payloads } = harness("other-theme");
  await runtime.createWritingProjectFromThemeIndex("theme-1");
  assert.equal(payloads[0].title, "新主题默认题目");
  assert.equal(payloads[0].goal, "新主题默认问题");
  assert.equal(payloads[0].audience, "默认读者");
});
