import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildSourceNoteDistillDraft,
  buildSourceNoteDistillDraftFromAiResult
} from "../../apps/web/src/source-note-distill-ai-draft.js";

const repoRoot = path.resolve(fileURLToPath(new URL("../..", import.meta.url)));

test("source note distill draft uses AI writing analysis artifacts when available", () => {
  const draft = buildSourceNoteDistillDraftFromAiResult({
    result: {
      artifacts: [
        {
          type: "WritingMove",
          body: "材料中的核心判断是记录问题应先于整理结论。",
          payload: { whyItMatters: "避免过早封闭思考。" }
        },
        {
          type: "OutlineDraft",
          title: "研究笔记应先记录问题",
          body: "问题\n证据\n边界",
          payload: { sections: ["问题", "证据", "边界"] }
        },
        {
          type: "SourceGap",
          body: "还需要一个反例。",
          payload: { gap: "缺少反例" }
        }
      ]
    }
  }, {
    sourceTitle: "原材料",
    sourceBody: "原文"
  });

  assert.equal(draft.modelUsed, true);
  assert.equal(draft.draft.title, "研究笔记应先记录问题");
  assert.equal(draft.draft.coreArgument, "材料中的核心判断是记录问题应先于整理结论。");
  assert.match(draft.draft.content, /问题/);
  assert.match(draft.draft.questions, /还需要一个反例/);
});

test("source note distill draft returns null when AI analysis has no usable content", () => {
  assert.equal(buildSourceNoteDistillDraftFromAiResult({ result: { artifacts: [] } }, { sourceTitle: "材料" }), null);
  assert.equal(buildSourceNoteDistillDraft({ sourceTitle: "材料" }).draft.title, "材料");
});

test("source note distill draft does not copy full source body when AI returns no outline", () => {
  const sourceBody = Array.from({ length: 20 }, (_, index) => `第 ${index + 1} 段很长的原始材料`).join("\n");
  const draft = buildSourceNoteDistillDraftFromAiResult({
    result: {
      artifacts: [
        {
          type: "WritingMove",
          body: "先把问题记录下来，再整理结论。"
        }
      ]
    }
  }, {
    sourceTitle: "材料",
    sourceBody
  });

  assert.match(draft.draft.content, /说明：先把问题记录下来/);
  assert.match(draft.draft.content, /参考材料：/);
  assert.ok(draft.draft.content.length < sourceBody.length);
});

test("prototype source distill runner calls writing AI analysis before fallback draft", () => {
  const source = fs.readFileSync(path.join(repoRoot, "apps/web/src/prototype-app.js"), "utf8");
  const start = source.indexOf("async function runSourceDistillAi");
  const end = source.indexOf("function shouldGuideLocalAiSetupForFeature", start);
  const body = source.slice(start, end);

  assert.match(body, /analyzeWritingWithStrongModel\(/);
  assert.match(body, /buildSourceNoteDistillDraftFromAiResult\(analysis, payload\)/);
  assert.doesNotMatch(body, /^\s*return buildSourceNoteDistillDraft\(payload\);/m);
});

test("prototype AI feature policy prefers local unless remote is explicitly enabled", () => {
  const source = fs.readFileSync(path.join(repoRoot, "apps/web/src/prototype-app.js"), "utf8");
  const policyStart = source.indexOf("function remoteAiExplicitlyEnabledForFeatures");
  const policyEnd = source.indexOf("const settingsAiStateRuntime", policyStart);
  const policyBody = source.slice(policyStart, policyEnd);
  const runStart = source.indexOf("async function runSourceDistillAi");
  const runEnd = source.indexOf("function shouldGuideLocalAiSetupForFeature", runStart);
  const runBody = source.slice(runStart, runEnd);
  const readyStart = source.indexOf("async function ensureAiReadyForFeature");
  const readyEnd = source.indexOf("async function runSourceDistillAi", readyStart);
  const readyBody = source.slice(readyStart, readyEnd);

  assert.match(policyBody, /normalizeAiRuntimeMode\(settingsState\.ai\.runtimeMode\) === "cloud_only"/);
  assert.match(policyBody, /preferredLocalProviderPresetForSelection\(\)/);
  assert.match(policyBody, /function featureAiRequestOptions\(\)/);
  assert.match(policyBody, /providerPreset:\s*providerId/);
  assert.match(policyBody, /privacyMode:\s*localProvider \? "local_only" : "remote_after_confirmation"/);
  assert.match(runBody, /const requestOptions = featureAiRequestOptions\(\)/);
  assert.match(runBody, /const localProvider = requestOptions\.privacyMode === "local_only"/);
  assert.match(readyBody, /if \(!remoteAiExplicitlyEnabledForFeatures\(\)\)/);
  assert.match(readyBody, /return ensureLocalAiReadyForFeature\(options\)/);
});

test("prototype local AI readiness requires the tested local model", () => {
  const source = fs.readFileSync(path.join(repoRoot, "apps/web/src/prototype-app.js"), "utf8");
  const start = source.indexOf("function localAiFeatureReady");
  const end = source.indexOf("function localOllamaSetupActive", start);
  const body = source.slice(start, end);

  assert.match(body, /const testModel = String\(settingsState\.ai\.testModel \|\| ""\)\.trim\(\)/);
  assert.match(body, /\["auto", "local_only", "hybrid"\]\.includes\(runtimeMode\)/);
  assert.match(body, /installedLocalModelReady\(\)[\s\S]*testStatus === "success"[\s\S]*testModel === localModel/);
});

test("prototype source distill runner enforces remote confirmation at the route boundary", () => {
  const source = fs.readFileSync(path.join(repoRoot, "apps/web/src/prototype-app.js"), "utf8");
  const start = source.indexOf("async function runSourceDistillAi");
  const end = source.indexOf("function shouldGuideLocalAiSetupForFeature", start);
  const body = source.slice(start, end);

  assert.match(body, /payload\.remoteConfirmed !== true/);
  assert.match(body, /REMOTE_AI_CONFIRMATION_REQUIRED/);
  assert.match(body, /\.\.\.requestOptions/);
});

test("prototype writing AI wrapper forwards remote confirmation options", () => {
  const source = fs.readFileSync(path.join(repoRoot, "apps/web/src/prototype-app.js"), "utf8");
  const start = source.indexOf("async function prepareWritingStrongModelAnalysis");
  const end = source.indexOf("function updateWritingProjectHistoryVisibility", start);
  const body = source.slice(start, end);

  assert.match(body, /async function prepareWritingStrongModelAnalysis\(options = \{\}\)/);
  assert.match(body, /writingProjectRuntimeController\.prepareWritingStrongModelAnalysis\(options\)/);
});

test("prototype AI settings resume includes editor contextual actions", () => {
  const source = fs.readFileSync(path.join(repoRoot, "apps/web/src/prototype-app.js"), "utf8");
  const start = source.indexOf("async function resumePendingAiSettingsAction");
  const end = source.indexOf("installSettingsAiEventBindings", start);
  const body = source.slice(start, end);

  assert.match(body, /writingProjectRuntimeController\.resumePendingContextualAiAction\(\.\.\.args\)/);
  assert.match(body, /editor\.resumePendingContextualAiAction\?\.\(\.\.\.args\)/);
  assert.match(source, /onAiSettingsReady: resumePendingAiSettingsAction/);
});
