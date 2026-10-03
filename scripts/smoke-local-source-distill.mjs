import { buildWritingStrongModelRequest } from "../packages/ai-orchestrator/src/writing-analysis.mjs";
import { runWritingStrongModelAnalysis } from "../packages/ai-orchestrator/src/analysis-executor.mjs";
import { createOpenAiCompatibleProviderAdapter } from "../packages/ai-orchestrator/src/openai-compatible-adapter.mjs";
import { getProviderPreset } from "../packages/ai-orchestrator/src/provider-presets.mjs";
import { buildSourceNoteDistillDraftFromAiResult } from "../apps/web/src/source-note-distill-ai-draft.js";

const model = process.env.OLLAMA_MODEL || "qwen2.5:7b";
const baseUrl = (process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434").replace(/\/+$/, "");
const source = { noteId: process.env.SOURCE_NOTE_ID || "synthetic_reading_source", noteType: "literature", title: "怎样检验读书后的理解",
  body: "反复阅读让原文变得熟悉，但熟悉不等于真正理解。合上书后用自己的语言说明概念和因果，解释不清的地方暴露了理解的缺口，应回到材料核对。流畅背诵原句并不能代替解释。初学者仍然需要先阅读，主动回忆不能替代最初的学习。" };
const request = buildWritingStrongModelRequest({ analysisFocus: "source_distill", privacyMode: "local_only",
  writingGoal: "把读书材料提炼为一条供我修改确认的中文观点。", notes: [source]
}, { model: { provider: "ollama_local_gateway", model: `ollama_local_gateway:${model}`, tier: "local_private" } });
const adapter = createOpenAiCompatibleProviderAdapter({
  descriptor: { ...getProviderPreset("ollama_local_gateway"), endpointUrl: `${baseUrl}/v1/chat/completions` },
  networkEnabled: true, createExecutor: true
});
const start = Date.now();
let providerOutput;
const observedAdapter = { ...adapter, complete: async (...args) => {
  const response = await adapter.complete(...args);
  providerOutput = response.output;
  return response;
} };
try {
  const result = await runWritingStrongModelAnalysis(request, observedAdapter);
  const preview = buildSourceNoteDistillDraftFromAiResult({ result });
  if (!preview || preview.autoWrite !== false || preview.requiresConfirmation !== true) throw new Error("No safe editable preview");
  console.log(JSON.stringify({ model, latencyMs: Date.now() - start, preview, summary: result.summary, provenance: result.provenance }, null, 2));
} catch (error) {
  console.error(JSON.stringify({ model, latencyMs: Date.now() - start, message: error.message, providerOutput }));
  process.exitCode = 1;
}
