import { buildPermanentNoteLocalModelRequest } from "../packages/ai-orchestrator/src/note-analysis.mjs";
import { runPermanentNoteLocalModelAnalysis } from "../packages/ai-orchestrator/src/analysis-executor.mjs";
import { createOpenAiCompatibleProviderAdapter } from "../packages/ai-orchestrator/src/openai-compatible-adapter.mjs";
import { getProviderPreset } from "../packages/ai-orchestrator/src/provider-presets.mjs";

const model = String(process.env.OLLAMA_MODEL || "qwen3:8b");
const baseUrl = String(process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434").replace(/\/+$/, "");
const fixture = {
  options: process.env.AI_ANALYSIS_FOCUS === "relations" ? { analysisFocus: "relations" } : {},
  noteId: "synthetic_understanding", title: "Explain to test understanding",
  body: "Explaining a concept in your own words can reveal gaps in understanding. Evidence: closing the book requires organizing reasons rather than copying sentences. Counterexample: fluent memorization is not the same as understanding causes.",
  relatedNotes: [{ noteId: "synthetic_recall", title: "Active recall reveals gaps",
    body: "Active recall reveals what is missing when a learner cannot explain a concept without the source. A beginner still needs initial reading before retrieval." }]
};
if (process.env.AI_FIXTURE_LANGUAGE === "zh") {
  fixture.title = "用解释检验理解";
  fixture.body = "能够用自己的语言解释一个概念，才说明自己真正理解了它。主动回忆要求合上书复述内容，解释中的卡顿会暴露理解漏洞。流畅背诵不代表能解释因果。";
  fixture.relatedNotes[0].title = "主动回忆帮助发现理解漏洞";
  fixture.relatedNotes[0].body = "合上书主动回忆，能发现自己尚未理解的知识。解释不清楚的地方，需要回到材料中核对。初学者仍需要先阅读，不能完全用回忆替代学习。";
}
const request = buildPermanentNoteLocalModelRequest(fixture, null, {
  model: { provider: "ollama_local_gateway", model: `ollama_local_gateway:${model}`, tier: "local_private" }
});
const adapter = createOpenAiCompatibleProviderAdapter({
  descriptor: { ...getProviderPreset("ollama_local_gateway"), endpointUrl: `${baseUrl}/v1/chat/completions` },
  networkEnabled: true, createExecutor: true
});
const started = Date.now();
try {
  const result = await runPermanentNoteLocalModelAnalysis(request, adapter);
  const valid = !result.analysis.modelParseError;
  console.log(JSON.stringify({ ok: valid, model, latencyMs: Date.now() - started,
    promptCharacters: request.messages.reduce((total, message) => total + message.content.length, 0),
    timeoutMs: request.executionDefaults.timeoutMs, modelCallStatus: result.providerResponse.status,
    candidateViewpoint: result.analysis.candidateViewpoint,
    relationCandidates: result.analysis.relationCandidates,
    canAutoConfirm: result.analysis.provenance.canAutoConfirm }, null, 2));
  if (!valid) process.exitCode = 1;
} catch (error) {
  console.error(JSON.stringify({ ok: false, model, latencyMs: Date.now() - started,
    timeoutMs: request.executionDefaults.timeoutMs, code: error.code,
    message: error.message, providerErrorType: error.providerResponse?.error?.error_type }, null, 2));
  process.exitCode = 1;
}
