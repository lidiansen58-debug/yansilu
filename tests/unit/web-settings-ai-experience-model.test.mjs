import test from "node:test";
import assert from "node:assert/strict";
import {
  buildSettingsAiExperienceBadges,
  buildSettingsAiOnboardingView,
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
      { tone: "muted", text: "未启用" },
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
      localRuntimeLabel: "本地可用",
      localModel: "qwen3:4b",
      models: [{ name: "qwen3:4b" }]
    }),
    [
      { tone: "ok", text: "本地 AI" },
      { tone: "ok", text: "本地可用" },
      { tone: "ok", text: "当前模型 qwen3:4b" }
    ]
  );
});

test("settings AI setup badges keep hybrid entry wording aligned with existing UI", () => {
  assert.deepEqual(
    buildSettingsAiSetupBadges({
      runtimeMode: "hybrid",
      localFlowActive: true,
      localStatus: "unknown",
      localRuntimeLabel: "本地待检测",
      models: ["qwen3:4b", "llama3.2"]
    }),
    [
      { tone: "ok", text: "本地优先" },
      { tone: "muted", text: "本地待检测" },
      { tone: "muted", text: "2 个本地模型" }
    ]
  );
});

test("settings AI onboarding gives a clear next step when AI is not configured", () => {
  assert.deepEqual(
    buildSettingsAiOnboardingView({
      runtimeMode: "auto",
      providerId: "",
      models: []
    }),
    {
      title: "AI 未配置",
      body: "",
      status: "未配置",
      statusTone: "muted",
      mode: "未启用",
      primaryAction: "配置本地 AI",
      primaryActionKind: "local",
      secondaryAction: "配置远程 AI",
      secondaryActionKind: "remote",
      helper: ""
    }
  );
});

test("settings AI onboarding prompts start, download, and save local model steps", () => {
  assert.equal(buildSettingsAiOnboardingView({
    runtimeMode: "local_only",
    localFlowActive: true,
    localStatus: "unavailable",
    localReadinessStatus: "installed_not_running"
  }).primaryAction, "启动本地模型");

  assert.equal(buildSettingsAiOnboardingView({
    runtimeMode: "local_only",
    localFlowActive: true,
    localStatus: "available",
    models: [],
    primaryRecommendedModel: "qwen3:8b"
  }).status, "模型未下载");

  assert.equal(buildSettingsAiOnboardingView({
    runtimeMode: "local_only",
    localFlowActive: true,
    localStatus: "available",
    models: [{ name: "qwen3:8b" }],
    localModel: ""
  }).primaryAction, "保存模型");
});

test("settings AI onboarding keeps unavailable local runtime states recoverable", () => {
  const view = buildSettingsAiOnboardingView({
    runtimeMode: "local_only",
    localFlowActive: true,
    localStatus: "unavailable",
    localReadinessStatus: "check_failed",
    localReady: true,
    localModel: "qwen3:8b",
    models: [{ name: "qwen3:8b" }]
  });

  assert.equal(view.title, "模型运行工具检测失败");
  assert.equal(view.primaryAction, "重新检测");
  assert.equal(view.primaryActionKind, "detect-local");
  assert.equal(view.secondaryAction, "安装模型运行工具");
  assert.equal(view.secondaryActionKind, "install-ollama");
});

test("settings AI onboarding gives an initial detection action before runtime status is known", () => {
  const view = buildSettingsAiOnboardingView({
    runtimeMode: "local_only",
    localFlowActive: true,
    localStatus: "unknown",
    localReadinessStatus: "unknown"
  });

  assert.equal(view.title, "尚未检测模型运行工具");
  assert.equal(view.primaryAction, "检测本地环境");
  assert.equal(view.primaryActionKind, "detect-local");
  assert.equal(view.secondaryAction, "");
});

test("settings AI onboarding requires testing before remote completion", () => {
  const view = buildSettingsAiOnboardingView({
    runtimeMode: "cloud_only",
    providerId: "openai_compatible_gateway",
    remoteConfigurable: true,
    remoteConfigReady: true,
    testStatus: ""
  });

  assert.equal(view.status, "待验证");
  assert.equal(view.primaryAction, "测试连接");
  assert.equal(view.helper, "配置已填写，验证连接后保存。");
});

test("settings AI onboarding keeps explicit remote setup on the remote path", () => {
  const view = buildSettingsAiOnboardingView({
    runtimeMode: "cloud_only",
    remoteConfigurable: true,
    remoteConfigReady: false,
    testStatus: ""
  });

  assert.equal(view.status, "未配置");
  assert.equal(view.mode, "远程 AI");
  assert.equal(view.primaryAction, "配置远程 AI");
  assert.equal(view.primaryActionKind, "remote");
  assert.equal(view.secondaryAction, "配置本地 AI");
});

test("settings AI experience badges expose advanced, lab, and hybrid states", () => {
  assert.deepEqual(
    buildSettingsAiExperienceBadges({
      advancedFields: 2,
      testRunning: true,
      runtimeMode: "hybrid"
    }),
    {
      advancedBadge: { text: "已填写 2 项", warn: true, muted: false },
      labBadge: { text: "测试中", warn: true, ok: false, muted: false },
      hybridToggle: { text: "关闭本地优先", primary: true, subtle: false }
    }
  );
});

test("settings AI experience badges expose default and completed lab states", () => {
  assert.deepEqual(
    buildSettingsAiExperienceBadges({
      hasMeaningfulAdvancedOverride: false,
      testStatus: "success",
      runtimeMode: "auto"
    }),
    {
      advancedBadge: { text: "通常不用改", warn: false, muted: true },
      labBadge: { text: "测试成功", warn: false, ok: true, muted: false },
      hybridToggle: { text: "本地优先", primary: false, subtle: true }
    }
  );
});

test("settings AI runtime mode label covers supported modes", () => {
  assert.equal(settingsAiRuntimeModeLabel("local_only"), "本地 AI");
  assert.equal(settingsAiRuntimeModeLabel("hybrid"), "本地优先");
  assert.equal(settingsAiRuntimeModeLabel("cloud_only"), "远程 AI");
  assert.equal(settingsAiRuntimeModeLabel(""), "未启用");
});
