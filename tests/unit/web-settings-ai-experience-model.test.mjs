import test from "node:test";
import assert from "node:assert/strict";
import {
  buildSettingsAiExperienceBadges,
  buildSettingsAiSetupBadges,
  settingsAiRuntimeModeLabel
} from "../../apps/web/src/settings-ai-experience-model.js";

test("settings AI setup badges describe automatic remote mode", () => {
  assert.deepEqual(
    buildSettingsAiSetupBadges({
      runtimeMode: "auto",
      localFlowActive: false,
      providerId: "platform_managed_openai",
      providerLabel: "平台托管 OpenAI"
    }),
    [
      { tone: "muted", text: "使用方式 自动选择" },
      { tone: "", text: "平台托管 OpenAI" }
    ]
  );
});

test("settings AI setup badges describe local runtime and selected model", () => {
  assert.deepEqual(
    buildSettingsAiSetupBadges({
      runtimeMode: "local_only",
      localFlowActive: true,
      localStatus: "available",
      localRuntimeLabel: "本地 AI 可用",
      localModel: "qwen3:4b",
      models: [{ name: "qwen3:4b" }]
    }),
    [
      { tone: "ok", text: "使用方式 只用本地模型" },
      { tone: "ok", text: "本地 AI 可用" },
      { tone: "ok", text: "本地模型 qwen3:4b" }
    ]
  );
});

test("settings AI setup badges keep hybrid entry wording aligned with existing UI", () => {
  assert.deepEqual(
    buildSettingsAiSetupBadges({
      runtimeMode: "hybrid",
      localFlowActive: true,
      localStatus: "unknown",
      localRuntimeLabel: "等待检测",
      models: ["qwen3:4b", "llama3.2"]
    }),
    [
      { tone: "ok", text: "使用方式 自动选择" },
      { tone: "muted", text: "等待检测" },
      { tone: "muted", text: "2 个本地模型" }
    ]
  );
});

test("settings AI experience badges expose advanced, lab, and hybrid states", () => {
  assert.deepEqual(
    buildSettingsAiExperienceBadges({
      advancedFields: 2,
      testRunning: true,
      runtimeMode: "hybrid"
    }),
    {
      advancedBadge: { text: "2 项已填写", warn: true, muted: false },
      labBadge: { text: "运行中", warn: true, ok: false, muted: false },
      hybridToggle: { text: "退出本地优先", primary: true, subtle: false }
    }
  );
});

test("settings AI experience badges expose default and completed lab states", () => {
  assert.deepEqual(
    buildSettingsAiExperienceBadges({
      hasMeaningfulAdvancedOverride: false,
      testOutput: "pong",
      runtimeMode: "auto"
    }),
    {
      advancedBadge: { text: "保持默认", warn: false, muted: true },
      labBadge: { text: "已有结果", warn: false, ok: true, muted: false },
      hybridToggle: { text: "启用本地优先", primary: false, subtle: true }
    }
  );
});

test("settings AI runtime mode label covers supported modes", () => {
  assert.equal(settingsAiRuntimeModeLabel("local_only"), "只用本地模型");
  assert.equal(settingsAiRuntimeModeLabel("hybrid"), "本地优先");
  assert.equal(settingsAiRuntimeModeLabel("cloud_only"), "只用远程模型");
  assert.equal(settingsAiRuntimeModeLabel(""), "自动选择");
});
