import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import net from "node:net";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { createSqliteArtifactStore } from "../../packages/ai-orchestrator/src/index.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..", "..");

async function makeTempDir(prefix) {
  return fs.mkdtemp(path.join(os.tmpdir(), prefix));
}

async function findFreePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.on("error", reject);
    server.listen(0, () => {
      const address = server.address();
      const port = typeof address === "object" ? address.port : 0;
      server.close(() => resolve(port));
    });
  });
}

async function waitForHealth(baseUrl) {
  const deadline = Date.now() + 5000;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${baseUrl}/health`);
      if (res.ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 80));
  }
  throw new Error("API server did not become healthy");
}

async function postJson(baseUrl, pathname, body) {
  const res = await fetch(`${baseUrl}${pathname}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  const json = await res.json();
  return { status: res.status, json };
}

async function readRequestJson(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const text = Buffer.concat(chunks).toString("utf8");
  return text ? JSON.parse(text) : {};
}

async function startJsonProvider(output) {
  const requests = [];
  const server = http.createServer(async (req, res) => {
    if (req.method !== "POST" || req.url !== "/v1/chat/completions") {
      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: { message: "not found" } }));
      return;
    }
    const body = await readRequestJson(req);
    requests.push({ body, headers: req.headers });
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        id: "chatcmpl_potential_relation_refine_test",
        choices: [{ message: { role: "assistant", content: JSON.stringify(output) } }],
        usage: { prompt_tokens: 33, completion_tokens: 41, total_tokens: 74 }
      })
    );
  });

  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      resolve({
        server,
        requests,
        baseUrl: `http://127.0.0.1:${address.port}`
      });
    });
  });
}

async function startDelayedOllamaProvider(delayMs = 250) {
  const requests = [];
  const server = http.createServer(async (req, res) => {
    if (req.method !== "POST" || req.url !== "/api/generate") {
      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: { message: "not found" } }));
      return;
    }
    const body = await readRequestJson(req);
    requests.push({ body, headers: req.headers, closedEarly: false });
    const record = requests[requests.length - 1];
    req.on("close", () => {
      record.closedEarly = res.writableEnded === false;
    });
    setTimeout(() => {
      if (res.writableEnded) return;
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          response: JSON.stringify({
            decision: "uncertain",
            relationType: "same_topic",
            confidence: 0.2,
            rationale: "late response"
          })
        })
      );
    }, delayMs);
  });

  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      resolve({
        server,
        requests,
        baseUrl: `http://127.0.0.1:${address.port}`
      });
    });
  });
}

async function startHeaderFirstOllamaProvider(bodyDelayMs = 250) {
  const requests = [];
  const server = http.createServer(async (req, res) => {
    if (req.method !== "POST" || req.url !== "/api/generate") {
      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: { message: "not found" } }));
      return;
    }
    const body = await readRequestJson(req);
    requests.push({ body, headers: req.headers, closedEarly: false });
    const record = requests[requests.length - 1];
    req.on("close", () => {
      record.closedEarly = res.writableEnded === false;
    });
    res.writeHead(200, { "Content-Type": "application/json" });
    setTimeout(() => {
      if (res.writableEnded) return;
      res.end(
        JSON.stringify({
          response: JSON.stringify({
            decision: "uncertain",
            relationType: "same_topic",
            confidence: 0.2,
            rationale: "late body response"
          })
        })
      );
    }, bodyDelayMs);
  });

  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      resolve({
        server,
        requests,
        baseUrl: `http://127.0.0.1:${address.port}`
      });
    });
  });
}

async function startDualModeRefineProvider() {
  const chatRequests = [];
  const generateRequests = [];
  const server = http.createServer(async (req, res) => {
    if (req.method === "POST" && req.url === "/v1/chat/completions") {
      const body = await readRequestJson(req);
      chatRequests.push({ body, headers: req.headers });
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          id: "chatcmpl_dual_mode_refine_test",
          choices: [
            {
              message: {
                role: "assistant",
                content: JSON.stringify({
                  decision: "accept",
                  relationType: "supports",
                  confidence: 0.74,
                  rationale: "remote-like provider response",
                  evidenceA: "A",
                  evidenceB: "B",
                  reviewQuestion: "Q1"
                })
              }
            }
          ],
          usage: { prompt_tokens: 21, completion_tokens: 35, total_tokens: 56 }
        })
      );
      return;
    }
    if (req.method === "POST" && req.url === "/api/generate") {
      const body = await readRequestJson(req);
      generateRequests.push({ body, headers: req.headers });
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          response: JSON.stringify({
            decision: "accept",
            relationType: "qualifies",
            confidence: 0.61,
            rationale: "ollama-like provider response",
            evidenceA: "A2",
            evidenceB: "B2",
            reviewQuestion: "Q2"
          })
        })
      );
      return;
    }
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: { message: "not found" } }));
  });

  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      resolve({
        server,
        chatRequests,
        generateRequests,
        baseUrl: `http://127.0.0.1:${address.port}`
      });
    });
  });
}

function startApi(port, vaultPath, extraEnv = {}) {
  return spawn(process.execPath, ["apps/api/src/server.mjs"], {
    cwd: REPO_ROOT,
    env: {
      ...process.env,
      API_PORT: String(port),
      VAULT_PATH: vaultPath,
      YANSILU_TEST_PROVIDER_KEY: process.env.YANSILU_TEST_PROVIDER_KEY || "test-key",
      ...extraEnv
    },
    stdio: ["ignore", "pipe", "pipe"]
  });
}

function buildRefineNotes() {
  return [
    {
      id: "pn_source_runtime",
      title: "Manual confirmation is required before formal links",
      body: [
        "# Manual confirmation is required before formal links",
        "",
        "## One-line thesis",
        "Remote AI relation suggestions should be reviewed before becoming formal graph links.",
        "",
        "## Three-line summary",
        "AI can propose candidate links.",
        "Users still need to confirm whether the relation is real.",
        "Potential relations should stay pending until review."
      ].join("\n"),
      thesis: "Remote AI relation suggestions should be reviewed before becoming formal graph links.",
      summary: "AI can propose candidate links, but users should confirm them before they become formal graph relations.",
      tags: ["AI", "relation-review", "permanent-note"],
      folderId: "dir_original_default",
      updatedAt: "2026-06-16T00:00:00.000Z"
    },
    {
      id: "pn_target_runtime",
      title: "Potential relations should stay pending first",
      body: [
        "# Potential relations should stay pending first",
        "",
        "## One-line thesis",
        "Potential relations should show reasons and stay pending instead of being auto-written as formal edges.",
        "",
        "## Three-line summary",
        "The graph can surface likely links.",
        "The user should still choose the relation type.",
        "Formal graph edges should only appear after confirmation."
      ].join("\n"),
      thesis: "Potential relations should show reasons and stay pending instead of being auto-written as formal edges.",
      summary: "The graph can surface likely links, but users should still confirm the relation before it becomes formal.",
      tags: ["AI", "relation-review", "graph"],
      folderId: "dir_original_default",
      updatedAt: "2026-06-16T00:00:00.000Z"
    }
  ];
}

function buildCandidate() {
  return {
    id: "candidate_runtime_1",
    sourceNoteId: "pn_source_runtime",
    targetNoteId: "pn_target_runtime",
    relationType: "associated_with",
    coarseType: "associated_with",
    sharedTags: ["AI", "relation-review"]
  };
}

function buildRemoteRefineBody() {
  return {
    notes: buildRefineNotes(),
    relations: [],
    candidate: buildCandidate(),
    focusNoteId: "pn_source_runtime",
    currentNoteId: "pn_source_runtime",
    userMode: "Local / Private",
    modelPack: "Global Optimized",
    providerPreset: "openai_compatible_gateway",
    authMode: "workspace_managed",
    secretRef: "env:YANSILU_TEST_PROVIDER_KEY",
    endpointUrl: "https://remote-gateway.example.test/v1/chat/completions",
    modelTier: "local_private",
    timeoutMs: 60000
  };
}

function buildLocalRefineBody(providerBaseUrl) {
  return {
    notes: buildRefineNotes(),
    relations: [],
    candidate: buildCandidate(),
    focusNoteId: "pn_source_runtime",
    currentNoteId: "pn_source_runtime",
    userMode: "Local / Private",
    modelPack: "Privacy First",
    providerPreset: "local_private_gateway",
    authMode: "local_no_key",
    endpointUrl: `${providerBaseUrl}/v1/chat/completions`,
    runtimeModelMap: {
      "local_private_gateway:local_private": "local-runtime-model"
    },
    modelTier: "local_private",
    timeoutMs: 60000
  };
}

test("potential relation refine returns confirmation-needed state before remote execution", async (t) => {
  const vaultPath = await makeTempDir("yansilu-api-potential-relations-vault-");
  const port = await findFreePort();
  const baseUrl = `http://127.0.0.1:${port}`;
  const child = startApi(port, vaultPath);

  t.after(() => child.kill());
  await waitForHealth(baseUrl);

  const response = await postJson(baseUrl, "/api/v1/graph/potential-relations/refine", buildRemoteRefineBody());

  assert.equal(response.status, 200, JSON.stringify(response.json));
  assert.equal(response.json.item.aiDecision, null);
  assert.equal(response.json.item.aiRelationType, null);
  assert.equal(response.json.item.aiErrorCode, "AI_ROUTE_CONFIRMATION_REQUIRED");
  assert.equal(response.json.item.aiNeedsConfirmation, true);
  assert.equal(response.json.metrics.providerId, "openai_compatible_gateway");
  assert.equal(response.json.metrics.modelRef, "openai_compatible_gateway:local_private");
});

test("potential relation refine executes with current provider settings after confirmation", async (t) => {
  const vaultPath = await makeTempDir("yansilu-api-potential-relations-confirmed-vault-");
  const port = await findFreePort();
  const baseUrl = `http://127.0.0.1:${port}`;
  const child = startApi(port, vaultPath);

  t.after(() => child.kill());
  await waitForHealth(baseUrl);

  const provider = await startJsonProvider({
    decision: "accept",
    relationType: "supports",
    confidence: 0.91,
    rationale: "The source note says relation suggestions need user review first, which supports the target note's pending-first workflow.",
    evidenceA: "relation suggestions should be reviewed before becoming formal graph links",
    evidenceB: "potential relations should stay pending instead of being auto-written as formal edges",
    reviewQuestion: "Does the first note clearly support the pending-first workflow described by the second note?"
  });

  t.after(() => provider.server.close());

  const response = await postJson(baseUrl, "/api/v1/graph/potential-relations/refine", {
    ...buildLocalRefineBody(provider.baseUrl),
    confirmationApproved: true,
    confirmBudget: true
  });

  assert.equal(response.status, 200, JSON.stringify(response.json));
  assert.equal(response.json.item.aiDecision, "accept");
  assert.equal(response.json.item.aiRelationType, "supports");
  assert.match(response.json.item.aiRationale, /supports|pending-first/i);
  assert.equal(response.json.item.aiNeedsConfirmation, false);
  assert.equal(response.json.reviewItems.artifactsPersisted, true);
  assert.equal(response.json.reviewItems.storedArtifactIds.length, 1);
  assert.equal(response.json.metrics.providerId, "local_private_gateway");
  assert.equal(response.json.metrics.modelRef, "local_private_gateway:local_private");
  assert.equal(provider.requests.length, 1);
  assert.equal(provider.requests[0].body.model, "local-runtime-model");
  assert.equal(provider.requests[0].body.max_tokens, 320);

  const artifactStore = await createSqliteArtifactStore({ vaultPath });
  t.after(() => artifactStore.close());
  const artifact = artifactStore.getArtifact(response.json.reviewItems.storedArtifactIds[0]);
  assert.equal(artifact.type, "LinkSuggestion");
  assert.equal(artifact.payload.aiRelationType, "supports");
  assert.equal(artifact.payload.aiDecision, "accept");
  assert.match(String(artifact.summary || ""), /supports|pending-first/i);
  assert.equal(artifact.model.provider, "local_private_gateway");
  assert.equal(artifact.privacy.mode, "local_only");
  assert.equal(artifact.privacy.cloudModelUsed, false);
});

test("potential relation refine invalidates cached AI rationale when the current note content changes", async (t) => {
  const vaultPath = await makeTempDir("yansilu-api-potential-relations-cache-vault-");
  const port = await findFreePort();
  const baseUrl = `http://127.0.0.1:${port}`;
  const child = startApi(port, vaultPath);

  t.after(() => child.kill());
  await waitForHealth(baseUrl);

  const provider = await startJsonProvider({
    decision: "accept",
    relationType: "supports",
    confidence: 0.88,
    rationale: "The source note supports the target note's pending-first relation workflow.",
    evidenceA: "relation suggestions need user confirmation",
    evidenceB: "potential relations should remain pending first",
    reviewQuestion: "Does the source note still support the target note after the latest edit?"
  });

  t.after(() => provider.server.close());

  const staleCandidate = {
    id: "candidate_stale_hash",
    sourceNoteId: "pn_source_runtime",
    targetNoteId: "pn_target_runtime",
    relationType: "associated_with",
    coarseType: "associated_with",
    sharedTags: ["AI", "relation-review"],
    sourceContentHash: "stale_source_hash",
    targetContentHash: "stale_target_hash"
  };

  const notesV1 = [
    {
      id: "pn_source_runtime",
      title: "Manual confirmation before formal graph links",
      body: "# Manual confirmation before formal graph links\n\n## One-line thesis\nRelation suggestions need user confirmation before they become formal graph links.",
      thesis: "Relation suggestions need user confirmation before they become formal graph links.",
      tags: ["AI", "relation-review"],
      folderId: "dir_original_default",
      updatedAt: "2026-06-16T00:00:00.000Z"
    },
    {
      id: "pn_target_runtime",
      title: "Potential relations should remain pending first",
      body: "# Potential relations should remain pending first\n\n## One-line thesis\nPotential relations should remain pending until the user confirms the exact edge.",
      thesis: "Potential relations should remain pending until the user confirms the exact edge.",
      tags: ["AI", "relation-review"],
      folderId: "dir_original_default",
      updatedAt: "2026-06-16T00:00:00.000Z"
    }
  ];

  const firstResponse = await postJson(baseUrl, "/api/v1/graph/potential-relations/refine", {
    ...buildLocalRefineBody(provider.baseUrl),
    notes: notesV1,
    candidate: staleCandidate,
    options: { minScore: 0.05 },
    confirmationApproved: true,
    confirmBudget: true
  });

  assert.equal(firstResponse.status, 200, JSON.stringify(firstResponse.json));
  assert.equal(firstResponse.json.metrics.cacheHit, false);
  assert.equal(provider.requests.length, 1);

  const notesV2 = [
    {
      ...notesV1[0],
      body: "# Manual confirmation before formal graph links\n\n## One-line thesis\nRelation suggestions need user confirmation before they become formal graph links.\n\n## Three-line summary\nThe latest edit adds a stronger review boundary for all suggested edges.",
      thesis: "Relation suggestions need explicit user confirmation before they become formal graph links, especially after the latest review boundary edit.",
      updatedAt: "2026-06-17T00:00:00.000Z"
    },
    notesV1[1]
  ];

  const secondResponse = await postJson(baseUrl, "/api/v1/graph/potential-relations/refine", {
    ...buildLocalRefineBody(provider.baseUrl),
    notes: notesV2,
    candidate: staleCandidate,
    options: { minScore: 0.05 },
    confirmationApproved: true,
    confirmBudget: true
  });

  assert.equal(secondResponse.status, 200, JSON.stringify(secondResponse.json));
  assert.equal(secondResponse.json.metrics.cacheHit, false);
  assert.equal(provider.requests.length, 2);
});

test("potential relation refine persists remote provider metadata on review artifacts", async (t) => {
  const vaultPath = await makeTempDir("yansilu-api-potential-relations-remote-metadata-vault-");
  const port = await findFreePort();
  const baseUrl = `http://127.0.0.1:${port}`;
  const child = startApi(port, vaultPath);

  t.after(() => child.kill());
  await waitForHealth(baseUrl);

  const response = await postJson(baseUrl, "/api/v1/graph/potential-relations/refine", {
    ...buildRemoteRefineBody(),
    useMockProviderAdapters: true,
    userMode: "Balanced",
    modelTier: "standard",
    confirmationApproved: true,
    confirmBudget: true
  });

  assert.equal(response.status, 200, JSON.stringify(response.json));
  assert.equal(response.json.metrics.providerId, "openai_compatible_gateway");
  assert.equal(response.json.reviewItems.storedArtifactIds.length, 1);

  const artifactStore = await createSqliteArtifactStore({ vaultPath });
  t.after(() => artifactStore.close());
  const artifact = artifactStore.getArtifact(response.json.reviewItems.storedArtifactIds[0]);
  assert.equal(artifact.model.provider, "openai_compatible_gateway");
  assert.equal(artifact.model.modelRef, response.json.metrics.modelRef);
  assert.equal(artifact.privacy.cloudModelUsed, true);
  assert.notEqual(artifact.privacy.mode, "local_only");
});

test("potential relation refine uses stored user mode for artifact metadata when the request omits userMode", async (t) => {
  const vaultPath = await makeTempDir("yansilu-api-potential-relations-stored-mode-vault-");
  const port = await findFreePort();
  const baseUrl = `http://127.0.0.1:${port}`;
  const child = startApi(port, vaultPath);

  t.after(() => child.kill());
  await waitForHealth(baseUrl);

  const preferences = await postJson(baseUrl, "/api/v1/ai/preferences", {
    userMode: "Balanced",
    modelPack: "Starter Auto"
  });
  assert.equal(preferences.status, 200, JSON.stringify(preferences.json));

  const response = await postJson(baseUrl, "/api/v1/graph/potential-relations/refine", {
    notes: buildRefineNotes(),
    relations: [],
    candidate: buildCandidate(),
    useMockProviderAdapters: true,
    confirmationApproved: true,
    confirmBudget: true
  });

  assert.equal(response.status, 200, JSON.stringify(response.json));
  assert.equal(response.json.metrics.providerId, "platform_managed_openai");
  assert.equal(response.json.reviewItems.storedArtifactIds.length, 1);

  const artifactStore = await createSqliteArtifactStore({ vaultPath });
  t.after(() => artifactStore.close());
  const artifact = artifactStore.getArtifact(response.json.reviewItems.storedArtifactIds[0]);
  assert.equal(artifact.model.mode, "Balanced");
  assert.notEqual(artifact.model.mode, "Local / Private");
});

test("potential relation refine rejects a stale candidate that is no longer in the current scan", async (t) => {
  const vaultPath = await makeTempDir("yansilu-api-potential-relations-stale-candidate-vault-");
  const port = await findFreePort();
  const baseUrl = `http://127.0.0.1:${port}`;
  const child = startApi(port, vaultPath);

  t.after(() => child.kill());
  await waitForHealth(baseUrl);

  const response = await postJson(baseUrl, "/api/v1/graph/potential-relations/refine", {
    notes: buildRefineNotes(),
    relations: [
      {
        id: "r_confirmed_runtime",
        fromNoteId: "pn_source_runtime",
        toNoteId: "pn_target_runtime",
        relationType: "supports",
        status: "confirmed"
      }
    ],
    candidate: buildCandidate(),
    useMockProviderAdapters: true,
    confirmationApproved: true,
    confirmBudget: true
  });

  assert.equal(response.status, 404, JSON.stringify(response.json));
  assert.equal(response.json.error.code, "POTENTIAL_RELATION_CANDIDATE_NOT_FOUND");
  assert.match(response.json.error.message, /no longer available in the current scan/i);
});

test("potential relation refine does not reuse cached AI output across different providers with the same model name", async (t) => {
  const vaultPath = await makeTempDir("yansilu-api-potential-relations-provider-cache-vault-");
  const port = await findFreePort();
  const dualProvider = await startDualModeRefineProvider();
  const baseUrl = `http://127.0.0.1:${port}`;
  const child = startApi(port, vaultPath, {
    OLLAMA_BASE_URL: dualProvider.baseUrl
  });

  t.after(() => child.kill());
  t.after(() => dualProvider.server.close());
  await waitForHealth(baseUrl);

  const first = await postJson(baseUrl, "/api/v1/graph/potential-relations/refine", {
    ...buildLocalRefineBody(dualProvider.baseUrl),
    modelRef: "shared-runtime-model",
    confirmationApproved: true,
    confirmBudget: true,
    persistArtifacts: false
  });
  assert.equal(first.status, 200, JSON.stringify(first.json));
  assert.equal(first.json.metrics.cacheHit, false);
  assert.equal(first.json.item.aiRelationType, "supports");
  assert.equal(dualProvider.chatRequests.length, 1);

  const second = await postJson(baseUrl, "/api/v1/graph/potential-relations/refine", {
    notes: buildRefineNotes(),
    relations: [],
    candidate: buildCandidate(),
    providerMode: "ollama_direct",
    modelName: "shared-runtime-model",
    timeoutMs: 60000,
    persistArtifacts: false
  });
  assert.equal(second.status, 200, JSON.stringify(second.json));
  assert.equal(second.json.metrics.cacheHit, false);
  assert.equal(second.json.item.aiRelationType, "qualifies");
  assert.equal(dualProvider.generateRequests.length, 1);
});

test("potential relation refine returns a timeout error instead of waiting indefinitely for ollama_direct", async (t) => {
  const vaultPath = await makeTempDir("yansilu-api-potential-relations-ollama-timeout-vault-");
  const port = await findFreePort();
  const delayedProvider = await startDelayedOllamaProvider(250);
  const baseUrl = `http://127.0.0.1:${port}`;
  const child = startApi(port, vaultPath, {
    OLLAMA_BASE_URL: delayedProvider.baseUrl
  });

  t.after(() => child.kill());
  t.after(() => delayedProvider.server.close());
  await waitForHealth(baseUrl);

  const startedAt = Date.now();
  const response = await postJson(baseUrl, "/api/v1/graph/potential-relations/refine", {
    notes: buildRefineNotes(),
    relations: [],
    candidate: buildCandidate(),
    providerMode: "ollama_direct",
    modelName: "timeout-test-model",
    timeoutMs: 50,
    persistArtifacts: false
  });
  const elapsedMs = Date.now() - startedAt;

  assert.equal(response.status, 200, JSON.stringify(response.json));
  assert.equal(response.json.item.aiDecision, null);
  assert.match(String(response.json.item.aiErrorCode || ""), /OLLAMA_TIMEOUT|AI_RELATION_TIMEOUT/);
  assert.ok(elapsedMs < 320, `expected timeout response quickly, got ${elapsedMs}ms`);
});

test("potential relation refine also times out when ollama stalls after sending response headers", async (t) => {
  const vaultPath = await makeTempDir("yansilu-api-potential-relations-ollama-body-timeout-vault-");
  const port = await findFreePort();
  const delayedProvider = await startHeaderFirstOllamaProvider(250);
  const baseUrl = `http://127.0.0.1:${port}`;
  const child = startApi(port, vaultPath, {
    OLLAMA_BASE_URL: delayedProvider.baseUrl
  });

  t.after(() => child.kill());
  t.after(() => delayedProvider.server.close());
  await waitForHealth(baseUrl);

  const startedAt = Date.now();
  const response = await postJson(baseUrl, "/api/v1/graph/potential-relations/refine", {
    notes: buildRefineNotes(),
    relations: [],
    candidate: buildCandidate(),
    providerMode: "ollama_direct",
    modelName: "timeout-test-model",
    timeoutMs: 50,
    persistArtifacts: false
  });
  const elapsedMs = Date.now() - startedAt;

  assert.equal(response.status, 200, JSON.stringify(response.json));
  assert.equal(response.json.item.aiDecision, null);
  assert.match(String(response.json.item.aiErrorCode || ""), /OLLAMA_TIMEOUT|AI_RELATION_TIMEOUT/);
  assert.ok(elapsedMs < 320, `expected body-parse timeout response quickly, got ${elapsedMs}ms`);
});
