import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SERVER_SOURCE = path.resolve(__dirname, "..", "..", "apps", "api", "src", "server.mjs");

function readServer() {
  return fs.readFileSync(SERVER_SOURCE, "utf8");
}

test("potential relation refine follows current AI provider settings by default", () => {
  const source = readServer();
  const start = source.indexOf('url.pathname === "/api/v1/graph/potential-relations/refine"');
  const end = source.indexOf('if (req.method === "GET" && url.pathname === "/api/v1/graph/path")', start);
  assert.ok(start >= 0 && end > start, "expected potential relation refine endpoint");
  const endpoint = source.slice(start, end);

  assert.match(endpoint, /const executeWithCurrentSettings = body\.providerMode !== "ollama_direct" && body\.provider_mode !== "ollama_direct";/);
  assert.match(endpoint, /resolveAnalysisProviderExecution\(body, \{/);
  assert.match(endpoint, /agentId: "potential_relation_refine_agent"/);
  assert.match(endpoint, /providerExecution\.providerAdapter\.complete\(\{/);
  assert.match(endpoint, /providerDescriptor: providerExecution\.providerDescriptor/);
  assert.match(endpoint, /modelRoute: providerExecution\.modelRoute/);
  assert.match(endpoint, /const budgetPrecheck = assertProviderModelCallAllowed\(\{/);
  assert.match(endpoint, /budgetPrecheck/);
  assert.match(endpoint, /maxOutputTokens: options\.numPredict/);
  assert.match(endpoint, /max_output_tokens: options\.numPredict/);
  assert.match(endpoint, /const hasBatchTimeout =/);
  assert.match(endpoint, /body\.batchTimeoutMs !== undefined/);
  assert.match(endpoint, /body\.batch_timeout_ms !== undefined/);
  assert.match(endpoint, /const timeoutMs = hasBatchTimeout/);
  assert.match(endpoint, /\? batchPlan\[0\]\?\.timeoutMs \|\| 120000/);
  assert.match(endpoint, /: Math\.min\(Number\(body\.timeoutMs \?\? body\.timeout_ms\) \|\| 60000, 60000\);/);
  assert.match(endpoint, /callOllamaGenerate\(prompt, \{ \.\.\.options, timeoutMs \}\)/);
  assert.match(endpoint, /const artifactContext = graphArtifactExecutionContext\(\{/);
  assert.match(endpoint, /providerExecution,/);
  assert.match(endpoint, /modelName/);
  assert.match(endpoint, /focusNoteId:/);
  assert.match(endpoint, /body\.focusNoteId/);
  assert.match(endpoint, /body\.focus_note_id/);
  assert.doesNotMatch(endpoint, /confirmationRequired: false/);
});

test("potential relation endpoints accept noteId as a focus alias and infer its directory", () => {
  const source = readServer();
  const helperStart = source.indexOf("async function resolvePotentialRelationScope(body = {})");
  const helperEnd = source.indexOf("\nfunction graphArtifactScopeKey", helperStart);
  assert.ok(helperStart >= 0 && helperEnd > helperStart, "expected potential relation scope helper");
  const helper = source.slice(helperStart, helperEnd);

  assert.match(helper, /body\.noteId \|\|/);
  assert.match(helper, /body\.note_id/);
  assert.match(helper, /const focusNote = await getNoteById\(VAULT_PATH, focusNoteId\);/);
  assert.match(helper, /focusNote\?\.folderId \|\| focusNote\?\.directoryId \|\| focusNote\?\.directory_id/);
  assert.match(helper, /getDirectoryGraph\(VAULT_PATH, directoryId/);
  const scopeStart = source.indexOf("function graphArtifactScopeKey(body = {}, notes = [])");
  const scopeEnd = source.indexOf("\nfunction stableArtifactScopePart", scopeStart);
  assert.ok(scopeStart >= 0 && scopeEnd > scopeStart, "expected graph artifact scope helper");
  const scopeHelper = source.slice(scopeStart, scopeEnd);
  assert.match(scopeHelper, /body\.noteId \|\|/);
  assert.match(scopeHelper, /body\.note_id/);

  const endpointStart = source.indexOf('url.pathname === "/api/v1/graph/potential-relations"');
  const endpointEnd = source.indexOf('if (req.method === "POST" && url.pathname === "/api/v1/graph/potential-relations/refine")', endpointStart);
  assert.ok(endpointStart >= 0 && endpointEnd > endpointStart, "expected potential relation scan endpoint");
  const endpoint = source.slice(endpointStart, endpointEnd);
  assert.match(endpoint, /resolvePotentialRelationScope\(body\)/);
  assert.match(endpoint, /\.\.\.\(body\.options \|\| \{\}\)/);
  assert.match(endpoint, /body\.noteId/);
  assert.match(endpoint, /body\.note_id/);
  assert.match(endpoint, /body\.options\?\.focusNoteId/);
  assert.match(endpoint, /body\.options\?\.focus_note_id/);
  assert.match(endpoint, /directoryId: directoryId \|\| null/);
});

test("ollama direct refine aborts the generate call on timeout", () => {
  const source = readServer();

  assert.match(source, /function graphArtifactExecutionContext\(/);
  assert.match(source, /const requestedUserMode = cleanText\(body\.userMode \|\| body\.user_mode\);/);
  assert.match(source, /model: requestModelFromRoute\(providerExecution\.providerDescriptor, providerExecution\.modelRoute, modelName, requestedUserMode\)/);
  assert.match(source, /cloudModelUsed: providerExecution\.providerDescriptor\?\.localExecution !== true/);
  assert.match(source, /const controller = new AbortController\(\);/);
  assert.match(source, /signal: controller\.signal,/);
  assert.match(source, /function ollamaTimeoutError\(\) \{/);
  assert.match(source, /async function withOllamaDeadline\(promise, remainingMs\) \{/);
  assert.match(source, /json = await withOllamaDeadline\(response\.json\(\), timeoutMs - \(Date\.now\(\) - startedAt\)\);/);
  assert.match(source, /if \(error\?\.name === "AbortError"\) throw ollamaTimeoutError\(\);/);
});
