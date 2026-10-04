import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import http from "node:http";
import { spawn } from "node:child_process";
import { once } from "node:events";
import assert from "node:assert/strict";
import { createLiveCheckRecorder } from "./remote-ai-live-check.mjs";

// Explicit opt-in live test. Never put credentials in fixtures, reports or arguments.
const apiKey = process.env.DEEPSEEK_API_KEY?.trim();
if (!apiKey) throw new Error("Set DEEPSEEK_API_KEY in the process environment to run live checks.");
const model = process.env.DEEPSEEK_TEST_MODEL || "deepseek-flash";
const report = { model, timestamp: new Date().toISOString(), syntheticNotesOnly: true, results: [] };
const reportPath = path.resolve("output/remote-ai/deepseek-live-report.json");
const ref = "env:DEEPSEEK_API_KEY";
const remoteHeaders = { "content-type": "application/json", authorization: `Bearer ${apiKey}` };
async function balance() {
  const response = await fetch("https://api.deepseek.com/user/balance", { headers: remoteHeaders, signal: AbortSignal.timeout(15000) });
  const json = await response.json();
  return response.ok ? (json.balance_infos || []).map(({ currency, total_balance }) => ({ currency, total: Number(total_balance) })) : null;
}
const record = createLiveCheckRecorder(report, { secret: apiKey });
const vault = await fs.mkdtemp(path.join(os.tmpdir(), "yansilu-deepseek-live-"));
const probe = http.createServer();
probe.listen(0, "127.0.0.1");
await once(probe, "listening");
const port = probe.address().port;
await new Promise(resolve => probe.close(resolve));
const apiBase = `http://127.0.0.1:${port}`;
const child = spawn(process.execPath, ["apps/api/src/server.mjs"], {
  cwd: path.resolve(import.meta.dirname, ".."),
  env: { ...process.env, VAULT_PATH: vault, API_PORT: String(port) }, stdio: "ignore"
});
async function request(route, body) {
  const response = await fetch(apiBase + route, { ...(body ? { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(65000) });
  const json = await response.json();
  if (!response.ok) throw new Error(`${route}: ${json.error?.code}: ${json.error?.message}`);
  return json;
}
const runtimeModelMap = Object.fromEntries(["router_fast", "cheap_fast", "standard", "strong_reasoning", "guardrail"].map(tier => [`openai_compatible_gateway:${tier}`, model]));
const settings = { providerPreset: "openai_compatible_gateway", modelPack: "Global Optimized", userMode: "Balanced", authMode: "byok_advanced", secretRef: ref, privacyMode: "normal" };
try {
  report.balanceBefore = await balance();
  let ready = false;
  for (let i = 0; i < 100; i++) {
    try { if ((await fetch(apiBase + "/health")).ok) { ready = true; break; } } catch {}
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  assert.ok(ready, "temporary API failed to start");
  await record("connection_1", async () => {
    const json = await request("/api/v1/ai/test-chat", { ...settings, endpointUrl: "https://api.deepseek.com", runtimeModelMap, prompt: "请只回复：连接成功" });
    assert.ok(json.item.output.content?.includes("连接成功"));
    return { status: json.item.status, usage: json.item.usage, draftTestBeforeSave: true };
  }, { required: true });
  await record("save_remote_configuration", async () => {
    await request("/api/v1/ai/provider-configs", { providerId: settings.providerPreset, authMode: settings.authMode, secretRef: ref,
      status: "enabled", endpointUrl: "https://api.deepseek.com", runtimeModelMap });
    const loaded = await request("/api/v1/ai/provider-configs/openai_compatible_gateway");
    assert.equal(loaded.item.runtimeModelMap["openai_compatible_gateway:standard"], model);
    assert.ok(!JSON.stringify(loaded).includes(apiKey));
    return { configurationReloaded: true, credentialNotReturned: true };
  }, { required: true });
  for (let i = 2; i <= 3; i++) await record(`connection_${i}`, async () => {
    const json = await request("/api/v1/ai/test-chat", { ...settings, prompt: "请只回复：连接成功" });
    assert.ok(json.item.output.content?.includes("连接成功"));
    return { status: json.item.status, usage: json.item.usage };
  }, { required: true });
  const bodies = [
    "# 笔记理解\n\n## 一句话判断\n用自己的话解释材料，才能检查是否理解。\n\n只复制原文无法暴露理解的缺口，解释时需要说明理由和边界。 #笔记 #理解",
    "# 来源保留\n\n## 一句话判断\n形成自己的判断时，应保留来源链接和关键证据。\n\n保留出处能帮助以后核对判断；只有摘录并不代表已经理解。 #笔记 #理解"
  ];
  const notes = [];
  for (const body of bodies) notes.push((await request("/api/v1/notes", { directoryId: "dir_original_default", noteType: "permanent", body })).item);
  const input = { ...settings, executeRemoteModel: true, userConfirmedRemoteModel: true, writingGoal: "说明如何从阅读材料形成有依据的自己的判断", noteIds: notes.map(note => note.id), persistArtifacts: false };
  for (const focus of ["writing", "source_distill", "outline_check"]) await record(focus, async () => {
    const json = await request("/api/v1/writing/ai-analysis", { ...input,
      ...(focus === "source_distill" ? { analysisFocus: "source_distill", noteIds: [notes[0].id] } : {}),
      ...(focus === "outline_check" ? { currentOutline: { title: "理解与依据", sections: [
        { heading: "解释材料", purpose: "用自己的话解释以暴露理解缺口", sourceNoteIds: [notes[0].id] },
        { heading: "保留来源", purpose: "保留来源和证据以便核对判断", sourceNoteIds: [notes[1].id] }
      ] } } : {}) });
    assert.equal(json.item.modelExecution.status, "succeeded");
    assert.equal(json.item.result.artifactsPersisted, false);
    if (focus === "source_distill") assert.ok(json.item.result.sourceDistillDraft?.coreArgument);
    return { status: json.item.modelExecution.status, usage: json.item.modelExecution.usage,
      artifactCount: json.item.result.artifacts?.length, viewpointReturned: Boolean(json.item.result.sourceDistillDraft) };
  });
  const relationNotes = notes.map(note => ({ id: note.id, title: note.title, body: note.body, tags: ["笔记", "理解"], folderId: "dir_original_default" }));
  const scan = await request("/api/v1/graph/potential-relations", { notes: relationNotes, options: { minScore: 0.01 } });
  const candidate = scan.item.candidates[0];
  if (candidate) {
    const body = { ...settings, notes: relationNotes, candidate, options: { minScore: 0.01 }, confirmationApproved: true, confirmBudget: true, persistArtifacts: false, timeoutMs: 30000 };
    for (let i = 1; i <= 2; i++) await record(`relation_${i}`, async () => {
      const json = await request("/api/v1/graph/potential-relations/refine", body);
      assert.ok(!json.item.aiError, json.item.aiError || "relation inference failed");
      assert.ok(json.item.aiDecision);
      if (i === 2) assert.equal(json.metrics.cacheHit, true);
      return { decision: json.item.aiDecision, relationType: json.item.aiRelationType, cacheHit: json.metrics.cacheHit };
    });
  } else report.results.push({ name: "relation", ok: false, error: "No candidate from synthetic notes" });
  await record("source_notes_unchanged", async () => {
    for (const note of notes) assert.equal((await request(`/api/v1/notes/${note.id}`)).item.body, note.body);
    return { noteCount: notes.length };
  });
  await record("baseline_default_thinking_probe", async () => {
    const response = await fetch("https://api.deepseek.com/chat/completions", { method: "POST", headers: remoteHeaders,
      body: JSON.stringify({ model, messages: [
        { role: "system", content: "You are a helpful local assistant for note-taking and knowledge work." },
        { role: "user", content: "请只回复：连接成功" }
      ], max_tokens: 256, stream: false }), signal: AbortSignal.timeout(30000) });
    const json = await response.json();
    assert.equal(response.status, 200);
    return { finishReason: json.choices?.[0]?.finish_reason, finalReplyPresent: Boolean(json.choices?.[0]?.message?.content), usage: json.usage };
  });
} finally {
  try { report.balanceAfter = await balance(); } catch {}
  if (child.exitCode === null) { const exited = once(child, "exit"); child.kill(); await exited; }
  await fs.rm(vault, { recursive: true, force: true });
  await fs.mkdir(path.dirname(reportPath), { recursive: true });
  await fs.writeFile(reportPath, JSON.stringify(report, null, 2).replaceAll(apiKey, "[redacted]"), "utf8");
  console.log(JSON.stringify({ reportPath, balanceBefore: report.balanceBefore, balanceAfter: report.balanceAfter }));
}
if (report.results.some(result => !result.ok)) process.exitCode = 1;
